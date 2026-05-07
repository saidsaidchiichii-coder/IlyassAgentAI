// ================================================================
//  api/discover.js — IlyassAI Free API Discovery & Status
//
//  Checks all configured free APIs for availability & limits
//  Returns a status report of all APIs
// ================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Free API Registry ─────────────────────────────────────────
const API_REGISTRY = [
  // LLM APIs
  {
    id: 'groq',
    name: 'Groq (Llama 3.3 70B)',
    category: 'LLM',
    free_tier: '14,400 req/day, 6K tokens/min',
    endpoint: 'https://api.groq.com/openai/v1/models',
    auth_header: 'Authorization',
    auth_prefix: 'Bearer ',
    env_key: 'GROQ_API_KEY',
    icon: '⚡',
    priority: 1,
  },
  {
    id: 'gemini',
    name: 'Google Gemini 2.0 Flash',
    category: 'LLM',
    free_tier: '1M tokens/min, 1500 req/day',
    endpoint: null, // key-based, checked differently
    env_key: 'GEMINI_API_KEY',
    icon: '🌟',
    priority: 2,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (DeepSeek R1, Llama)',
    category: 'LLM',
    free_tier: '20 req/min, 200 req/day (free models)',
    endpoint: 'https://openrouter.ai/api/v1/models',
    auth_header: 'Authorization',
    auth_prefix: 'Bearer ',
    env_key: 'OPENROUTER_API_KEY',
    icon: '🔀',
    priority: 3,
  },
  {
    id: 'mistral',
    name: 'Mistral Large',
    category: 'LLM',
    free_tier: '1 req/sec, 500K tokens/min',
    endpoint: 'https://api.mistral.ai/v1/models',
    auth_header: 'Authorization',
    auth_prefix: 'Bearer ',
    env_key: 'MISTRAL_API_KEY',
    icon: '🌪️',
    priority: 4,
  },
  {
    id: 'huggingface',
    name: 'HuggingFace Inference',
    category: 'LLM',
    free_tier: 'Variable monthly credits',
    endpoint: 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
    auth_header: 'Authorization',
    auth_prefix: 'Bearer ',
    env_key: 'HF_TOKEN',
    icon: '🤗',
    priority: 5,
  },
  // Search APIs
  {
    id: 'jina_search',
    name: 'Jina AI Search',
    category: 'Search',
    free_tier: 'No key required, generous limits',
    endpoint: 'https://s.jina.ai/test',
    env_key: null, // no key needed
    icon: '🔍',
    priority: 1,
  },
  {
    id: 'jina_reader',
    name: 'Jina AI Reader',
    category: 'Fetch',
    free_tier: 'No key required',
    endpoint: 'https://r.jina.ai/',
    env_key: null,
    icon: '📖',
    priority: 1,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo Instant',
    category: 'Search',
    free_tier: 'Unlimited, no key',
    endpoint: 'https://api.duckduckgo.com/?q=test&format=json',
    env_key: null,
    icon: '🦆',
    priority: 2,
  },
  // Utility APIs
  {
    id: 'wttr',
    name: 'wttr.in Weather',
    category: 'Weather',
    free_tier: 'Unlimited, no key',
    endpoint: 'https://wttr.in/Casablanca?format=j1',
    env_key: null,
    icon: '🌤️',
    priority: 1,
  },
  {
    id: 'pollinations',
    name: 'Pollinations.ai Image Gen',
    category: 'Image',
    free_tier: 'Unlimited, no key',
    endpoint: null,
    env_key: null,
    icon: '🎨',
    priority: 1,
  },
  {
    id: 'github',
    name: 'GitHub API',
    category: 'DevOps',
    free_tier: '5000 req/hour',
    endpoint: 'https://api.github.com/user',
    auth_header: 'Authorization',
    auth_prefix: 'Bearer ',
    env_key: 'GITHUB_TOKEN',
    icon: '🐙',
    priority: 1,
  },
];

// ── Check API availability ────────────────────────────────────
async function checkAPI(api) {
  const result = {
    id: api.id,
    name: api.name,
    category: api.category,
    free_tier: api.free_tier,
    icon: api.icon,
    status: 'unknown',
    configured: false,
    latency: null,
  };

  // Check if env key is configured
  if (api.env_key) {
    const keyValue = process.env[api.env_key];
    result.configured = !!(keyValue && keyValue.length > 5);
  } else {
    result.configured = true; // No key needed = always configured
  }

  // If configured and has endpoint, check availability
  if (result.configured && api.endpoint) {
    const start = Date.now();
    try {
      const headers = {};
      if (api.auth_header && api.env_key && process.env[api.env_key]) {
        headers[api.auth_header] = `${api.auth_prefix}${process.env[api.env_key]}`;
      }
      const res = await fetch(api.endpoint, {
        headers,
        signal: AbortSignal.timeout(4000),
      });
      result.latency = Date.now() - start;
      result.status = res.ok ? 'online' : `error_${res.status}`;
    } catch(e) {
      result.latency = Date.now() - start;
      result.status = 'offline';
      result.error = e.message;
    }
  } else if (result.configured && !api.endpoint) {
    result.status = 'configured'; // Has key, no endpoint to check
  } else {
    result.status = 'not_configured';
  }

  return result;
}

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const startTime = Date.now();

  // Check all APIs in parallel
  const results = await Promise.all(API_REGISTRY.map(api => checkAPI(api)));

  // Group by category
  const byCategory = results.reduce((acc, api) => {
    if (!acc[api.category]) acc[api.category] = [];
    acc[api.category].push(api);
    return acc;
  }, {});

  const onlineCount = results.filter(r => r.status === 'online' || r.status === 'configured').length;
  const configuredCount = results.filter(r => r.configured).length;

  return res.status(200).json({
    summary: {
      total: results.length,
      online: onlineCount,
      configured: configuredCount,
      not_configured: results.length - configuredCount,
    },
    by_category: byCategory,
    all: results,
    checked_at: new Date().toISOString(),
    latency: Date.now() - startTime,
    recommended_setup: [
      'GROQ_API_KEY — Get free at: https://console.groq.com',
      'GEMINI_API_KEY — Get free at: https://aistudio.google.com',
      'OPENROUTER_API_KEY — Get free at: https://openrouter.ai',
      'MISTRAL_API_KEY — Get free at: https://console.mistral.ai',
      'GITHUB_TOKEN — Get at: https://github.com/settings/tokens',
    ],
  });
}
