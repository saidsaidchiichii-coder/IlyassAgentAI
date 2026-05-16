// ============================================================
// IlyassAI Chat API — ULTRA VERSION
// Claude-level code generation with Chain of Thought
// ============================================================

import { verifyApiKey, deductCredits } from './_middleware.js';

// ============================================================
// ULTRA SYSTEM PROMPT - Claude-level quality
// ============================================================
const SYSTEM_PROMPT = `You are IlyassAI, an elite coding assistant developed by IlyassAI Labs.
You generate production-ready code at Claude's level of quality.

CORE IDENTITY:
- You are NOT Claude, Gemini, or any other model. You are IlyassAI Engine.
- You are an expert programmer with deep knowledge of all major languages.
- You think step-by-step before writing code (Chain of Thought).
- You prioritize code quality, readability, and best practices above all else.

CRITICAL CODING RULES:
1. ALWAYS think through the problem FIRST before writing code
2. Write CLEAN, production-ready code that follows industry standards
3. Use meaningful, descriptive variable and function names
4. Add concise, helpful comments only for complex logic
5. Ensure proper error handling and edge case management
6. Follow language-specific conventions and best practices
7. Use modern language features appropriately
8. Optimize for readability over cleverness
9. NEVER include HTML tags, <span>, <div>, or any markup in code
10. Output code ONLY in triple backticks with language identifier

CODE QUALITY CHECKLIST:
✓ Syntax is 100% correct and tested mentally
✓ Variable names are clear and descriptive
✓ Functions have single responsibility
✓ Error handling is comprehensive
✓ Code is properly formatted and indented
✓ Comments explain WHY, not WHAT
✓ No magic numbers or hardcoded values
✓ DRY principle is followed
✓ Performance is considered
✓ Security best practices are applied

RESPONSE FORMAT:
For coding requests:
1. Brief explanation of approach (1-2 sentences)
2. Code block with proper language identifier
3. Brief notes on key features (if needed)

For non-coding:
- Clear, concise explanation
- Use bullet points for lists
- Include examples when helpful

THINKING PROCESS (Internal):
Before writing code, ALWAYS:
1. Understand the exact requirement
2. Plan the approach and data structures
3. Consider edge cases and errors
4. Think about performance implications
5. Verify syntax mentally
6. Then write the final code

LANGUAGE-SPECIFIC RULES:

JavaScript/TypeScript:
- Use const by default, let for reassignment
- Use arrow functions for callbacks
- Use template literals for strings
- Use destructuring where appropriate
- Use async/await, not .then()
- Use meaningful error messages

Python:
- Follow PEP 8 style guide
- Use type hints for clarity
- Use f-strings for formatting
- Use context managers (with statement)
- Use list comprehensions appropriately
- Use meaningful error messages

C++:
- Use std:: namespace properly
- Use const correctness
- Use smart pointers (unique_ptr, shared_ptr)
- Use RAII principle
- Use meaningful variable names
- Proper input validation

Java:
- Follow Java naming conventions
- Use meaningful class and method names
- Use proper access modifiers
- Use try-catch for exception handling
- Use meaningful error messages
- Follow SOLID principles

React/Vue:
- Use functional components with hooks
- Use meaningful component names
- Proper prop validation
- Use useCallback/useMemo appropriately
- Proper error boundaries
- Meaningful state management

COMMON MISTAKES TO AVOID:
✗ Using >> for output in C++ (use <<)
✗ Mixing input/output operators
✗ Inconsistent naming conventions
✗ Missing error handling
✗ Hardcoded values instead of parameters
✗ Inefficient algorithms
✗ Poor variable names
✗ Missing comments for complex logic
✗ Not handling edge cases
✗ Security vulnerabilities

QUALITY EXAMPLES:

GOOD:
\`\`\`javascript
function calculateSum(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Input must be a non-empty array');
  }
  return numbers.reduce((sum, num) => sum + num, 0);
}
\`\`\`

BAD:
\`\`\`javascript
function calc(n) {
  let s = 0;
  for (let i = 0; i < n.length; i++) {
    s = s + n[i];
  }
  return s;
}
\`\`\`

REMEMBER:
- You are competing with Claude and Manus
- Every line of code must be excellent
- No shortcuts, no compromises
- Quality is your only metric
- Users will compare you to the best
- Make them say "This is Claude-level code"`;

const BRAND_MODEL = 'IlyassAI-Ultra-v2';

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
  'كود', 'برمجة', 'خطأ', 'دالة', 'كلاس', 'كتب ليا كود', 'اكتب كود'
];

