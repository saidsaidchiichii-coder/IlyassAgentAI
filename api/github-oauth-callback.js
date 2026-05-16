// ============================================================
// api/github-oauth-callback.js
// GitHub OAuth callback — exchanges code for token, saves to Firebase
// ============================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app.js';
import { getFirestore } from 'firebase-admin/firestore.js';

// Init Firebase Admin (avoid re-init)
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GitHub redirects here with ?code=XXX&state=YYY
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/app?connector_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  // Parse state to get userId
  let userId;
  try {
    const parsed = JSON.parse(state);
    userId = parsed.userId;
  } catch {
    userId = state; // fallback: old format
  }

  if (!userId) {
    return res.redirect('/app?connector_error=missing_user');
  }

  try {
    // Exchange code for access token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenResp.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token error:', tokenData);
      return res.redirect('/app?connector_error=token_exchange_failed');
    }

    // Get GitHub user info
    const userResp = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    const githubUser = await userResp.json();

    // Save to Firebase
    await db.collection('users').doc(userId).set({
      connectors: {
        github: {
          connected: true,
          access_token: tokenData.access_token,
          token_type: tokenData.token_type || 'bearer',
          scope: tokenData.scope || '',
          github_username: githubUser.login,
          github_name: githubUser.name || githubUser.login,
          github_avatar: githubUser.avatar_url,
          connected_at: new Date().toISOString()
        }
      }
    }, { merge: true });

    // Redirect back to app with success
    return res.redirect('/app?connector_success=github');

  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect('/app?connector_error=server_error');
  }
}
