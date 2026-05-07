// IlyassAI — /api/parse
// Document/URL parsing: extract text from PDFs, web pages, and files

export default async function handler(req, res) {
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
