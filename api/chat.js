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

    // ======================
    // 💬 CHAT
    // ======================
    if (body.type === "chat") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer YOUR_OPENAI_API_KEY`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: body.content }
          ],
        }),
      });

      const data = await response.json();

      return res.status(200).json({
        type: "chat",
        reply: data.choices?.[0]?.message?.content,
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
          "Authorization": `Bearer YOUR_OPENAI_API_KEY`,
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: body.content,
          size: "1024x1024",
        }),
      });

      const data = await response.json();

      return res.status(200).json({
        type: "image",
        image: data.data?.[0]?.url,
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
