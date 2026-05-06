import { Composio } from "@composio/core";
import { OpenAIProvider } from "@composio/openai";

// ============================================================
//  🎨 IMAGE INTENT DETECTION — Simple & Reliable
// ============================================================
function detectImageIntent(message) {
  const m = message.toLowerCase();
  const keywords = [
    // English
    "generate an image", "create an image", "make an image",
    "generate a picture", "create a picture", "draw me",
    "draw a ", "paint me", "paint a ", "illustrate",
    "show me an image", "render an image",
    // Arabic — simple includes check (no regex)
    "ارسم", "أرسم", "رسم لي", "رسملي",
    "صورة ل", "صوّر", "صور لي",
    "توليد صورة", "أنشئ صورة", "اصنع صورة",
    "اعمل صورة", "ولّد صورة", "ولد صورة"
  ];
  return keywords.some(kw => m.includes(kw) || message.includes(kw));
}

// ============================================================
//  🖼️ EXTRACT CLEAN PROMPT
// ============================================================
function extractImagePrompt(message) {
  const remove = [
    "generate an image of", "generate an image",
    "create an image of", "create an image",
    "make an image of", "make an image",
    "draw me", "draw a", "paint me", "paint a",
    "illustrate", "show me an image of", "render an image of",
    "ارسم لي", "أرسم لي", "رسم لي",
    "صورة ل", "توليد صورة", "أنشئ صورة",
    "اصنع صورة", "اعمل صورة", "ولّد صورة",
    "ارسم", "أرسم", "صوّر", "صور لي"
  ];
  let prompt = message;
  for (const r of remove) {
    prompt = prompt.replace(new RegExp(r, 'gi'), '').trim();
  }
  return prompt || message;
}

// ============================================================
//  🤖 MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "IlyassAgentAI v3 — LLM + Image Generation ✔️"
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
    //  🎨 BRANCH 1 — IMAGE GENERATION
    // ============================================================
    if (detectImageIntent(message)) {
      const imagePrompt = extractImagePrompt(message);
      const seed = Math.floor(Math.random() * 999999);
      const encoded = encodeURIComponent(imagePrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${seed}&nologo=true&enhance=true`;

      // Verify Pollinations is reachable
      try {
        const check = await fetch(imageUrl, { method: "HEAD" });
        if (!check.ok) throw new Error("Pollinations unreachable");
      } catch (_) {
        // fallback: still return the URL, browser will load it
      }

      return res.status(200).json({
        type: "image",
        imageUrl: imageUrl,
        prompt: imagePrompt,
        seed: seed,
        provider: "Pollinations.ai (Free)",
        reply: `🎨 صورة تم توليدها لـ: ${imagePrompt}`
      });
    }

    // ============================================================
    //  🤖 BRANCH 2 — GROQ LLM CHAT
    // ============================================================
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
          "You are IlyassAgentAI, a helpful AI assistant. Answer questions clearly and helpfully. If someone asks you to draw or generate an image, tell them you will do it via the image generation system.",
      },
      { role: "user", content: message },
    ];

    let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    let data = await response.json();

    // Agentic tool-call loop
    let iterations = 0;
    while (data.choices?.[0]?.message?.tool_calls && iterations < 5) {
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
          messages,
          tools,
          tool_choice: "auto",
        }),
      });
      data = await response.json();
    }

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "API error" });
    }

    return res.status(200).json({
      type: "text",
      reply: data.choices?.[0]?.message?.content || "No response",
    });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
