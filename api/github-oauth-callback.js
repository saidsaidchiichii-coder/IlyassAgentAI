// ============================================================
// api/github-oauth-callback.js
// Real GitHub OAuth callback handler with Firebase integration
// ============================================================

import { initializeApp, cert } from 'firebase-admin/app.js';
import { getFirestore } from 'firebase-admin/firestore.js';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.body;

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: 'Ov23lirMXFp5nCzBIGLz',
        client_secret: 'e81d6da171e521447fb2a65b6786fd529d683b6c',
        code: code,
        redirect_uri: `https://my-webxyu.vercel.app/app?github_callback=true`
      })
    });

    if (!tokenResponse.ok) {
      return res.status(400).json({ error: 'Failed to exchange code for token' });
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || 'OAuth error' });
    }

    const accessToken = tokenData.access_token;

    // Fetch user data from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch user data' });
    }

    const userData = await userResponse.json();

    // Fetch user repos count
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let reposCount = 0;
    if (reposResponse.ok) {
      const linkHeader = reposResponse.headers.get('link');
      if (linkHeader) {
        const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
        reposCount = match ? parseInt(match[1]) : 1;
      } else {
        reposCount = 1;
      }
    }

    // Save to Firebase
    const userId = state; // state is the user ID
    await db.collection('users').doc(userId).set({
      github: {
        token: accessToken,
        username: userData.login,
        name: userData.name,
        avatar: userData.avatar_url,
        repos_count: reposCount,
        profile_url: userData.html_url,
        bio: userData.bio,
        company: userData.company,
        location: userData.location,
        email: userData.email,
        public_repos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        connected_at: new Date().toISOString()
      }
    }, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'GitHub connected successfully',
      user: {
        username: userData.login,
        name: userData.name,
        avatar: userData.avatar_url,
        repos_count: reposCount
      }
    });

  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
