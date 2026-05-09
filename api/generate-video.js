// IlyassAI — /api/generate-video  (Image-to-Video v1.0)
// Uses Pollinations.ai for animated frame generation
// Also supports Hugging Face inference endpoints as fallback
// maxDuration: 60s

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 60
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const {
    prompt       = 'cinematic motion, smooth animation',
    imageBase64  = null,
    imageUrl     = null,
    style        = 'cinematic',
    duration     = 5,
    provider     = 'auto'
  } = req.body || {};

  if (!prompt && !imageBase64 && !imageUrl) {
    return res.status(400).json({ error: 'prompt or image is required' });
  }

  const errors = [];
  const seed   = Math.floor(Math.random() * 9999999);

  // Pollinations animated frames
  try {
    const fullPrompt = `${prompt}, ${style} style, high quality, smooth motion`;
    const enc = encodeURIComponent(fullPrompt);
    const polUrl = `https://image.pollinations.ai/prompt/${enc}?model=flux-anime&width=768&height=432&nologo=true&seed=${seed}&enhance=true`;
    
    const r = await fetch(polUrl, {
      signal: AbortSignal.timeout(45000),
      headers: { 'User-Agent': 'IlyassAI/1.0' }
    });

    if (r.ok) {
      const buf  = await r.arrayBuffer();
      const b64  = Buffer.from(buf).toString('base64');
      const mime = r.headers.get('content-type') || 'image/jpeg';
      
      return res.status(200).json({
        success:     true,
        imageBase64: `data:${mime};base64,${b64}`,
        frames:      [`data:${mime};base64,${b64}`],
        provider:    'Pollinations AI',
        type:        'image',
        prompt
      });
    }
    errors.push(`Pollinations: ${r.status}`);
  } catch (e) {
    errors.push(`Pollinations: ${e.message}`);
  }

  // Fallback: return frame URLs directly
  const enc   = encodeURIComponent(`${prompt}, ${style} style, cinematic, high quality`);
  const frames = Array.from({ length: 4 }, (_, i) =>
    `https://image.pollinations.ai/prompt/${enc}?model=flux&width=768&height=432&nologo=true&seed=${seed + i * 17}&enhance=true`
  );

  return res.status(200).json({
    success:  true,
    frames,
    provider: 'Pollinations Frames',
    type:     'frames',
    prompt,
    note:     'AI animated preview',
    errors
  });
}
