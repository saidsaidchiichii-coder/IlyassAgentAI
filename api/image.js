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

  const { prompt, width = 1024, height = 1024, quality = 'high', seed, enhance = true } =
    req.method === 'GET' ? req.query : (req.body || {});

  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  // ── 1. GPT-Image-1 (OpenAI) ─────────────────────────────
  const OPENAI_KEY = process.env.OPENAI_API_KEY || 'sk-83pg9XSh2A1slF76B5594175E7A048929a632f2c274e6eCa';
  if (OPENAI_KEY) {
    try {
      const size = `${width}x${height}`;
      const validSizes = ['1024x1024', '1536x1024', '1024x1536'];
      const finalSize  = validSizes.includes(size) ? size : '1024x1024';

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: finalSize,
          quality: quality === 'high' ? 'high' : 'medium',
          output_format: 'url'
        }),
        signal: AbortSignal.timeout(90000)
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;
        if (imageUrl) {
          const finalUrl = imageUrl.startsWith('http')
            ? imageUrl
            : `data:image/png;base64,${imageUrl}`;
          if (isExternal && userId) await deductCredits(userId, 15);
          return res.status(200).json({
            success: true,
            imageUrl: finalUrl,
            prompt,
            model: 'gpt-image-1',
            provider: 'OpenAI GPT-Image',
            width: parseInt(width),
            height: parseInt(height)
          });
        }
      } else {
        const errText = await response.text();
        console.error('GPT-Image-1 Error:', response.status, errText);
      }
    } catch (err) {
      console.error('GPT-Image-1 Exception:', err.message);
    }
  }

  // ── 2. FAL AI (fallback) ─────────────────────────────────
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
            success: true, imageUrl, prompt,
            model: 'flux-pro-ultra', provider: 'FAL AI',
            width, height
          });
        }
      }
    } catch (err) {
      console.error('FAL AI Error:', err);
    }
  }

  // ── 3. Pollinations.ai (fallback أخير) ───────────────────
  const encodedPrompt = encodeURIComponent(prompt);
  const seedParam     = seed ? `&seed=${seed}` : `&seed=${Math.floor(Math.random() * 999999)}`;
  const imageUrl      = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=${width}&height=${height}&nologo=true${seedParam}${enhance ? '&enhance=true' : ''}`;

  if (isExternal && userId) await deductCredits(userId, 5);

  return res.status(200).json({
    success: true, imageUrl, prompt,
    model: 'flux', provider: 'Pollinations.ai',
    width, height
  });
}
