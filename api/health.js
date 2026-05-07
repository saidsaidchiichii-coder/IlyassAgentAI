// IlyassAI — /api/health
// Diagnostic endpoint: verify which API keys are configured and working

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const hfKey     = process.env.HF_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const braveKey  = process.env.BRAVE_API_KEY;
  const kvUrl     = process.env.KV_REST_API_URL;

  const checks = {};

  // ── Test Groq ──
  if (groqKey) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` },
        signal: AbortSignal.timeout(5000)
      });
      const body = await r.json().catch(() => ({}));
      checks.groq = r.ok
        ? { status: 'ok', models: (body.data || []).map(m => m.id).slice(0, 5) }
        : { status: 'error', code: r.status, message: body.error?.message || 'Unknown error' };
    } catch (e) {
      checks.groq = { status: 'error', message: e.message };
    }
  } else {
    checks.groq = { status: 'missing', message: 'GROQ_API_KEY not set in Vercel env vars', fix: 'Get free key at console.groq.com' };
  }

  // ── Test Gemini ──
  if (geminiKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      checks.gemini = r.ok
        ? { status: 'ok' }
        : { status: 'error', code: r.status };
    } catch (e) {
      checks.gemini = { status: 'error', message: e.message };
    }
  } else {
    checks.gemini = { status: 'missing', message: 'GEMINI_API_KEY not set', fix: 'Get free key at aistudio.google.com' };
  }

  // ── Test HuggingFace ──
  checks.huggingface = hfKey
    ? { status: 'configured', note: 'Key present (not tested to save quota)' }
    : { status: 'missing', message: 'HF_API_KEY not set', fix: 'Get free key at huggingface.co/settings/tokens' };

  // ── Test OpenAI ──
  checks.openai = openaiKey
    ? { status: 'configured', note: 'Key present (not tested to save credits)' }
    : { status: 'missing', message: 'OPENAI_API_KEY not set (optional)' };

  // ── Test Brave Search ──
  checks.brave_search = braveKey
    ? { status: 'configured' }
    : { status: 'missing', message: 'BRAVE_API_KEY not set (optional — DuckDuckGo used as fallback)' };

  // ── Check KV for memory ──
  checks.memory_kv = kvUrl
    ? { status: 'configured', note: 'Vercel KV connected — memories persist across sessions' }
    : { status: 'missing', message: 'KV_REST_API_URL not set — memories reset on cold start', fix: 'Add Vercel KV Storage in your project dashboard' };

  // Overall status
  const hasLLM = checks.groq?.status === 'ok' || checks.gemini?.status === 'ok' || checks.openai?.status === 'configured';

  return res.status(200).json({
    status: hasLLM ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      chat_working: checks.groq?.status === 'ok',
      llm_available: hasLLM,
      search_available: !!(braveKey),
      memory_persistent: !!kvUrl,
      recommendation: checks.groq?.status !== 'ok'
        ? '⚠️ Add GROQ_API_KEY to Vercel env vars for best performance (free at console.groq.com)'
        : '✅ All core features ready'
    }
  });
}
