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

// Default features for each plan
const DEFAULT_FEATURES = {
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    initFirebase();
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      // New user — default to free
      return res.status(200).json({
        plan: 'free',
        planStatus: 'active',
        planFeatures: DEFAULT_FEATURES.free,
      });
    }

    const data = userDoc.data();
    const plan = data.plan || 'free';
    const planStatus = data.planStatus || 'active';
    const planFeatures = data.planFeatures || DEFAULT_FEATURES[plan] || DEFAULT_FEATURES.free;

    return res.status(200).json({
      plan,
      planStatus,
      planFeatures,
      planActivatedAt: data.planActivatedAt || null,
      planCancelledAt: data.planCancelledAt || null,
      stripeCustomerId: data.stripeCustomerId || null,
      stripeSubscriptionId: data.stripeSubscriptionId || null,
      lastPayment: data.lastPayment || null,
      totalSpent: data.totalSpent || 0,
    });
  } catch (err) {
    console.error('subscription-status error:', err);
    return res.status(500).json({ error: err.message });
  }
}
