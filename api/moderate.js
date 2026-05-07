// IlyassAI — /api/moderate
// Content moderation using OpenAI Moderation API with keyword fallback

export default async function handler(req, res) {
  // ── CORS preflight ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, input } = req.body || {};
  const content = text || input;

  if (!content) {
    return res.status(400).json({ error: 'text or input is required' });
  }

  // ── OpenAI Moderation (free endpoint) ──
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const modRes = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({ input: content })
      });

      if (modRes.ok) {
        const data = await modRes.json();
        const result = data.results?.[0];
        return res.status(200).json({
          success: true,
          provider: 'OpenAI',
          flagged: result?.flagged || false,
          categories: result?.categories || {},
          scores: result?.category_scores || {}
        });
      }
    } catch (e) {
      console.error('Moderation error:', e.message);
    }
  }

  // ── Basic keyword fallback ──
  const blockedPatterns = [
    /\b(harm|violence|abuse|illegal)\b/i
  ];
  const flagged = blockedPatterns.some(p => p.test(content));
  
  return res.status(200).json({
    success: true,
    provider: 'keyword-fallback',
    flagged,
    categories: { violence: flagged },
    scores: { violence: flagged ? 0.9 : 0.01 }
  });
}
