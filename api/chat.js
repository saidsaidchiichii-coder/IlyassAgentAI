export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/chat") {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const message = body.message || "";
      const mode = body.selectedMode || body.mode || "fast";

      if (!message.trim()) {
        return Response.json(
          { error: "message is required" },
          { status: 400 }
        );
      }

      let systemPrompt = "You are a helpful assistant. Reply clearly and naturally.";

      if (mode === "thinking") {
        systemPrompt = `
You are in HARD THINKING mode.

Rules:
- Think carefully before answering.
- Give a deeper, more complete answer.
- Break the explanation into clear steps if needed.
- Be accurate, practical, and detailed.
- Do not be overly short.
`;
      } else if (mode === "fast") {
        systemPrompt = "You are a helpful assistant. Give short and direct answers.";
      }

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        }
      );

      const reply =
        result?.response ||
        result?.result ||
        result?.text ||
        "No response";

      return Response.json({ reply });
    } catch (error) {
      return Response.json(
        { error: error.message || "Server error" },
        { status: 500 }
      );
    }
  }
};
