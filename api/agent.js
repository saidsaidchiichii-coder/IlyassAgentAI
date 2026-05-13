async function triggerGitHubWorkflow(prompt, filePath, actionType) {
  const token = process.env.GH_TOKEN;
  const repo = "saidsaidchiichii-coder/IlyassAgentAI";
  
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/groq_automation.yml/dispatches`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        prompt: prompt,
        file_path: filePath,
        action_type: actionType
      }
    })
  });
  return res.ok;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, filePath, actionType } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    const success = await triggerGitHubWorkflow(
      prompt,
      filePath || '',
      actionType || 'general'
    );

    if (success) {
      return res.status(200).json({
        success: true,
        message: 'GitHub workflow triggered successfully',
        prompt,
        filePath,
        actionType
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to trigger GitHub workflow'
      });
    }
  } catch (error) {
    console.error('Agent error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
