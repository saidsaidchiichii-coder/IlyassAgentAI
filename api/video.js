// IlyassAI — /api/video
// Image-to-Video: HuggingFace SVD + i2vgen-xl + Pollinations.ai frames fallback
// maxDuration: 60s (set in vercel.json per-function override)

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
  maxDuration: 60
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    imageBase64,
    imageUrl,
    prompt = 'cinematic smooth motion, high quality',
    style = 'cinematic'
  } = req.body || {};

  if (!imageBase64 && !imageUrl)
    return res.status(400).json({ error: 'imageBase64 or imageUrl is required' });

  const hfKey = process.env.HF_API_KEY;
  const errors = [];
  const styleMap = {
    cinematic: 'cinematic camera movement, dramatic lighting, film grain, 4k',
    smooth:    'gentle smooth motion, soft bokeh, dreamy atmosphere',
    dynamic:   'dynamic zoom, fast motion, energetic, sharp',
    'slow-motion': 'slow motion, graceful, elegant, ethereal'
  };
  const fullPrompt = `${prompt}, ${styleMap[style] || styleMap.cinematic}`;
  const seed = Math.floor(Math.random() * 99999);

  // ── Helper: call HuggingFace Inference API ──────────────────────────────────
  async function hfPost(model, body) {
    return fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55000)
    });
  }

  // ── Helper: call HuggingFace Space via REST (free, no key needed) ───────────
  async function hfSpacePost(spaceUrl, payload) {
    return fetch(`${spaceUrl}/run/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55000)
    });
  }

  // ── 1. HuggingFace SVD (requires HF_API_KEY) ────────────────────────────────
  if (hfKey) {
    try {
      const r = await hfPost('stabilityai/stable-video-diffusion-img2vid-xt', {
        inputs: imageUrl || imageBase64,
        parameters: { num_frames: 14, fps: 7, motion_bucket_id: 127 }
      });
      if (r.ok) {
        const ct = r.headers.get('content-type') || '';
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 5000) {
          const b64 = Buffer.from(buf).toString('base64');
          const mime = ct.includes('gif') ? 'image/gif' : 'video/mp4';
          return res.status(200).json({
            success: true,
            videoBase64: `data:${mime};base64,${b64}`,
            provider: 'HuggingFace SVD',
            type: 'video',
            prompt
          });
        }
      } else {
        const txt = await r.text().catch(() => r.status);
        errors.push(`SVD: ${r.status} – ${String(txt).slice(0, 100)}`);
      }
    } catch (e) { errors.push(`SVD: ${e.message}`); }
  }

  // ── 2. HuggingFace i2vgen-xl (requires HF_API_KEY) ─────────────────────────
  if (hfKey) {
    try {
      const r = await hfPost('ali-vilab/i2vgen-xl', {
        inputs: imageUrl || imageBase64,
        parameters: { prompt: fullPrompt, num_inference_steps: 20 }
      });
      if (r.ok) {
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 5000) {
          const b64 = Buffer.from(buf).toString('base64');
          return res.status(200).json({
            success: true,
            videoBase64: `data:video/mp4;base64,${b64}`,
            provider: 'HuggingFace i2vgen-xl',
            type: 'video',
            prompt
          });
        }
      } else {
        errors.push(`i2vgen-xl: ${r.status}`);
      }
    } catch (e) { errors.push(`i2vgen-xl: ${e.message}`); }
  }

  // ── 3. HuggingFace Spaces – Wan2.1 (FREE, no key needed) ───────────────────
  // Uses public Gradio Space REST endpoint
  try {
    const spaceUrl = 'https://wan-ai-wan2-1.hf.space';
    const payload = { data: [imageUrl || imageBase64, fullPrompt, 16, 8] };
    const r = await hfSpacePost(spaceUrl, payload);
    if (r.ok) {
      const json = await r.json();
      const videoData = json?.data?.[0];
      if (videoData) {
        // Gradio returns either a URL or base64
        const isUrl = typeof videoData === 'string' && videoData.startsWith('http');
        return res.status(200).json({
          success: true,
          ...(isUrl ? { videoUrl: videoData } : { videoBase64: videoData }),
          provider: 'HuggingFace Wan2.1 Space',
          type: 'video',
          prompt
        });
      }
    } else {
      errors.push(`Wan2.1: ${r.status}`);
    }
  } catch (e) { errors.push(`Wan2.1: ${e.message}`); }

  // ── 4. Pollinations.ai – animated frames fallback (ALWAYS FREE) ─────────────
  // Generates a sequence of unique images simulating motion
  try {
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const frames = Array.from({ length: 8 }, (_, i) =>
      `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=768&height=432&nologo=true&seed=${seed + i * 11}&enhance=true`
    );
    return res.status(200).json({
      success: true,
      frames,
      videoUrl: frames[0],
      provider: 'Pollinations.ai (animated frames)',
      type: 'frames',
      prompt,
      note: 'No HF_API_KEY found – using animated frames fallback. Add HF_API_KEY in Vercel env vars for real video.',
      errors
    });
  } catch (e) {
    errors.push(`Pollinations: ${e.message}`);
  }

  return res.status(503).json({ error: 'All video providers failed', details: errors });
}
