export default async function handler(req, res) {
  try {
    // 🔥 Allow only POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    // 🔥 Safely parse body (fix Vercel issues)
    let body = req.body;

    if (!body) {
      body = {};
    }

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    if (!body.message) {
      return res.status(400).json({
        error: "message is required"
      });
    }

    // 🔥 Call Cloudflare Worker
    const response = await fetch(
      "https://super-grass-93d7.saidsaidchiichii.workers.dev/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
