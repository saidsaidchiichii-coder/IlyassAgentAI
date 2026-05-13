import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const config = { api: { bodyParser: false } };

function initFirebase() {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe not configured' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig    = req.headers['stripe-signature'];
  const buf    = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    initFirebase();
    const db = getFirestore();

    // ─── Checkout completed (new subscription) ───────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, plan } = session.metadata || {};
      if (!userId) return res.json({ received: true });

      const customerId     = session.customer;
      const subscriptionId = session.subscription;

      await db.collection('users').doc(userId).set({
        plan:             plan || 'pro',
        stripeCustomerId: customerId,
        subscriptionId:   subscriptionId,
        planActivatedAt:  new Date().toISOString(),
        planExpiresAt:    null,
        credits:          FieldValue.increment(0), // keep existing
      }, { merge: true });

      console.log(`✅ Pro plan activated for user ${userId}`);
    }

    // ─── Subscription activated/renewed ───────────────────────────
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      // Find user by stripeCustomerId
      const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
      if (!snap.empty) {
        const uid = snap.docs[0].id;
        const periodEnd = invoice.lines?.data?.[0]?.period?.end;
        await db.collection('users').doc(uid).update({
          plan:            'pro',
          planExpiresAt:   periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          lastPaymentDate: new Date().toISOString(),
          lastInvoiceId:   invoice.id,
        });
        console.log(`✅ Subscription renewed for user ${uid}`);
      }
    }

    // ─── Subscription cancelled / expired ─────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId   = subscription.customer;

      const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
      if (!snap.empty) {
        const uid = snap.docs[0].id;
        await db.collection('users').doc(uid).update({
          plan:           'free',
          subscriptionId: null,
          planExpiresAt:  new Date().toISOString(),
          cancelledAt:    new Date().toISOString(),
        });
        console.log(`⚠️ Subscription cancelled for user ${uid}`);
      }
    }

    // ─── Payment failed ────────────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice    = event.data.object;
      const customerId = invoice.customer;

      const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
      if (!snap.empty) {
        const uid = snap.docs[0].id;
        await db.collection('users').doc(uid).update({
          paymentFailed:     true,
          paymentFailedDate: new Date().toISOString(),
        });
      }
    }

  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Handler failed' });
  }

  res.json({ received: true });
}
