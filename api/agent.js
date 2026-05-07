// ================================================================
//  api/agent.js — IlyassAI Autonomous Agent v1.0
//
//  Architecture: ReAct (Reasoning + Acting) loop
//  Max iterations: 10 per task
//  Tool calling: search, fetch, code, math, weather, news, github
//  LLM fallback chain: Gemini → OpenRouter → Mistral → Groq
// ================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Tool definitions ──────────────────────────────────────────
const TOOLS = [
  {
    name: 'web_search',
    description: 'Search the web for real-time information. Use for current events, facts, prices, news.',
    parameters: { query: 'string (search query)' },
  },
  {
    name: 'web_fetch',
    description: 'Fetch and extract text content from a URL. Use to read articles, docs, or pages.',
    parameters: { url: 'string (full URL to fetch)' },
  },
  {
    name: 'code_execute',
    description: 'Execute JavaScript/math expressions. Use for calculations, data transformation.',
    parameters: { code: 'string (JS expression to evaluate)' },
  },
  {
    name: 'get_weather',
    description: 'Get current weather for a city.',
    parameters: { city: 'string (city name)' },
  },
  {
    name: 'get_news',
    description: 'Get latest news headlines on a topic.',
    parameters: { topic: 'string (topic/keyword)', lang: 'string (optional, e.g. en, fr, ar)' },
  },
  {
    name: 'github_read',
    description: 'Read a file from a GitHub repository.',
    parameters: { repo: 'string (owner/repo)', path: 'string (file path)', branch: 'string (optional)' },
  },
  {
    name: 'summarize',
    description: 'Summarize a long text into key points.',
    parameters: { text: 'string (text to summarize)', style: 'string (optional: bullet|paragraph|tldr)' },
  },
  {
    name: 'translate',
    description: 'Translate text to another language.',
    parameters: { text: 'string', target_lang: 'string (e.g. Arabic, French, English)' },
  },
];

const TOOLS_DESCRIPTION = TOOLS.map(t =>
  `- ${t.name}(${Object.entries(t.parameters).map(([k,v])=>`${k}: ${v}`).join(', ')}): ${t.description}`
).join('\n');

// ── AGENT SYSTEM PROMPT ───────────────────────────────────────
const AGENT_SYSTEM = `You are IlyassAI, an autonomous AI agent. You solve tasks step by step using a ReAct (Reasoning + Acting) framework.

AVAILABLE TOOLS:
${TOOLS_DESCRIPTION}

RESPONSE FORMAT (strictly follow this JSON format):
{
  "thought": "Your reasoning about what to do next",
  "action": "tool_name OR null (if done)",
  "action_input": { "param": "value" },
  "final_answer": "Your complete answer (ONLY when action is null)"
}

RULES:
1. Always think before acting
2. Use tools when you need real information
3. Never make up facts — search if unsure
4. When you have enough info, set action to null and provide final_answer
5. Maximum 10 iterations — be efficient
6. Respond ONLY with valid JSON, no markdown, no extra text
7. Speak the same language as the user (Arabic, French, English, Darija)`;

// ── LLM Providers (fallback chain) ────────────────────────────
async function callLLM(messages, isJSON = true) {
  const providers = [
    () => callGemini(messages, isJSON),
    () => callOpenRouter(messages, isJSON),
() => callGroq(messages, isJSON),
  ];

  for (const provider of providers) {
    try {
      const result = await provider();
      if (result) return result;
    } catch (e) {
      console.warn('[agent] Provider failed:', e.message);
    }
  }
  throw new Error('All LLM providers failed');
}

async function callGemini(messages, isJSON) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const contents = messages.slice(1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const systemMsg = messages[0]?.content || '';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemMsg }] },
        contents,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          ...(isJSON ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callOpenRouter(messages, isJSON) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://my-webxyu.vercel.app',
      'X-Title': 'IlyassAI',
    },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it:free',
      messages,
      temperature: 0.1,
      max_tokens: 4096,
      ...(isJSON ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callGroq(messages, isJSON) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('No GROQ_API_KEY');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.1,
      max_tokens: 4096,
      ...(isJSON ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

// ── Tool Executors ────────────────────────────────────────────
async function executeTool(name, input) {
  switch (name) {
    case 'web_search':   return await toolSearch(input.query);
    case 'web_fetch':    return await toolFetch(input.url);
    case 'code_execute': return toolCode(input.code);
    case 'get_weather':  return await toolWeather(input.city);
    case 'get_news':     return await toolNews(input.topic, input.lang);
    case 'github_read':  return await toolGithubRead(input.repo, input.path, input.branch);
    case 'summarize':    return `[Summarize tool - use LLM for this]: ${input.text?.slice(0, 500)}...`;
    case 'translate':    return `[Translate tool - use LLM for this]: "${input.text}" → ${input.target_lang}`;
    default: return `Unknown tool: ${name}`;
  }
}

async function toolSearch(query) {
  // Try Jina AI search (free, no key)
  try {
    const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'X-Return-Format': 'json' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const results = (data.data || []).slice(0, 5).map(r =>
        `[${r.title}](${r.url}): ${r.description || r.content?.slice(0,200) || ''}`
      ).join('\n');
      return results || 'No results found';
    }
  } catch(e) {}

  // Fallback: DuckDuckGo instant answer
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const answer = data.AbstractText || data.Answer || '';
    const related = (data.RelatedTopics || []).slice(0,3)
      .map(r => r.Text || '').filter(Boolean).join('\n');
    return (answer + '\n' + related).trim() || 'No instant answer available';
  } catch(e) {}

  return `Could not search for: ${query}`;
}

