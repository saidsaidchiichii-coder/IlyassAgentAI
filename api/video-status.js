// IlyassAI — /api/video-status (Check MiniMax video generation status)
// Poll this endpoint to get the video URL once ready

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });

  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (!minimaxKey) return res.status(500).json({ error: 'MiniMax key not configured' });

  try {
    const response = await fetch(`https://api.minimax.io/v1/video_generation/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${minimaxKey}` },
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        success: true,
        status: data.status,
        videoUrl: data.video_url || null,
        taskId
      });
    }
    return res.status(response.status).json({ error: 'Failed to fetch status' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
