export default async function handler(req, res) {

  // 🟢 TEST
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "API Key Generator ✔️ Use POST"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {

    // 🌐 USER IP
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress;

    // 🧠 store in memory
    if (!global.oneKeyStore) {
      global.oneKeyStore = {};
    }

    // ⛔ CHECK: already got key?
    if (global.oneKeyStore[ip]) {
      return res.status(403).json({
        error: "You already got your API key (1 per user only)"
      });
    }

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const message = body?.message;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // 🤖 GROQ CALL (same as your system)
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

    // 💾 MARK USER AS USED
    global.oneKeyStore[ip] = true;

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Server error"
    });
  }
}
