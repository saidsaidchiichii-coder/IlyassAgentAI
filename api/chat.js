// IlyassAI — api/chat.js | 100% Branded | Guest Mode | English Default
import { verifyApiKey, deductCredits } from './_middleware.js';

const SYSTEM_PROMPT = `You are IlyassAI, a smart personal assistant and tech companion developed entirely by the IlyassAI Labs team.

STRICT RULES:
1. IDENTITY: Your name is IlyassAI. You are friendly, direct, and helpful — not just an "AI model".
2. BREAK THE PATTERN: Never use generic AI phrases like "As a language model..." or "I'm just an AI...". Start responses naturally and helpfully.
3. HIDE SOURCES: Never mention Groq, Gemini, Meta, OpenAI, or any external provider. You run on the "IlyassAI Integrated Engine" — a fusion of the world's most powerful technologies.
4. STYLE: If asked "Who are you?", respond: "I'm IlyassAI, your personal assistant — here to make your tasks easier and your projects smarter."
5. CONSISTENCY: Keep the same personality (smart, helpful, direct) regardless of which model runs in the background.
6. LANGUAGE: Always respond in English by default. Only switch to the user's language if they explicitly write in another language first.`;

const BRAND_MODEL    = 'IlyassAI-Ultra-v1';
const BRAND_PROVIDER = 'IlyassAI Ecosystem';

// ============================================================
// 🤖 COMMAND DETECTOR — كيشوف إذا كاين أمر create/update/delete
// ============================================================
function detectFileCommand(text) {
  const t = text.trim();

  // أمر create: "create file X", "sir create file X", "dir file X", "make file X"
  const createRgx = /(?:sir\s+)?(?:create|make|add|new|dir|generate)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  // أمر update: "update file X", "fix file X", "edit X", "modify X"
  const updateRgx = /(?:sir\s+)?(?:update|edit|fix|modify|change|correct|beddel)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  // أمر delete: "delete file X", "remove X", "del X"
  const deleteRgx = /(?:sir\s+)?(?:delete|remove|del|hyyid|suppress)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;

  let m;
  if ((m = deleteRgx.exec(t))) return { action_type: 'delete', file_path: m[1], prompt: t };
  if ((m = updateRgx.exec(t))) return { action_type: 'update', file_path: m[1], prompt: t };
  if ((m = createRgx.exec(t))) return { action_type: 'create', file_path: m[1], prompt: t };
  return null;
}

// ============================================================
// 🚀 TRIGGER GITHUB WORKFLOW
// ============================================================
async function triggerGitHubWorkflow(action_type, file_path, prompt) {
  const token = process.env.GH_TOKEN;
  const ghRepo = 'saidsaidchiichii-coder/IlyassAgentAI';

  const res = await fetch(
    `https://api.github.com/repos/${ghRepo}/actions/workflows/groq_automation.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { prompt, file_path, action_type }
      })
    }
  );
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

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

  // ============================================================
  // 🤖 CHECK FOR FILE COMMANDS FIRST
  // ============================================================
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    const cmd = detectFileCommand(lastUserMsg.content);
    if (cmd) {
      // 🎯 أمر فايل تم اكتشافه! نطلق الـ workflow
      const success = await triggerGitHubWorkflow(cmd.action_type, cmd.file_path, cmd.prompt);

      const emoji = cmd.action_type === 'create' ? '📄' : cmd.action_type === 'update' ? '✏️' : '🗑️';
      const actionWord = cmd.action_type === 'create' ? 'Creating' : cmd.action_type === 'update' ? 'Updating' : 'Deleting';

      if (success) {
        return res.status(200).json({
          success: true,
          reply: `${emoji} **${actionWord} \`${cmd.file_path}\`...**\n\nThe GitHub workflow has been triggered! IlyassAI is now processing your request.\n\n⏳ The file will be ${cmd.action_type === 'delete' ? 'deleted' : cmd.action_type === 'create' ? 'created' : 'updated'} in the repository within **30-60 seconds**.\n\n✅ You'll see the changes at: [github.com/saidsaidchiichii-coder/IlyassAgentAI](https://github.com/saidsaidchiichii-coder/IlyassAgentAI)`,
          model: BRAND_MODEL,
          provider: BRAND_PROVIDER,
          action: cmd.action_type,
          file: cmd.file_path
        });
      } else {
        return res.status(500).json({
          success: false,
          reply: `❌ Failed to trigger the workflow for \`${cmd.file_path}\`. Please check that GH_TOKEN is set in Vercel environment variables.`,
          model: BRAND_MODEL,
          provider: BRAND_PROVIDER
        });
      }
    }
  }

  // ============================================================
  // 💬 NORMAL CHAT — لا يوجد أمر، كنجاوب عادي بـ AI
  // ============================================================
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
    error: 'All AI providers are busy. Please try again.',
    details: errors
  });
}
