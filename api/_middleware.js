import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

export async function verifyApiKey(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }

  const apiKey = authHeader.split(' ')[1];
  
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('apiKey', '==', apiKey).limit(1).get();

    if (snapshot.empty) {
      return { error: 'Invalid API key', status: 401 };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.credits <= 0) {
      return { error: 'Insufficient credits', status: 402 };
    }

    return { user: { id: userDoc.id, ...userData }, key: apiKey };
  } catch (error) {
    console.error('API Key verification error:', error);
    return { error: 'Internal server error', status: 500 };
  }
}

export async function deductCredits(userId, amount = 1) {
  const userRef = db.collection('users').doc(userId);
  await userRef.update({
    credits: admin.firestore.FieldValue.increment(-amount)
  });
}
