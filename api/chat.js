import { Composio } from "@composio/core";
import { OpenAIProvider } from "@composio/openai";

export default async function handler(req, res) {
  // GET test
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "IlyassAgentAI with Composio working ✔️ Use POST",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // 🛠️ COMPOSIO SETUP
    const composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
      provider: new OpenAIProvider(),
    });

    // Use a fixed user ID for now or derive from session/auth
    const userId = body?.userId || "default_user";
    const session = await composio.create(userId);
    const tools = await session.tools();

    // 🤖 GROQ API CALL (Using Groq as the LLM)
    // Note: Composio tools are formatted for OpenAI, which Groq supports
    const messages = [
      {
        role: "system",
        content: "You are IlyassAgentAI, a personal AI agent. You have access to various tools via Composio. Use them to help the user with their tasks.",
      },
      {
        role: "user",
        content: message,
      },
    ];

    let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    let data = await response.json();

    // Agentic loop for tool calls
    let iterations = 0;
    const maxIterations = 5;

    while (data.choices?.[0]?.message?.tool_calls && iterations < maxIterations) {
      iterations++;
      const toolMessage = data.choices[0].message;
      messages.push(toolMessage);

      const results = await composio.provider.handleToolCalls(userId, toolMessage);

      for (const [i, tc] of toolMessage.tool_calls.entries()) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(results[i]),
        });
      }

      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          tools: tools,
          tool_choice: "auto",
        }),
      });
      data = await response.json();
    }

    // ❌ handle errors
    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "API error",
      });
    }

    // ✅ success
    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "No response",
    });
  } catch (err) {
    console.error("Error in chat handler:", err);
    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}
