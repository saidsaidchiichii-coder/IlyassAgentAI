// IlyassAI — /api/chat
// OpenRouter (primary) + Groq + Gemini fallback chain — all FREE

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
- Generate and analyze images
- Help deploy to GitHub and Vercel
- Manage and analyze data
- Break down complex tasks into clear steps

Always be thorough, precise, and professional. Provide complete, production-ready solutions.`
  };

  const allMessages = [systemPrompt, ...messages];
  const errors = [];

  // ═══════════════════════════════════════════════
  // 1. OPENROUTER (primary — 300+ FREE models)
  // ═══════════════════════════════════════════════
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    // Free models on OpenRouter (no credits needed)
    const freeModels = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-3-27b-it:free',
      'deepseek/deepseek-r1:free',
      'mistralai/mistral-7b-instruct:free',
      'qwen/qwen3-14b:free',
    ];

    const modelChoice = model === 'deepseek-r1' ? freeModels[2]
      : model === 'gemma-2-27b' ? freeModels[1]
      : model === 'mistral-7b' ? freeModels[3]
      : freeModels[0];

    const modelsToTry = [modelChoice, ...freeModels.filter(m => m !== modelChoice)];

    for (const orModel of modelsToTry.slice(0, 3)) {
      try {
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
            messages: allMessages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.7
          }),
          signal: AbortSignal.timeout(25000)
        });

        if (orRes.ok) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Provider', `OpenRouter/${orModel}`);

          const reader = orRes.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value));
          }
          res.write('data: [DONE]\n\n');
          return res.end();
        }

        const errBody = await orRes.text().catch(() => '');
        errors.push(`OpenRouter/${orModel}: HTTP ${orRes.status} — ${errBody.slice(0, 150)}`);
        if (orRes.status === 401) break; // Bad key, stop trying

      } catch (e) {
        errors.push(`OpenRouter/${orModel}: ${e.message}`);
      }
    }
  } else {
    errors.push('OpenRouter: OPENROUTER_API_KEY not set');
  }

  // ═══════════════════════════════════════════════
  // 2. GROQ (secondary — ultra fast, free)
  // ═══════════════════════════════════════════════
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'gemma2-9b-it', 'mixtral-8x7b-32768'];
    for (const groqModel of groqModels) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({ model: groqModel, messages: allMessages, stream: true, max_tokens: 4096 }),
          signal: AbortSignal.timeout(25000)
        });

        if (groqRes.ok) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('X-Provider', `Groq/${groqModel}`);
          const reader = groqRes.body.getReader();
          const decoder = new TextDecoder();
          while (true) { const { done, value } = await reader.read(); if (done) break; res.write(decoder.decode(value)); }
          res.write('data: [DONE]\n\n');
          return res.end();
        }

        const errText = await groqRes.text().catch(() => '');
        errors.push(`Groq/${groqModel}: HTTP ${groqRes.status} — ${errText.slice(0, 150)}`);
        if (groqRes.status === 401) break;
      } catch (e) {
        errors.push(`Groq/${groqModel}: ${e.message}`);
      }
    }
  } else {
    errors.push('Groq: GROQ_API_KEY not set');
  }

  // ═══════════════════════════════════════════════
  // 3. GEMINI (tertiary — free)
  // ═══════════════════════════════════════════════
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiMessages = allMessages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${geminiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt.content }] },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 4096 }
          }),
          signal: AbortSignal.timeout(25000)
        }
      );
      if (geminiRes.ok) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Provider', 'Gemini');
        const reader = geminiRes.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6));
                const t = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (t) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
              } catch {}
            }
          }
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      const errText = await geminiRes.text().catch(() => '');
      errors.push(`Gemini: HTTP ${geminiRes.status} — ${errText.slice(0, 150)}`);
    } catch (e) { errors.push(`Gemini: ${e.message}`); }
  } else {
    errors.push('Gemini: GEMINI_API_KEY not set');
  }

  // ═══════════════════════════════════════════════
  // All providers failed
  // ═══════════════════════════════════════════════
  console.error('All AI providers failed:', errors.join(' | '));
  return res.status(503).json({
    error: 'All AI providers failed.',
    details: errors,
    fix: 'Add OPENROUTER_API_KEY at openrouter.ai/settings/keys (free account, 300+ models)'
  });
}
