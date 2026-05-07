// ================================================================
//  api/chat.js — IlyassAI Chat Handler v6.0 (Enhanced)
//  
//  Pipeline (per request):
//    1. Moderation check (rule-based + optional OpenAI/Groq)
//    2. URL detection → Jina AI Reader (auto-fetch page content)
//    3. Mode routing:
//       • search  → Web search (Jina/DDG/Tavily) → inject results
//       • think   → DeepSeek R1 with chain-of-thought
//       • image   → handled by /api/image
//       • auto    → Smart routing (detect intent)
//    4. Memory search → inject relevant context (if Upstash configured)
//    5. Groq LLM call (Llama 3.3 70B / DeepSeek R1 / Llama 8B)
//    6. Analytics via Helicone proxy (if HELICONE_API_KEY set)
// ================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── System prompts ─────────────────────────────────────────────
const SYSTEM_BASE = `You are IlyassAI, an advanced AI assistant. You are helpful, accurate, creative, and concise.
- Format responses with Markdown when helpful (headers, lists, code blocks)
- For code, always specify the language in code blocks
- Be direct and avoid unnecessary filler text
- Current date: ${new Date().toISOString().split('T')[0]}`;

const SYSTEM_SEARCH = `${SYSTEM_BASE}
You have access to real-time web search results. When search results are provided:
- Cite sources with [1], [2] etc. inline
- Prioritize recent, authoritative sources
- Clearly indicate when information comes from search vs. your training data`;

const SYSTEM_THINK = `${SYSTEM_BASE}
You are in deep reasoning mode. For complex problems:
- Break down the problem step by step
- Consider multiple approaches before concluding
- Show your reasoning process clearly
- Use mathematical notation when relevant`;

// ── URL detection regex ────────────────────────────────────────
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g;

// ── Simple moderation (no external API) ───────────────────────
function quickModerate(text) {
  const lower = text.toLowerCase();
  const blocked = [
    /\b(bomb|explosive)\s*(make|build|create|how)/,
    /\b(child|minor)\s*(porn|nude|sex)/,
    /\bmalware\s*(create|write|code)/,
  ];
  return !blocked.some(p => p.test(lower));
}

