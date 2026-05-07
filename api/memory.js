// ================================================================
//  api/memory.js — RAG / Vector Memory
//  
//  Simple conversation memory using:
//    • localStorage-compatible JSON store (no DB needed for basic)
//    • Upstash Vector (if UPSTASH_VECTOR_REST_URL set) — FREE tier
//    • Text similarity scoring (TF-IDF style, no embeddings API)
//
//  Endpoints:
//    POST /api/memory { action: 'store', content, userId, convId }
//    POST /api/memory { action: 'search', query, userId, topK }
//    POST /api/memory { action: 'clear', userId }
// ================================================================

export const config = { api: { bodyParser: true } };

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Simple in-memory store (resets between cold starts) ────────
// For production, use Upstash (see below)
const memoryStore = new Map();

// ── TF-IDF similarity (no external embeddings API) ─────────────
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function cosineSimilarity(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(w => setB.has(w)).length;
  if (!intersection) return 0;
  return intersection / Math.sqrt(setA.size * setB.size);
}

function chunkText(text, maxChunk = 512) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxChunk && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET')     return res.status(200).json({ ok: true, message: 'IlyassAI Memory API ✅' });
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body   = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const action = body?.action || 'search';
    const userId = body?.userId || 'default';

    // ── Try Upstash Vector first ───────────────────────────────
    const UPSTASH_URL   = process.env.UPSTASH_VECTOR_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN;
    const useUpstash    = UPSTASH_URL && UPSTASH_TOKEN;

    if (useUpstash) {
      return await handleUpstash(action, body, userId, UPSTASH_URL, UPSTASH_TOKEN, res);
    }

    // ── Fallback: in-memory store ──────────────────────────────
    return await handleInMemory(action, body, userId, res);

  } catch(err) {
    console.error('[memory] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── IN-MEMORY handler (no DB) ──────────────────────────────────
async function handleInMemory(action, body, userId, res) {
  if (!memoryStore.has(userId)) memoryStore.set(userId, []);
  const store = memoryStore.get(userId);

  if (action === 'store') {
    const content = (body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'content required' });

    const chunks = chunkText(content);
    const added  = [];
    for (const chunk of chunks) {
      const entry = {
        id:       `${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        content:  chunk,
        tokens:   tokenize(chunk),
        convId:   body?.convId || null,
        filename: body?.filename || null,
        timestamp: Date.now(),
      };
      store.push(entry);
      added.push(entry.id);
      if (store.length > 500) store.splice(0, store.length - 500); // Keep last 500
    }
    memoryStore.set(userId, store);
    return res.status(200).json({ stored: added.length, chunks: added });
  }

  if (action === 'search') {
    const query  = (body?.query || '').trim();
    const topK   = Math.min(body?.topK || 3, 10);
    if (!query) return res.status(400).json({ error: 'query required' });

    const queryTokens = tokenize(query);
    const scored = store.map(entry => ({
      ...entry,
      score: cosineSimilarity(queryTokens, entry.tokens),
    }));
    const results = scored
      .sort((a, b) => b.score - a.score)
      .filter(r => r.score > 0.05)
      .slice(0, topK)
      .map(r => ({ id: r.id, content: r.content, score: r.score, filename: r.filename }));

    const context = results.map(r => r.content).join('\n\n---\n\n');
    return res.status(200).json({ results, context, topK: results.length });
  }

  if (action === 'clear') {
    memoryStore.set(userId, []);
    return res.status(200).json({ cleared: true });
  }

  if (action === 'list') {
    return res.status(200).json({
      count: store.length,
      items: store.slice(-10).map(e => ({ id: e.id, preview: e.content.slice(0,80), timestamp: e.timestamp })),
    });
  }

  return res.status(400).json({ error: 'action must be: store | search | clear | list' });
}

// ── UPSTASH VECTOR handler ─────────────────────────────────────
async function handleUpstash(action, body, userId, baseUrl, token, res) {
  const upstashFetch = (endpoint, method, data) =>
    fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }).then(r => r.json());

  if (action === 'store') {
    const content = (body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'content required' });

    const chunks  = chunkText(content);
    const vectors = chunks.map((chunk, i) => {
      // Simple hash-based pseudo-embedding (no embedding API needed)
      const tokens = tokenize(chunk);
      const vec    = new Array(128).fill(0);
      tokens.forEach(t => { vec[Math.abs(hashCode(t)) % 128] += 1; });
      const norm   = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
      return {
        id:       `${userId}_${Date.now()}_${i}`,
        vector:   vec.map(v => v / norm),
        metadata: { content: chunk, userId, convId: body?.convId, filename: body?.filename, ts: Date.now() },
      };
    });

    const result = await upstashFetch('/upsert', 'POST', vectors);
    return res.status(200).json({ stored: chunks.length, provider: 'upstash', result });
  }

  if (action === 'search') {
    const query = (body?.query || '').trim();
    const topK  = Math.min(body?.topK || 3, 10);
    const tokens = tokenize(query);
    const vec    = new Array(128).fill(0);
    tokens.forEach(t => { vec[Math.abs(hashCode(t)) % 128] += 1; });
    const norm   = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;

    const result = await upstashFetch('/query', 'POST', {
      vector:          vec.map(v => v / norm),
      topK,
      includeMetadata: true,
      filter:          `userId = '${userId}'`,
    });

    const results = (result?.result || []).map(r => ({
      id:       r.id,
      content:  r.metadata?.content || '',
      score:    r.score,
      filename: r.metadata?.filename,
    }));

    const context = results.map(r => r.content).join('\n\n---\n\n');
    return res.status(200).json({ results, context, topK: results.length, provider: 'upstash' });
  }

  return res.status(400).json({ error: 'action must be: store | search | clear' });
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
