// ============================================================
// api/utilities.js — MERGED: memory + discover + transcribe
// Route via ?action=memory | discover | transcribe
// ============================================================

// IlyassAI — /api/memory
// Persistent memory system using Vercel KV (Redis) with cookie-based in-request fallback
// 
// For persistence across requests, set these env vars in Vercel:
//   KV_REST_API_URL   — from Vercel KV (Storage tab)
//   KV_REST_API_TOKEN — from Vercel KV (Storage tab)
//
// Without KV, memory still works within a single request but won't persist across sessions.

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, exSeconds = 2592000 /* 30 days */) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: JSON.stringify(value), ex: exSeconds })
    });
    return res.ok;
  } catch { return false; }
}

async function kvDel(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  try {
    await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return true;
  } catch { return false; }
}

// In-memory fallback (only lives for the duration of this cold-start instance)
const memoryStore = new Map();

async function handleMemory(req, res) {
  // ── CORS preflight ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, userId = 'default', key, value, query, content, memoryId } = 
    req.method === 'GET' ? req.query : (req.body || {});

  const storeKey = `memory:${userId}`;
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  // Helper: get memories from KV or in-memory fallback
  const getMemories = async () => {
    if (hasKV) {
      return (await kvGet(storeKey)) || [];
    }
    return memoryStore.get(userId) || [];
  };

  // Helper: save memories to KV or in-memory fallback
  const saveMemories = async (memories) => {
    if (hasKV) {
      await kvSet(storeKey, memories);
    } else {
      memoryStore.set(userId, memories);
    }
  };

  try {
    // ── Store memory ──
    if (req.method === 'POST' && action !== 'search') {
      const memories = await getMemories();
      const memory = {
        id: Date.now().toString(),
        key: key || 'general',
        value: value || content || req.body,
        timestamp: new Date().toISOString(),
        type: req.body?.type || 'fact'
      };
      memories.unshift(memory);
      await saveMemories(memories.slice(0, 100)); // Keep last 100
      return res.status(200).json({ 
        success: true, 
        memoryId: memory.id, 
        stored: memory,
        persistent: hasKV
      });
    }

    // ── Retrieve all memories ──
    if (req.method === 'GET' && !query) {
      const memories = await getMemories();
      return res.status(200).json({ 
        success: true, 
        userId, 
        count: memories.length,
        memories: memories.slice(0, 20),
        persistent: hasKV
      });
    }

    // ── Search memories ──
    if (query || (req.method === 'POST' && action === 'search')) {
      const searchQuery = query || req.body?.query || '';
      const memories = await getMemories();
      const q = searchQuery.toLowerCase();
      const matches = memories.filter(m => 
        JSON.stringify(m).toLowerCase().includes(q)
      ).slice(0, 10);
      return res.status(200).json({ success: true, query: searchQuery, matches, total: matches.length });
    }

    // ── Delete memory ──
    if (req.method === 'DELETE') {
      const delId = memoryId || req.body?.memoryId || req.query?.memoryId;
      if (delId) {
        const memories = (await getMemories()).filter(m => m.id !== delId);
        await saveMemories(memories);
        return res.status(200).json({ success: true, deleted: delId });
      }
      // Delete all
      if (hasKV) await kvDel(storeKey);
      else memoryStore.delete(userId);
      return res.status(200).json({ success: true, message: 'All memories deleted' });
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


// IlyassAI — /api/discover (Edge Function — not counted in 12-function limit)
// config merged below

async function handleDiscover(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  const groqKey   = process.env.GROQ_API_KEY;
  const hfKey     = process.env.HF_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const apiSources = [
    { name: 'Groq',         type: 'llm',    models: ['llama-3.3-70b-versatile', 'gemma2-9b-it'], endpoint: 'https://api.groq.com/openai/v1/models', auth: groqKey ? `Bearer ${groqKey}` : null },
    { name: 'HuggingFace',  type: 'llm',    models: ['Meta-Llama-3-8B', 'Qwen2.5-72B'],          endpoint: 'https://huggingface.co/api/models?limit=3', auth: hfKey ? `Bearer ${hfKey}` : null },
    { name: 'Pollinations', type: 'image',  models: ['flux', 'turbo'],                            endpoint: 'https://image.pollinations.ai/models', auth: null },
    ...(geminiKey ? [{ name: 'Gemini', type: 'llm', models: ['gemini-1.5-flash'], endpoint: `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, auth: null }] : []),
  ];

  const now = new Date().toISOString();
  const results = [];

  for (const source of apiSources) {
    const start = Date.now();
    let status = 'unknown', latency = null;
    try {
      const headers = source.auth ? { Authorization: source.auth } : {};
      const r = await fetch(source.endpoint, { headers, signal: AbortSignal.timeout(4000) });
      latency = Date.now() - start;
      status  = r.ok ? 'online' : 'error';
    } catch (e) {
      status  = 'offline';
      latency = Date.now() - start;
    }
    results.push({ name: source.name, type: source.type, models: source.models, status, latency, checkedAt: now });
  }

  results.sort((a, b) => (b.status === 'online' ? 1 : 0) - (a.status === 'online' ? 1 : 0));
  const online = results.filter(r => r.status === 'online').length;

  return new Response(JSON.stringify({
    success: true, discoveredAt: now,
    summary: { total: results.length, online, offline: results.length - online },
    apis: results
  }), { status: 200, headers: corsHeaders });
}


// IlyassAI — /api/transcribe
// Speech-to-text using Groq Whisper (primary) and OpenAI Whisper (fallback)


async function handleTranscribe(req, res) {
  // ── CORS preflight ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return res.status(503).json({ 
      error: 'Transcription requires GROQ_API_KEY or OPENAI_API_KEY in Vercel environment variables.' 
    });
  }

  try {
    // ── Read raw body safely ──
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const body = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || 'audio/webm';

    // ── Groq Whisper (primary — free & fast) ──
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': contentType
          },
          body
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          return res.status(200).json({ 
            success: true, 
            text: data.text, 
            language: data.language,
            duration: data.duration,
            provider: 'Groq Whisper'
          });
        } else {
          const errText = await groqRes.text();
          console.error('Groq Whisper error:', groqRes.status, errText);
        }
      } catch (e) {
        console.error('Groq Whisper exception:', e.message);
      }
    }

    // ── OpenAI Whisper fallback ──
    if (openaiKey) {
      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': contentType
        },
        body
      });

      if (!whisperRes.ok) {
        const err = await whisperRes.text();
        throw new Error(`Whisper API error: ${whisperRes.status} - ${err}`);
      }

      const data = await whisperRes.json();
      return res.status(200).json({ 
        success: true, 
        text: data.text, 
        language: data.language,
        duration: data.duration,
        provider: 'OpenAI Whisper'
      });
    }

    return res.status(503).json({ error: 'All transcription providers failed.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'memory';
  if (action === 'memory') return handleMemory(req, res);
  if (action === 'discover') return handleDiscover(req, res);
  if (action === 'transcribe') return handleTranscribe(req, res);
  return res.status(400).json({ error: 'Unknown action. Use ?action=memory|discover|transcribe' });
}
