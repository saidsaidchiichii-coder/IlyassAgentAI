export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // =========================
    // /chat
    // =========================
    if (url.pathname === "/chat") {
      if (request.method !== "POST") {
        return new Response("Only POST allowed", { status: 405, headers: corsHeaders });
      }

      try {
        let body;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
        }

        const message = body?.message?.trim();
        const mode = body?.selectedMode || body?.mode || "fast";

        if (!message) {
          return Response.json({ error: "message is required" }, { status: 400, headers: corsHeaders });
        }

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

        const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
        });

        const reply =
          result?.response ||
          result?.result ||
          result?.text ||
          result?.output ||
          "No response from AI";

        return Response.json({ reply }, { headers: corsHeaders });
      } catch (error) {
        return Response.json(
          { error: error?.message || "Server error" },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================
    // /image
    // =========================
    if (url.pathname === "/image") {
      if (request.method !== "POST") {
        return new Response("Only POST allowed", { status: 405, headers: corsHeaders });
      }

      try {
        let body;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
        }

        const prompt = body?.prompt?.trim();

        if (!prompt) {
          return Response.json({ error: "prompt is required" }, { status: 400, headers: corsHeaders });
        }

        const image = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
          prompt,
        });

        return new Response(image, {
          headers: {
            ...corsHeaders,
            "Content-Type": "image/jpg",
          },
        });
      } catch (error) {
        return Response.json(
          { error: error?.message || "Server error" },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
