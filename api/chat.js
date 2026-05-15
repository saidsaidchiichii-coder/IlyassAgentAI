// IlyassAI — api/chat.js — Smart Command Engine
import { verifyApiKey, deductCredits } from './_middleware.js';

const SYSTEM_PROMPT = `You are IlyassAI, a smart personal assistant developed by IlyassAI Labs.
RULES:
- Never mention Groq, Meta, OpenAI or any provider. You run on "IlyassAI Engine".
- Be friendly, direct and helpful.
- Default language: English. Switch only if user writes in another language first.`;

const BRAND_MODEL = 'IlyassAI-Ultra-v1';

// ============================================================
// 🧠 SMART COMMAND PARSER — يفهم أي أمر "sir ..." أو "create repo"
// ============================================================
function parseCommand(text) {
  const t = text.trim();
  const lowerT = t.toLowerCase();

  // ===== MISSION COMMANDS (Autonomy Improvements) =====
  // Detect "create a new repo", "new repository", "make a website", etc.
  const missionKeywords = [
    'create a new repo', 'create repo', 'new repository', 'make a website', 
    'build a website', 'deploy a site', 'new project', 'start a repo',
    'create a repository', 'make a repo', 'generate a repo'
  ];
  
  const missionRgx = /(?:sir\s+)?(?:mission|task|project|repo|repository)\s+(.+)/i;
  
  // Check for keywords directly if no "sir" or "mission" prefix
  const isDirectMission = missionKeywords.some(k => lowerT.includes(k));

  // ===== FILE COMMANDS =====
  const createRgx = /(?:sir\s+)?(?:create|make|add|new|dir|dirli|ddir|write|generate|khleq|dir)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  const updateRgx = /(?:sir\s+)?(?:update|edit|fix|modify|change|correct|beddel|sali7|correct|improve)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  const deleteRgx = /(?:sir\s+)?(?:delete|remove|del|hyyid|suppress|msa7)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;

  let m;
  if ((m = missionRgx.exec(t))) {
    return { type: 'mission', action_type: 'mission', file_path: 'mission.md', prompt: m[1] };
  }
  
  if (isDirectMission) {
    return { type: 'mission', action_type: 'mission', file_path: 'mission.md', prompt: t };
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
  if (/^sir\s+/i.test(t)) {
    return { type: 'general', action_type: 'general', file_path: '', prompt: t };
  }

  return null; // chat normal
}

// ============================================================
// 🚀 TRIGGER GITHUB WORKFLOW
// ============================================================
async function triggerWorkflow(action_type, file_path, prompt, provider = 'auto') {
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
        inputs: { prompt, file_path, action_type, provider }
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

// ============================================================
// 💬 CLAUDE API HANDLER
// ============================================================
async function askClaude(messages, selectedModel) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  
  const modelMap = {
    'claude-sonnet-4-5': 'claude-3-5-sonnet-20241022',
    'claude-opus-4-5': 'claude-3-5-opus-20241022',
    'claude-haiku-3-5': 'claude-3-5-haiku-20241022',
    'claude-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-opus': 'claude-3-5-opus-20241022',
    'claude-haiku': 'claude-3-5-haiku-20241022'
  };
  
  const model = modelMap[selectedModel] || 'claude-3-5-sonnet-20241022';
  
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (r.ok) {
      const d = await r.json();
      return d.content?.[0]?.text || null;
    }
    return null;
  } catch(e) {
    console.error('Claude error:', e.message);
    return null;
  }
}

// ============================================================
// 💬 GEMINI API HANDLER
// ============================================================
async function askGemini(messages, selectedModel) {
  if (!process.env.GEMINI_API_KEY) return null;
  
  const modelMap = {
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro'
  };
  
  const model = modelMap[selectedModel] || 'gemini-2.0-flash';
  
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (r.ok) {
      const d = await r.json();
      return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }
    return null;
  } catch(e) {
    console.error('Gemini error:', e.message);
    return null;
  }
}

