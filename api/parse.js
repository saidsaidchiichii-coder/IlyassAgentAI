// IlyassAI — /api/parse
// Document/URL parsing: extract text from PDFs, web pages, and files

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { url, type = 'web' } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    if (type === 'web') {
      // Fetch and extract text from a web page
      const pageRes = await fetch(url, {
        headers: { 'User-Agent': 'IlyassAI/1.0 (document-parser)' },
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
        wordCount: text.split(/\s+/).length
      });
    }

    return res.status(400).json({ error: `Unsupported type: ${type}` });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
