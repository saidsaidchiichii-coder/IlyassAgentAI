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

// ============================================================
// PLANS — 3 REAL TIERS
// ============================================================
const PLANS = {
  free: {
    name: 'IlyassAI Free',
    description: '100 messages/day, 1 AI model, no image generation',
    amount: 0,
    currency: 'usd',
    interval: 'month',
    features: {
      messagesPerDay: 100,
      models: ['gpt-3.5-turbo'],
      imageGenPerDay: 0,
      webSearch: false,
      memoryPersistence: false,
      priorityRouting: false,
      ownApiKey: false,
    },
  },
  pro: {
    name: 'IlyassAI Pro',
    description: 'Unlimited messages, GPT-4o, Claude, unlimited images, memory & priority routing',
    amount: 1800, // $18.00
    currency: 'usd',
    interval: 'month',
    features: {
      messagesPerDay: -1, // unlimited
      models: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      imageGenPerDay: -1, // unlimited
      webSearch: true,
      memoryPersistence: true,
      priorityRouting: true,
      ownApiKey: false,
    },
  },
  custom: {
    name: 'IlyassAI Custom',
    description: 'Everything in Pro + your own API key, custom integrations, white-label',
    amount: 8000, // $80.00
    currency: 'usd',
    interval: 'month',
    features: {
      messagesPerDay: -1,
      models: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4-turbo', 'gpt-3.5-turbo', 'custom'],
      imageGenPerDay: -1,
      webSearch: true,
      memoryPersistence: true,
      priorityRouting: true,
      ownApiKey: true,
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Free plan — no Stripe needed, just update Firestore
  const { plan = 'pro', userId, email } = req.body || {};
  const selected = PLANS[plan];
  if (!selected) return res.status(400).json({ error: 'Invalid plan. Use: free, pro, custom' });
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // FREE PLAN — no payment, just set plan in Firestore
  if (plan === 'free') {
    try {
      initFirebase();
      const db = getFirestore();
      await db.collection('users').doc(userId).set({
        plan: 'free',
        planFeatures: selected.features,
        planActivatedAt: new Date().toISOString(),
        planExpiresAt: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      }, { merge: true });
      return res.status(200).json({ success: true, plan: 'free', message: 'Free plan activated' });
    } catch (err) {
      return res.status(500).json({ error: 'Firebase update failed: ' + err.message });
    }
  }

  // PAID PLANS — Stripe checkout
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY env var.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // Get existing Stripe customer ID from Firestore if available
    let customerId;
    try {
      initFirebase();
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        customerId = userDoc.data()?.stripeCustomerId;
      }
    } catch (e) {
      console.warn('Firebase read warning:', e.message);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ilyassagentai.vercel.app';

    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: selected.currency,
          product_data: {
            name: selected.name,
            description: selected.description,
          },
          unit_amount: selected.amount,
          recurring: { interval: selected.interval },
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { userId, plan },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: { userId, plan },
      },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url, sessionId: session.id, plan });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
