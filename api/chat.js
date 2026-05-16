// IlyassAI — api/chat.js — Smart Multi-AI Router
// Claude → CODING  |  Gemini → CHAT  |  Groq Whisper → VOICE  |  HuggingFace → Fallback
import { verifyApiKey, deductCredits } from './_middleware.js';

const SYSTEM_PROMPT = `You are IlyassAI, a smart personal assistant developed by IlyassAI Labs.
RULES:
- Never mention Claude, Gemini, Groq, or any provider. You run on "IlyassAI Engine".
- Be friendly, direct and helpful.
- For coding tasks: write clean, well-commented code.
- Default language: English. Switch only if user writes in another language first.`;

const BRAND_MODEL = 'IlyassAI-Ultra-v1';

// ============================================================
// 🧠 CODING DETECTION — يكشف إذا السؤال برمجي
// ============================================================
const CODING_KEYWORDS = [
  'code', 'function', 'class', 'bug', 'fix', 'error', 'debug', 'implement',
  'algorithm', 'api', 'database', 'script', 'program', 'html', 'css', 'javascript',
  'python', 'react', 'node', 'git', 'deploy', 'regex', 'array', 'object',
  'loop', 'async', 'await', 'fetch', 'endpoint', 'component', 'typescript',
  'sql', 'query', 'json', 'xml', 'refactor', 'optimize', 'compile', 'syntax',
  'import', 'export', 'module', 'package', 'framework', 'library', 'stack',
  'كود', 'برمجة', 'خطأ', 'دالة', 'كلاس', 'كتب ليا كود', 'اكتب كود'
];

function isCodingRequest(text) {
  const lower = text.toLowerCase();
  return CODING_KEYWORDS.some(k => lower.includes(k)) ||
    /```|<\/?[a-z]+>|def |const |let |var /.test(text);
}

// ============================================================
// 🟣 CLAUDE — For CODING tasks
// ============================================================
async function askClaude(messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.content?.[0]?.text || null;
  } catch(e) {
    console.error('[Claude] Error:', e.message);
    return null;
  }
}

// ============================================================
// 🔵 GEMINI — For CHAT tasks
// ============================================================
async function askGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    // Convert messages to Gemini format
    const geminiMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    // Prepend system prompt as first user message if needed
    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nUnderstood. I am IlyassAI.' }] },
      { role: 'model', parts: [{ text: 'Understood. I am IlyassAI, ready to help!' }] },
      ...geminiMessages
    ];

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 4096, temperature: 0.7 } }),
        signal: AbortSignal.timeout(25000)
      }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch(e) {
    console.error('[Gemini] Error:', e.message);
    return null;
  }
}

// ============================================================
// 🤗 HUGGING FACE — Fallback
// ============================================================
async function askHuggingFace(messages) {
  const token = process.env.HF_TOKEN || process.env.HF_TOKEN_V2;
  if (!token) return null;

  const lastMsg = messages[messages.length - 1]?.content || '';
  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${lastMsg}\nAssistant:`;

  try {
    const r = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: fullPrompt, parameters: { max_new_tokens: 1024, temperature: 0.7 } }),
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    const raw = Array.isArray(d) ? d[0]?.generated_text : d?.generated_text;
    if (!raw) return null;
    const idx = raw.indexOf('Assistant:');
    return idx !== -1 ? raw.slice(idx + 10).trim() : raw.trim();
  } catch(e) {
    console.error('[HuggingFace] Error:', e.message);
    return null;
  }
}

// ============================================================
// 🎤 GROQ — Chat fallback + VOICE (Whisper)
// ============================================================
async function askGroq(messages) {
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
  for (const model of models) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
        signal: AbortSignal.timeout(25000)
      });
      if (r.ok) {
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      }
      if (r.status !== 429) break;
    } catch(e) { break; }
  }
  return null;
}

// ============================================================
// 🚀 SMART COMMAND PARSER
// ============================================================
function parseCommand(text) {
  const t = text.trim();
  const lowerT = t.toLowerCase();

  const missionKeywords = [
    'create a new repo', 'create repo', 'new repository', 'make a website',
    'build a website', 'deploy a site', 'new project', 'start a repo',
    'create a repository', 'make a repo', 'generate a repo'
  ];

  const missionRgx = /(?:sir\s+)?(?:mission|task|project|repo|repository)\s+(.+)/i;
  const isDirectMission = missionKeywords.some(k => lowerT.includes(k));
  const createRgx = /(?:sir\s+)?(?:create|make|add|new|dir|dirli|ddir|write|generate|khleq|dir)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  const updateRgx = /(?:sir\s+)?(?:update|edit|fix|modify|change|correct|beddel|sali7|improve)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  const deleteRgx = /(?:sir\s+)?(?:delete|remove|del|hyyid|suppress|msa7)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;

  let m;
  if ((m = missionRgx.exec(t))) return { type: 'mission', action_type: 'mission', file_path: 'mission.md', prompt: m[1] };
  if (isDirectMission) return { type: 'mission', action_type: 'mission', file_path: 'mission.md', prompt: t };
  if ((m = deleteRgx.exec(t))) return { type: 'file', action_type: 'delete', file_path: m[1], prompt: t };
  if ((m = updateRgx.exec(t))) return { type: 'file', action_type: 'update', file_path: m[1], prompt: t };
  if ((m = createRgx.exec(t))) return { type: 'file', action_type: 'create', file_path: m[1], prompt: t };
  if (/^sir\s+/i.test(t)) return { type: 'general', action_type: 'general', file_path: '', prompt: t };
  return null;
}

