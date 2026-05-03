export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // 🟢 route /chat فقط
    if (url.pathname !== "/chat") {
      return new Response("Not Found", { status: 404 });
    }

    // GET test
    if (request.method === "GET") {
      return new Response("Chat API is working ✔️ Use POST", {
        headers: { "Content-Type": "text/plain" }
      });
    }

    // POST فقط
    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const message = body.message;

      if (!message) {
        return new Response(JSON.stringify({
          error: "Message required"
        }), { status: 400 });
      }

      // 🤖 AI CALL
      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            {
              role: "user",
              content: message
            }
          ]
        }
      );

      return new Response(JSON.stringify({
        reply: result.response
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message
      }), { status: 500 });
    }
  }
};
