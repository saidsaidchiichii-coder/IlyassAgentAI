export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { type, message, prompt } = req.body;

    if (type === "chat") {
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      const chatResponse = await fetch(
        "https://super-grass-93d7.saidsaidchiichii.workers.dev/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        }
      );

      const chatData = await chatResponse.json();
      return res.status(200).json({ type: "chat", data: chatData });
    }

    if (type === "image") {
      if (!prompt) {
        return res.status(400).json({ error: "prompt is required" });
      }

      const imageResponse = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt,
            size: "1024x1024",
          }),
        }
      );

      const imageData = await imageResponse.json();
      return res.status(200).json({ type: "image", data: imageData });
    }

    return res.status(400).json({ error: "Invalid type (use chat or image)" });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Internal Server Error",
    });
  }
}
