export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const body = req.body;

    // لازم type + content
    if (!body?.type || !body?.content) {
      return res.status(400).json({
        error: "type and content are required",
      });
    }

    // ======================
    // 💬 CHAT MODE
    // ======================
    if (body.type === "chat") {
      const response = await fetch(
        "https://super-grass-93d7.saidsaidchiichii.workers.dev/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: body.content,
          }),
        }
      );

      const data = await response.json();

      return res.status(200).json({
        type: "chat",
        data,
      });
    }

    // ======================
    // 🎨 IMAGE MODE
    // ======================
    if (body.type === "image") {
      const response = await fetch("YOUR_IMAGE_API_URL", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer YOUR_API_KEY`,
        },
        body: JSON.stringify({
          prompt: body.content,
        }),
      });

      const data = await response.json();

      return res.status(200).json({
        type: "image",
        image: data.image || data.url,
      });
    }

    return res.status(400).json({
      error: "Invalid type (use chat or image)",
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
