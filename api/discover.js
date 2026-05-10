// IlyassAI — /api/discover (Edge Function — not counted in 12-function limit)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  const groqKey   = process.env.GROQ_API_KEY;
  const hfKey     = process.env.HF_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const apiSources = [
    { name: 'Groq',         type: 'llm',    models: ['llama-3.3-70b-versatile', 'gemma2-9b-it'], endpoint: 'https://api.groq.com/openai/v1/models', auth: groqKey ? `Bearer ${groqKey}` : null },
    { name: 'HuggingFace',  type: 'llm',    models: ['Meta-Llama-3-8B', 'Qwen2.5-72B'],          endpoint: 'https://huggingface.co/api/models?limit=3', auth: hfKey ? `Bearer ${hfKey}` : null },
    { name: 'Pollinations', type: 'image',  models: ['flux', 'turbo'],                            endpoint: 'https://image.pollinations.ai/models', auth: null },
    ...(geminiKey ? [{ name: 'Gemini', type: 'llm', models: ['gemini-1.5-flash'], endpoint: `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, auth: null }] : []),
  ];

  const now = new Date().toISOString();
  const results = [];

  for (const source of apiSources) {
    const start = Date.now();
    let status = 'unknown', latency = null;
    try {
      const headers = source.auth ? { Authorization: source.auth } : {};
      const r = await fetch(source.endpoint, { headers, signal: AbortSignal.timeout(4000) });
      latency = Date.now() - start;
      status  = r.ok ? 'online' : 'error';
    } catch (e) {
      status  = 'offline';
      latency = Date.now() - start;
    }
    results.push({ name: source.name, type: source.type, models: source.models, status, latency, checkedAt: now });
  }

  results.sort((a, b) => (b.status === 'online' ? 1 : 0) - (a.status === 'online' ? 1 : 0));
  const online = results.filter(r => r.status === 'online').length;

  return new Response(JSON.stringify({
    success: true, discoveredAt: now,
    summary: { total: results.length, online, offline: results.length - online },
    apis: results
  }), { status: 200, headers: corsHeaders });
}
