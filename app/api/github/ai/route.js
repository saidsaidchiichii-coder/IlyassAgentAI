import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, messages, github_token } = body;

    const token = github_token || process.env.GH_TOKEN;
    const groqKey = process.env.GROQ_API_KEY;

    if (!token)   return NextResponse.json({ error: 'GitHub token missing' }, { status: 401 });
    if (!groqKey) return NextResponse.json({ error: 'GROQ_API_KEY missing' },  { status: 500 });
    if (!message && !messages) return NextResponse.json({ error: 'message required' }, { status: 400 });

    // Fetch GitHub data in parallel
    const [reposRes, userRes] = await Promise.all([
      fetch('https://api.github.com/user/repos?sort=updated&per_page=50&type=all', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      }),
      fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const [repos, userData] = await Promise.all([reposRes.json(), userRes.json()]);

    const repoList = Array.isArray(repos)
      ? repos
          .map(
            r =>
              `• ${r.name} [${r.language || 'Unknown'}] — ${r.description || 'No description'} | ⭐${r.stargazers_count} | ${r.private ? '🔒 Private' : '🌍 Public'} | Updated: ${new Date(r.updated_at).toLocaleDateString()}`
          )
          .join('\n')
      : 'Could not fetch repos';

    const systemPrompt = `You are IlyassAI, a smart assistant with LIVE access to the user's GitHub account.

GITHUB PROFILE:
👤 Username  : ${userData.login  || 'Unknown'}
📛 Name      : ${userData.name   || 'Unknown'}
📁 Repos     : ${userData.public_repos || 0} public
👥 Followers : ${userData.followers || 0}
🔗 Profile   : https://github.com/${userData.login}

REPOSITORIES (${Array.isArray(repos) ? repos.length : 0} loaded):
${repoList}

RULES:
1. Use ONLY the real data above — never invent repos
2. Respond in the same language the user uses
3. Be direct, helpful, and concise
4. Never mention Groq, tokens, or any internal API`;

    const chatHistory = messages && Array.isArray(messages)
      ? messages
      : [{ role: 'user', content: message }];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      return NextResponse.json({ error: 'AI error', details: err }, { status: 500 });
    }

    const groqData = await groqRes.json();
    const reply = groqData.choices?.[0]?.message?.content;

    return NextResponse.json({
      success: true,
      reply,
      github_user: userData.login,
      repos_count: Array.isArray(repos) ? repos.length : 0,
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
