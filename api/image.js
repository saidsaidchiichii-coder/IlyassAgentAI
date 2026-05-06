export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Image generation API ✅",
      providers: {
        "flux":  "Pollinations.ai FLUX (default, no key, 1024x1024)",
        "turbo": "Pollinations.ai Turbo (fastest, no key)",
        "hf":    "Hugging Face FLUX.1-schnell (free key, best quality)"
      }
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const body   = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const prompt = body?.prompt;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    // Pick provider: hf > flux > turbo (based on available keys)
    const HF_TOKEN = process.env.HF_TOKEN;
    const provider = body?.provider || (HF_TOKEN ? "hf" : "flux");

    // ── PROVIDER 1: Hugging Face FLUX.1-schnell (FREE key) ──────
    if (provider === "hf" && HF_TOKEN) {
      const hfRes = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true"
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { num_inference_steps: 4, width: 1024, height: 1024 }
          })
        }
      );

      if (hfRes.ok) {
        const buffer = await hfRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return res.status(200).json({
          type: "image",
          imageUrl: `data:image/jpeg;base64,${base64}`,
          imageType: "base64",
          prompt,
          provider: "Hugging Face / FLUX.1-schnell (Free)"
        });
      }
      // fallback to pollinations if HF fails
      console.warn("HF failed, falling back to Pollinations");
    }

    // ── PROVIDER 2: Pollinations.ai FLUX (default, no key) ──────
    const seed   = Math.floor(Math.random() * 999999);
    const width  = body?.width  || 1024;
    const height = body?.height || 1024;
    const model  = provider === "turbo" ? "turbo" : "flux";

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${model}&width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

    return res.status(200).json({
      type: "image",
      imageUrl,
      imageType: "url",
      prompt,
      seed,
      model,
      provider: `Pollinations.ai / ${model.toUpperCase()} (Free)`
    });

  } catch (err) {
    console.error("Image handler error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
