export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "IlyassAgentAI API v5 ✅" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body    = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message || "";
    if (!message) return res.status(400).json({ error: "Message is required" });

    // ════════════════════════════════════════════════════════
    //  🎨 STEP 1: IMAGE INTENT DETECTION
    // ════════════════════════════════════════════════════════
    const m = message.toLowerCase();
    const imageKeywords = [
      // English
      "generate an image","generate image","create an image","create image",
      "make an image","make image","draw me","draw a ","draw the ",
      "paint me","paint a ","illustrate","show me an image","render an image",
      "generate a picture","create a picture","make a picture","photo of",
      "/img ","imagine ",
      // Arabic
      "ارسم","أرسم","رسم لي","رسم ","صورة ل","صوّر","صور لي",
      "توليد صورة","أنشئ صورة","اصنع صورة","اعمل صورة","ولد صورة",
      "جيب لي صورة","صورة ديال","خلق صورة"
    ];
    const isImage = imageKeywords.some(k => m.includes(k) || message.includes(k));

    if (isImage) {
      // Clean prompt
      const removeWords = [
        "generate an image of ","generate an image","generate image of ","generate image",
        "create an image of ","create an image","make an image of ","make an image",
        "draw me a ","draw me an ","draw me ","draw a ","draw the ",
        "paint me a ","paint me ","paint a ","illustrate ","imagine ",
        "show me an image of ","render an image of ","generate a picture of ",
        "create a picture of ","make a picture of ","photo of ","/img ",
        "ارسم لي ","أرسم لي ","ارسم ","أرسم ","رسم لي ","رسم ",
        "صورة ل","توليد صورة ","أنشئ صورة ","اصنع صورة ","اعمل صورة ",
        "ولد صورة ","صوّر ","صور لي ","جيب لي صورة ","خلق صورة "
      ];
      let prompt = message;
      removeWords.forEach(w => {
        prompt = prompt.replace(new RegExp(w.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "gi"), "");
      });
      prompt = prompt.trim() || message;

      // Call internal /api/image with best available provider
      const HF_TOKEN = process.env.HF_TOKEN;
      const provider = HF_TOKEN ? "hf" : "flux";

      const seed  = Math.floor(Math.random() * 999999);
      let imageResult;

      // Try Hugging Face first if token available
      if (HF_TOKEN) {
        try {
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
            imageResult = {
              type: "image",
              imageUrl: `data:image/jpeg;base64,${base64}`,
              imageType: "base64",
              prompt,
              provider: "Hugging Face / FLUX.1-schnell (Free)"
            };
          }
        } catch (e) {
          console.warn("HF failed:", e.message);
        }
      }

      // Fallback to Pollinations FLUX (always works, no key needed)
      if (!imageResult) {
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;
        imageResult = {
          type: "image",
          imageUrl,
          imageType: "url",
          prompt,
          seed,
          provider: "Pollinations.ai / FLUX (Free)"
        };
      }

      return res.status(200).json(imageResult);
    }

    // ════════════════════════════════════════════════════════
    //  🤖 STEP 2: GROQ LLM — TEXT ONLY
    // ════════════════════════════════════════════════════════
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
      return res.status(200).json({
        type: "text",
        reply: "⚠️ GROQ_API_KEY missing. Add it in Vercel → Settings → Environment Variables."
      });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are IlyassAgentAI, a helpful and smart AI assistant. Answer clearly and helpfully in the same language the user uses."
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    return res.status(200).json({
      type: "text",
      reply: data.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
