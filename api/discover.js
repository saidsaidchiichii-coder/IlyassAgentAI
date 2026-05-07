// IlyassAI — /api/discover
// Self-improvement engine: auto-discovers and evaluates new free AI APIs

export default async function handler(req, res) {
  // ── CORS preflight ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const hfKey = process.env.HF_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Fixed: only include Gemini endpoint when the key is actually set (avoid 'undefined' in URL)
  const apiSources = [
    {
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/models',
      authHeader: groqKey ? `Bearer ${groqKey}` : null,
      type: 'llm',
      models: ['llama-3.3-70b-versatile', 'gemma2-9b-it', 'mixtral-8x7b-32768', 'deepseek-r1-distill-llama-70b']
    },
    {
      name: 'HuggingFace',
      endpoint: 'https://huggingface.co/api/models?filter=text-generation&sort=downloads&limit=5',
      authHeader: hfKey ? `Bearer ${hfKey}` : null,
      type: 'llm',
      models: ['Meta-Llama-3-8B-Instruct', 'Qwen2.5-72B-Instruct', 'phi-3.5-mini-instruct']
    },
    // Fixed: only add Gemini entry when key is present
    ...(geminiKey ? [{
      name: 'Google Gemini',
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
      type: 'llm',
      models: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro']
    }] : []),
    {
      name: 'Pollinations.ai',
      endpoint: 'https://image.pollinations.ai/models',
      type: 'image',
      models: ['flux', 'turbo', 'flux-realism']
    },
    {
      name: 'DuckDuckGo Search',
      endpoint: 'https://duckduckgo.com/',
      type: 'search',
      models: ['instant-answers', 'web-search']
    }
  ];

  const results = [];
  const now = new Date().toISOString();

  for (const source of apiSources) {
    const result = {
      name: source.name,
      type: source.type,
      models: source.models,
      status: 'unknown',
      latency: null,
      checkedAt: now
    };

    const start = Date.now();
    try {
      const headers = {};
      if (source.authHeader) {
        headers['Authorization'] = source.authHeader;
      }

      const r = await fetch(source.endpoint, { 
        headers, 
        signal: AbortSignal.timeout(4000)
      });
      
      result.latency = Date.now() - start;
      result.status = r.ok ? 'online' : 'error';
      result.httpStatus = r.status;

      if (r.ok && source.name === 'Groq') {
        try {
          const data = await r.json();
          if (data.data) {
            result.discoveredModels = data.data.map(m => m.id);
          }
        } catch {}
      }

    } catch (e) {
      result.status = 'offline';
      result.error = e.message;
      result.latency = Date.now() - start;
    }

    results.push(result);
  }

  // Sort: online first, then by latency
  results.sort((a, b) => {
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (b.status === 'online' && a.status !== 'online') return 1;
    return (a.latency || 9999) - (b.latency || 9999);
  });

  const onlineCount = results.filter(r => r.status === 'online').length;
  const totalModels = results.reduce((sum, r) => sum + (r.models?.length || 0), 0);

  return res.status(200).json({
    success: true,
    discoveredAt: now,
    summary: {
      total: results.length,
      online: onlineCount,
      offline: results.length - onlineCount,
      totalModels,
      recommendation: results.find(r => r.status === 'online' && r.type === 'llm')?.name || 'None available'
    },
    apis: results,
    nextCheckIn: '1 hour'
  });
}
