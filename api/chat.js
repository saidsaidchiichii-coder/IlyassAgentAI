export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const body = req.body;

    if (!body?.type || !body?.content) {
      return res.status(400).json({
        error: "type and content are required",
      });
    }

    const API_KEY = process.env.OPENAI_API_KEY; // مهم يكون فـ env

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }

    // ======================
    // 💬 CHAT
    // ======================
    if (body.type === "chat") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: body.content }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(500).json({
          error: "Chat API failed",
          details: err,
        });
      }

      const data = await response.json();

      const reply = data?.choices?.[0]?.message?.content;

      if (!reply) {
        return res.status(500).json({ error: "Empty chat response" });
      }

      return res.status(200).json({
        type: "chat",
        reply,
      });
    }

    // ======================
    // 🎨 IMAGE
    // ======================
    if (body.type === "image") {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: body.content,
          size: "1024x1024",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(500).json({
          error: "Image API failed",
          details: err,
        });
      }

      const data = await response.json();

      const image = data?.data?.[0]?.url;

      if (!image) {
        return res.status(500).json({ error: "No image returned" });
      }

      return res.status(200).json({
        type: "image",
        image,
      });
    }

    return res.status(400).json({
      error: "Invalid type (chat or image only)",
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
