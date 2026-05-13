// api/github.js — GitHub AI Tool for IlyassAI
// Uses GH_TOKEN from Vercel env to give AI access to GitHub
// Actions: ?action=repos | ai-github | files

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'repos';

  if (action === 'repos')      return handleRepos(req, res);
  if (action === 'ai-github')  return handleAIGitHub(req, res);
  if (action === 'files')      return handleFiles(req, res);

  return res.status(400).json({ error: 'Use ?action=repos|ai-github|files' });
}

// ─── Get list of repos ───────────────────────────────────────────────────────
async function handleRepos(req, res) {
  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });

  try {
    const r = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!r.ok) return res.status(r.status).json({ error: 'GitHub API error' });

    const repos = await r.json();
    const simplified = repos.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || 'No description',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      private: repo.private,
      updated_at: repo.updated_at,
      url: repo.html_url,
      size: repo.size
    }));

    return res.status(200).json({ success: true, count: simplified.length, repos: simplified });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Get files from a specific repo ─────────────────────────────────────────
async function handleFiles(req, res) {
  const token = process.env.GH_TOKEN;
  const { repo, path } = req.query;
  if (!repo) return res.status(400).json({ error: 'repo parameter required' });

  try {
    const apiPath = path ? `contents/${path}` : 'contents';
    const r = await fetch(`https://api.github.com/repos/${repo}/${apiPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!r.ok) return res.status(r.status).json({ error: 'GitHub API error' });
    const data = await r.json();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── AI talks to GitHub ──────────────────────────────────────────────────────
async function handleAIGitHub(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { message, messages } = req.body || {};
  if (!message && !messages) return res.status(400).json({ error: 'message required' });

  const token = process.env.GH_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;

  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  try {
    // 1. Fetch repos for context
    const [reposRes, userRes] = await Promise.all([
      fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      }),
      fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    const repos = await reposRes.json();
    const userData = await userRes.json();

    const repoList = Array.isArray(repos)
      ? repos.map(r => `• ${r.name} [${r.language || 'Unknown'}] — ${r.description || 'No description'} | ⭐${r.stargazers_count} | ${r.private ? '🔒 Private' : '🌍 Public'} | Updated: ${new Date(r.updated_at).toLocaleDateString()}`).join('\n')
      : 'Could not fetch repos';

    // 2. System prompt with full GitHub context
    const systemPrompt = `You are IlyassAI, a smart assistant with direct access to the user's GitHub account.

GITHUB ACCOUNT:
👤 Username: ${userData.login || 'Unknown'}
📛 Name: ${userData.name || 'Unknown'}  
📁 Public Repos: ${userData.public_repos || 0}
👥 Followers: ${userData.followers || 0}
⭐ Following: ${userData.following || 0}
🌍 Location: ${userData.location || 'Unknown'}
🔗 Profile: https://github.com/${userData.login}

REPOSITORIES (${Array.isArray(repos) ? repos.length : 0} total):
${repoList}

YOUR CAPABILITIES:
- Answer questions about repos, languages, stats
- Help analyze code structure
- Suggest improvements
- Explain what each project does

RULES:
1. Use the GitHub data above to answer accurately
2. If asked "what repos do I have?" → list them clearly with details
3. Be specific, helpful, and concise
4. Respond in the same language as the user
5. Never mention Groq, GitHub tokens, or internal implementation`;

    // 3. Build messages array
    let chatMessages;
    if (messages && Array.isArray(messages)) {
      chatMessages = messages;
    } else {
      chatMessages = [{ role: 'user', content: message }];
    }

    // 4. Call Groq
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
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
