module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // ===== تحليل الأمر من المستخدم =====
    const lowerPrompt = prompt.toLowerCase().trim();
    let action_type = 'create';
    let file_path = '';
    let aiPrompt = prompt;

    // ===== كشف نوع الأمر =====
    // "sir create file X" أو "sir dir file X" أو "sir create X.js"
    const createMatch = lowerPrompt.match(/(?:sir\s+)?(?:create|dir|new|ddir|dirf)\s+(?:file\s+)?([\w\-\/\.]+)/i);
    const updateMatch = lowerPrompt.match(/(?:sir\s+)?(?:update|edit|fix|modify|beddel|correct)\s+(?:file\s+)?([\w\-\/\.]+)/i);
    const deleteMatch = lowerPrompt.match(/(?:sir\s+)?(?:delete|remove|del|hyyid)\s+(?:file\s+)?([\w\-\/\.]+)/i);

    if (deleteMatch) {
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
      // إذا ماعندوش extension، نضيفوها
      if (!file_path.includes('.')) file_path = file_path + '.js';
      aiPrompt = `Create a new JavaScript file named ${file_path}. Content: ${prompt}`;
    } else {
      // أمر عام - نستعمل Groq مباشرة
      return res.status(200).json({
        success: true,
        message: 'Please specify a file. Example: "sir create file hello.js"',
        hint: 'Commands: create / update / delete + filename'
      });
    }

    // ===== trigger GitHub Workflow =====
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
    console.error('Agent error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
