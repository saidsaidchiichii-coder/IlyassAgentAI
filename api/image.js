// IlyassAI — /api/image
// Image generation using Pollinations.ai (free) with Stable Diffusion fallback

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { prompt, model = 'flux', width = 1024, height = 1024, seed, enhance = true } = 
    req.method === 'GET' ? req.query : (req.body || {});

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const encodedPrompt = encodeURIComponent(prompt);
  const seedParam = seed ? `&seed=${seed}` : '';
  const enhanceParam = enhance ? '&enhance=true' : '';

  // ── Pollinations.ai (100% free, no API key needed) ──
  try {
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true${seedParam}${enhanceParam}`;
    
    const pollRes = await fetch(pollinationsUrl);
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
          body: JSON.stringify({ inputs: prompt })
        }
      );

      if (hfRes.ok) {
        const buffer = await hfRes.arrayBuffer();
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('X-Provider', 'HuggingFace FLUX');
        return res.send(Buffer.from(buffer));
      }
    } catch (e) {
      console.error('HuggingFace image error:', e.message);
    }
  }

  // ── Return URL fallback ──
  return res.status(200).json({
    success: true,
    provider: 'Pollinations.ai (URL)',
    url: `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true`,
    prompt
  });
}
