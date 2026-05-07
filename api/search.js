// ================================================================
//  api/search.js — Real-time Web Search
//  Providers (priority order, all FREE):
//    1. Jina AI Search  → https://s.jina.ai/{query}  (free, no key)
//    2. DuckDuckGo API  → instant answers + web results (no key)
//  Optional (add TAVILY_API_KEY in Vercel env):
//    3. Tavily AI       → best quality, 1000 req/month free
// ================================================================

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, message: 'IlyassAI Search API ✅' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body  = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const query = (body?.query || body?.q || '').trim();
    if (!query) return res.status(400).json({ error: 'query is required' });

    const maxResults = Math.min(body?.maxResults || 5, 10);
    const provider   = body?.provider || 'auto';

    // ── PROVIDER 1: Tavily AI (best quality) ──────────────────
    const TAVILY_KEY = process.env.TAVILY_API_KEY;
    if (TAVILY_KEY && (provider === 'tavily' || provider === 'auto')) {
      try {
        const r = await fetch('https://api.tavily.com/search', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key:        TAVILY_KEY,
            query,
            search_depth:   'basic',
            max_results:    maxResults,
            include_answer: true,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const data = await r.json();
          return res.status(200).json(formatTavily(data, query));
        }
      } catch(e) { console.warn('[search] Tavily failed, trying Jina:', e.message); }
    }

    // ── PROVIDER 2: Jina AI Search (free, no key) ─────────────
    if (provider === 'jina' || provider === 'auto') {
      try {
        const encoded = encodeURIComponent(query);
        const r = await fetch(`https://s.jina.ai/${encoded}`, {
          headers: { 'Accept': 'application/json', 'X-Respond-With': 'markdown' },
          signal: AbortSignal.timeout(10000),
        });
        if (r.ok) {
          const text = await r.text();
          return res.status(200).json(formatJinaSearch(text, query));
        }
      } catch(e) { console.warn('[search] Jina failed, trying DDG:', e.message); }
    }

    // ── PROVIDER 3: DuckDuckGo Instant Answer (fallback) ──────
    {
      const encoded = encodeURIComponent(query);
      const r = await fetch(
        `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1&t=IlyassAI`,
        { signal: AbortSignal.timeout(6000) }
      );
      const data = await r.json();
      return res.status(200).json(formatDDG(data, query));
    }

  } catch(err) {
    console.error('[search] Error:', err);
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
}

// ── Formatters ─────────────────────────────────────────────────

function formatTavily(data, query) {
  const results = (data.results || []).map((r, i) => ({
    index:   i + 1,
    title:   r.title,
    url:     r.url,
    snippet: r.content?.slice(0, 300) || '',
    score:   r.relevance_score,
  }));

  const markdown = [
    `## 🔍 Search: "${query}"`,
    data.answer ? `\n**Quick Answer:** ${data.answer}\n` : '',
    '### Sources',
    ...results.map(r =>
      `**[${r.index}] [${r.title}](${r.url})**\n${r.snippet}\n`
    ),
  ].join('\n');

  return { query, provider: 'tavily', answer: data.answer || '', results, markdown };
}

function formatJinaSearch(text, query) {
  // Parse Jina's markdown response into structured results
  const lines   = text.split('\n').filter(Boolean);
  const results = [];
  let current   = null;

  for (const line of lines) {
    const urlMatch = line.match(/https?:\/\/[^\s)]+/);
    if (line.startsWith('## ') || line.startsWith('### ')) {
      if (current) results.push(current);
      current = { index: results.length + 1, title: line.replace(/^#+\s*/, '').trim(), url: '', snippet: '' };
    } else if (current && urlMatch && !current.url) {
      current.url = urlMatch[0];
    } else if (current && line.length > 30) {
      current.snippet += line.slice(0, 200) + ' ';
    }
    if (results.length >= 6) break;
  }
  if (current) results.push(current);

  const markdown = [
    `## 🔍 Search: "${query}"`,
    '### Sources',
    ...results.slice(0, 5).map(r =>
      `**[${r.index}] ${r.url ? `[${r.title}](${r.url})` : r.title}**\n${r.snippet.trim()}\n`
    ),
    '\n*Powered by Jina AI Search*',
  ].join('\n');

  return { query, provider: 'jina', answer: '', results: results.slice(0, 5), markdown };
}

function formatDDG(data, query) {
  const answer  = data.AbstractText || data.Answer || '';
  const relTopics = (data.RelatedTopics || [])
    .filter(t => t.Text && t.FirstURL)
    .slice(0, 5)
    .map((t, i) => ({
      index:   i + 1,
      title:   (t.Text || '').slice(0, 80),
      url:     t.FirstURL || '',
      snippet: (t.Text || '').slice(0, 250),
    }));

  const markdown = [
    `## 🔍 Search: "${query}"`,
    answer ? `\n**Quick Answer:** ${answer}\n` : '',
    relTopics.length ? '### Related Results' : '### No detailed results found',
    ...relTopics.map(r =>
      `**[${r.index}] [${r.title}](${r.url})**\n${r.snippet}\n`
    ),
    '\n*Powered by DuckDuckGo*',
  ].join('\n');

  return { query, provider: 'duckduckgo', answer, results: relTopics, markdown };
}
