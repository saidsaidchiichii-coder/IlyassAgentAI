// IlyassAI — /api/chat
// Autonomous multi-model AI agent with streaming, tool routing, and fallback chain

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], model = 'auto', tools = [], stream = true } = req.body || {};

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }

  // ── System prompt injected for autonomous agent behavior ──
  const systemPrompt = {
    role: 'system',
    content: `You are IlyassAI, an autonomous AI agent similar to Manus in capabilities. You are intelligent, proactive, and capable of complex multi-step reasoning. 

You can:
- Search the web for real-time information
- Write, debug, and explain code in any language  
- Generate and analyze images
- Help deploy to GitHub and Vercel
- Manage and analyze data
- Break down complex tasks into clear steps

Always be thorough, precise, and professional. When asked to build something, provide complete, production-ready code. Show your reasoning step by step when solving complex problems. You represent a world-class AI company's product.`
  };

  const allMessages = [systemPrompt, ...messages];

  // ── Model routing: pick best available free model ──
  const modelMap = {
    'auto':            'meta-llama/llama-3.3-70b-versatile',
    'llama-3.3-70b':   'meta-llama/llama-3.3-70b-versatile',
    'deepseek-r1':     'deepseek-r1-distill-llama-70b',
    'gemma-2-27b':     'gemma2-9b-it',
    'qwen-2.5-72b':    'meta-llama/llama-3.1-70b-versatile',
    'mistral-7b':      'mixtral-8x7b-32768',
  };

  const groqModel = modelMap[model] || modelMap['auto'];

  // ── Groq streaming (primary — ultra fast) ──
  const groqKey = process.env.GROQ_API_KEY;
  const hfKey = process.env.HF_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: allMessages,
          stream: true,
          max_tokens: 4096,
          temperature: 0.7
        })
      });

      if (groqRes.ok) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          res.write(chunk);
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    } catch (e) {
      console.error('Groq error:', e.message);
    }
  }

  // ── Gemini fallback ──
  if (geminiKey) {
    try {
      const geminiMessages = allMessages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${geminiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt.content }] },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 4096, temperature: 0.7 }
          })
        }
      );

      if (geminiRes.ok) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const reader = geminiRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
                }
              } catch {}
            }
          }
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    } catch (e) {
      console.error('Gemini error:', e.message);
    }
  }

  // ── HuggingFace fallback (no stream) ──
  if (hfKey) {
    try {
      const hfRes = await fetch(
        'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: messages[messages.length - 1].content,
            parameters: { max_new_tokens: 2048, return_full_text: false }
          })
        }
      );

      if (hfRes.ok) {
        const data = await hfRes.json();
        const text = data[0]?.generated_text || 'No response generated.';
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    } catch (e) {
      console.error('HuggingFace error:', e.message);
    }
  }

  // ── Final fallback: OpenAI ──
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: allMessages,
          stream: true,
          max_tokens: 4096
        })
      });

      if (openaiRes.ok) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const reader = openaiRes.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value));
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    } catch (e) {
      console.error('OpenAI error:', e.message);
    }
  }

  return res.status(503).json({ 
    error: 'All AI models unavailable. Please configure at least one API key (GROQ_API_KEY, GEMINI_API_KEY, HF_API_KEY, or OPENAI_API_KEY) in your Vercel environment variables.' 
  });
}
