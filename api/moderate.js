// IlyassAI — /api/moderate (Edge Function — not counted in 12-function limit)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const content = body.text || body.input;
  if (!content) {
    return new Response(JSON.stringify({ error: 'text or input is required' }), { status: 400, headers: corsHeaders });
  }

  // Basic keyword fallback (no OpenAI key needed)
  const blockedPatterns = [/\b(harm|violence|abuse|illegal|nsfw)\b/i];
  const flagged = blockedPatterns.some(p => p.test(content));

  return new Response(JSON.stringify({
    success: true,
    provider: 'keyword-filter',
    flagged,
    categories: { violence: flagged },
    scores: { violence: flagged ? 0.9 : 0.01 }
  }), { status: 200, headers: corsHeaders });
}
