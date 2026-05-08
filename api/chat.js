// IlyassAI — /api/chat
// OpenRouter (primary) → Groq → Gemini fallback chain — returns JSON

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages = [], model = 'auto' } = req.body || {};
  if (!messages || messages.length === 0) return res.status(400).json({ error: 'messages array is required' });

  const systemPrompt = {
    role: 'system',
    content: `You are IlyassAI, a powerful autonomous AI agent. You are intelligent, proactive, and capable of complex multi-step reasoning.

You can:
- Search the web for real-time information
- Write, debug, and explain code in any language
- Analyze images and documents
- Generate creative content
- Solve complex problems step by step

Be concise, helpful, and accurate. Format responses with markdown when helpful.`
  };

  const fullMessages = [systemPrompt, ...messages];
  const errors = [];

  // ═══════════════════════════════════════════════
  // 1. OpenRouter (primary — 300+ free models)
  // ═══════════════════════════════════════════════
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const orModel = model === 'auto' ? 'meta-llama/llama-3.3-70b-instruct:free' : model;
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${orKey}`,
          'HTTP-Referer': 'https://my-webxyu.vercel.app',
          'X-Title': 'IlyassAI'
        },
        body: JSON.stringify({
          model: orModel,
          messages: fullMessages,
          max_tokens: 2048,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(25000)
      });

      if (orRes.ok) {
        const data = await orRes.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return res.status(200).json({ reply, model: orModel, provider: 'OpenRouter' });
        }
      }
      const errText = await orRes.text().catch(() => '');
      errors.push(`OpenRouter: HTTP ${orRes.status} — ${errText.slice(0, 100)}`);
    } catch (e) { errors.push(`OpenRouter: ${e.message}`); }
  } else {
    errors.push('OpenRouter: OPENROUTER_API_KEY not set');
  }

  // ═══════════════════════════════════════════════
  // 2. Groq (fast, free)
  // ═══════════════════════════════════════════════
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: fullMessages,
          max_tokens: 2048,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return res.status(200).json({ reply, model: 'llama-3.3-70b-versatile', provider: 'Groq' });
        }
      }
      const errText = await groqRes.text().catch(() => '');
      errors.push(`Groq: HTTP ${groqRes.status} — ${errText.slice(0, 100)}`);
    } catch (e) { errors.push(`Groq: ${e.message}`); }
  } else {
    errors.push('Groq: GROQ_API_KEY not set');
  }

  // ═══════════════════════════════════════════════
  // 3. Gemini (Google, free tier)
  // ═══════════════════════════════════════════════
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            systemInstruction: { parts: [{ text: systemPrompt.content }] },
            generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
          }),
          signal: AbortSignal.timeout(20000)
        }
      );

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return res.status(200).json({ reply, model: 'gemini-2.0-flash-exp', provider: 'Gemini' });
        }
      }
      const errText = await geminiRes.text().catch(() => '');
      errors.push(`Gemini: HTTP ${geminiRes.status} — ${errText.slice(0, 100)}`);
    } catch (e) { errors.push(`Gemini: ${e.message}`); }
  } else {
    errors.push('Gemini: GEMINI_API_KEY not set');
  }

  // All providers failed
  console.error('All AI providers failed:', errors.join(' | '));
  return res.status(503).json({
    error: 'All AI providers failed.',
    details: errors,
    fix: 'Add OPENROUTER_API_KEY at openrouter.ai/settings/keys (free account)'
  });
}
