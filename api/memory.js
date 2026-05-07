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

export default async function handler(req, res) {
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
