// IlyassAI — /api/chat  
// OpenRouter → Groq → Gemini — returns JSON {reply}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages = [] } = req.body || {};
  if (!messages || messages.length === 0)
    return res.status(400).json({ error: 'messages array is required' });

  const systemMsg = {
    role: 'system',
    content: 'You are IlyassAI, a powerful AI assistant. Be helpful, concise, and accurate.'
  };
  const fullMessages = [systemMsg, ...messages];
  const errors = [];

  // 1. Groq — try multiple models on 429
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
      'mixtral-8x7b-32768'
    ];
    for (const gModel of groqModels) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({ model: gModel, messages: fullMessages, max_tokens: 2048, temperature: 0.7 }),
          signal: AbortSignal.timeout(20000)
        });
        if (r.ok) {
          const data = await r.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) return res.status(200).json({ reply, model: gModel, provider: 'Groq' });
        }
        if (r.status !== 429) break; // only retry on rate limit
        errors.push(`Groq ${gModel}: 429 rate limit`);
      } catch (e) { errors.push(`Groq ${gModel}: ${e.message}`); break; }
    }
  }

  // 2. Gemini — use stable models
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const geminiModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
    for (const gModel of geminiModels) {
      try {
        const geminiMessages = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: geminiMessages,
              systemInstruction: { parts: [{ text: systemMsg.content }] },
              generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            }),
            signal: AbortSignal.timeout(20000)
          }
        );
        if (r.ok) {
          const data = await r.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return res.status(200).json({ reply, model: gModel, provider: 'Gemini' });
        }
        errors.push(`Gemini ${gModel}: HTTP ${r.status}`);
      } catch (e) { errors.push(`Gemini ${gModel}: ${e.message}`); }
    }
  }

  // 3. OpenRouter — try multiple free models
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    const orModels = [
      'google/gemma-3-27b-it:free',
      'microsoft/phi-3-mini-128k-instruct:free',
      'qwen/qwen-2-7b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free'
    ];
    for (const orModel of orModels) {
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orKey}`,
            'HTTP-Referer': 'https://my-webxyu.vercel.app',
            'X-Title': 'IlyassAI'
          },
          body: JSON.stringify({ model: orModel, messages: fullMessages, max_tokens: 2048 }),
          signal: AbortSignal.timeout(25000)
        });
        if (r.ok) {
          const data = await r.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) return res.status(200).json({ reply, model: orModel, provider: 'OpenRouter' });
        }
        if (r.status !== 429) break;
        errors.push(`OpenRouter ${orModel}: 429`);
      } catch (e) { errors.push(`OpenRouter ${orModel}: ${e.message}`); break; }
    }
  }

  return res.status(503).json({ error: 'All AI providers failed.', details: errors });
}
