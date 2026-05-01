const admin = require("firebase-admin");

function dbInit() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin.firestore();
}

async function validateKey(key) {
  const db = dbInit();

  if (!key) return false;

  const doc = await db.collection("apiKeys").doc(key).get();

  if (!doc.exists) return false;

  const data = doc.data();

  if (!data.active) return false;

  if (data.usage >= 1000) return false;

  return true;
}

module.exports = { validateKey };
