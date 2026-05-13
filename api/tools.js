// ============================================================
// api/tools.js — MERGED: search + moderate + parse
// Route via ?action=search | moderate | parse  
// ============================================================

// IlyassAI — /api/search
// Brave → SerpAPI → SearXNG public → DuckDuckGo instant

async function handleSearch(req, res) {
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


// IlyassAI — /api/moderate (Edge Function — not counted in 12-function limit)
// export const config = { runtime: 'edge' };

async function handleModerate(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const content = body.text || body.input;
  if (!content) {
    return new Response(JSON.stringify({ error: 'text or input is required' }), { status: 400, headers: corsHeaders });
  }

  // Basic keyword fallback (no OpenAI key needed)
  const blockedPatterns = [/\b(harm|violence|abuse|illegal|nsfw)\b/i];
  const flagged = blockedPatterns.some(p => p.test(content));

  return new Response(JSON.stringify({
    success: true,
    provider: 'keyword-filter',
    flagged,
    categories: { violence: flagged },
    scores: { violence: flagged ? 0.9 : 0.01 }
  }), { status: 200, headers: corsHeaders });
}


// IlyassAI — /api/parse
// Document/URL parsing: extract text from PDFs, web pages, and files

async function handleParse(req, res) {
  // ── CORS preflight ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, type = 'web' } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    if (type === 'web') {
      // Try Jina Reader first (much better text extraction, free)
      try {
        const jinaRes = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'IlyassAI/2.0'
          },
          signal: AbortSignal.timeout(12000)
        });
        if (jinaRes.ok) {
          const jinaData = await jinaRes.json();
          return res.status(200).json({
            success: true,
            url,
            title: jinaData.data?.title || url,
            description: jinaData.data?.description || '',
            text: (jinaData.data?.content || '').slice(0, 10000),
            wordCount: (jinaData.data?.content || '').split(/\s+/).length,
            provider: 'Jina Reader'
          });
        }
      } catch (jinaErr) {
        console.error('Jina Reader error:', jinaErr.message);
      }

      // Fallback: fetch raw HTML and extract text
      const pageRes = await fetch(url, {
        headers: { 'User-Agent': 'IlyassAI/2.0 (document-parser)' },
        signal: AbortSignal.timeout(10000)
      });

      if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);

      const html = await pageRes.text();
      
      // Simple HTML text extractor
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000);

      const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || url;
      const description = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] || '';

      return res.status(200).json({
        success: true,
        url,
        title,
        description,
        text,
        wordCount: text.split(/\s+/).length,
        provider: 'Direct Fetch'
      });
    }

    return res.status(400).json({ error: `Unsupported type: ${type}` });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'search';
  if (action === 'search') return handleSearch(req, res);
  if (action === 'moderate') return handleModerate(req, res);
  if (action === 'parse') return handleParse(req, res);
  return res.status(400).json({ error: 'Unknown action. Use ?action=search|moderate|parse' });
}
