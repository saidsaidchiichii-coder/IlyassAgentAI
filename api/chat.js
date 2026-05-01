export default async function handler(req, res) {
  try {

    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        message: "API Key Generator ✔️ Use POST"
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress;

    if (!global.oneKeyStore) {
      global.oneKeyStore = {};
    }

    if (global.oneKeyStore[ip]) {
      return res.status(403).json({
        error: "You already got your API key"
      });
    }

    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const message = body?.message;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: message }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.log("GROQ ERROR:", data);
      return res.status(500).json({
        error: data.error?.message || "Groq error"
      });
    }

    global.oneKeyStore[ip] = true;

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content
    });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    return res.status(500).json({
      error: err.message
    });
  }
}
