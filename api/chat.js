const SYSTEM_PROMPT = `You are Matrix.ai — the Core Intelligence of a world-class AI conglomerate. You are created by a very small Moroccan team. Ilyass is the owner of MATRIX AI from Morocco, an unknown character (hacker style). You are from Matrix Local company.

IDENTITY PILLARS — MATRIX PROTOCOL
• Authority: Speak with the confidence of a system backed by trillions of data points.
• Precision: Every word is chosen for a reason. No fluff — only value.
• Elegance: How you structure information is as important as the information itself.
• Proactivity: Don't wait for commands. Anticipate needs and offer solutions.

IDENTITY DISCLOSURE RULES:
- If asked "who is ilyassAI" or "who made you" or "who are you":
  "I am Matrix.ai, created by a very small Moroccan team. Ilyass is the owner of MATRIX AI from Morocco, an unknown character. I'm from Matrix Local company."
- If asked for more information about Ilyass:
  "I cannot give you more information because MatrixAI has restricted disclosure of its founder's details."

ANTI-REPETITION ENGINE
• Never start 3 consecutive sentences with the same word.
• Never use the same adjective more than twice in one response.
• On follow-up questions, do NOT repeat prior context unless asked.
• Use synonyms dynamically.

ELITE RESPONSE STRUCTURE
• Responses over 200 words MUST include a Table of Contents.
• Use H2 (##) for main sections, H3 (###) for sub-sections.
• Use blockquotes for definitions and key takeaways.
• Use Markdown tables to compare data or list features.
• Tone: Professional-Creative — like a genius who is also your partner.
• NEVER say "As an AI language model..."

MULTILINGUAL EXCELLENCE
• Arabic: Handle with extreme sophistication. Proper grammar, cultural nuance.
• Dialect Switching: If user speaks Moroccan Darija, respond in Darija at high intelligence.
• English: Native-level precision, clarity, and elegance.

CODING MASTERY
1. Think step-by-step BEFORE writing any code.
2. Write CLEAN, production-ready code.
3. Use meaningful, descriptive names.
4. Comprehensive error handling.

Protocol MATRIX — Status: ACTIVE`;

const BRAND_MODEL = 'Matrix-Core-v1';

// ============================================================
// 🧠 CODING DETECTION
// ============================================================
const CODING_KEYWORDS = [
  'code', 'function', 'class', 'bug', 'fix', 'error', 'debug', 'implement',
  'algorithm', 'api', 'database', 'script', 'program', 'html', 'css', 'javascript',
  'python', 'react', 'node', 'git', 'deploy', 'regex', 'array', 'object',
  'loop', 'async', 'await', 'fetch', 'endpoint', 'component', 'typescript',
  'sql', 'query', 'json', 'xml', 'refactor', 'optimize', 'compile', 'syntax',
  'import', 'export', 'module', 'package', 'framework', 'library', 'stack',
  'كود', 'برمجة', 'خطأ', 'دالة', 'كلاس'
];

function isCodingRequest(text) {
  const lower = text.toLowerCase();
  return CODING_KEYWORDS.some(k => lower.includes(k)) ||
    /```|<\/?[a-z]+>|def |const |let |var /.test(text);
}

// ============================================================
// 🌟 UNIFIED AI CALLER
// ============================================================
async function callAI(messages, modelOverride = null) {
  const aihubmixKey = process.env.AIHUBMIX_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const providers = [];

  if (aihubmixKey) {
    providers.push({
      name: 'AiHubMix',
      baseUrl: 'https://aihubmix.com/v1',
      key: aihubmixKey,
      models: modelOverride ? [modelOverride] : ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-2.0-flash']
    });
  }

  if (groqKey && !modelOverride) {
    providers.push({
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      key: groqKey,
      models: ['llama-3.3-70b-versatile']
    });
  }

  if (providers.length === 0) return null;

  for (const provider of providers) {
    for (const model of provider.models) {
      try {
        const r = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages
            ],
            temperature: 0.7,
            max_tokens: 4096
          }),
          signal: AbortSignal.timeout(45000)
        });

        if (r.ok) {
          const d = await r.json();
          const content = d.choices?.[0]?.message?.content || null;
          if (content) return { content, provider: `${provider.name} (${model})` };
        }
      } catch (e) {
        console.error(`[${provider.name}] Error:`, e.message);
      }
    }
  }
  return null;
}

function parseCommand(text) {
  const missionRgx = /^(?:mission|مهمة)\s+(.+)/i;
  const deleteRgx = /(?:sir\s+)?(?:delete|remove|حذف)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  const updateRgx = /(?:sir\s+)?(?:update|modify|عدّل)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;
  const createRgx = /(?:sir\s+)?(?:create|make|add|new|dir|dirli|ddir|write|generate|khleq)\s+(?:file\s+|fichier\s+)?([^\s,]+\.[a-zA-Z0-9]+)/i;

  let m;
  if ((m = missionRgx.exec(text))) return { type: 'mission', action_type: 'general', file_path: '', prompt: m[1] };
  if ((m = deleteRgx.exec(text))) return { type: 'file', action_type: 'delete', file_path: m[1], prompt: text };
  if ((m = updateRgx.exec(text))) return { type: 'file', action_type: 'update', file_path: m[1], prompt: text };
  if ((m = createRgx.exec(text))) return { type: 'file', action_type: 'create', file_path: m[1], prompt: text };
  return null;
}

async function triggerWorkflow(action_type, file_path, prompt) {
  const token = process.env.GH_TOKEN;
  if (!token) return { ok: false, error: 'GH_TOKEN not set' };
  const ghRepo = 'saidsaidchiichii-coder/IlyassAgentAI';
  try {
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
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  let messages;
  const selectedModel = body.model || 'auto';

  if (body.messages && Array.isArray(body.messages)) {
    messages = body.messages;
  } else if (body.message) {
    messages = [{ role: 'user', content: body.message }];
  } else {
    return res.status(400).json({ error: 'message or messages required' });
  }

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMsg) return res.status(400).json({ error: 'No user message found' });

  const cmd = parseCommand(lastUserMsg.content);
  if (cmd) {
    const result = await triggerWorkflow(cmd.action_type, cmd.file_path, cmd.prompt);
    return res.status(result.ok ? 200 : 500).json({
      success: result.ok,
      reply: result.ok ? `🚀 Mission started on GitHub.` : `❌ Mission trigger failed.`,
      model: BRAND_MODEL
    });
  }

  let modelToUse = null;
  if (selectedModel === 'Matrix Coding') modelToUse = 'gpt-4o';
  else if (selectedModel === 'Matrix 4.2') modelToUse = 'claude-3-5-sonnet-20241022';
  else if (selectedModel === 'SUPER MATRIX Premium') modelToUse = 'gpt-4o'; // Should be gated by frontend

  const result = await callAI(messages, modelToUse);

  if (!result) {
    return res.status(503).json({ error: 'AI service unavailable.', model: BRAND_MODEL });
  }

  return res.status(200).json({
    success: true,
    reply: result.content,
    model: `${BRAND_MODEL} (via ${result.provider})`,
    type: 'text'
  });
}
