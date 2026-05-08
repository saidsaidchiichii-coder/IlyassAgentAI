// IlyassAI — /api/search
// Web search: Brave (primary) → SerpAPI → DuckDuckGo HTML scraping (free fallback)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = req.method === 'GET' ? req.query.q : req.body?.query;
  if (!query) {
    return res.status(400).json({ error: 'query (q) is required' });
  }

  const braveKey = process.env.BRAVE_API_KEY;
  const serpKey  = process.env.SERP_API_KEY;

  // ── 1. Brave Search (best, if key available) ──
  if (braveKey) {
    try {
      const r = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': braveKey
          },
          signal: AbortSignal.timeout(8000)
        }
      );
      if (r.ok) {
        const data = await r.json();
        const results = (data.web?.results || []).map(r => ({
          title: r.title, url: r.url, snippet: r.description, source: 'Brave'
        }));
        if (results.length > 0)
          return res.status(200).json({ success: true, provider: 'Brave', query, results });
      }
    } catch (e) { console.error('Brave:', e.message); }
  }

  // ── 2. SerpAPI fallback ──
  if (serpKey) {
    try {
      const r = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpKey}&num=10`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (r.ok) {
        const data = await r.json();
        const results = (data.organic_results || []).map(r => ({
          title: r.title, url: r.link, snippet: r.snippet, source: 'SerpAPI'
        }));
        if (results.length > 0)
          return res.status(200).json({ success: true, provider: 'SerpAPI', query, results });
      }
    } catch (e) { console.error('SerpAPI:', e.message); }
  }

  // ── 3. DuckDuckGo HTML scraping (free, no API key) ──
  try {
    const ddgRes = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(12000)
      }
    );

    if (ddgRes.ok) {
      const html = await ddgRes.text();

      // Extract titles + URLs
      const titleMatches = [...html.matchAll(/class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)</g)];
      // Extract snippets
      const snippetMatches = [...html.matchAll(/class="result__snippet"[^>]*>([^<]+)</g)];

      const results = titleMatches.slice(0, 8).map((m, i) => ({
        title: m[2]?.trim() || query,
        url: m[1]?.trim() || '#',
        snippet: snippetMatches[i]?.[1]?.trim() || '',
        source: 'DuckDuckGo'
      })).filter(r => r.url !== '#' && r.title);

      if (results.length > 0) {
        return res.status(200).json({ success: true, provider: 'DuckDuckGo', query, results });
      }
    }
  } catch (e) { console.error('DDG HTML:', e.message); }

  // ── 4. DuckDuckGo Instant Answer (last resort) ──
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (ddgRes.ok) {
      const data = await ddgRes.json();
      const results = [];
      if (data.AbstractText) {
        results.push({ title: data.Heading || query, url: data.AbstractURL || '#', snippet: data.AbstractText, source: 'DuckDuckGo' });
      }
      (data.RelatedTopics || []).slice(0, 5).forEach(t => {
        if (t.Text) results.push({ title: t.Text.split(' - ')[0] || query, url: t.FirstURL || '#', snippet: t.Text, source: 'DuckDuckGo' });
      });
      if (results.length > 0)
        return res.status(200).json({ success: true, provider: 'DuckDuckGo', query, results });
    }
  } catch (e) { console.error('DDG instant:', e.message); }

  return res.status(503).json({ error: 'All search providers unavailable.' });
}
