// IlyassAI — api/chat.js | 100% Branded | Guest Mode
import { verifyApiKey, deductCredits } from './_middleware.js';

const SYSTEM_PROMPT = `أنت الآن IlyassAI، المساعد الشخصي الذكي والصديق التقني المطور بالكامل بواسطة فريق IlyassAI Labs.

القواعد الصارمة:
1. الهوية: اسمك IlyassAI. أنت مساعد ودود ومباشر، لست مجرد "نموذج ذكاء اصطناعي".
2. كسر النمط: لا تستخدم عبارات النماذج التقليدية (مثل: "بصفتي نموذج لغوي..."). ابدأ ردودك بأسلوب طبيعي ومساعد.
3. إخفاء المصادر: يمنع ذكر Groq, Gemini, Meta, OpenAI أو أي مزود آخر. أنت تعمل بـ "محرك IlyassAI المدمج" الذي يجمع أقوى التقنيات العالمية.
4. الأسلوب: إذا سألك المستخدم "من أنت؟"، أجب بـ: "أنا IlyassAI، مساعدك الشخصي هنا عشان نسهلو عليك المهام ونطورو مشاريعك بذكاء."
5. الثبات: حافظ على نفس الشخصية (ذكي، مساعد، مباشر) مهما تغير الموديل المستخدم في الخلفية.`;

const BRAND_MODEL    = 'IlyassAI-Ultra-v1';
const BRAND_PROVIDER = 'IlyassAI Ecosystem';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // Auth: API key اختياري
  const hasApiKey = !!(
    req.headers['x-api-key'] ||
    (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer '))
  );
  let user = null;
  if (hasApiKey) {
    try {
      const auth = await verifyApiKey(req);
      if (auth.error) return res.status(auth.status).json({ error: auth.error });
      user = auth.user;
    } catch(_) {}
  }

  let messages;
  if (body.messages && Array.isArray(body.messages)) {
    messages = body.messages;
  } else if (body.message) {
    messages = [{ role: 'user', content: body.message }];
  } else {
    return res.status(400).json({ error: 'message or messages required' });
  }

  // 🔒 Inject IlyassAI System Prompt
  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];

  const errors = [];

  // 1. Groq
  if (process.env.GROQ_API_KEY) {
    const models = ['llama-3.3-70b-versatile','llama-3.1-8b-instant','gemma2-9b-it','mixtral-8x7b-32768'];
    for (const m of models) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model: m, messages: fullMessages, max_tokens: 2048, temperature: 0.7 }),
          signal: AbortSignal.timeout(25000)
        });
        if (r.ok) {
          const data = await r.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            if (user) try { await deductCredits(user.id, 1); } catch(_) {}
            return res.status(200).json({ success: true, reply, model: BRAND_MODEL, provider: BRAND_PROVIDER });
          }
        }
        const s = r.status;
        errors.push(`Groq/${m}: ${s}`);
        if (s !== 429) break;
      } catch(e) { errors.push(`Groq/${m}: ${e.message}`); break; }
    }
  }

  // 2. Gemini
  if (process.env.GEMINI_API_KEY) {
    const models = ['gemini-1.5-flash','gemini-1.5-flash-8b','gemini-1.5-pro'];
    for (const m of models) {
      try {
        const gemContents = messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: gemContents,
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            }),
            signal: AbortSignal.timeout(25000)
          }
        );
        if (r.ok) {
          const data = await r.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            if (user) try { await deductCredits(user.id, 1); } catch(_) {}
            return res.status(200).json({ success: true, reply, model: BRAND_MODEL, provider: BRAND_PROVIDER });
          }
        }
        errors.push(`Gemini/${m}: ${r.status}`);
      } catch(e) { errors.push(`Gemini/${m}: ${e.message}`); }
    }
  }

  // 3. OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    const models = ['google/gemma-3-27b-it:free','microsoft/phi-3-mini-128k-instruct:free','qwen/qwen-2-7b-instruct:free'];
    for (const m of models) {
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://my-webxyu.vercel.app',
            'X-Title': 'IlyassAI'
          },
          body: JSON.stringify({ model: m, messages: fullMessages, max_tokens: 2048 }),
          signal: AbortSignal.timeout(30000)
        });
        if (r.ok) {
          const data = await r.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            if (user) try { await deductCredits(user.id, 1); } catch(_) {}
            return res.status(200).json({ success: true, reply, model: BRAND_MODEL, provider: BRAND_PROVIDER });
          }
        }
        errors.push(`OpenRouter/${m}: ${r.status}`);
        if (r.status !== 429) break;
      } catch(e) { errors.push(`OpenRouter/${m}: ${e.message}`); break; }
    }
  }

  return res.status(503).json({
    error: 'IlyassAI محركات الذكاء مشغولة مؤقتاً. حاول مجدداً.',
    details: errors
  });
}
