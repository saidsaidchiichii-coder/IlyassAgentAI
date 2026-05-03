export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://super-grass-93d7.saidsaidchiichii.workers.dev/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
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
