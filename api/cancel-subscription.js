import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe not configured' });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    initFirebase();
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const data = userDoc.data();
    const subscriptionId = data.stripeSubscriptionId;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Cancel at period end (user keeps access until end of billing cycle)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    await db.collection('users').doc(userId).update({
      planStatus: 'cancelling',
      cancelAt: new Date(subscription.cancel_at * 1000).toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at end of billing period',
      cancelAt: new Date(subscription.cancel_at * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    return res.status(500).json({ error: err.message });
  }
}
