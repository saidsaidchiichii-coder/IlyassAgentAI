// ============================================================
// api/agent.js — CONSOLIDATED: agent + orchestrator + reasoning
// Route via ?action=mission | orchestrate | reason
// ============================================================

// ── MISSION/GITHUB WORKFLOW HANDLER ─────────────────────────
async function handleMission(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Parse command from prompt
    const lowerPrompt = prompt.toLowerCase().trim();
    let action_type = 'create';
    let file_path = 'mission_log.txt';
    let aiPrompt = prompt;

    // Detect command type
    const missionMatch = lowerPrompt.match(/(?:sir\s+)?(?:mission|task|project|repo|repository)\s+(.+)/i);
    const createMatch = lowerPrompt.match(/(?:sir\s+)?(?:create|dir|new|ddir|dirf)\s+(?:file\s+)?([\w\-\/\.]+)/i);
    const updateMatch = lowerPrompt.match(/(?:sir\s+)?(?:update|edit|fix|modify|beddel|correct)\s+(?:file\s+)?([\w\-\/\.]+)/i);
    const deleteMatch = lowerPrompt.match(/(?:sir\s+)?(?:delete|remove|del|hyyid)\s+(?:file\s+)?([\w\-\/\.]+)/i);

    if (missionMatch) {
      action_type = 'mission';
      file_path = 'mission.md';
      aiPrompt = missionMatch[1];
    } else if (deleteMatch) {
      action_type = 'delete';
      file_path = deleteMatch[1];
      aiPrompt = `Delete the file: ${file_path}`;
    } else if (updateMatch) {
      action_type = 'update';
      file_path = updateMatch[1];
      aiPrompt = prompt;
    } else if (createMatch) {
      action_type = 'create';
      file_path = createMatch[1];
      if (!file_path.includes('.')) file_path = file_path + '.js';
      aiPrompt = `Create a new file named ${file_path}. Content: ${prompt}`;
    } else if (lowerPrompt.length > 10) {
      action_type = 'mission';
      file_path = 'mission.md';
      aiPrompt = prompt;
    } else {
      return res.status(200).json({
        success: true,
        message: 'Please specify a mission or file. Example: "mission create a new repo for a grok website"',
        hint: 'Commands: mission / create / update / delete'
      });
    }

    // Trigger GitHub Workflow
    const ghToken = process.env.GH_TOKEN;
    const ghRepo = "saidsaidchiichii-coder/IlyassAgentAI";

    const ghRes = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/groq_automation.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${ghToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            prompt: aiPrompt,
            file_path: file_path,
            action_type: action_type
          }
        })
      }
    );

    if (ghRes.ok) {
      return res.status(200).json({
        success: true,
        message: `✅ GitHub workflow triggered!`,
        action: action_type,
        file: file_path,
        prompt: aiPrompt
      });
    } else {
      const errText = await ghRes.text();
      return res.status(500).json({ success: false, error: 'GitHub trigger failed', details: errText });
    }

  } catch (error) {
    console.error('Mission error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ── AGENT ORCHESTRATOR HANDLER ──────────────────────────────
async function handleOrchestrate(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  const { task, tools = [], context = {} } = req.body || {};
  if (!task) return res.status(400).json({ error: 'task required' });

  try {
    // Build orchestration prompt
    const toolsDescription = tools.length > 0 
      ? `Available tools: ${tools.join(', ')}`
      : 'No tools available';

    const orchestrationPrompt = `Task: ${task}\n${toolsDescription}\nContext: ${JSON.stringify(context)}`;

    // Call LLM for orchestration
    const baseUrl = process.env.AIHUBMIX_BASE_URL || 'https://api.aihubmix.com/v1';
    const apiKey = process.env.AIHUBMIX_API_KEY || process.env.OPENAI_API_KEY;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: orchestrationPrompt }],
        temperature: 0.5,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.message || 'Orchestration failed' });
    }

    const data = await response.json();
    const plan = data.choices?.[0]?.message?.content || 'No plan generated';

    return res.status(200).json({
      success: true,
      task,
      plan,
      toolsUsed: tools
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ── REASONING ENGINE HANDLER ────────────────────────────────
async function handleReason(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  const { problem, depth = 'standard' } = req.body || {};
  if (!problem) return res.status(400).json({ error: 'problem required' });

  try {
    // Build reasoning prompt based on depth
    let reasoningPrompt = `Analyze this problem step-by-step:\n${problem}`;
    if (depth === 'deep') {
      reasoningPrompt += '\n\nProvide: 1) Root cause analysis, 2) Multiple solution paths, 3) Pros/cons, 4) Recommendation';
    } else if (depth === 'quick') {
      reasoningPrompt += '\n\nProvide a concise analysis in 3-4 sentences.';
    }

    // Call LLM for reasoning
    const baseUrl = process.env.AIHUBMIX_BASE_URL || 'https://api.aihubmix.com/v1';
    const apiKey = process.env.AIHUBMIX_API_KEY || process.env.OPENAI_API_KEY;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: reasoningPrompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.message || 'Reasoning failed' });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'No analysis generated';

    return res.status(200).json({
      success: true,
      problem,
      analysis,
      depth
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ── MAIN HANDLER ────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'mission';
  
  if (action === 'mission') return handleMission(req, res);
  if (action === 'orchestrate') return handleOrchestrate(req, res);
  if (action === 'reason') return handleReason(req, res);
  
  return res.status(400).json({ error: 'Unknown action. Use ?action=mission|orchestrate|reason' });
}
