// IlyassAI — /api/video  (Text-to-Video & Image-to-Video v4.0)
// Priority: Pollinations → HF i2vgen-xl → HF damo-vilab → Zeroscope → AnimateDiff → Animated Frames
// Env vars: POLLINATIONS_API_KEY (optional), HF_API_KEY or HF_TOKEN_V2 (optional)
// maxDuration: 60s

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
  maxDuration: 60
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    prompt = '',
    style  = 'cinematic',
    imageUrl    = null,
    imageBase64 = null,
    provider    = 'auto'
  } = req.body || {};

  if (!prompt && !imageUrl && !imageBase64)
    return res.status(400).json({ error: 'prompt is required' });

  // Env vars — never hardcoded
  const pollinationsKey = process.env.POLLINATIONS_API_KEY;
  const hfKey = process.env.HF_API_KEY || process.env.HF_TOKEN_V2;
  const errors = [];
  const seed   = Math.floor(Math.random() * 99999);
  const hasImage = !!(imageUrl || imageBase64);

  const styleMap = {
    cinematic:     'cinematic camera movement, dramatic lighting, film grain, 4k ultra hd',
    smooth:        'smooth gentle motion, soft bokeh, dreamy atmosphere, high quality',
    dynamic:       'dynamic zoom, fast motion, energetic, sharp, action',
    'slow-motion': 'slow motion, graceful movement, elegant, ethereal, cinematic',
    'zoom-in':     'slow zoom in, cinematic push, focus pull, shallow depth of field',
    'zoom-out':    'slow zoom out, wide reveal, cinematic pullback, epic scale'
  };
  const fullPrompt = `${prompt}${styleMap[style] ? ', ' + styleMap[style] : ''}`;

  // ── Helper: HuggingFace Inference API ────────────────────────────────────
  async function callHF(model, inputs, params = {}) {
    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method:  'POST',
      headers: {
        ...(hfKey ? { 'Authorization': `Bearer ${hfKey}` } : {}),
        'Content-Type':  'application/json',
        'x-wait-for-model': 'true'
      },
      body:   JSON.stringify({ inputs, parameters: params }),
      signal: AbortSignal.timeout(50000)
    });
    return r;
  }

  // ── 1. Pollinations.ai (primary — always available, key optional) ─────────
  if (!hasImage || provider === 'Pollinations') {
    try {
      const enc = encodeURIComponent(fullPrompt);
      const pHeaders = pollinationsKey
        ? { 'Authorization': `Bearer ${pollinationsKey}` }
        : {};

      // Pollinations video endpoint (if available)
      const pVideoUrl = `https://image.pollinations.ai/prompt/${enc}?model=video&width=768&height=432&nologo=true&seed=${seed}`;
      const rV = await fetch(pVideoUrl, {
        headers: pHeaders,
        signal: AbortSignal.timeout(25000)
      }).catch(() => null);

      if (rV?.ok) {
        const ct = rV.headers.get('content-type') || '';
        if (ct.includes('video') || ct.includes('mp4')) {
          const buf = await rV.arrayBuffer();
          if (buf.byteLength > 5000) {
            const b64 = Buffer.from(buf).toString('base64');
            return res.status(200).json({
              success: true,
              videoBase64: `data:${ct};base64,${b64}`,
              provider: 'Pollinations Video',
              type: 'video', prompt
            });
          }
        }
      }
    } catch(e) { errors.push(`Pollinations video: ${e.message}`); }
  }

  // ── 2. HF i2vgen-xl (Image to Video — excellent with input image) ────────
  if (hasImage && hfKey) {
    try {
      const inputData = imageBase64 || imageUrl || fullPrompt;
      const r = await callHF(
        'ali-vilab/i2vgen-xl',
        inputData,
        { prompt: fullPrompt, num_inference_steps: 20 }
      );
      if (r.ok) {
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 5000) {
          const b64 = Buffer.from(buf).toString('base64');
          return res.status(200).json({
            success: true,
            videoBase64: `data:video/mp4;base64,${b64}`,
            provider: 'HuggingFace i2vgen-xl (Image→Video)',
            type: 'video', prompt
          });
        }
      } else errors.push(`i2vgen-xl: ${r.status}`);
    } catch(e) { errors.push(`i2vgen-xl: ${e.message}`); }
  }

  // ── 3. damo-vilab text-to-video (HF key required) ────────────────────────
  if (hfKey) {
    try {
      const r = await callHF(
        'damo-vilab/text-to-video-ms-1.7b',
        fullPrompt,
        { num_inference_steps: 25, num_frames: 16 }
      );
      if (r.ok) {
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 5000) {
          const ct  = r.headers.get('content-type') || 'video/mp4';
          const b64 = Buffer.from(buf).toString('base64');
          return res.status(200).json({
            success: true,
            videoBase64: `data:${ct};base64,${b64}`,
            provider: 'HuggingFace damo-vilab',
            type: 'video', prompt
          });
        }
      } else errors.push(`damo-vilab: ${r.status}`);
    } catch(e) { errors.push(`damo-vilab: ${e.message}`); }
  }

  // ── 4. Zeroscope v2 XL via HF Space (FREE, no key) ───────────────────────
  const spaceEndpoints = [
    'https://hysts-zeroscope-v2.hf.space',
    'https://fffiloni-zeroscope-v2-xl.hf.space'
  ];
  for (const base of spaceEndpoints) {
    try {
      const r = await fetch(`${base}/run/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: [fullPrompt, 24, 7.5, 576, 320, 24, seed] }),
        signal: AbortSignal.timeout(45000)
      });
      if (r.ok) {
        const json = await r.json();
        const v = json?.data?.[0]?.video?.url || json?.data?.[0];
        if (v && typeof v === 'string') {
          return res.status(200).json({
            success: true,
            videoUrl: v.startsWith('http') ? v : `${base}/file=${v}`,
            provider: 'Zeroscope v2 XL',
            type: 'video', prompt
          });
        }
      } else errors.push(`Zeroscope ${base}: ${r.status}`);
    } catch(e) { errors.push(`Zeroscope: ${e.message}`); }
  }

  // ── 5. AnimateDiff Lightning via HF Space (FREE, no key) ─────────────────
  const adEndpoints = [
    'https://guoyww-animatediff.hf.space',
    'https://ByteDance-AnimateDiff-Lightning.hf.space'
  ];
  for (const base of adEndpoints) {
    try {
      const r = await fetch(`${base}/run/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: [fullPrompt, '', 8, '16 frames', '512x512', 'lightning_4step'] }),
        signal: AbortSignal.timeout(45000)
      });
      if (r.ok) {
        const json = await r.json();
        const v = json?.data?.[0]?.video?.url || json?.data?.[0];
        if (v && typeof v === 'string') {
          return res.status(200).json({
            success: true,
            videoUrl: v.startsWith('http') ? v : `${base}/file=${v}`,
            provider: 'AnimateDiff Lightning',
            type: 'video', prompt
          });
        }
      } else errors.push(`AnimateDiff: ${r.status}`);
    } catch(e) { errors.push(`AnimateDiff: ${e.message}`); }
  }

  // ── 6. Animated frames fallback via Pollinations (ALWAYS works) ──────────
  const enc = encodeURIComponent(fullPrompt);
  const baseImageUrl = hasImage && (imageUrl || imageBase64)
    ? (imageUrl || `https://image.pollinations.ai/prompt/${enc}?model=flux&seed=${seed}`)
    : null;

  const frames = Array.from({ length: 12 }, (_, i) =>
    `https://image.pollinations.ai/prompt/${enc}?model=flux&width=768&height=432&nologo=true&seed=${seed + i * 17}&enhance=true`
  );

  return res.status(200).json({
    success: true,
    frames,
    videoUrl: frames[0],
    provider: 'Pollinations Animated Frames',
    type: 'frames',
    prompt,
    note: 'Video providers busy — showing animated preview. ' + (errors.length ? 'Tried: ' + errors.slice(0,3).join(' | ') : ''),
    errors
  });
}
