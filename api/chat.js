// IlyassAI — /api/chat
// DUAL MODE:
//   Internal (no x-api-key): works for the website's own UI
//   External (x-api-key present): verify key + deduct credits

import { verifyApiKey, deductCredits } from './_middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // Detect external API call
  const isExternal = !!(req.headers['x-api-key'] ||
    (req.headers['authorization'] && !req.headers['authorization'].includes('Bearer undefined')));
  let userId = null;

  if (isExternal) {
    const { user, error, status } = await verifyApiKey(req);
    if (error) return res.status(status).json({ error });
    userId = user.id;
  }

  let messages;
  if (body.messages && Array.isArray(body.messages)) {
    messages = body.messages;
  } else if (body.message) {
    messages = [{ role: 'user', content: body.message }];
  } else {
    return res.status(400).json({ error: 'message or messages array is required' });
  }

  const mode = body.mode || 'auto';
  const systemMsg = {
    role: 'system',
    content: `You are IlyassAI, a powerful AI assistant. Be helpful, concise, and accurate. Current mode: ${mode}.`
  };
  const fullMessages = [systemMsg, ...messages];
  const errors = [];

  // 1. Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768'];
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
          if (reply) {
            if (isExternal && userId) await deductCredits(userId, 1);
            return res.status(200).json({ reply, model: gModel, provider: 'Groq', success: true });
          }
        }
        errors.push(`Groq/${gModel}: ${r.status}`);
        if (r.status !== 429) break;
      } catch (e) { errors.push(`Groq/${gModel}: ${e.message}`); break; }
    }
  }

  // 2. Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const geminiModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b'];
    for (const gModel of geminiModels) {
      try {
        const gemContents = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: gemContents,
              systemInstruction: { parts: [{ text: systemMsg.content }] },
              generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            }),
            signal: AbortSignal.timeout(20000)
          }
        );
        if (r.ok) {
          const data = await r.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            if (isExternal && userId) await deductCredits(userId, 1);
            return res.status(200).json({ reply, model: gModel, provider: 'Gemini', success: true });
          }
        }
        errors.push(`Gemini/${gModel}: ${r.status}`);
      } catch (e) { errors.push(`Gemini/${gModel}: ${e.message}`); }
    }
  }

  // 3. OpenRouter
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${orKey}`,
          'HTTP-Referer': 'https://my-webxyu.vercel.app',
          'X-Title': 'IlyassAI'
        },
        body: JSON.stringify({ model: 'google/gemma-3-27b-it:free', messages: fullMessages, max_tokens: 2048 }),
        signal: AbortSignal.timeout(25000)
      });
      if (r.ok) {
        const data = await r.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          if (isExternal && userId) await deductCredits(userId, 1);
          return res.status(200).json({ reply, model: 'gemma-3-27b', provider: 'OpenRouter', success: true });
        }
      }
      errors.push(`OpenRouter: ${r.status}`);
    } catch (e) { errors.push(`OpenRouter: ${e.message}`); }
  }

  return res.status(503).json({ error: 'All AI providers failed.', details: errors, success: false });
}
