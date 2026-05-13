import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const PLANS = {
  pro: {
    name:        'IlyassAI Pro',
    description: 'Unlimited messages, premium models, and all features',
    amount:      1200,   // $12.00
    currency:    'usd',
    interval:    'month',
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Stripe not configured.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { plan = 'pro', userId, email } = req.body || {};
  const selected = PLANS[plan];
  if (!selected) return res.status(400).json({ error: 'Invalid plan' });
  if (!userId)   return res.status(400).json({ error: 'userId required' });

  try {
    // Check if user already has a Stripe customer ID
    let customerId;
    try {
      initFirebase();
      const db      = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists()) {
        customerId = userDoc.data()?.stripeCustomerId;
      }
    } catch(e) {}

    // Build session params
    const sessionParams = {
      payment_method_types: ['card'],
      mode:                 'subscription',
      line_items: [{
        price_data: {
          currency:    selected.currency,
          product_data: {
            name:        selected.name,
            description: selected.description,
          },
          unit_amount:  selected.amount,
          recurring: { interval: selected.interval },
        },
        quantity: 1,
      }],
      success_url: `https://my-webxyu.vercel.app/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url:  `https://my-webxyu.vercel.app/app`,
      metadata:    { userId, plan },
      allow_promotion_codes: true,
    };

    // Attach customer if exists (to avoid duplicate customers)
    if (customerId) {
      sessionParams.customer = customerId;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
