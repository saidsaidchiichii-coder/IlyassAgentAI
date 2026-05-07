// ================================================================
//  api/parse.js — Document & URL Parsing
//  Tools (all FREE):
//    • Jina AI Reader  → r.jina.ai/{url}   (URLs → clean markdown)
//    • Jina AI Search  → s.jina.ai/{query} (web search → markdown)
//    • OCR.space       → ocr.space/parse   (images → text, 25K/month free)
//  Optional: set OCR_SPACE_API_KEY in Vercel env (or use free key "helloworld")
// ================================================================

export const config = { api: { bodyParser: true } };

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET')     return res.status(200).json({ ok: true, message: 'IlyassAI Parse API ✅' });
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const type = body?.type || 'url'; // 'url' | 'image_url' | 'text'

    // ── TYPE: URL → Jina AI Reader ────────────────────────────
    if (type === 'url') {
      const url = (body?.url || '').trim();
      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Valid URL required' });
      }

      const jinaUrl = `https://r.jina.ai/${url}`;
      const r = await fetch(jinaUrl, {
        headers: {
          'Accept':           'text/plain',
          'X-Return-Format':  'markdown',
          'X-Timeout':        '15',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!r.ok) {
        return res.status(r.status).json({ error: `Jina failed: ${r.status}` });
      }

      const markdown = await r.text();
      const truncated = markdown.slice(0, 8000); // Limit for LLM context

      return res.status(200).json({
        type:      'url',
        url,
        provider:  'jina_reader',
        content:   truncated,
        truncated: markdown.length > 8000,
        chars:     markdown.length,
        summary:   `Content from ${new URL(url).hostname} (${Math.ceil(truncated.split(' ').length / 200)} min read)`,
      });
    }

    // ── TYPE: Image URL → OCR.space ───────────────────────────
    if (type === 'image_url' || type === 'ocr') {
      const imageUrl = (body?.url || body?.imageUrl || '').trim();
      if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });

      const OCR_KEY = process.env.OCR_SPACE_API_KEY || 'helloworld'; // Free test key
      const fd      = new FormData();
      fd.append('url',          imageUrl);
      fd.append('language',     body?.language || 'eng');
      fd.append('isOverlayRequired', 'false');
      fd.append('detectOrientation', 'true');
      fd.append('scale',         'true');
      fd.append('OCREngine',     '2'); // Engine 2 = better accuracy

      const r = await fetch('https://api.ocr.space/parse/image', {
        method:  'POST',
        headers: { 'apikey': OCR_KEY },
        body:    fd,
        signal: AbortSignal.timeout(12000),
      });

      const data = await r.json();
      if (data.IsErroredOnProcessing) {
        return res.status(400).json({ error: data.ErrorMessage?.[0] || 'OCR failed' });
      }

      const text = (data.ParsedResults || [])
        .map(p => p.ParsedText || '')
        .join('\n')
        .trim();

      return res.status(200).json({
        type:      'ocr',
        provider:  'ocr_space',
        content:   text,
        chars:     text.length,
        pages:     data.ParsedResults?.length || 0,
      });
    }

    // ── TYPE: Raw text processing ─────────────────────────────
    if (type === 'text') {
      const text = (body?.text || '').trim();
      if (!text) return res.status(400).json({ error: 'text required' });

      // Extract URLs from text
      const urls = text.match(/https?:\/\/[^\s]+/g) || [];
      const wordCount = text.split(/\s+/).length;

      return res.status(200).json({
        type:      'text',
        content:   text.slice(0, 8000),
        wordCount,
        urls,
        hasCode:   /```|<code|function |def |import |class /.test(text),
      });
    }

    return res.status(400).json({ error: 'type must be: url | image_url | text' });

  } catch(err) {
    console.error('[parse] Error:', err);
    return res.status(500).json({ error: err.message || 'Parse failed' });
  }
}
