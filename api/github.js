// api/github.js — GitHub OAuth + AI GitHub Tool for IlyassAI
// Handles: /api/github?action=auth | callback | repos | files | ai-github

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'auth';

  if (action === 'auth') return handleAuth(req, res);
  if (action === 'callback') return handleCallback(req, res);
  if (action === 'repos') return handleRepos(req, res);
  if (action === 'ai-github') return handleAIGitHub(req, res);

  return res.status(400).json({ error: 'Unknown action. Use ?action=auth|callback|repos|ai-github' });
}

// ─── STEP 1: Redirect user to GitHub OAuth ───────────────────────────────────
function handleAuth(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'GITHUB_CLIENT_ID not set' });

  const redirectUri = process.env.GITHUB_REDIRECT_URI || 
    'https://my-webxyu.vercel.app/api/github?action=callback';

  const scope = 'repo read:user';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

  return res.redirect(githubAuthUrl);
}

// ─── STEP 2: GitHub redirects back with code → exchange for token ─────────────
async function handleCallback(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) return res.status(400).json({ error: 'Failed to get access token', details: tokenData });

    // Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    const userData = await userRes.json();

    // Redirect back to frontend with token and username
    const frontendUrl = `https://my-webxyu.vercel.app/?github_token=${accessToken}&github_user=${userData.login}&github_avatar=${encodeURIComponent(userData.avatar_url || '')}`;
    return res.redirect(frontendUrl);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── STEP 3: List repos using stored token ───────────────────────────────────
async function handleRepos(req, res) {
  const token = req.headers['x-github-token'] || req.query.token;
  if (!token) return res.status(401).json({ error: 'No GitHub token. Connect GitHub first.' });

  try {
    const r = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!r.ok) return res.status(r.status).json({ error: 'GitHub API error', status: r.status });

    const repos = await r.json();
    const simplified = repos.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      private: repo.private,
      updated_at: repo.updated_at,
      url: repo.html_url
    }));

    return res.status(200).json({ success: true, count: simplified.length, repos: simplified });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── STEP 4: AI talks to GitHub (the main feature!) ─────────────────────────
async function handleAIGitHub(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { message, github_token } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message is required' });
  if (!github_token) return res.status(401).json({ error: 'github_token is required. Connect GitHub first.' });

  try {
    // 1. Fetch user's repos to give AI context
    const reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
      headers: { 'Authorization': `Bearer ${github_token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const repos = await reposRes.json();
    
    const repoList = Array.isArray(repos) 
      ? repos.map(r => `- ${r.name} (${r.language || 'Unknown'}) — ${r.description || 'No description'} | Stars: ${r.stargazers_count} | ${r.private ? 'Private' : 'Public'}`).join('\n')
      : 'Could not fetch repos';

    // Get GitHub username
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${github_token}` }
    });
    const userData = await userRes.json();

    // 2. Build system prompt with GitHub context
    const systemPrompt = `You are IlyassAI, a smart personal assistant with access to the user's GitHub account.

GitHub User: ${userData.login || 'Unknown'}
GitHub Name: ${userData.name || 'Unknown'}
Public Repos: ${userData.public_repos || 0}
Followers: ${userData.followers || 0}

USER'S REPOSITORIES (${Array.isArray(repos) ? repos.length : 0} repos):
${repoList}

RULES:
1. Answer questions about the user's GitHub repos using the data above
2. If asked "what repos do I have?", list them clearly
3. If asked about a specific repo, provide details from the list
4. If the user asks to do something (create file, open issue, etc.), say you can help but need more details
5. Always be helpful and specific about their actual repos
6. Never mention Groq, OpenAI or any AI provider
7. Respond in the same language the user uses`;

    // 3. Call Groq AI
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}` 
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1024,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      return res.status(500).json({ error: 'AI error', details: err });
    }

    const groqData = await groqRes.json();
    const reply = groqData.choices?.[0]?.message?.content;

    return res.status(200).json({ 
      success: true, 
      reply,
      github_user: userData.login,
      repos_count: Array.isArray(repos) ? repos.length : 0
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
