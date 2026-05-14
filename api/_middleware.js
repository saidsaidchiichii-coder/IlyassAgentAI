// ============================================================
// _middleware.js — Plan enforcement for all API routes
// ============================================================
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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

const PLAN_LIMITS = {
  free: {
    messagesPerDay: 100,
    imageGenPerDay: 0,
    allowedModels: ['gpt-3.5-turbo'],
    webSearch: false,
  },
  pro: {
    messagesPerDay: -1,
    imageGenPerDay: -1,
    allowedModels: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    webSearch: true,
  },
  custom: {
    messagesPerDay: -1,
    imageGenPerDay: -1,
    allowedModels: ['*'],
    webSearch: true,
  },
};

// Verify Firebase ID token from Authorization header
export async function verifyUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    initFirebase();
    const decoded = await getAuth().verifyIdToken(token);
    return decoded;
  } catch (e) {
    return null;
  }
}

// ✅ FIXED: Verify API Key from x-api-key header or Bearer token
export async function verifyApiKey(req) {
  try {
    const apiKey =
      req.headers['x-api-key'] ||
      req.headers['authorization']?.replace('Bearer ', '').trim();
    if (!apiKey) return { error: 'No API key provided', status: 401 };
    initFirebase();
    const db = getFirestore();
    const snapshot = await db
      .collection('apiKeys')
      .where('key', '==', apiKey)
      .where('active', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) return { error: 'Invalid or inactive API key', status: 401 };
    const keyDoc = snapshot.docs[0].data();
    return { user: { id: keyDoc.userId, plan: keyDoc.plan || 'free' } };
  } catch (e) {
    return { error: 'Authentication failed: ' + e.message, status: 500 };
  }
}

// ✅ FIXED: Deduct credits from user account
export async function deductCredits(userId, amount = 1) {
  try {
    initFirebase();
    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      credits: FieldValue.increment(-amount),
      lastUsed: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Credit deduction failed:', e.message);
  }
}

// Get user plan data from Firestore
export async function getUserPlan(userId) {
  try {
    initFirebase();
    const db = getFirestore();
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return { plan: 'free', ...PLAN_LIMITS.free };
    const data = doc.data();
    const plan = data.plan || 'free';
    return { plan, ...(PLAN_LIMITS[plan] || PLAN_LIMITS.free), ...data.planFeatures };
  } catch (e) {
    return { plan: 'free', ...PLAN_LIMITS.free };
  }
}

// Check and increment message count (for free plan limits)
export async function checkMessageLimit(userId, plan) {
  if (plan !== 'free') return { allowed: true };
  try {
    initFirebase();
    const db = getFirestore();
    const today = new Date().toISOString().split('T')[0];
    const usageRef = db.collection('usage').doc(`${userId}_${today}`);
    const usageDoc = await usageRef.get();
    const current = usageDoc.exists ? (usageDoc.data().messages || 0) : 0;
    if (current >= 100) {
      return {
        allowed: false,
        reason: 'Daily message limit reached (100/day on Free). Upgrade to Pro for unlimited messages.',
      };
    }
    await usageRef.set(
      { messages: FieldValue.increment(1), userId, date: today },
      { merge: true }
    );
    return { allowed: true, remaining: 100 - current - 1 };
  } catch (e) {
    return { allowed: true };
  }
}

// Check image generation limit
export async function checkImageLimit(userId, plan) {
  if (plan !== 'free') return { allowed: true };
  return {
    allowed: false,
    reason: 'Image generation is not available on the Free plan. Upgrade to Pro.',
  };
}

// Check if model is allowed for plan
export function checkModelAccess(model, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  if (limits.allowedModels.includes('*')) return { allowed: true };
  if (limits.allowedModels.includes(model)) return { allowed: true };
  return {
    allowed: false,
    reason: `Model "${model}" requires Pro or higher. Your plan: ${plan}. Upgrade at /pricing.`,
  };
}

export { PLAN_LIMITS };
