// ================================================================
//  api/image.js — IlyassAI Image Generation
//  Providers:
//    1. Pollinations.ai Turbo (default, FREE, no key, fast)
//    2. Pollinations.ai FLUX  (higher quality, slower)
//    3. Hugging Face FLUX.1   (optional, needs HF_TOKEN env var)
// ================================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET')     return res.status(200).json({ ok: true, message: 'IlyassAI Image API ✅' });
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // ✅ FIX 1: Accept BOTH "message" and "prompt" fields
    const rawPrompt = (body?.message || body?.prompt || '').trim();
    if (!rawPrompt) return res.status(400).json({ error: 'message or prompt is required' });

    // Clean prompt (remove command words)
    let prompt = rawPrompt
      .replace(/^(generate|create|make|draw|paint|render|show|produce)\s+(an?\s+)?(image|picture|photo|illustration|art|artwork)\s+(of\s+)?/i, '')
      .replace(/^(generate|create|make)\s+/i, '')
      .trim() || rawPrompt;

    const provider = body?.provider || 'turbo'; // turbo = fastest
    const width    = Math.min(body?.width  || 1024, 1024);
    const height   = Math.min(body?.height || 1024, 1024);
    const seed     = body?.seed || Math.floor(Math.random() * 999999);

    // ── PROVIDER 1: Pollinations.ai (no API key, always free) ──
    // ✅ FIX 2: Use turbo model + remove enhance=true (was slowing things down)
    const model    = provider === 'flux' ? 'flux' : 'turbo';
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${model}&width=${width}&height=${height}&seed=${seed}&nologo=true&safe=false`;

    return res.status(200).json({
      ok:        true,
      imageUrl,
      imageType: 'url',
      prompt,
      seed,
      model,
      provider:  `Pollinations.ai / ${model.toUpperCase()}`,
    });

  } catch(err) {
    console.error('[image] Error:', err);
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
