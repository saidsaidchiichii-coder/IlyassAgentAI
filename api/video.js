// ============================================================
// api/video.js — MERGED: video generation + status + generate
// Route via ?action=generate | status (default: main video)
// ============================================================

// IlyassAI — /api/generate-video  (Image-to-Video v1.0)
// Uses Pollinations.ai for animated frame generation
// Also supports Hugging Face inference endpoints as fallback
// maxDuration: 60s

// config skipped
  api: { bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 60
};

async function handleGenerateVideo(req, res) {
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


// IlyassAI — /api/video-status (Check MiniMax video generation status)
// Poll this endpoint to get the video URL once ready


async function handleVideoStatus(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });

  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (!minimaxKey) return res.status(500).json({ error: 'MiniMax key not configured' });

  try {
    const response = await fetch(`https://api.minimax.io/v1/video_generation/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${minimaxKey}` },
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        success: true,
        status: data.status,
        videoUrl: data.video_url || null,
        taskId
      });
    }
    return res.status(response.status).json({ error: 'Failed to fetch status' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}


// Original video handler (main)
// IlyassAI — /api/video  (Text-to-Video & Image-to-Video v4.0)
  // Priority: Zeroscope (FREE 100%) → AnimateDiff (FREE 100%) → Pollinations → Zhipu AI → MiniMax → Animated Frames
// Env vars: ZHIPU_API_KEY, MINIMAX_API_KEY, KLING_API_KEY, POLLINATIONS_API_KEY, HF_API_KEY
// maxDuration: 60s

  api: { bodyParser: { sizeLimit: '8mb' } },
  maxDuration: 60
};

async function handleVideoMain(req, res) {
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
  const zhipuKey = process.env.ZHIPU_API_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;
  const klingKey = process.env.KLING_API_KEY;
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

  // ── 1. Zeroscope v2 XL via HF Space (FREE 100%, no key) ───────────────────
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
            provider: 'Zeroscope v2 XL (FREE)',
            type: 'video', prompt
          });
        }
      }
    } catch(e) { errors.push(`Zeroscope: ${e.message}`); }
  }

  // ── 2. AnimateDiff Lightning via HF Space (FREE 100%, no key) ─────────────
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
            provider: 'AnimateDiff Lightning (FREE)',
            type: 'video', prompt
          });
        }
      }
    } catch(e) { errors.push(`AnimateDiff: ${e.message}`); }
  }

  // ── 3. Zhipu AI (CogVideoX) - Fallback (Needs Key) ────────────────────────
  if (zhipuKey) {
    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/videos/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${zhipuKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: "cogvideox", prompt: fullPrompt }),
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.id) return res.status(200).json({ success: true, taskId: data.id, provider: 'Zhipu AI', type: 'video_task', prompt });
      }
    } catch (e) { errors.push(`Zhipu AI: ${e.message}`); }
  }

  // ── 4. MiniMax (Hailuo AI) - PRIMARY (Needs Key) ─────────────────────────
  if (minimaxKey) {
    try {
      const response = await fetch('https://api.minimax.io/v1/video_generation', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${minimaxKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, model: "MiniMax-Hailuo-2.3", duration: 6, resolution: "1080P" }),
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.task_id) return res.status(200).json({ success: true, taskId: data.task_id, provider: 'MiniMax', type: 'video_task', prompt, videoUrl: null });
      } else errors.push(`MiniMax: ${response.status}`);
    } catch (e) { errors.push(`MiniMax: ${e.message}`); }
  }

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

  // ── 5. Hugging Face Fallback (i2vgen-xl) ───────────────────────────
  if (hfKey) {
    try {
      const r = await callHF('ali-vilab/i2vgen-xl', imageBase64 || imageUrl || fullPrompt, { prompt: fullPrompt });
      if (r.ok) {
        const buf = await r.arrayBuffer();
        if (buf.byteLength > 5000) {
          return res.status(200).json({ success: true, videoBase64: `data:video/mp4;base64,${Buffer.from(buf).toString('base64')}`, provider: 'HF i2vgen-xl', type: 'video', prompt });
        }
      }
    } catch(e) { errors.push(`HF Fallback: ${e.message}`); }
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


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;
  if (action === 'status') return handleVideoStatus(req, res);
  if (action === 'generate') return handleGenerateVideo(req, res);
  return handleVideoMain(req, res);
}
