export default async function handler(req, res) {
  // ❌ خاص غير POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const body = req.body;

    if (!body?.message) {
      return res.status(400).json({ error: "message is required" });
    }

    const response = await fetch(
      "https://super-grass-93d7.saidsaidchiichii.workers.dev/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
