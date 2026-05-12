import { verifyApiKey, deductCredits } from './_middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isExternal = !!(req.headers['x-api-key'] ||
    (req.headers['authorization'] && !req.headers['authorization'].includes('Bearer undefined')));

  let userId = null;
  if (isExternal) {
    const { user, error, status } = await verifyApiKey(req);
    if (error) return res.status(status).json({ error });
    userId = user.id;
  }

  const { prompt, model = 'flux-pro', width = 1024, height = 1024, seed, enhance = true } =
    req.method === 'GET' ? req.query : (req.body || {});

  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  // Try FAL AI first if key exists
  if (process.env.FAL_KEY) {
    try {
      const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${process.env.FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          image_size: { width: parseInt(width), height: parseInt(height) },
          sync_mode: true
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.images?.[0]?.url;
        if (imageUrl) {
          if (isExternal && userId) await deductCredits(userId, 10);
          return res.status(200).json({
            success: true, imageUrl, prompt, model: 'flux-pro-ultra', provider: 'FAL AI', width, height
          });
        }
      }
    } catch (err) {
      console.error('FAL AI Error:', err);
    }
  }

  // Fallback to Pollinations.ai
  const encodedPrompt = encodeURIComponent(prompt);
  const seedParam    = seed ? `&seed=${seed}` : `&seed=${Math.floor(Math.random() * 999999)}`;
  const imageUrl     = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true${seedParam}${enhance ? '&enhance=true' : ''}`;

  if (isExternal && userId) await deductCredits(userId, 5);

  return res.status(200).json({
    success: true, imageUrl, prompt, model, provider: 'Pollinations.ai', width, height
  });
}
