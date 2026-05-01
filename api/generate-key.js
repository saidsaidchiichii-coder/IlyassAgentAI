import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

function initFirebase() {
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

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const db = initFirebase(); // 🔥 مهم

    const apiKey = "key_" + uuidv4();

    await db.collection("apiKeys").doc(apiKey).set({
      key: apiKey,
      createdAt: Date.now(),
      usage: 0,
      active: true,
    });

    return res.status(200).json({
      success: true,
      apiKey,
    });

  } catch (err) {
    console.error("FIREBASE ERROR:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
}
