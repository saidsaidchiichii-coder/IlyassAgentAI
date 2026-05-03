export default {
  async fetch(request, env) {

    // 🟢 CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/chat") {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method === "GET") {
      return new Response("Chat API OK ✔️ Use POST");
    }

    try {
      const body = await request.json();

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            {
              role: "user",
              content: body.message
            }
          ]
        }
      );

      return new Response(JSON.stringify({
        reply: result.response
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message
      }), { status: 500 });
    }
  }
};
