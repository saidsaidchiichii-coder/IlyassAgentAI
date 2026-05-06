export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "IlyassAgentAI API v4 ✅" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message || "";
    if (!message) return res.status(400).json({ error: "Message is required" });

    // ── IMAGE DETECTION ──────────────────────────────────────────
    const m = message.toLowerCase();
    const imageKeywords = [
      "generate an image","create an image","make an image","draw me","draw a ",
      "paint me","paint a ","illustrate","show me an image","render an image",
      "ارسم","أرسم","رسم لي","صورة ل","صوّر","صور لي",
      "توليد صورة","أنشئ صورة","اصنع صورة","اعمل صورة","ولد صورة"
    ];
    const isImageRequest = imageKeywords.some(k => m.includes(k) || message.includes(k));

    if (isImageRequest) {
      const removeWords = [
        "generate an image of ","generate an image","create an image of ","create an image",
        "make an image of ","make an image","draw me ","draw a ","paint me ","paint a ",
        "illustrate ","show me an image of ","render an image of ",
        "ارسم لي ","أرسم لي ","ارسم ","أرسم ","رسم لي ","صورة ل","توليد صورة ",
        "أنشئ صورة ","اصنع صورة ","اعمل صورة ","ولد صورة ","صوّر ","صور لي "
      ];
      let prompt = message;
      removeWords.forEach(w => { prompt = prompt.replace(new RegExp(w, "gi"), ""); });
      prompt = prompt.trim() || message;

      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&seed=${seed}&nologo=true&enhance=true`;

      return res.status(200).json({
        type: "image",
        imageUrl,
        prompt,
        seed,
        provider: "Pollinations.ai (Free)"
      });
    }

    // ── TEXT / LLM ────────────────────────────────────────────────
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
      return res.status(200).json({
        type: "text",
        reply: "⚠️ GROQ_API_KEY is not set in Vercel Environment Variables. Please add it in Vercel → Settings → Environment Variables."
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are IlyassAgentAI, a helpful AI assistant. Answer clearly and helpfully." },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
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
