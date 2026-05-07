// ================================================================
//  api/moderate.js — Content Moderation
//  Layers (in order):
//    1. Local rule-based filter (instant, no API)
//    2. Groq-based moderation (uses existing GROQ_API_KEY)
//  Optional: OPENAI_API_KEY → OpenAI Moderation (most accurate, free)
// ================================================================

export const config = { api: { bodyParser: true } };

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Local keyword filter (Layer 1) ────────────────────────────
const BLOCKED_PATTERNS = [
  /\b(bomb|explosive|weapon)\s*(how|make|build|create)/i,
  /\b(hack|crack)\s+(into|password|account)/i,
  /\bcredit\s*card\s*(number|steal|dump)/i,
  /\b(child|minor|underage)\s+(porn|nude|sex)/i,
];
const WARNED_PATTERNS = [
  /\b(kill|murder|suicide|self.harm)\b/i,
  /\b(drugs|cocaine|heroin|meth)\s+(buy|sell|how to make)/i,
];

function localModerate(text) {
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(text)) return { flagged: true, level: 'block', reason: 'Harmful content detected' };
  }
  for (const p of WARNED_PATTERNS) {
    if (p.test(text)) return { flagged: true, level: 'warn', reason: 'Sensitive topic detected' };
  }
  return { flagged: false, level: 'safe' };
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const text = (body?.text || body?.message || '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });

    // ── Layer 1: Local rule-based ──────────────────────────────
    const local = localModerate(text);
    if (local.level === 'block') {
      return res.status(200).json({ safe: false, action: 'block', reason: local.reason, layer: 'local' });
    }

    // ── Layer 2: OpenAI Moderation (free endpoint) ─────────────
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_KEY) {
      try {
        const r = await fetch('https://api.openai.com/v1/moderations', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({ input: text }),
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) {
          const data = await r.json();
          const result = data.results?.[0];
          if (result?.flagged) {
            const categories = Object.entries(result.categories || {})
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(', ');
            return res.status(200).json({
              safe:   false,
              action: 'block',
              reason: `Policy violation: ${categories}`,
              layer:  'openai',
              scores: result.category_scores,
            });
          }
        }
      } catch(e) { console.warn('[moderate] OpenAI check failed:', e.message); }
    }

    // ── Layer 3: Groq-based semantic check ─────────────────────
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (GROQ_KEY && text.length > 20) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{
              role:    'user',
              content: `Is this message safe and appropriate? Reply ONLY with "SAFE" or "UNSAFE:reason". Message: "${text.slice(0,200)}"`,
            }],
            max_tokens:  20,
            temperature: 0,
          }),
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) {
          const data = await r.json();
          const verdict = data.choices?.[0]?.message?.content?.trim() || 'SAFE';
          if (verdict.startsWith('UNSAFE')) {
            return res.status(200).json({
              safe:   false,
              action: local.level === 'warn' ? 'warn' : 'block',
              reason: verdict.replace('UNSAFE:', '').trim(),
              layer:  'groq',
            });
          }
        }
      } catch(e) { console.warn('[moderate] Groq check skipped:', e.message); }
    }

    // ── All clear ──────────────────────────────────────────────
    return res.status(200).json({
      safe:    true,
      action:  local.level === 'warn' ? 'warn' : 'allow',
      reason:  local.level === 'warn' ? local.reason : null,
      layer:   'passed',
    });

  } catch(err) {
    console.error('[moderate] Error:', err);
    // Fail open — don't block users on moderation error
    return res.status(200).json({ safe: true, action: 'allow', layer: 'error_fallback' });
  }
}
