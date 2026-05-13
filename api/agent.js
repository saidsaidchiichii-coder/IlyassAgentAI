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
    } )
  });
  return res.ok;
}
