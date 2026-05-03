export default async function handler(req, res) {
  try {
    let body = req.body;

    // 🔥 fix empty body issue
    if (!body) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
    }

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
      error: error.message
    });
  }
}
