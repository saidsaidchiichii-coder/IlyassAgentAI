// IlyassAI — /api/search
// Real-time web search using Brave, DuckDuckGo, and SerpAPI

export default async function handler(req, res) {
  // ── CORS preflight ──
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

  // ── Brave Search (primary) ──
  if (braveKey) {
    try {
      const braveRes = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&search_lang=en`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': braveKey
          },
          signal: AbortSignal.timeout(10000)  // FIX: added timeout
        }
      );

      if (braveRes.ok) {
        const data = await braveRes.json();
        const results = (data.web?.results || []).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
          source: 'Brave'
        }));
        return res.status(200).json({ success: true, provider: 'Brave', query, results });
      }
    } catch (e) {
      console.error('Brave search error:', e.message);
    }
  }

  // ── SerpAPI fallback ──
  if (serpKey) {
    try {
      const serpRes = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpKey}&num=10`,
        { signal: AbortSignal.timeout(10000) }  // FIX: added timeout
      );

      if (serpRes.ok) {
        const data = await serpRes.json();
        const results = (data.organic_results || []).map(r => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          source: 'SerpAPI'
        }));
        return res.status(200).json({ success: true, provider: 'SerpAPI', query, results });
      }
    } catch (e) {
      console.error('SerpAPI error:', e.message);
    }
  }

  // ── DuckDuckGo Instant Answer (free fallback) ──
  // FIX: Added timeout to prevent Vercel 30s timeout
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (ddgRes.ok) {
      const data = await ddgRes.json();
      const results = [];

      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '#',
          snippet: data.AbstractText,
          source: 'DuckDuckGo'
        });
      }

      (data.RelatedTopics || []).slice(0, 5).forEach(topic => {
        if (topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || query,
            url: topic.FirstURL || '#',
            snippet: topic.Text,
            source: 'DuckDuckGo'
          });
        }
      });

      // Even if no results, return success (DDG may have no instant answers)
      return res.status(200).json({ success: true, provider: 'DuckDuckGo', query, results });
    }
  } catch (e) {
    console.error('DuckDuckGo error:', e.message);
  }

  return res.status(503).json({ error: 'All search providers unavailable.' });
}
