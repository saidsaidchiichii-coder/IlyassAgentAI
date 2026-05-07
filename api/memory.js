// IlyassAI — /api/memory
// Persistent memory system using Vercel KV (or in-memory fallback)

const memoryStore = new Map(); // In-memory fallback for dev

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, userId = 'default', key, value, query } = 
    req.method === 'GET' ? req.query : (req.body || {});

  try {
    // ── Store memory ──
    if (req.method === 'POST' && action !== 'search') {
      const memories = memoryStore.get(userId) || [];
      const memory = {
        id: Date.now().toString(),
        key: key || 'general',
        value: value || req.body,
        timestamp: new Date().toISOString(),
        type: req.body.type || 'fact'
      };
      memories.unshift(memory);
      // Keep last 100 memories
      memoryStore.set(userId, memories.slice(0, 100));
      return res.status(200).json({ success: true, memoryId: memory.id, stored: memory });
    }

    // ── Retrieve all memories ──
    if (req.method === 'GET' && !query) {
      const memories = memoryStore.get(userId) || [];
      return res.status(200).json({ 
        success: true, 
        userId, 
        count: memories.length,
        memories: memories.slice(0, 20)
      });
    }

    // ── Search memories ──
    if (query) {
      const memories = memoryStore.get(userId) || [];
      const q = query.toLowerCase();
      const matches = memories.filter(m => 
        JSON.stringify(m).toLowerCase().includes(q)
      ).slice(0, 10);
      return res.status(200).json({ success: true, query, matches, total: matches.length });
    }

    // ── Delete memory ──
    if (req.method === 'DELETE') {
      const { memoryId } = req.body || req.query;
      if (memoryId) {
        const memories = (memoryStore.get(userId) || []).filter(m => m.id !== memoryId);
        memoryStore.set(userId, memories);
        return res.status(200).json({ success: true, deleted: memoryId });
      }
      // Delete all
      memoryStore.delete(userId);
      return res.status(200).json({ success: true, message: 'All memories deleted' });
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