async function toolFetch(url) {
  try {
    // Use Jina Reader (free)
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const text = await res.text();
      return text.slice(0, 8000); // Limit to 8K chars
    }
  } catch(e) {}
  return `Failed to fetch: ${url}`;
}

function toolCode(code) {
  try {
    // Safe math/string evaluation
    const safe = code.replace(/[^0-9+\-*/().,%&|^~<>=!? \t\n]/g, '');
    const result = Function('"use strict"; return (' + safe + ')')();
    return String(result);
  } catch(e) {
    return `Error: ${e.message}`;
  }
}

async function toolWeather(city) {
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const current = data.current_condition?.[0];
    if (current) {
      return `${city}: ${current.weatherDesc?.[0]?.value}, ${current.temp_C}°C, feels like ${current.FeelsLikeC}°C, humidity ${current.humidity}%`;
    }
  } catch(e) {}
  return `Could not get weather for ${city}`;
}

async function toolNews(topic, lang = 'en') {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=${lang}&gl=US&ceid=US:${lang}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const text = await res.text();
    const items = [...text.matchAll(/<title>(.*?)<\/title>/g)]
      .slice(1, 6)
      .map(m => m[1].replace(/<[^>]*>/g, ''));
    return items.length > 0 ? items.join('\n') : 'No news found';
  } catch(e) {}
  return `Could not get news for: ${topic}`;
}

async function toolGithubRead(repo, path, branch = 'main') {
  try {
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    const ghToken = process.env.GITHUB_TOKEN;
    if (ghToken) headers['Authorization'] = `Bearer ${ghToken}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8').slice(0, 6000);
    }
    return data.message || 'File not found';
  } catch(e) {
    return `Error reading GitHub file: ${e.message}`;
  }
}

// ── Main Agent Loop ───────────────────────────────────────────
export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET')     return res.status(200).json({ ok: true, message: 'IlyassAI Agent v1 ✅' });
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const startTime = Date.now();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const task = (body?.task || body?.message || '').trim();
    if (!task) return res.status(400).json({ error: 'task is required' });

    const maxIterations = Math.min(body?.maxIterations || 8, 10);
    const steps = [];
    const messages = [
      { role: 'system', content: AGENT_SYSTEM },
      { role: 'user', content: `Task: ${task}` },
    ];

    let iteration = 0;
    let finalAnswer = null;

    while (iteration < maxIterations && !finalAnswer) {
      iteration++;

      // Call LLM
      let rawText = await callLLM(messages, true);

      // Parse JSON response
      let parsed;
      try {
        // Clean up common issues
        rawText = rawText?.trim();
        if (rawText?.startsWith('```')) {
          rawText = rawText.replace(/^```json?\n?/, '').replace(/```$/, '').trim();
        }
        parsed = JSON.parse(rawText);
      } catch(e) {
        // Try to extract JSON from text
        const match = rawText?.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); }
          catch(e2) { parsed = { thought: 'Parse error', action: null, final_answer: rawText || 'Could not process task' }; }
        } else {
          parsed = { thought: 'No valid JSON', action: null, final_answer: rawText || 'Task completed' };
        }
      }

      const step = {
        iteration,
        thought: parsed.thought || '',
        action: parsed.action || null,
        action_input: parsed.action_input || {},
        observation: null,
        timestamp: new Date().toISOString(),
      };

      // Execute tool if action is specified
      if (parsed.action && parsed.action !== 'null' && parsed.action !== null) {
        try {
          step.observation = await executeTool(parsed.action, parsed.action_input || {});
        } catch(e) {
          step.observation = `Tool error: ${e.message}`;
        }

        // Add observation to conversation
        messages.push({
          role: 'assistant',
          content: JSON.stringify({ thought: parsed.thought, action: parsed.action, action_input: parsed.action_input }),
        });
        messages.push({
          role: 'user',
          content: `Observation from ${parsed.action}: ${step.observation}\n\nContinue with the task.`,
        });
      } else {
        // Agent is done
        finalAnswer = parsed.final_answer || parsed.thought || 'Task completed';
        step.final = true;
      }

      steps.push(step);

      if (step.final) break;
    }

    // If max iterations reached without final answer
    if (!finalAnswer) {
      const lastStep = steps[steps.length - 1];
      finalAnswer = `Based on my research:\n\n${steps.map(s =>
        s.observation ? `• ${s.thought}\n  → ${s.observation?.slice(0,300)}` : `• ${s.thought}`
      ).join('\n\n')}`;
    }

    return res.status(200).json({
      answer: finalAnswer,
      steps,
      iterations: iteration,
      latency: Date.now() - startTime,
      task,
    });

  } catch(err) {
    console.error('[agent] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
