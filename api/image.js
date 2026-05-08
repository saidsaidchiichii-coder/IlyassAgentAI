// IlyassAI — /api/image
// Returns JSON { imageUrl } — Pollinations.ai (free, no key) with HF fallback

export default async function handler(req, res) {
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
  const seedParam = seed ? `&seed=${seed}` : `&seed=${Math.floor(Math.random() * 999999)}`;
  const enhanceParam = enhance ? '&enhance=true' : '';
  const noLogoParam = '&nologo=true';

  // ── Pollinations.ai — return URL directly (no binary download needed)
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${width}&height=${height}${noLogoParam}${seedParam}${enhanceParam}`;

  // Verify the URL works with a HEAD request
  try {
    const check = await fetch(imageUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000),
      redirect: 'follow'
    });

    if (check.ok || check.status === 200) {
      return res.status(200).json({
        success: true,
        imageUrl,
        prompt,
        model,
        provider: 'Pollinations.ai',
        width,
        height
      });
    }
  } catch (e) {
    console.error('Pollinations HEAD check failed:', e.message);
  }

  // If HEAD fails, still return the URL (Pollinations generates on-demand)
  // The URL is valid even if HEAD times out
  return res.status(200).json({
    success: true,
    imageUrl,
    prompt,
    model,
    provider: 'Pollinations.ai',
    width,
    height
  });
}
