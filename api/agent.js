// IlyassAI — /api/agent
// Autonomous agent endpoint: plans, executes multi-step tasks, and reports progress

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
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
  const geminiKey = process.env.GEMINI_API_KEY;

  const planningPrompt = `You are IlyassAI, an autonomous agent. Analyze this task and create a numbered execution plan (max 6 steps). Be specific and actionable.

Task: ${task}

Respond with ONLY a JSON array of steps like:
[
  { "step": 1, "action": "search", "description": "Search for X" },
  { "step": 2, "action": "code", "description": "Write Y code" },
  { "step": 3, "action": "analyze", "description": "Analyze results" }
]`;

  let plan = [];
  
  if (groqKey) {
    try {
      const planRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: planningPrompt }],
          max_tokens: 512,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (planRes.ok) {
        const planData = await planRes.json();
        const content = planData.choices?.[0]?.message?.content || '[]';
        try {
          const parsed = JSON.parse(content);
          plan = Array.isArray(parsed) ? parsed : (parsed.steps || parsed.plan || []);
        } catch {
          plan = [
            { step: 1, action: 'research', description: 'Research the task requirements' },
            { step: 2, action: 'execute', description: 'Execute the primary task' },
            { step: 3, action: 'review', description: 'Review and refine the output' }
          ];
        }
      }
    } catch (e) {
      console.error('Planning error:', e.message);
    }
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
    
    await new Promise(r => setTimeout(r, 300)); // Brief pause for UX

    try {
      let stepResult = null;

      if (step.action === 'search' && tools.includes('search')) {
        // Execute web search
        try {
          const searchRes = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: task.slice(0, 100) })
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            stepResult = { type: 'search', results: searchData.results?.slice(0, 5) || [] };
          }
        } catch {}
      } else {
        // Generate content using LLM
        const messages = [
          { role: 'system', content: 'You are IlyassAI, an autonomous AI agent. Execute the assigned step thoroughly.' },
          ...context,
          { role: 'user', content: `Task: ${task}\n\nExecute step ${step.step}: ${step.description}\n\nProvide a complete, detailed response.` }
        ];

        if (groqKey) {
          const execRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.3-70b-versatile',
              messages,
              max_tokens: 2048,
              temperature: 0.7
            })
          });

          if (execRes.ok) {
            const execData = await execRes.json();
            const content = execData.choices?.[0]?.message?.content || '';
            stepResult = { type: 'text', content };
            results.push({ step: step.step, ...stepResult });
          }
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
  if (groqKey && results.length > 0) {
    try {
      const synthesisPrompt = `Task: ${task}

Execution results:
${results.map(r => `Step ${r.step}: ${JSON.stringify(r).slice(0, 500)}`).join('\n')}

Synthesize these results into a comprehensive, well-formatted final response. Use markdown formatting.`;

      const synthRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: synthesisPrompt }],
          max_tokens: 3000
        })
      });

      if (synthRes.ok) {
        const synthData = await synthRes.json();
        finalResponse = synthData.choices?.[0]?.message?.content || '';
      }
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
