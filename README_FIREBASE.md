# Firebase Setup for IlyassAI

To make the API Key system work, you need to add these environment variables to your Vercel project:

### 1. Firebase Admin Credentials
These are required for the backend to verify API keys and manage credits.

- `FIREBASE_PROJECT_ID`: `ilyassagentai`
- `FIREBASE_CLIENT_EMAIL`: `firebase-adminsdk-fbsvc@ilyassagentai.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_KEY`: (Copy the private key from the JSON you provided, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts. Make sure to handle newlines correctly in Vercel settings).

### 2. AI Provider Keys (Free Tiers)
- `GROQ_API_KEY`: Your Groq API Key
- `GEMINI_API_KEY`: Your Google Gemini API Key
- `OPENROUTER_API_KEY`: Your OpenRouter API Key (for free models)

### 3. Database Structure
The system will automatically create a `users` collection in Firestore with the following structure for each user:
```json
{
  "apiKey": "sk_live_...",
  "email": "user@example.com",
  "credits": 1000,
  "createdAt": "2024-05-10T..."
}
```

### 4. Web Config
Make sure to update the `firebaseConfig` in `firebase.js` with your actual Web App credentials from the Firebase Console (Project Settings > General > Your apps).
