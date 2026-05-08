// IlyassAI — /api/video
// Image-to-Video generation using Pollinations.ai & HuggingFace
// Accepts: { imageUrl, prompt, duration }
// Returns: { videoUrl, provider, prompt }

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageUrl, imageBase64, prompt = 'cinematic smooth motion', duration = 3 } = req.body || {};

  if (!imageUrl && !imageBase64) {
    return res.status(400).json({ error: 'imageUrl or imageBase64 is required' });
  }

  const errors = [];

  // ══════════════════════════════════════════
  // 1. Pollinations.ai Video Generation (free)
  // ══════════════════════════════════════════
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    
    // If we have a direct imageUrl, use it as reference
    let pollinationsUrl;
    if (imageUrl) {
      // Use the image as a reference frame for video generation
      pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=turbo&width=512&height=512&nologo=true&seed=${Math.floor(Math.random()*9999)}`;
    } else {
      pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=512&height=512&nologo=true`;
    }

    // Pollinations generates a video via the video endpoint
    const videoPromptUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=turbo&nologo=true&nofeed=true`;
    
    // Try Pollinations direct video endpoint
    const polVideoUrl = `https://videos.pollinations.ai/${encodedPrompt}?seed=${Math.floor(Math.random()*99999)}&nologo=true`;
    
    const checkRes = await fetch(polVideoUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
      redirect: 'follow'
    });

    if (checkRes.ok) {
      return res.status(200).json({
        success: true,
        videoUrl: polVideoUrl,
        provider: 'Pollinations.ai',
        prompt,
        type: 'video'
      });
    }
    errors.push(`Pollinations video: ${checkRes.status}`);
  } catch (e) {
    errors.push(`Pollinations video: ${e.message}`);
  }

  // ══════════════════════════════════════════
  // 2. HuggingFace — AnimateDiff / Zeroscope
  // ══════════════════════════════════════════
  const hfKey = process.env.HF_API_KEY;
  if (hfKey) {
    // Try Zeroscope v2 XL (image-to-video via text prompt)
    const hfModels = [
      'ali-vilab/i2vgen-xl',           // Image-to-Video
      'cerspense/zeroscope_v2_576w',    // Text-to-Video (fallback)
    ];

    for (const model of hfModels) {
      try {
        let requestBody;
        if (model === 'ali-vilab/i2vgen-xl' && imageUrl) {
          // i2vgen-xl: image + prompt → video
          requestBody = JSON.stringify({
            inputs: imageUrl,
            parameters: { prompt, num_frames: 16, guidance_scale: 9.0 }
          });
        } else {
          // Text-to-video models
          requestBody = JSON.stringify({
            inputs: prompt,
            parameters: { num_frames: 16, guidance_scale: 7.5, num_inference_steps: 25 }
          });
        }

        const hfRes = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hfKey}`,
              'Content-Type': 'application/json'
            },
            body: requestBody,
            signal: AbortSignal.timeout(55000)
          }
        );

        if (hfRes.ok) {
          const contentType = hfRes.headers.get('content-type') || '';
          
          if (contentType.includes('video') || contentType.includes('octet-stream')) {
            // Got video binary — convert to base64
            const buffer = await hfRes.arrayBuffer();
            const base64Video = Buffer.from(buffer).toString('base64');
            return res.status(200).json({
              success: true,
              videoBase64: `data:video/mp4;base64,${base64Video}`,
              provider: `HuggingFace (${model.split('/')[1]})`,
              prompt,
              type: 'video'
            });
          }

          // Might be JSON with URL
          const data = await hfRes.json().catch(() => null);
          if (data?.url || data?.video) {
            return res.status(200).json({
              success: true,
              videoUrl: data.url || data.video,
              provider: `HuggingFace (${model.split('/')[1]})`,
              prompt,
              type: 'video'
            });
          }
        }

        if (hfRes.status === 503) {
          const data = await hfRes.json().catch(() => ({}));
          errors.push(`HF ${model}: loading (${data.estimated_time || '?'}s)`);
        } else {
          errors.push(`HF ${model}: ${hfRes.status}`);
        }
      } catch (e) {
        errors.push(`HF ${model}: ${e.message}`);
      }
    }
  } else {
    errors.push('HuggingFace: HF_API_KEY not set');
  }

  // ══════════════════════════════════════════
  // 3. Fallback — Animated GIF via Pollinations
  // Generates a sequence of frames as "video"
  // ══════════════════════════════════════════
  try {
    const seed = Math.floor(Math.random() * 99999);
    const frames = [];
    
    // Generate 3 slightly different frames to suggest motion
    const motionPrompts = [
      `${prompt}, frame 1, beginning`,
      `${prompt}, frame 2, middle`,
      `${prompt}, frame 3, end`
    ];

    for (let i = 0; i < motionPrompts.length; i++) {
      frames.push(
        `https://image.pollinations.ai/prompt/${encodeURIComponent(motionPrompts[i])}?model=turbo&width=512&height=288&nologo=true&seed=${seed + i}`
      );
    }

    // Return frames as "slideshow" video — frontend will animate them
    return res.status(200).json({
      success: true,
      frames,
      videoUrl: frames[0], // Primary frame
      provider: 'Pollinations.ai (Frames)',
      prompt,
      type: 'frames',
      frameCount: frames.length
    });

  } catch (e) {
    errors.push(`Frames fallback: ${e.message}`);
  }

  return res.status(503).json({
    error: 'All video providers failed.',
    details: errors
  });
}
