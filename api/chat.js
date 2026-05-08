// IlyassAI — /api/chat
// Returns JSON: { reply: "..." } for text, or { type: "image", imageUrl: "..." } for images
// Frontend expects: res.json() → data.reply OR data.message

export default async function handler(req, res) {
  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, messages = [], mode = 'auto', files = [] } = req.body || {};
  const userText = message || (messages.at?.(-1)?.content) || '';

  if (!userText) return res.status(400).json({ error: 'message is required' });

  // ── IMAGE MODE ──
  if (mode === 'image') {
    try {
      const prompt = encodeURIComponent(userText.slice(0, 500));
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?model=flux&width=1024&height=1024&nologo=true&enhance=true`;
      // Verify image is reachable (quick HEAD check)
      const check = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).catch(() => null);
      return res.status(200).json({ type: 'image', imageUrl, prompt: userText });
    } catch (e) {
      return res.status(200).json({ reply: 'Image generation failed. Try again.' });
    }
  }

  // ── Build conversation history ──
  const history = Array.isArray(messages) && messages.length > 0
    ? messages
    : [{ role: 'user', content: userText }];

  const systemPrompt = `You are IlyassAI, a powerful and intelligent AI assistant. 
You help users with coding, analysis, writing, research, math, and any question they have.
Be concise, helpful, and precise. Use markdown formatting when appropriate.`;

  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...history.filter(m => m.role && m.content)
  ];

  // ── Helper: call LLM and return text ──
  async function callGroq(modelId) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not set');
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: modelId, messages: allMessages, max_tokens: 4096, temperature: 0.7 }),
      signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) {
      const err = await r.text().catch(() => r.status.toString());
      throw new Error(`Groq ${modelId}: HTTP ${r.status} — ${err.slice(0, 120)}`);
    }
    const d = await r.json();
    return d.choices?.[0]?.message?.content || '';
  }

  async function callOpenRouter(modelId) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY not set');
    const referer = req.headers.host ? `https://${req.headers.host}` : 'https://ilyassagentai.vercel.app';
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': referer,
        'X-Title': 'IlyassAI'
      },
      body: JSON.stringify({ model: modelId, messages: allMessages, max_tokens: 4096, temperature: 0.7 }),
      signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) {
      const err = await r.text().catch(() => r.status.toString());
      throw new Error(`OpenRouter ${modelId}: HTTP ${r.status} — ${err.slice(0, 120)}`);
    }
    const d = await r.json();
    return d.choices?.[0]?.message?.content || '';
  }

  async function callGemini() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    const gemMsgs = allMessages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    // FIX: Updated from gemini-1.5-flash (deprecated) to gemini-2.0-flash
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: gemMsgs,
          generationConfig: { maxOutputTokens: 4096 }
        }),
        signal: AbortSignal.timeout(25000)
      }
    );
    if (!r.ok) {
      const err = await r.text().catch(() => r.status.toString());
      throw new Error(`Gemini: HTTP ${r.status} — ${err.slice(0, 120)}`);
    }
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // ── Provider fallback chain ──
  const errors = [];

  // 1. Groq (fastest, free)
  // FIX: Removed deprecated 'mixtral-8x7b-32768', updated model list
  for (const model of ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'gemma2-9b-it', 'llama-3.1-8b-instant']) {
    try {
      const reply = await callGroq(model);
      if (reply) return res.status(200).json({ reply, provider: `Groq/${model}` });
    } catch (e) {
      errors.push(e.message);
      if (e.message.includes('401')) break; // Bad key — stop trying Groq
    }
  }

  // 2. OpenRouter (free models)
  for (const model of [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'mistralai/mistral-7b-instruct:free'
  ]) {
    try {
      const reply = await callOpenRouter(model);
      if (reply) return res.status(200).json({ reply, provider: `OpenRouter/${model}` });
    } catch (e) {
      errors.push(e.message);
      if (e.message.includes('401')) break;
    }
  }

  // 3. Gemini (free)
  try {
    const reply = await callGemini();
    if (reply) return res.status(200).json({ reply, provider: 'Gemini' });
  } catch (e) {
    errors.push(e.message);
  }

  // All failed
  console.error('All providers failed:', errors.join(' | '));
  return res.status(503).json({
    error: 'All AI providers failed',
    reply: '⚠️ AI service unavailable. Please check your API keys in Vercel environment variables (GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY).',
    details: errors
  });
}
