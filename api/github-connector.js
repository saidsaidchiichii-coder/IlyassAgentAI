// api/github-connector.js — Real GitHub OAuth Connector System
// Handles GitHub OAuth flow, token exchange, and secure storage in Firebase

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'status';

  if (action === 'callback')  return handleCallback(req, res);
  if (action === 'status')    return handleStatus(req, res);
  if (action === 'disconnect') return handleDisconnect(req, res);
  if (action === 'repos')     return handleRepos(req, res);

  return res.status(400).json({ error: 'Use ?action=callback|status|disconnect|repos' });
}

// ─── Handle GitHub OAuth Callback ───────────────────────────────────────────
async function handleCallback(req, res) {
  const { code, state, userId } = req.query;
  
  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or userId' });
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.VERCEL_URL || 'https://my-webxyu.vercel.app'}/api/github-connector?action=callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('[GitHub Connector] No token:', tokenData);
      return res.status(400).json({ error: 'Failed to get access token', details: tokenData });
    }

    // Fetch GitHub user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });
    const githubUser = await userRes.json();

    // Fetch repos count
    const reposRes = await fetch('https://api.github.com/user/repos?per_page=1', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });
    const reposLink = reposRes.headers.get('link');
    let reposCount = 0;
    if (reposLink) {
      const match = reposLink.match(/&page=(\d+)>; rel="last"/);
      reposCount = match ? parseInt(match[1]) : 1;
    }

    // Store token securely in Firebase
    initFirebase();
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    
    await userRef.set({
      github: {
        token: tokenData.access_token,
        username: githubUser.login,
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        repos_count: githubUser.public_repos || reposCount,
        connected_at: FieldValue.serverTimestamp(),
        scope: tokenData.scope || 'repo read:user user:email',
      }
    }, { merge: true });

    // Return success with user info
    return res.status(200).json({
      success: true,
      github_token: tokenData.access_token,
      github_user: githubUser.login,
      github_name: githubUser.name || githubUser.login,
      github_avatar: githubUser.avatar_url,
      github_repos: githubUser.public_repos || reposCount,
    });

  } catch (err) {
    console.error('[GitHub Connector] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Get GitHub Connection Status ───────────────────────────────────────────
async function handleStatus(req, res) {
  const userId = req.headers['x-user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    initFirebase();
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists || !userDoc.data().github) {
      return res.status(200).json({
        connected: false,
        message: 'GitHub not connected',
      });
    }

    const github = userDoc.data().github;
    return res.status(200).json({
      connected: true,
      username: github.username,
      name: github.name,
      avatar: github.avatar,
      repos_count: github.repos_count,
      connected_at: github.connected_at,
    });

  } catch (err) {
    console.error('[GitHub Status] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Disconnect GitHub ──────────────────────────────────────────────────────
async function handleDisconnect(req, res) {
  const userId = req.headers['x-user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    initFirebase();
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    
    await userRef.set({
      github: FieldValue.delete(),
    }, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'GitHub disconnected',
    });

  } catch (err) {
    console.error('[GitHub Disconnect] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Get User's GitHub Repos ───────────────────────────────────────────────
async function handleRepos(req, res) {
  const userId = req.headers['x-user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    initFirebase();
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists || !userDoc.data().github) {
      return res.status(401).json({ error: 'GitHub not connected' });
    }

    const token = userDoc.data().github.token;

    // Fetch repos from GitHub
    const reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!reposRes.ok) {
      return res.status(reposRes.status).json({ error: 'GitHub API error' });
    }

    const repos = await reposRes.json();
    const simplified = repos.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || 'No description',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      private: repo.private,
      updated_at: repo.updated_at,
      url: repo.html_url,
    }));

    return res.status(200).json({
      success: true,
      count: simplified.length,
      repos: simplified,
    });

  } catch (err) {
    console.error('[GitHub Repos] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
