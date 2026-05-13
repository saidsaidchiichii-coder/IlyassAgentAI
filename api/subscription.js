// ============================================================
// api/subscription.js — MERGED: status + cancel + billing-portal
// Route via ?action=status | cancel | portal
// ============================================================
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

const DEFAULT_FEATURES = {
  free: { messagesPerDay: 100, models: ['gpt-3.5-turbo'], imageGenPerDay: 0, webSearch: false, memoryPersistence: false, priorityRouting: false, ownApiKey: false },
  pro: { messagesPerDay: -1, models: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4-turbo', 'gpt-3.5-turbo'], imageGenPerDay: -1, webSearch: true, memoryPersistence: true, priorityRouting: true, ownApiKey: false },
  custom: { messagesPerDay: -1, models: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4-turbo', 'gpt-3.5-turbo', 'custom'], imageGenPerDay: -1, webSearch: true, memoryPersistence: true, priorityRouting: true, ownApiKey: true },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.method === 'GET' ? 'status' : 'cancel');

  // ── GET STATUS ──────────────────────────────────────────────
  if (action === 'status') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    try {
      initFirebase();
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(200).json({ plan: 'free', planStatus: 'active', planFeatures: DEFAULT_FEATURES.free });
      }
      const data = userDoc.data();
      const plan = data.plan || 'free';
      return res.status(200).json({
        plan,
        planStatus: data.planStatus || 'active',
        planFeatures: data.planFeatures || DEFAULT_FEATURES[plan] || DEFAULT_FEATURES.free,
        planActivatedAt: data.planActivatedAt || null,
        stripeCustomerId: data.stripeCustomerId || null,
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        lastPayment: data.lastPayment || null,
        totalSpent: data.totalSpent || 0,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── CANCEL ─────────────────────────────────────────────────
  if (action === 'cancel') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe not configured' });
    try {
      initFirebase();
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      const subscriptionId = userDoc.data()?.stripeSubscriptionId;
      if (!subscriptionId) return res.status(400).json({ error: 'No active subscription' });
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const subscription = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
      await db.collection('users').doc(userId).update({
        planStatus: 'cancelling',
        cancelAt: new Date(subscription.cancel_at * 1000).toISOString(),
      });
      return res.status(200).json({ success: true, cancelAt: new Date(subscription.cancel_at * 1000).toISOString() });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── BILLING PORTAL ─────────────────────────────────────────
  if (action === 'portal') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe not configured' });
    try {
      initFirebase();
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      const customerId = userDoc.data()?.stripeCustomerId;
      if (!customerId) return res.status(400).json({ error: 'No Stripe customer found' });
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://my-webxyu.vercel.app'}/app`,
      });
      return res.status(200).json({ url: session.url });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action. Use ?action=status|cancel|portal' });
}
