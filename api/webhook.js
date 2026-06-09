import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const config = { api: { bodyParser: false } };

function initFirebase() {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Plan features map (must match create-checkout.js)
const PLAN_FEATURES = {
  free: {
    messagesPerDay: 100,
    models: ['gpt-3.5-turbo'],
    imageGenPerDay: 0,
    webSearch: false,
    memoryPersistence: false,
    priorityRouting: false,
    ownApiKey: false,
  },
  pro: {
    messagesPerDay: -1,
    models: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    imageGenPerDay: -1,
    webSearch: true,
    memoryPersistence: true,
    priorityRouting: true,
    ownApiKey: false,
  },
  custom: {
    messagesPerDay: -1,
    models: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4-turbo', 'gpt-3.5-turbo', 'custom'],
    imageGenPerDay: -1,
    webSearch: true,
    memoryPersistence: true,
    priorityRouting: true,
    ownApiKey: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe not configured' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const buf = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  initFirebase();
  const db = getFirestore();

  console.log(`Stripe event received: ${event.type}`);

  try {
    switch (event.type) {

      // ✅ Payment succeeded — activate plan
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, plan } = session.metadata || {};
        if (!userId || !plan) break;

        const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        await db.collection('users').doc(userId).set({
          plan,
          planFeatures: features,
          planActivatedAt: new Date().toISOString(),
          planStatus: 'active',
          stripeCustomerId: customerId || null,
          stripeSubscriptionId: subscriptionId || null,
          lastPayment: new Date().toISOString(),
          lastPaymentAmount: session.amount_total || 0,
          totalSpent: FieldValue.increment(session.amount_total || 0),
        }, { merge: true });

        console.log(`✅ Plan activated: ${plan} for user ${userId}`);
        break;
      }

      // ✅ Subscription renewed successfully
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        // Find user by stripeCustomerId
        const userSnap = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          await userDoc.ref.update({
            planStatus: 'active',
            lastPayment: new Date().toISOString(),
            lastPaymentAmount: invoice.amount_paid || 0,
            totalSpent: FieldValue.increment(invoice.amount_paid || 0),
            planRenewedAt: new Date().toISOString(),
          });
          console.log(`✅ Subscription renewed for customer ${customerId}`);
        }
        break;
      }

      // ❌ Payment failed — downgrade to free
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const userSnap = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          await userDoc.ref.update({
            planStatus: 'payment_failed',
            paymentFailedAt: new Date().toISOString(),
          });
          console.log(`❌ Payment failed for customer ${customerId}`);
        }
        break;
      }

      // ❌ Subscription cancelled — downgrade to free
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const userSnap = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          await userDoc.ref.update({
            plan: 'free',
            planFeatures: PLAN_FEATURES.free,
            planStatus: 'cancelled',
            planCancelledAt: new Date().toISOString(),
            stripeSubscriptionId: null,
          });
          console.log(`🔄 Subscription cancelled → downgraded to free for customer ${customerId}`);
        }
        break;
      }

      // ℹ️ Subscription updated (plan change)
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status;

        const userSnap = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          await userDoc.ref.update({
            planStatus: status,
            stripeSubscriptionId: subscription.id,
            subscriptionUpdatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook handler failed: ' + err.message });
  }

  res.json({ received: true });
}
