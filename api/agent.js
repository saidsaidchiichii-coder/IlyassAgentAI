// IlyassAI — /api/agent
// Autonomous agent endpoint: plans, executes multi-step tasks, and reports progress

export default async function handler(req, res) {
  // ── CORS preflight ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // FIX: Set SSE headers BEFORE any writes (was set after first sendEvent call)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { task, context = [], tools = ['search', 'code', 'image', 'deploy'] } = req.body || {};

  if (!task) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'task is required' })}\n\n`);
    return res.end();
  }

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data, timestamp: new Date().toISOString() })}\n\n`);
  };

  // ── Phase 1: Planning ──
  sendEvent('thinking', { message: 'Analyzing task and creating execution plan…', step: 0 });

  const groqKey = process.env.GROQ_API_KEY;
  const orKey   = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Helper: call any available LLM
  async function callLLM(messages, maxTokens = 512, jsonMode = false) {
    // FIX: Groq model name corrected (no slash prefix)
    if (groqKey) {
      try {
        const body = {
          model: 'llama-3.3-70b-versatile',  // FIX: was 'llama-3.3-70b-versatile'
          messages,
          max_tokens: maxTokens,
          temperature: 0.3
        };
        if (jsonMode) body.response_format = { type: 'json_object' };

        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000)
        });
        if (r.ok) {
          const d = await r.json();
          return d.choices?.[0]?.message?.content || '';
        }
      } catch (e) { console.error('LLM Groq error:', e.message); }
    }

    // Fallback to OpenRouter
    if (orKey) {
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orKey}`,
            'HTTP-Referer': req.headers.host ? `https://${req.headers.host}` : 'https://ilyassagentai.vercel.app',
            'X-Title': 'IlyassAI'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            messages,
            max_tokens: maxTokens,
            temperature: 0.3
          }),
          signal: AbortSignal.timeout(20000)
        });
        if (r.ok) {
          const d = await r.json();
          return d.choices?.[0]?.message?.content || '';
        }
      } catch (e) { console.error('LLM OpenRouter error:', e.message); }
    }

    // Fallback to Gemini
    if (geminiKey) {
      try {
        const gemMsgs = messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: gemMsgs, generationConfig: { maxOutputTokens: maxTokens } }),
            signal: AbortSignal.timeout(20000)
          }
        );
        if (r.ok) {
          const d = await r.json();
          return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) { console.error('LLM Gemini error:', e.message); }
    }

    return '';
  }

  const planningPrompt = `You are IlyassAI, an autonomous agent. Analyze this task and create a numbered execution plan (max 6 steps). Be specific and actionable.

Task: ${task}

Respond with ONLY valid JSON in this exact format:
{"steps": [
  { "step": 1, "action": "search", "description": "Search for X" },
  { "step": 2, "action": "code", "description": "Write Y code" },
  { "step": 3, "action": "analyze", "description": "Analyze results" }
]}`;

  let plan = [];

  try {
    const planContent = await callLLM(
      [{ role: 'user', content: planningPrompt }],
      512,
      true  // json mode
    );
    if (planContent) {
      const parsed = JSON.parse(planContent);
      plan = Array.isArray(parsed) ? parsed : (parsed.steps || parsed.plan || []);
    }
  } catch (e) {
    console.error('Planning parse error:', e.message);
  }

  if (plan.length === 0) {
    plan = [
      { step: 1, action: 'analyze', description: 'Analyze task requirements' },
      { step: 2, action: 'execute', description: 'Execute the task' },
      { step: 3, action: 'complete', description: 'Finalize and return results' }
    ];
  }

  sendEvent('plan', { steps: plan, totalSteps: plan.length });

  // ── Phase 2: Execute each step ──
  let results = [];
  for (const step of plan) {
    sendEvent('step_start', { step: step.step, action: step.action, description: step.description });

    await new Promise(r => setTimeout(r, 300));

    try {
      let stepResult = null;

      if (step.action === 'search' && tools.includes('search')) {
        try {
          const query = task.slice(0, 100);
          const ddgRes = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (ddgRes.ok) {
            const data = await ddgRes.json();
            const searchResults = [];
            if (data.AbstractText) {
              searchResults.push({
                title: data.Heading || query,
                url: data.AbstractURL || '#',
                snippet: data.AbstractText,
                source: 'DuckDuckGo'
              });
            }
            (data.RelatedTopics || []).slice(0, 4).forEach(topic => {
              if (topic.Text) {
                searchResults.push({
                  title: topic.Text.split(' - ')[0] || query,
                  url: topic.FirstURL || '#',
                  snippet: topic.Text,
                  source: 'DuckDuckGo'
                });
              }
            });
            stepResult = { type: 'search', results: searchResults };
          }
        } catch (searchErr) {
          console.error('Search step error:', searchErr.message);
        }
      }

      if (!stepResult) {
        const messages = [
          { role: 'system', content: 'You are IlyassAI, an autonomous AI agent. Execute the assigned step thoroughly.' },
          ...context,
          { role: 'user', content: `Task: ${task}\n\nExecute step ${step.step}: ${step.description}\n\nProvide a complete, detailed response.` }
        ];

        const content = await callLLM(messages, 2048);
        if (content) {
          stepResult = { type: 'text', content };
          results.push({ step: step.step, ...stepResult });
        }
      }

      sendEvent('step_done', {
        step: step.step,
        description: step.description,
        result: stepResult,
        status: 'success'
      });

    } catch (err) {
      sendEvent('step_error', { step: step.step, error: err.message });
    }
  }

  // ── Phase 3: Synthesize final response ──
  sendEvent('synthesizing', { message: 'Combining results into final response…' });

  let finalResponse = '';
  if (results.length > 0) {
    try {
      const synthesisPrompt = `Task: ${task}

Execution results:
${results.map(r => `Step ${r.step}: ${JSON.stringify(r).slice(0, 500)}`).join('\n')}

Synthesize these results into a comprehensive, well-formatted final response. Use markdown formatting.`;

      finalResponse = await callLLM(
        [{ role: 'user', content: synthesisPrompt }],
        3000
      );
    } catch {}
  }

  sendEvent('complete', {
    message: 'Task completed',
    response: finalResponse || results.map(r => r.content || JSON.stringify(r)).join('\n\n'),
    steps: plan.length,
    duration: '—'
  });

  res.write('data: [DONE]\n\n');
  res.end();
}
