// IlyassAI — /api/image
// Image generation using Pollinations.ai (free) with Stable Diffusion fallback

export default async function handler(req, res) {
  // ── CORS preflight ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model = 'flux', width = 1024, height = 1024, seed, enhance = true } = 
    req.method === 'GET' ? req.query : (req.body || {});

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const encodedPrompt = encodeURIComponent(prompt);
  const seedParam = seed ? `&seed=${seed}` : '';
  const enhanceParam = enhance ? '&enhance=true' : '';

  // ── Pollinations.ai (100% free, no API key needed) ──
  // Fixed: added AbortSignal.timeout(25000) to stay within Vercel's 30s limit
  try {
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true${seedParam}${enhanceParam}`;
    
    const pollRes = await fetch(pollinationsUrl, {
      signal: AbortSignal.timeout(25000)
    });
    if (pollRes.ok) {
      const contentType = pollRes.headers.get('content-type');
      const buffer = await pollRes.arrayBuffer();
      
      res.setHeader('Content-Type', contentType || 'image/jpeg');
      res.setHeader('X-Provider', 'Pollinations.ai');
      res.setHeader('X-Model', model);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(buffer));
    }
  } catch (e) {
    console.error('Pollinations error:', e.message);
  }

  // ── HuggingFace Stable Diffusion fallback ──
  const hfKey = process.env.HF_API_KEY;
  if (hfKey) {
    try {
      const hfRes = await fetch(
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: prompt }),
          signal: AbortSignal.timeout(25000)
        }
      );

      if (hfRes.ok) {
        const buffer = await hfRes.arrayBuffer();
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('X-Provider', 'HuggingFace FLUX');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(Buffer.from(buffer));
      }
    } catch (e) {
      console.error('HuggingFace image error:', e.message);
    }
  }

  // ── Return placeholder SVG if all image providers fail ──
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#1a1a2e"/>
    <text x="256" y="240" font-family="Arial" font-size="20" fill="#888" text-anchor="middle">Image generation unavailable</text>
    <text x="256" y="275" font-family="Arial" font-size="14" fill="#555" text-anchor="middle">Set HF_API_KEY in Vercel env vars</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.status(503).send(svg);
}
