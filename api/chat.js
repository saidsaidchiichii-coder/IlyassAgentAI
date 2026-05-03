export default {
  async fetch(request, env) {

    // GET test
    if (request.method === "GET") {
      return new Response(JSON.stringify({
        ok: true,
        message: "Cloudflare AI working ✔️ Use POST"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Only POST allowed"
      }), { status: 405 });
    }

    try {

      const body = await request.json();
      const message = body?.message;

      if (!message) {
        return new Response(JSON.stringify({
          error: "Message required"
        }), { status: 400 });
      }

      // 🤖 CLOUDFLARE AI CALL
      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant."
            },
            {
              role: "user",
              content: message
            }
          ]
        }
      );

      return new Response(JSON.stringify({
        reply: result.response || "No response"
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message || "Server error"
      }), { status: 500 });
    }
  }
};
