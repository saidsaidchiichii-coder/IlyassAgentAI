import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { buffer } from 'micro';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig    = req.headers['stripe-signature'];
  const buf    = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, credits, pkg } = session.metadata;

    if (!userId || !credits) {
      console.error('Missing metadata in session');
      return res.status(400).json({ error: 'Missing metadata' });
    }

    try {
      initFirebase();
      const db      = getFirestore();
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        credits:     FieldValue.increment(parseInt(credits)),
        totalSpent:  FieldValue.increment(session.amount_total || 0),
        lastPayment: new Date().toISOString(),
        lastPkg:     pkg || 'unknown',
      });
      console.log(`✅ Added ${credits} credits to user ${userId}`);
    } catch (err) {
      console.error('Firebase update failed:', err);
      return res.status(500).json({ error: 'Firebase update failed' });
    }
  }

  res.json({ received: true });
}
