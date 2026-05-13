// IlyassAI — api/chat.js — Smart Command Engine
import { verifyApiKey, deductCredits } from './_middleware.js';

const SYSTEM_PROMPT = `You are IlyassAI, a smart personal assistant developed by IlyassAI Labs.
RULES:
- Never mention Groq, Meta, OpenAI or any provider. You run on "IlyassAI Engine".
- Be friendly, direct and helpful.
- Default language: English. Switch only if user writes in another language first.`;

const BRAND_MODEL = 'IlyassAI-Ultra-v1';

// ============================================================
// 🧠 SMART COMMAND PARSER — يفهم أي أمر "sir ..."
// ============================================================
function parseCommand(text) {
  const t = text.trim();

  // ===== MISSION COMMANDS =====
  const missionRgx = /(?:sir\s+)?(?:mission|task|project|repo|repository)\s+(.+)/i;
  
  // ===== FILE COMMANDS =====
  const createRgx = /(?:sir\s+)?(?:create|make|add|new|dir|dirli|ddir|write|generate|khleq|dir)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  const updateRgx = /(?:sir\s+)?(?:update|edit|fix|modify|change|correct|beddel|sali7|correct|improve)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  const deleteRgx = /(?:sir\s+)?(?:delete|remove|del|hyyid|suppress|msa7)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;

  let m;
  if ((m = missionRgx.exec(t))) {
    return { type: 'mission', action_type: 'mission', file_path: 'mission.md', prompt: m[1] };
  }
  if ((m = deleteRgx.exec(t))) {
    return { type: 'file', action_type: 'delete', file_path: m[1], prompt: t };
  }
  if ((m = updateRgx.exec(t))) {
    return { type: 'file', action_type: 'update', file_path: m[1], prompt: t };
  }
  if ((m = createRgx.exec(t))) {
    return { type: 'file', action_type: 'create', file_path: m[1], prompt: t };
  }

  // ===== GENERAL "SIR" COMMANDS — أي شي فيه "sir" =====
  // "sir write me a poem", "sir translate this", "sir explain X"
  if (/^sir\s+/i.test(t)) {
    return { type: 'general', action_type: 'general', file_path: '', prompt: t };
  }

  return null; // chat normal
}

// ============================================================
// 🚀 TRIGGER GITHUB WORKFLOW
// ============================================================
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
      body: JSON.stringify({
        ref: 'main',
        inputs: { prompt, file_path, action_type }
      })
    }
  );
  return { ok: res.ok, status: res.status };
}

// ============================================================
// 💬 GROQ CHAT
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

  // ============================================================
  // 🧠 CHECK FOR COMMANDS
  // ============================================================
  const cmd = parseCommand(lastUserMsg.content);

  if (cmd) {
    // MISSION COMMAND
    if (cmd.type === 'mission') {
      const result = await triggerWorkflow(cmd.action_type, cmd.file_path, cmd.prompt);
      if (result.ok) {
        return res.status(200).json({
          success: true,
          reply: `🚀 **Mission Started!**\n\nI'm executing your mission: *"${cmd.prompt}"*\n\n✅ GitHub workflow triggered. I'll handle everything on GitHub and report back when finished.\n\n🔗 [View Progress](https://github.com/saidsaidchiichii-coder/IlyassAgentAI/actions)`,
          model: BRAND_MODEL
        });
      } else {
        return res.status(500).json({
          success: false,
          reply: `❌ Mission trigger failed (${result.error || result.status}).`,
          model: BRAND_MODEL
        });
      }
    }

    // FILE COMMAND
    if (cmd.type === 'file') {
      const result = await triggerWorkflow(cmd.action_type, cmd.file_path, cmd.prompt);
      const emoji = { create: '📄', update: '✏️', delete: '🗑️' }[cmd.action_type] || '🤖';
      const action = { create: 'Creating', update: 'Updating', delete: 'Deleting' }[cmd.action_type];
      const done   = { create: 'created', update: 'updated', delete: 'deleted' }[cmd.action_type];

      if (result.ok) {
        return res.status(200).json({
          success: true,
          reply: `${emoji} **${action} \`${cmd.file_path}\`...**\n\n✅ GitHub workflow triggered! IlyassAI is generating the content now.\n\n⏳ The file will be **${done}** in your repository within **30–60 seconds**.\n\n🔗 [View on GitHub](https://github.com/saidsaidchiichii-coder/IlyassAgentAI)`,
          model: BRAND_MODEL
        });
      } else {
        return res.status(500).json({
          success: false,
          reply: `❌ Workflow trigger failed (${result.error || result.status}). Make sure \`GH_TOKEN\` is set in Vercel.`,
          model: BRAND_MODEL
        });
      }
    }

    // GENERAL "SIR" COMMAND — يجاوب مباشرة بـ AI
    if (cmd.type === 'general') {
      const reply = await askGroq([
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ]);
      return res.status(200).json({
        success: true,
        reply: reply || "I'm on it! Give me a second...",
        model: BRAND_MODEL
      });
    }
  }

  // ============================================================
  // 💬 NORMAL CHAT
  // ============================================================
  const reply = await askGroq([
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ]);

  if (reply) {
    return res.status(200).json({ success: true, reply, model: BRAND_MODEL });
  }

  return res.status(503).json({ error: 'All AI providers are busy. Try again.' });
}