export default async function handler(req, res) {
  // CORS
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET')     return res.status(200).json({ ok: true, message: 'IlyassAI API v6 ✅' });
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const startTime = Date.now();

  try {
    // ── Parse body ────────────────────────────────────────────
    const body    = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const message = (body?.message || '').trim();
    const mode    = body?.mode    || 'auto';
    const model   = body?.model   || 'llama-3.3-70b-versatile';
    const userId  = body?.userId  || 'anonymous';

    if (!message) return res.status(400).json({ error: 'message is required' });

    // ── Step 1: Quick moderation ──────────────────────────────
    if (!quickModerate(message)) {
      return res.status(200).json({
        reply:     '⚠️ I cannot help with that request. Please ask something appropriate.',
        flagged:   true,
        mode:      'blocked',
      });
    }

    // ── Step 2: URL detection & content fetching ──────────────
    let urlContext = '';
    const urls = message.match(URL_REGEX) || [];
    if (urls.length > 0 && mode !== 'image') {
      try {
        const url = urls[0]; // Process first URL
        const jinaUrl = `https://r.jina.ai/${url}`;
        const r = await fetch(jinaUrl, {
          headers: { 'Accept': 'text/plain', 'X-Timeout': '8' },
          signal:  AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const content = await r.text();
          urlContext = `\n\n## 📄 Content from ${new URL(url).hostname}:\n${content.slice(0, 3000)}\n[Content truncated]`;
        }
      } catch(e) { console.warn('[chat] URL fetch failed:', e.message); }
    }

    // ── Step 3: Web Search (search mode or auto-detect) ───────
    let searchContext = '';
    let searchResults = null;
    const isSearchIntent = mode === 'search' || (
      mode === 'auto' && /\b(latest|current|today|news|2024|2025|price|weather|who is|what is happening)\b/i.test(message)
    );

    if (isSearchIntent && mode !== 'image') {
      try {
        const searchRes = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/api/search`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ query: message, maxResults: 4 }),
          signal:  AbortSignal.timeout(8000),
        }).catch(() => null);

        // Fallback: direct Jina search
        if (!searchRes?.ok) {
          const jRes = await fetch(`https://s.jina.ai/${encodeURIComponent(message)}`, {
            headers: { 'Accept': 'text/plain' },
            signal:  AbortSignal.timeout(8000),
          });
          if (jRes.ok) {
            const text = await jRes.text();
            searchContext = `\n\n## 🔍 Web Search Results:\n${text.slice(0, 3000)}`;
            searchResults = { provider: 'jina', markdown: text };
          }
        } else {
          const data = await searchRes.json();
          searchContext = `\n\n## 🔍 Web Search Results:\n${data.markdown || ''}`;
          searchResults = data;
        }
      } catch(e) { console.warn('[chat] Search failed:', e.message); }
    }

    // ── Step 4: Memory/RAG context ────────────────────────────
    let memoryContext = '';
    const UPSTASH_URL = process.env.UPSTASH_VECTOR_REST_URL;
    if (UPSTASH_URL && message.length > 10) {
      try {
        const memRes = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/api/memory`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'search', query: message, userId, topK: 3 }),
          signal:  AbortSignal.timeout(3000),
        }).catch(() => null);

        if (memRes?.ok) {
          const memData = await memRes.json();
          if (memData.context?.trim()) {
            memoryContext = `\n\n## 📚 Relevant Context from Documents:\n${memData.context}\n`;
          }
        }
      } catch(e) { console.warn('[chat] Memory search failed:', e.message); }
    }

    // ── Step 5: Build messages ────────────────────────────────
    const systemPrompt = (mode === 'think' ? SYSTEM_THINK : isSearchIntent ? SYSTEM_SEARCH : SYSTEM_BASE)
      + urlContext + searchContext + memoryContext;

    // Model selection
    const modelMap = {
      'think':   'deepseek-r1-distill-llama-70b',
      'fast':    'llama-3.1-8b-instant',
      'default': 'llama-3.3-70b-versatile',
    };
    const selectedModel = modelMap[mode] || model || modelMap.default;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: message },
    ];

    // ── Step 6: Call Groq (with optional Helicone proxy) ──────
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
      return res.status(500).json({ error: '⚠️ GROQ_API_KEY not configured in Vercel environment variables.' });
    }

    const HELICONE_KEY = process.env.HELICONE_API_KEY;
    const groqEndpoint = HELICONE_KEY
      ? 'https://groq.helicone.ai/openai/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';

    const groqHeaders = {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    };

    if (HELICONE_KEY) {
      groqHeaders['Helicone-Auth']    = `Bearer ${HELICONE_KEY}`;
      groqHeaders['Helicone-User-Id'] = userId;
      groqHeaders['Helicone-Property-Mode'] = mode;
      groqHeaders['Helicone-Property-App']  = 'IlyassAI';
    }

    const groqRes = await fetch(groqEndpoint, {
      method:  'POST',
      headers: groqHeaders,
      body: JSON.stringify({
        model:       selectedModel,
        messages,
        max_tokens:  2048,
        temperature: mode === 'think' ? 0.3 : 0.7,
        top_p:       0.95,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[chat] Groq error:', groqRes.status, errText);
      return res.status(500).json({ error: `AI service error: ${groqRes.status}` });
    }

    const groqData = await groqRes.json();
    const reply    = groqData.choices?.[0]?.message?.content || 'No response generated.';

    // ── Step 7: Return enhanced response ─────────────────────
    return res.status(200).json({
      reply,
      model:        selectedModel,
      mode,
      searchUsed:   !!searchContext,
      urlFetched:   !!urlContext && urls.length > 0 ? urls[0] : null,
      memoryUsed:   !!memoryContext,
      searchResults: searchResults || null,
      latency:      Date.now() - startTime,
      tokens: {
        prompt:     groqData.usage?.prompt_tokens || 0,
        completion: groqData.usage?.completion_tokens || 0,
        total:      groqData.usage?.total_tokens || 0,
      },
    });

  } catch(err) {
    console.error('[chat] Unhandled error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
