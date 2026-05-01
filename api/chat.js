export default async function handler(req, res) {

  // 🟢 GET test
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "API Key Generator working ✔️ Use POST"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {

    // 🌐 GET USER IP
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress;

    // 🧠 simple memory store
    if (!global.keyLimitStore) {
      global.keyLimitStore = {};
    }

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    const last = global.keyLimitStore[ip];

    // ⛔ LIMIT CHECK
    if (last && now - last < ONE_DAY) {
      const remaining = ONE_DAY - (now - last);
      const hours = Math.ceil(remaining / (1000 * 60 * 60));

      return res.status(429).json({
        error: `Try again after ${hours} hours`
      });
    }

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const message = body?.message;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // 🤖 GROQ CALL
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant."
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Groq API error"
      });
    }

    // 💾 SAVE LIMIT TIME (IMPORTANT)
    global.keyLimitStore[ip] = now;

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Server error"
    });
  }
}
