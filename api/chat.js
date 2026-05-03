export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ❌ route check
    if (url.pathname !== "/chat") {
      return new Response("Not Found", { status: 404 });
    }

    // ❌ allow only POST
    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    try {
      // ✅ safe JSON parsing
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return Response.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const message = body?.message?.trim();
      const mode = body?.selectedMode || body?.mode || "fast";

      if (!message) {
        return Response.json(
          { error: "message is required" },
          { status: 400 }
        );
      }

      // 🧠 system prompts
      let systemPrompt = "You are a helpful assistant. Reply clearly and naturally.";

      if (mode === "thinking") {
        systemPrompt = `
You are in HARD THINKING mode.

- Think step by step
- Give detailed explanation
- Be accurate and structured
- Avoid short answers
`;
      } else if (mode === "fast") {
        systemPrompt = "Give short, direct answers.";
      }

      // 🤖 AI CALL
      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        }
      );

      // 🔥 safe response extraction
      const reply =
        result?.response ||
        result?.result ||
        result?.text ||
        result?.output ||
        "No response from AI";

      return Response.json({ reply });

    } catch (error) {
      return Response.json(
        { error: error?.message || "Server error" },
        { status: 500 }
      );
    }
  }
};
