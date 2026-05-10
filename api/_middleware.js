import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

export async function verifyApiKey(req) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) return { error: 'API key required. Add x-api-key header.', status: 401 };

  try {
    initFirebase();
    const db   = getFirestore();
    const snap = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get();
    if (snap.empty) return { error: 'Invalid API key.', status: 401 };

    const userDoc  = snap.docs[0];
    const userData = userDoc.data();
    if ((userData.credits ?? 0) <= 0) {
      return { error: 'Insufficient credits. Buy more at https://my-webxyu.vercel.app/api-dashboard', status: 402 };
    }
    return { user: { id: userDoc.id, ...userData }, error: null };
  } catch (err) {
    console.error('verifyApiKey error:', err);
    return { error: 'Internal server error', status: 500 };
  }
}

export async function deductCredits(userId, amount = 1) {
  try {
    initFirebase();
    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      credits:  FieldValue.increment(-amount),
      apiCalls: FieldValue.increment(1),
    });
  } catch (err) {
    console.error('deductCredits error:', err);
  }
}