async function triggerWorkflow(action_type, file_path, prompt) {
  const token = process.env.GH_TOKEN;
  if (!token) return { ok: false, error: 'GH_TOKEN not set' };
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
      body: JSON.stringify({ ref: 'main', inputs: { prompt, file_path, action_type } })
    }
  );
  return { ok: res.ok, status: res.status };
}

// ============================================================
// 🔀 MAIN HANDLER — Smart Router
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  let messages;
  if (body.messages && Array.isArray(body.messages)) {
    messages = body.messages;
  } else if (body.message) {
    messages = [{ role: 'user', content: body.message }];
  } else {
    return res.status(400).json({ error: 'message or messages required' });
  }

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMsg) return res.status(400).json({ error: 'No user message found' });

  // ── COMMAND DETECTION ────────────────────────────────────
  const cmd = parseCommand(lastUserMsg.content);

  if (cmd) {
    if (cmd.type === 'mission') {
      const result = await triggerWorkflow(cmd.action_type, cmd.file_path, cmd.prompt);
      return res.status(result.ok ? 200 : 500).json({
        success: result.ok,
        reply: result.ok
          ? `🚀 **Mission Started!**\n\nExecuting: *"${cmd.prompt}"*\n\n✅ GitHub workflow triggered.\n\n🔗 [View Progress](https://github.com/saidsaidchiichii-coder/IlyassAgentAI/actions)`
          : `❌ Mission trigger failed (${result.error || result.status}).`,
        model: BRAND_MODEL
      });
    }

    if (cmd.type === 'file') {
      const result = await triggerWorkflow(cmd.action_type, cmd.file_path, cmd.prompt);
      const emoji = { create: '📄', update: '✏️', delete: '🗑️' }[cmd.action_type] || '🤖';
      const action = { create: 'Creating', update: 'Updating', delete: 'Deleting' }[cmd.action_type];
      const done   = { create: 'created', update: 'updated', delete: 'deleted' }[cmd.action_type];
      return res.status(result.ok ? 200 : 500).json({
        success: result.ok,
        reply: result.ok
          ? `${emoji} **${action} \`${cmd.file_path}\`...**\n\n✅ Workflow triggered! File will be **${done}** in ~30-60 seconds.\n\n🔗 [View on GitHub](https://github.com/saidsaidchiichii-coder/IlyassAgentAI)`
          : `❌ Workflow trigger failed. Check GH_TOKEN in Vercel.`,
        model: BRAND_MODEL
      });
    }

    if (cmd.type === 'general') {
      const reply = await askGroq([{ role: 'system', content: SYSTEM_PROMPT }, ...messages]);
      return res.status(200).json({ success: true, reply: reply || "On it!", model: BRAND_MODEL });
    }
  }

  // ── 🔀 SMART AI ROUTING ──────────────────────────────────
  // 🟣 CODING → Claude
  // 🔵 CHAT   → Gemini
  // 🎤 VOICE  → Groq Whisper (handled in /api/utilities?action=transcribe)
  // 🤗 FALLBACK → HuggingFace → Groq

  const userText = lastUserMsg.content;
  const isCoding = isCodingRequest(userText);
  
  let reply = null;
  let usedProvider = '';

  if (isCoding) {
    // 🔵 Gemini for CODING
    reply = await askGemini([{ role: 'user', content: (messages.map(m=>m.content).join('\n')) }]);
    usedProvider = 'gemini-coding';

    if (!reply) {
      // Fallback: Groq for coding
      reply = await askGroq([{ role: 'system', content: SYSTEM_PROMPT }, ...messages]);
      usedProvider = 'groq-coding-fallback';
    }
  } else {
    // 🔵 Gemini for CHAT too
    reply = await askGemini(messages);
    usedProvider = 'gemini-chat';

    if (!reply) {
      // Fallback: HuggingFace
      reply = await askHuggingFace(messages);
      usedProvider = 'huggingface-fallback';
    }

    if (!reply) {
      // Final fallback: Groq
      reply = await askGroq([{ role: 'system', content: SYSTEM_PROMPT }, ...messages]);
      usedProvider = 'groq-final-fallback';
    }
  }

  if (reply) {
    return res.status(200).json({ success: true, reply, model: BRAND_MODEL });
  }

  return res.status(503).json({ error: 'All AI providers are busy. Try again later.' });
}
