export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const body = req.body;

    // ❌ خاص message ولا prompt
    if (!body?.message && !body?.prompt) {
      return res.status(400).json({
        error: "message or prompt is required",
      });
    }

    // =========================
    // 💬 CHAT MODE
    // =========================
    if (body.message) {
      const response = await fetch(
        "https://super-grass-93d7.saidsaidchiichii.workers.dev/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: body.message }),
        }
      );

      const data = await response.json();

      return res.status(200).json({
        type: "chat",
        data,
      });
    }

    // =========================
    // 🎨 IMAGE MODE
    // =========================
    if (body.prompt) {
      const response = await fetch("YOUR_IMAGE_API_URL", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer YOUR_API_KEY`,
        },
        body: JSON.stringify({
          prompt: body.prompt,
        }),
      });

      const data = await response.json();

      return res.status(200).json({
        type: "image",
        image: data.image || data.url,
      });
    }

  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