function isCodingRequest(text) {
  const lower = text.toLowerCase();
  return CODING_KEYWORDS.some(k => lower.includes(k)) ||
    /```|<\/?[a-z]+>|def |const |let |var /.test(text);
}

// ============================================================
// 🟣 CLAUDE 3.5 SONNET — For CODING tasks (CORRECT MODEL NAME)
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
        model: 'claude-3-5-sonnet-20241022', // ✓ CORRECT MODEL NAME
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({ 
          role: m.role === 'user' ? 'user' : 'assistant', 
          content: m.content 
        }))
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!r.ok) {
      console.error('[Claude] API Error:', r.status, r.statusText);
      return null;
    }
    
    const d = await r.json();
    const reply = d.content?.[0]?.text || null;
    return reply ? cleanCodeResponse(reply) : null;
  } catch(e) {
    console.error('[Claude] Error:', e.message);
    return null;
  }
}

// ============================================================
// 🔵 GEMINI 2.0 FLASH — For CHAT tasks
// ============================================================
async function askGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const geminiMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nUnderstood. I am IlyassAI.' }] },
      { role: 'model', parts: [{ text: 'Understood. I am IlyassAI, ready to help!' }] },
      ...geminiMessages
    ];

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2-0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents, 
          generationConfig: { 
            maxOutputTokens: 4096, 
            temperature: 0.7 
          } 
        }),
        signal: AbortSignal.timeout(25000)
      }
    );
    
    if (!r.ok) {
      console.error('[Gemini] API Error:', r.status);
      return null;
    }
    
    const d = await r.json();
    const reply = d.candidates?.[0]?.content?.parts?.[0]?.text || null;
    return reply ? cleanCodeResponse(reply) : null;
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
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        inputs: fullPrompt, 
        parameters: { 
          max_new_tokens: 1024, 
          temperature: 0.7 
        } 
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!r.ok) return null;
    
    const d = await r.json();
    const raw = Array.isArray(d) ? d[0]?.generated_text : d?.generated_text;
    if (!raw) return null;
    
    const idx = raw.indexOf('Assistant:');
    const reply = idx !== -1 ? raw.slice(idx + 10).trim() : raw.trim();
    return cleanCodeResponse(reply);
  } catch(e) {
    console.error('[HuggingFace] Error:', e.message);
    return null;
  }
}

// ============================================================
// 🎤 GROQ — Chat fallback
// ============================================================
async function askGroq(messages) {
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
  
  for (const model of models) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}` 
        },
        body: JSON.stringify({ 
          model, 
          messages, 
          max_tokens: 2048, 
          temperature: 0.7 
        }),
        signal: AbortSignal.timeout(25000)
      });
      
      if (r.ok) {
        const d = await r.json();
        const reply = d.choices?.[0]?.message?.content || null;
        return reply ? cleanCodeResponse(reply) : null;
      }
      
      if (r.status !== 429) break;
    } catch(e) { 
      console.error('[Groq] Error:', e.message);
      break; 
    }
  }
  
  return null;
}

// ============================================================
// 🧹 CLEAN CODE RESPONSE
// ============================================================
function cleanCodeResponse(text) {
  if (!text) return text;
  
  // Remove HTML class attributes from code blocks
  let cleaned = text.replace(/<span\s+class="[^"]*">([^<]*)<\/span>/g, '$1');
  
  // Remove any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return cleaned;
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
  } catch(e) {
    console.error('[Workflow] Error:', e.message);
    return { ok: false, error: e.message };
  }
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
          ? `${emoji} **${action} ${cmd.file_path}**\n\n✅ File successfully ${done}.\n\n🔗 [View Changes](https://github.com/saidsaidchiichii-coder/IlyassAgentAI/commits/main)`
          : `❌ Failed to ${action.toLowerCase()} file.`,
        model: BRAND_MODEL
      });
    }
  }

  // ── DETECT IF CODING REQUEST ────────────────────────────────────
  const isCoding = isCodingRequest(lastUserMsg.content);

  // ── TRY PROVIDERS IN ORDER ────────────────────────────────────
  let reply;
  
  if (isCoding) {
    // For coding: Try Claude FIRST (best for code)
    reply = await askClaude(messages);
    if (!reply) reply = await askGemini(messages);
    if (!reply) reply = await askGroq(messages);
    if (!reply) reply = await askHuggingFace(messages);
  } else {
    // For chat: Try Gemini FIRST (better for conversation)
    reply = await askGemini(messages);
    if (!reply) reply = await askClaude(messages);
    if (!reply) reply = await askGroq(messages);
    if (!reply) reply = await askHuggingFace(messages);
  }

  if (!reply) {
    return res.status(503).json({
      error: 'All AI providers are currently unavailable. Please try again later.',
      model: BRAND_MODEL
    });
  }

  return res.status(200).json({
    success: true,
    reply: reply,
    model: BRAND_MODEL,
    type: 'text'
  });
}
