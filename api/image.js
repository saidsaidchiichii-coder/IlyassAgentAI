export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "Image generation API ready ✅" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const prompt = body?.prompt;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const width  = body?.width  || 768;
    const height = body?.height || 768;
    const seed   = body?.seed   || Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

    return res.status(200).json({ imageUrl, prompt, seed, provider: "Pollinations.ai (Free)" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
