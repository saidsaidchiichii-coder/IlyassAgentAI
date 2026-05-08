// IlyassAI — /api/video  (Text-to-Video v3.0)
// Providers: HF damo-vilab → HF zeroscope-xl → HF AnimateDiff → Frames fallback
// maxDuration: 60s

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
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
    imageUrl   = null,
    imageBase64 = null
  } = req.body || {};

  if (!prompt && !imageUrl && !imageBase64)
    return res.status(400).json({ error: 'prompt is required' });

  const hfKey = process.env.HF_API_KEY || process.env.HF_TOKEN_V2;
  const errors = [];
  const seed   = Math.floor(Math.random() * 99999);

  const styleMap = {
    cinematic:     'cinematic camera movement, dramatic lighting, film grain, 4k ultra hd',
    smooth:        'smooth gentle motion, soft bokeh, dreamy atmosphere, high quality',
    dynamic:       'dynamic zoom, fast motion, energetic, sharp, action',
    'slow-motion': 'slow motion, graceful movement, elegant, ethereal, cinematic'
  };
  const fullPrompt = `${prompt}, ${styleMap[style] || styleMap.cinematic}`;

  // ── Helper: HuggingFace Inference API ─────────────────────────────────────
  async function callHF(model, inputs, params = {}) {
    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${hfKey}`,
        'Content-Type':  'application/json',
        'x-wait-for-model': 'true'
      },
      body:   JSON.stringify({ inputs, parameters: params }),
      signal: AbortSignal.timeout(55000)
    });
    return r;
  }

  // ── 1. damo-vilab/text-to-video-ms-1.7b  (HF key, text→video) ────────────
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
            provider: 'HuggingFace Text-to-Video (damo-vilab)',
            type: 'video', prompt
          });
        }
      } else {
        const txt = await r.text().catch(() => String(r.status));
        errors.push(`damo-vilab: ${r.status} – ${txt.slice(0, 120)}`);
      }
    } catch (e) { errors.push(`damo-vilab: ${e.message}`); }
  }

  // ── 2. ali-vilab/i2vgen-xl  (HF key, works text+image or text-only) ───────
  if (hfKey) {
    try {
      const inputData = imageUrl || imageBase64 || fullPrompt;
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
            provider: 'HuggingFace i2vgen-xl',
            type: 'video', prompt
          });
        }
      } else {
        errors.push(`i2vgen-xl: ${r.status}`);
      }
    } catch (e) { errors.push(`i2vgen-xl: ${e.message}`); }
  }

  // ── 3. Zeroscope v2 XL via HF Space  (FREE, no key needed) ───────────────
  try {
    const spaceEndpoints = [
      'https://hysts-zeroscope-v2.hf.space',
      'https://fffiloni-zeroscope-v2-xl.hf.space'
    ];
    for (const base of spaceEndpoints) {
      try {
        const r = await fetch(`${base}/run/predict`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            data: [fullPrompt, 24, 7.5, 576, 320, 24, seed]
          }),
          signal: AbortSignal.timeout(50000)
        });
        if (r.ok) {
          const json = await r.json();
          const v = json?.data?.[0]?.video?.url || json?.data?.[0];
          if (v && typeof v === 'string') {
            return res.status(200).json({
              success: true,
              videoUrl: v.startsWith('http') ? v : `${base}/file=${v}`,
              provider: 'Zeroscope v2 XL (Free HF Space)',
              type: 'video', prompt
            });
          }
        } else {
          errors.push(`Zeroscope ${base}: ${r.status}`);
        }
      } catch(e) { errors.push(`Zeroscope ${base}: ${e.message}`); }
    }
  } catch(e) { errors.push(`Zeroscope: ${e.message}`); }

  // ── 4. AnimateDiff Lightning via HF Space  (FREE, no key) ─────────────────
  try {
    const adEndpoints = [
      'https://guoyww-animatediff.hf.space',
      'https://ByteDance-AnimateDiff-Lightning.hf.space'
    ];
    for (const base of adEndpoints) {
      try {
        const r = await fetch(`${base}/run/predict`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            data: [fullPrompt, '', 8, '16 frames', '512x512', 'lightning_4step']
          }),
          signal: AbortSignal.timeout(50000)
        });
        if (r.ok) {
          const json = await r.json();
          const v = json?.data?.[0]?.video?.url || json?.data?.[0];
          if (v && typeof v === 'string') {
            return res.status(200).json({
              success: true,
              videoUrl: v.startsWith('http') ? v : `${base}/file=${v}`,
              provider: 'AnimateDiff Lightning (Free HF Space)',
              type: 'video', prompt
            });
          }
        } else {
          errors.push(`AnimateDiff: ${r.status}`);
        }
      } catch(e) { errors.push(`AnimateDiff ${base}: ${e.message}`); }
    }
  } catch(e) { errors.push(`AnimateDiff: ${e.message}`); }

  // ── 5. Stable Diffusion Video via HF  (HF key fallback) ───────────────────
  if (hfKey) {
    try {
      const r = await callHF(
        'stabilityai/stable-video-diffusion-img2vid-xt-1-1',
        fullPrompt,
        { num_frames: 14, fps: 7, motion_bucket_id: 100 }
      );
      if (r.ok) {
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 5000) {
          const b64  = Buffer.from(buf).toString('base64');
          const mime = r.headers.get('content-type')?.includes('gif') ? 'image/gif' : 'video/mp4';
          return res.status(200).json({
            success: true,
            videoBase64: `data:${mime};base64,${b64}`,
            provider: 'HuggingFace SVD XT',
            type: 'video', prompt
          });
        }
      } else { errors.push(`SVD-XT: ${r.status}`); }
    } catch(e) { errors.push(`SVD-XT: ${e.message}`); }
  }

  // ── 6. Animated frames fallback  (ALWAYS works) ───────────────────────────
  const enc = encodeURIComponent(fullPrompt);
  const frames = Array.from({ length: 12 }, (_, i) =>
    `https://image.pollinations.ai/prompt/${enc}?model=flux&width=768&height=432&nologo=true&seed=${seed + i * 13}&enhance=true`
  );
  return res.status(200).json({
    success: true,
    frames,
    videoUrl: frames[0],
    provider: 'Animated Preview',
    type: 'frames',
    prompt,
    note: 'Providers busy — showing animated preview. Real video providers: ' + errors.slice(0,3).join(' | '),
    errors
  });
}
