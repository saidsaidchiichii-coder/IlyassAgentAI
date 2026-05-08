// IlyassAI — /api/video  (Image → Video)
// Chain: HuggingFace SVD → i2vgen-xl → AnimateDiff → Pollinations Frames (fallback)
export const config = { api: { bodyParser: { sizeLimit: "10mb" } }, maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({error:"Method not allowed"});

  const { imageBase64, imageUrl, prompt = "cinematic smooth motion", style = "cinematic" } = req.body || {};
  if (!imageBase64 && !imageUrl) return res.status(400).json({error:"imageBase64 or imageUrl required"});

  const hfKey = process.env.HF_API_KEY;
  const fullPrompt = `${prompt}, ${style}, high quality, smooth`;
  const errors = [];

  // ── Helper: fetch with timeout ──────────────────────
  async function hfInfer(model, body, timeoutMs=55000) {
    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method:"POST",
      headers:{ Authorization:`Bearer ${hfKey}`, "Content-Type":"application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
    return r;
  }

  // ══ 1. Stable Video Diffusion (img2vid) ══════════════
  if (hfKey && (imageUrl || imageBase64)) {
    try {
      const r = await hfInfer("stabilityai/stable-video-diffusion-img2vid-xt", {
        inputs: imageUrl || imageBase64,
        parameters: { num_frames: 14, fps: 7, motion_bucket_id: 127, noise_aug_strength: 0.02 }
      });
      if (r.ok) {
        const ct = r.headers.get("content-type") || "";
        if (ct.includes("video") || ct.includes("octet-stream") || ct.includes("gif")) {
          const buf = await r.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const mime = ct.includes("gif") ? "image/gif" : "video/mp4";
          return res.status(200).json({ success:true, videoBase64:`data:${mime};base64,${b64}`,
            provider:"HuggingFace SVD", type:"video", prompt });
        }
      }
      errors.push(`SVD: ${r.status}`);
    } catch(e) { errors.push(`SVD: ${e.message}`); }
  }

  // ══ 2. i2vgen-xl (Image to Video) ════════════════════
  if (hfKey && (imageUrl || imageBase64)) {
    try {
      const r = await hfInfer("ali-vilab/i2vgen-xl", {
        inputs: imageUrl || imageBase64,
        parameters: { prompt: fullPrompt, num_inference_steps: 20 }
      });
      if (r.ok) {
        const ct = r.headers.get("content-type") || "";
        if (ct.includes("video") || ct.includes("octet-stream")) {
          const buf = await r.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          return res.status(200).json({ success:true, videoBase64:`data:video/mp4;base64,${b64}`,
            provider:"HuggingFace i2vgen-xl", type:"video", prompt });
        }
      }
      errors.push(`i2vgen: ${r.status}`);
    } catch(e) { errors.push(`i2vgen: ${e.message}`); }
  }

  // ══ 3. AnimateDiff (text-guided animation) ═══════════
  if (hfKey) {
    try {
      const r = await hfInfer("guoyww/animatediff-motion-adapter-v1-5-3", {
        inputs: fullPrompt,
        parameters: { num_frames: 16, guidance_scale: 7.5, num_inference_steps: 20 }
      });
      if (r.ok) {
        const ct = r.headers.get("content-type") || "";
        if (ct.includes("video") || ct.includes("gif") || ct.includes("octet-stream")) {
          const buf = await r.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const mime = ct.includes("gif") ? "image/gif" : "video/mp4";
          return res.status(200).json({ success:true, videoBase64:`data:${mime};base64,${b64}`,
            provider:"HuggingFace AnimateDiff", type:"video", prompt });
        }
      }
      errors.push(`AnimateDiff: ${r.status}`);
    } catch(e) { errors.push(`AnimateDiff: ${e.message}`); }
  }

  // ══ 4. Pollinations Frames (GUARANTEED free fallback) ═
  try {
    const seed = Math.floor(Math.random()*99999);
    const styleMap = {
      cinematic:"cinematic camera movement, dramatic lighting, film grain",
      smooth:"gentle smooth motion, soft bokeh, dreamy",
      dynamic:"dynamic zoom, fast motion, high energy",
      "slow-motion":"slow motion, time lapse, graceful movement"
    };
    const styleSuffix = styleMap[style] || styleMap.cinematic;
    const basePrompt  = encodeURIComponent(`${prompt}, ${styleSuffix}, 8k`);

    const frames = Array.from({length:6}, (_,i) =>
      `https://image.pollinations.ai/prompt/${basePrompt}?model=flux&width=768&height=432&nologo=true&seed=${seed+i*7}&enhance=true`
    );

    return res.status(200).json({
      success:true, frames, videoUrl:frames[0],
      provider:"Pollinations.ai", type:"frames",
      prompt, errors
    });
  } catch(e) { errors.push(`Frames: ${e.message}`); }

  return res.status(503).json({error:"All providers failed", details:errors});
}
