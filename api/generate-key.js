import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

// Init Firebase (مرة وحدة فقط)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // غير POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // 🔑 Generate API Key
    const apiKey = "key_" + uuidv4();

    // 💾 Save in Firebase
    await db.collection("apiKeys").doc(apiKey).set({
      key: apiKey,
      createdAt: Date.now(),
      usage: 0,
      active: true,
    });

    // 📤 Return to frontend
    return res.status(200).json({
      success: true,
      apiKey,
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
}
