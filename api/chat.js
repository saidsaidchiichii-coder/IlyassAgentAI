import { Composio } from "@composio/core";
import { OpenAIProvider } from "@composio/openai";

// ============================================================
//  🎨 IMAGE INTENT DETECTION
//  Detects if the user wants to generate an image
// ============================================================
function detectImageIntent(message) {
  const lower = message.toLowerCase();

  const imagePatterns = [
    // English
    /generate\s+(an?\s+)?image/i,
    /create\s+(an?\s+)?image/i,
    /make\s+(an?\s+)?image/i,
    /draw\s+(me\s+)?/i,
    /show\s+me\s+(an?\s+)?image/i,
    /generate\s+(a\s+)?picture/i,
    /create\s+(a\s+)?picture/i,
    /paint\s+(me\s+)?/i,
    /illustrate/i,
    /visualize/i,
    /render\s+(an?\s+)?image/i,
    // Arabic
    /ارسم/,
    /صورة\s+ل/,
    /توليد\s+صورة/,
    /أنشئ\s+صورة/,
    /اصنع\s+صورة/,
    /رسم\s+/,
    /أرسم/,
    /صوّر/,
    /صور\s+لي/,
    /ولّد\s+صورة/,
    /اعمل\s+صورة/,
  ];

  return imagePatterns.some((pattern) => pattern.test(message));
}

// ============================================================
//  🖼️ EXTRACT IMAGE PROMPT
//  Cleans the prompt by removing command words
// ============================================================
function extractImagePrompt(message) {
  return message
    .replace(
      /generate\s+(an?\s+)?image\s+(of\s+)?/gi,
      ""
    )
    .replace(/create\s+(an?\s+)?image\s+(of\s+)?/gi, "")
    .replace(/make\s+(an?\s+)?image\s+(of\s+)?/gi, "")
    .replace(/draw\s+(me\s+)?/gi, "")
    .replace(/show\s+me\s+(an?\s+)?image\s+(of\s+)?/gi, "")
    .replace(/generate\s+(a\s+)?picture\s+(of\s+)?/gi, "")
    .replace(/create\s+(a\s+)?picture\s+(of\s+)?/gi, "")
    .replace(/paint\s+(me\s+)?/gi, "")
    .replace(/illustrate\s+/gi, "")
    .replace(/visualize\s+/gi, "")
    .replace(/render\s+(an?\s+)?image\s+(of\s+)?/gi, "")
    // Arabic removals
    .replace(/ارسم\s+لي\s+/g, "")
    .replace(/ارسم\s+/g, "")
    .replace(/أرسم\s+لي\s+/g, "")
    .replace(/أرسم\s+/g, "")
    .replace(/صورة\s+ل/g, "")
    .replace(/توليد\s+صورة\s+/g, "")
    .replace(/أنشئ\s+صورة\s+/g, "")
    .replace(/اصنع\s+صورة\s+/g, "")
    .replace(/رسم\s+/g, "")
    .replace(/صوّر\s+/g, "")
    .replace(/صور\s+لي\s+/g, "")
    .replace(/ولّد\s+صورة\s+/g, "")
    .replace(/اعمل\s+صورة\s+/g, "")
    .trim();
}

// ============================================================
//  🖼️ GENERATE IMAGE via Pollinations.ai (FREE, no API key)
// ============================================================
async function generateImage(prompt) {
  const width = 768;
  const height = 768;
  const seed = Math.floor(Math.random() * 999999);
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

  // Verify the URL is reachable (HEAD request)
  const check = await fetch(imageUrl, { method: "HEAD" });
  if (!check.ok) {
    throw new Error("Pollinations.ai image generation failed");
  }

  return { imageUrl, seed, width, height };
}

// ============================================================
//  🤖 MAIN CHAT HANDLER
// ============================================================
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET test
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "IlyassAgentAI with Composio + Image Generation ✔️ Use POST",
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

    // ============================================================
    //  🎨 IMAGE GENERATION BRANCH
    // ============================================================
    if (detectImageIntent(message)) {
      const imagePrompt = extractImagePrompt(message) || message;

      try {
        const { imageUrl, seed, width, height } = await generateImage(imagePrompt);

        return res.status(200).json({
          type: "image",
          imageUrl: imageUrl,
          prompt: imagePrompt,
          seed: seed,
          width: width,
          height: height,
          provider: "Pollinations.ai (Free)",
          reply: `🎨 Here is your generated image for: **${imagePrompt}**`,
        });
      } catch (imgError) {
        console.error("Image generation error:", imgError);
        return res.status(500).json({
          error: "Failed to generate image: " + imgError.message,
        });
      }
    }

    // ============================================================
    //  🤖 LLM (GROQ) CHAT BRANCH
    // ============================================================

    // 🛠️ COMPOSIO SETUP
    const composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
      provider: new OpenAIProvider(),
    });

    const userId = body?.userId || "default_user";
    const session = await composio.create(userId);
    const tools = await session.tools();

    const messages = [
      {
        role: "system",
        content:
          "You are IlyassAgentAI, a personal AI agent. You have access to various tools via Composio. Use them to help the user with their tasks. If the user asks for an image, describe what you would generate.",
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
      type: "text",
      reply: data.choices?.[0]?.message?.content || "No response",
    });
  } catch (err) {
    console.error("Error in chat handler:", err);
    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}
