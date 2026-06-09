# IlyassAI — Vercel Environment Variables Setup

## ✅ Required (already set)
```
GROQ_API_KEY = gsk_...
```

## 🆓 Free — Add These in Vercel Dashboard

### 1. Web Search (Tavily)
Get free key at: https://tavily.com → 1,000 searches/month free
```
TAVILY_API_KEY = tvly-...
```

### 2. RAG Memory (Upstash Vector)
Get free at: https://upstash.com/vector → 10K queries/day free
```
UPSTASH_VECTOR_REST_URL   = https://...upstash.io
UPSTASH_VECTOR_REST_TOKEN = AX...
```

### 3. Analytics (Helicone)
Get free at: https://helicone.ai → 100K requests/month free
```
HELICONE_API_KEY = sk-helicone-...
```

### 4. Image OCR (OCR.space)
Get free at: https://ocr.space/OCRAPI → 25K requests/month free
```
OCR_SPACE_API_KEY = helloworld  (or your key)
```

### 5. Content Moderation (OpenAI)
Get key at: https://platform.openai.com → moderation endpoint is FREE
```
OPENAI_API_KEY = sk-...
```

## 📌 How to add in Vercel:
1. Go to: https://vercel.com/saidsaidchiichii-coders-projects/my-webxyu/settings/environment-variables
2. Add each variable with name + value
3. Select: Production + Preview + Development
4. Click Save → Redeploy

## 🌐 API Endpoints (all live after deploy)

| Endpoint       | Method | Description                         |
|----------------|--------|-------------------------------------|
| /api/chat      | POST   | Main AI chat with all integrations  |
| /api/search    | POST   | Web search (Jina/DDG/Tavily)        |
| /api/parse     | POST   | URL + doc parsing (Jina Reader)     |
| /api/memory    | POST   | RAG store/search (Upstash/local)    |
| /api/moderate  | POST   | Content moderation                  |
| /api/transcribe| POST   | Voice → text (Groq Whisper)         |
| /api/image     | POST   | Image generation (FLUX)             |

## 🧪 Test Commands (after deploy)

```bash
# Test search
curl -X POST https://my-webxyu.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "latest AI news 2025"}'

# Test URL parsing
curl -X POST https://my-webxyu.vercel.app/api/parse \
  -H "Content-Type: application/json" \
  -d '{"type": "url", "url": "https://example.com"}'

# Test memory
curl -X POST https://my-webxyu.vercel.app/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action": "store", "content": "My name is Ilyass", "userId": "user1"}'
```
