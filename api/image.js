// IlyassAI — /api/image
// DUAL MODE: internal (no x-api-key) or external (with x-api-key)

import { verifyApiKey, deductCredits } from './_middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Detect if external API call ──
  const isExternal = !!(req.headers['x-api-key'] || req.headers['authorization']);
  let userId = null;

  if (isExternal) {
    const { user, error, status } = await verifyApiKey(req);
    if (error) return res.status(status).json({ error });
    userId = user.id;
  }

  const { prompt, model = 'flux', width = 1024, height = 1024, seed, enhance = true } =
    req.method === 'GET' ? req.query : (req.body || {});

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const encodedPrompt = encodeURIComponent(prompt);
  const seedParam     = seed ? `&seed=${seed}` : `&seed=${Math.floor(Math.random() * 999999)}`;
  const enhanceParam  = enhance ? '&enhance=true' : '';
  const noLogoParam   = '&nologo=true';

  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${width}&height=${height}${noLogoParam}${seedParam}${enhanceParam}`;

  try {
    await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000), redirect: 'follow' });
  } catch (e) { /* HEAD timeout OK, URL still valid */ }

  if (isExternal && userId) await deductCredits(userId, 5);

  return res.status(200).json({
    success:  true,
    imageUrl,
    prompt,
    model,
    provider: 'Pollinations.ai',
    width,
    height
  });
}
