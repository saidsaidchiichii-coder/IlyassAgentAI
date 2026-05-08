// IlyassAI — /api/search
// Brave → SerpAPI → SearXNG public → DuckDuckGo instant

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const query = req.method === 'GET' ? req.query.q : req.body?.query;
  if (!query) return res.status(400).json({ error: 'query (q) is required' });

  const braveKey = process.env.BRAVE_API_KEY;
  const serpKey  = process.env.SERP_API_KEY;

  // 1. Brave
  if (braveKey) {
    try {
      const r = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
        { headers: { 'Accept': 'application/json', 'X-Subscription-Token': braveKey }, signal: AbortSignal.timeout(8000) }
      );
      if (r.ok) {
        const data = await r.json();
        const results = (data.web?.results || []).map(r => ({ title: r.title, url: r.url, snippet: r.description, source: 'Brave' }));
        if (results.length > 0) return res.status(200).json({ success: true, provider: 'Brave', query, results });
      }
    } catch (e) {}
  }

  // 2. SerpAPI
  if (serpKey) {
    try {
      const r = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpKey}&num=10`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const data = await r.json();
        const results = (data.organic_results || []).map(r => ({ title: r.title, url: r.link, snippet: r.snippet, source: 'SerpAPI' }));
        if (results.length > 0) return res.status(200).json({ success: true, provider: 'SerpAPI', query, results });
      }
    } catch (e) {}
  }

  // 3. Bing via bing.com (scrape-free approach using meta tags)
  try {
    const r = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10&mkt=en-US`,
      { headers: { 'Accept': 'application/json', 'Ocp-Apim-Subscription-Key': '' }, signal: AbortSignal.timeout(8000) }
    );
    // Skip if no key
  } catch (e) {}

  // 4. DuckDuckGo Instant Answer
  try {
    const r = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (r.ok) {
      const data = await r.json();
      const results = [];
      if (data.AbstractText) results.push({ title: data.Heading || query, url: data.AbstractURL || '#', snippet: data.AbstractText, source: 'DuckDuckGo' });
      (data.RelatedTopics || []).slice(0, 7).forEach(t => {
        if (t.Text) results.push({ title: t.Text.split(' - ')[0] || query, url: t.FirstURL || '#', snippet: t.Text, source: 'DuckDuckGo' });
      });
      if (results.length > 0) return res.status(200).json({ success: true, provider: 'DuckDuckGo', query, results });
    }
  } catch (e) {}

  // 5. Wikipedia API as last resort
  try {
    const r = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5&origin=*`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (r.ok) {
      const data = await r.json();
      const results = (data.query?.search || []).map(p => ({
        title: p.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
        snippet: p.snippet.replace(/<[^>]+>/g, ''),
        source: 'Wikipedia'
      }));
      if (results.length > 0) return res.status(200).json({ success: true, provider: 'Wikipedia', query, results });
    }
  } catch (e) {}

  return res.status(503).json({ error: 'All search providers unavailable.' });
}