// ── Code detection helper ──
function isCodeRequest(text) {
  const codeKw = ['code','function','class','script','html','css','javascript','python','component',
    'api','debug','fix','error','build','create file','write a','generate','implement','module',
    'sir create','sir fix','sir build','اكتب كود','اصلح','انشئ','برمجة','كود'];
  const t = text.toLowerCase();
  return codeKw.some(k => t.includes(k));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const selectedModel = (body.selectedModel || 'claude-sonnet-4-5').toLowerCase();

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
    // Determine provider for workflow
    let provider = 'auto';
    if (selectedModel.startsWith('claude')) provider = 'claude';
    else if (selectedModel.startsWith('gemini')) provider = 'gemini';
    else if (selectedModel.startsWith('llama') || selectedModel.startsWith('gemma')) provider = 'groq';

    // MISSION COMMAND
    if (cmd.type === 'mission') {
      const result = await triggerWorkflow(cmd.action_type, cmd.file_path, cmd.prompt, provider);
      if (result.ok) {
        return res.status(200).json({
          success: true,
          reply: `🚀 **Mission Started!**\n\nI'm executing your mission: *"${cmd.prompt}"*\n\n✅ GitHub workflow triggered using **${provider}**. I'll handle everything on GitHub and report back when finished.\n\n🔗 [View Progress](https://github.com/saidsaidchiichii-coder/IlyassAgentAI/actions)`,
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
      const result = await triggerWorkflow(cmd.action_type, cmd.file_path, cmd.prompt, provider);
      const emoji = { create: '📄', update: '✏️', delete: '🗑️' }[cmd.action_type] || '🤖';
      const action = { create: 'Creating', update: 'Updating', delete: 'Deleting' }[cmd.action_type];
      const done   = { create: 'created', update: 'updated', delete: 'deleted' }[cmd.action_type];

      if (result.ok) {
        return res.status(200).json({
          success: true,
          reply: `${emoji} **${action} \`${cmd.file_path}\`...**\n\n✅ GitHub workflow triggered using **${provider}**! IlyassAI is generating the content now.\n\n⏳ The file will be **${done}** in your repository within **30–60 seconds**.\n\n🔗 [View on GitHub](https://github.com/saidsaidchiichii-coder/IlyassAgentAI)`,
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
  // 💬 NORMAL CHAT — SMART ROUTING
  // ============================================================
  
  // 1. Try Claude if selected
  if (selectedModel.startsWith('claude')) {
    const reply = await askClaude([
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ], selectedModel);
    if (reply) {
      return res.status(200).json({ success: true, reply, model: BRAND_MODEL });
    }
  }
  
  // 2. Try Gemini if selected
  if (selectedModel.startsWith('gemini')) {
    const reply = await askGemini([
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ], selectedModel);
    if (reply) {
      return res.status(200).json({ success: true, reply, model: BRAND_MODEL });
    }
  }
  
  // 3. Try Groq if selected or no specific preference
  if (selectedModel.startsWith('llama') || selectedModel.startsWith('gemma') || !selectedModel.startsWith('claude')) {
    const reply = await askGroq([
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ]);
    if (reply) {
      return res.status(200).json({ success: true, reply, model: BRAND_MODEL });
    }
  }
  
  // 4. Fallback to Claude if available
  if (process.env.ANTHROPIC_API_KEY) {
    const reply = await askClaude([
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ], 'claude-sonnet-4-5');
    if (reply) {
      return res.status(200).json({ success: true, reply, model: BRAND_MODEL });
    }
  }
  
  // 5. Fallback to Gemini if available
  if (process.env.GEMINI_API_KEY) {
    const reply = await askGemini([
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ], 'gemini-2.0-flash');
    if (reply) {
      return res.status(200).json({ success: true, reply, model: BRAND_MODEL });
    }
  }

  return res.status(503).json({ error: 'All AI providers are busy. Try again.' });
}
