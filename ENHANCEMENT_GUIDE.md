# IlyassAI Enhancement Guide v3.0
## Tool Orchestration, Function Calling & Agentic Reasoning

---

## 📋 Overview

This guide documents the **advanced enhancements** made to IlyassAgentAI to transform it from a basic chat interface into a **true AI agent** with:

- **Tool Orchestration** — Intelligent selection and execution of multiple tools
- **Function Calling** — Structured function calling with parameter validation
- **Persistent Memory** — Context-aware memory system with TTL support
- **Multi-step Reasoning** — Step-by-step planning before execution
- **Enhanced Search** — Intelligent web search with fallback providers
- **Advanced URL Parsing** — Extract content from web pages and documents
- **GitHub Automation** — Trigger workflows with intelligent routing

---

## 🚀 New Features

### 1. Tool Orchestration (`api/chat-enhanced.js`)

The enhanced chat endpoint now **automatically selects appropriate tools** based on user intent:

```javascript
// Automatically detects and executes:
- web_search: For queries about current information
- parse_url: For URL extraction and content analysis
- memory_store: For context retention
- github_actions: For code generation and automation
```

**Usage Example:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Search for the latest news about AI and summarize it"
  }'
```

**Response:**
```json
{
  "success": true,
  "reply": "...",
  "model": "IlyassAI-Ultra-v3-Agentic",
  "tools_used": ["web_search"],
  "reasoning": {
    "intent": "information_search",
    "model_used": "Gemini",
    "tools_executed": 1
  }
}
```

### 2. Function Calling (`api/tools-enhanced.js`)

New function calling registry with 8 available functions:

| Function | Purpose | Parameters |
|----------|---------|-----------|
| `web_search` | Search the web | `query`, `limit` |
| `parse_url` | Extract URL content | `url`, `type` |
| `summarize_content` | Summarize text | `content`, `length` |
| `moderate_content` | Check content safety | `text` |
| `store_memory` | Store in memory | `key`, `value`, `type` |
| `retrieve_memory` | Retrieve from memory | `query` |
| `github_action` | Trigger GitHub workflows | `action_type`, `file_path`, `prompt` |
| `code_analysis` | Analyze code | `code`, `language`, `focus` |

**Usage:**
```bash
# Get available functions
curl http://localhost:3000/api/tools?action=functions

# Call a function
curl -X POST http://localhost:3000/api/tools?action=call_function \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "web_search",
    "params": {
      "query": "latest AI breakthroughs 2025",
      "limit": 5
    }
  }'
```

### 3. Contextual Memory System (`api/utilities-enhanced.js`)

**ContextualMemory** class provides:

- **Persistent Storage** — Uses Vercel KV (Redis) with in-memory fallback
- **Context Awareness** — Separate context storage for different conversation types
- **TTL Support** — Automatic expiration of old memories
- **Search Capability** — Full-text search across memories

**Usage:**
```javascript
import { ContextualMemory } from './api/utilities-enhanced.js';

const memory = new ContextualMemory('user123');

// Store a memory
await memory.store('user_preference', 'prefers_arabic', 'preference', {
  ttl: 7776000 // 90 days
});

// Search memories
const results = await memory.search('preference', 10);

// Set context
await memory.setContext('conversation', {
  topic: 'code_review',
  language: 'javascript'
});

// Get context
const context = await memory.getContext('conversation');
```

**API Endpoints:**
```bash
# Store memory
POST /api/utilities?action=memory
{
  "userId": "user123",
  "key": "preference",
  "value": "prefers_code_examples",
  "type": "preference"
}

# Search memories
GET /api/utilities?action=memory&userId=user123&query=preference

# Get context
POST /api/utilities?action=memory
{
  "action": "get_context",
  "userId": "user123",
  "contextType": "conversation"
}

# Set context
POST /api/utilities?action=memory
{
  "action": "set_context",
  "userId": "user123",
  "contextType": "conversation",
  "data": { "topic": "code_review" }
}
```

### 4. Multi-Step Reasoning

The agent now **thinks step-by-step** before responding:

```javascript
// Internal reasoning process:
1. Analyzing user intent and context...
2. Executing 2 tool(s): web_search, parse_url
3. Executing web_search...
4. Executing parse_url...
5. Preparing comprehensive response...
```

### 5. Enhanced Search with Fallbacks

Intelligent search with **5 fallback providers**:

1. **Brave Search** (fastest, privacy-focused)
2. **SerpAPI** (comprehensive results)
3. **DuckDuckGo** (instant answers)
4. **Wikipedia** (reliable reference)

Each result includes a **relevance score** (0-1).

### 6. Advanced URL Parsing

- **Jina Reader** for intelligent text extraction
- **Direct HTML parsing** as fallback
- Extracts: title, description, full text, word count
- Supports: web pages, documents, PDFs

### 7. Provider Discovery & Health Checks

Monitor all AI providers in real-time:

```bash
curl http://localhost:3000/api/utilities?action=discover
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 5,
    "online": 4,
    "offline": 1
  },
  "apis": [
    {
      "name": "Claude (Anthropic)",
      "type": "llm",
      "status": "online",
      "latency": 245,
      "priority": "high"
    },
    ...
  ],
  "recommended": ["Claude", "Groq", "Gemini"]
}
```

---

## 🔧 Implementation Guide

### Step 1: Replace Chat Endpoint

Replace `api/chat.js` with `api/chat-enhanced.js`:

```bash
# Option A: Rename files
mv api/chat.js api/chat-legacy.js
mv api/chat-enhanced.js api/chat.js

# Option B: Update vercel.json routing
# Point /api/chat to chat-enhanced.js
```

### Step 2: Add Enhanced Tools

```bash
# Add new tools endpoint
cp api/tools-enhanced.js api/tools.js
```

### Step 3: Add Enhanced Utilities

```bash
# Add new utilities endpoint
cp api/utilities-enhanced.js api/utilities.js
```

### Step 4: Update Environment Variables

Ensure these are set in Vercel:

```env
# LLM Keys (existing)
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
GROQ_API_KEY=...
HF_TOKEN=hf_...

# Search Keys (existing)
BRAVE_API_KEY=...
SERP_API_KEY=...

# Memory (new)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# GitHub (existing)
GH_TOKEN=ghp_...
```

### Step 5: Test the Enhancements

```bash
# Test tool orchestration
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the latest developments in quantum computing? Find current news and summarize."
  }'

# Test function calling
curl -X POST http://localhost:3000/api/tools?action=call_function \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "web_search",
    "params": { "query": "quantum computing 2025" }
  }'

# Test memory
curl -X POST http://localhost:3000/api/utilities?action=memory \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "key": "test_fact",
    "value": "IlyassAI is awesome",
    "type": "fact"
  }'
```

---

## 📊 Architecture

### Data Flow

```
User Message
    ↓
[Tool Selection Engine]
    ↓
[Multi-step Reasoning]
    ↓
[Tool Execution]
    ├→ web_search
    ├→ parse_url
    ├→ memory_store
    └→ github_actions
    ↓
[LLM Selection]
    ├→ Claude (for coding)
    ├→ Gemini (for chat)
    ├→ Groq (fallback)
    └→ HuggingFace (fallback)
    ↓
[Response with Context]
```

### Tool Orchestration Flow

```
User Query
    ↓
Intent Analysis
    ├─ Is it a search? → web_search
    ├─ Does it have a URL? → parse_url
    ├─ Does it reference past context? → memory_store
    ├─ Is it code-related? → github_actions
    └─ Multiple conditions? → Execute all relevant tools
    ↓
Tool Results Aggregation
    ↓
Context Injection into LLM
    ↓
Final Response
```

---

## 🎯 Use Cases

### 1. Research Assistant
```
User: "Find the latest research on machine learning and summarize the key findings"

Agent:
1. Executes web_search for "machine learning research 2025"
2. Parses top results with parse_url
3. Stores findings in memory
4. Returns comprehensive summary with sources
```

### 2. Code Generator with Context
```
User: "Create a React component for user authentication. Remember I prefer TypeScript and Tailwind CSS"

Agent:
1. Stores preferences in memory
2. Triggers GitHub automation
3. Generates code with stored preferences
4. Returns code with explanations
```

### 3. Knowledge Management
```
User: "Remember that I'm working on a machine learning project using PyTorch"

Agent:
1. Stores context in memory
2. On future queries, retrieves this context
3. Provides relevant suggestions based on project type
```

### 4. Real-time Information
```
User: "What's the current Bitcoin price and latest crypto news?"

Agent:
1. Executes web_search for real-time data
2. Parses financial websites
3. Returns current prices and news
```

---

## 🔒 Security Considerations

1. **API Key Management**
   - All keys stored in Vercel environment variables
   - Never exposed in responses
   - Rotated regularly

2. **Content Moderation**
   - All user inputs checked for safety
   - Harmful content flagged and blocked
   - Audit logs maintained

3. **Memory Privacy**
   - User-scoped memory storage
   - No cross-user data leakage
   - TTL-based automatic cleanup

4. **Tool Execution**
   - Function calling validated against registry
   - Parameters type-checked
   - Execution logged for audit

---

## 📈 Performance Optimization

### Caching Strategy
- Search results cached for 1 hour
- URL parsing cached for 24 hours
- Memory queries indexed for fast retrieval

### Timeout Management
- Web search: 8 seconds
- URL parsing: 12 seconds
- LLM calls: 25-30 seconds
- Total request timeout: 60 seconds

### Fallback Chain
- Primary provider fails → Secondary provider
- All providers fail → Graceful error response
- User informed of provider status

---

## 🚦 Monitoring & Debugging

### Enable Debug Logging
```javascript
// In chat-enhanced.js
const DEBUG = true; // Set to true for verbose logging
```

### Check Provider Health
```bash
curl http://localhost:3000/api/utilities?action=discover
```

### Memory Usage
```bash
# Get user's memory stats
curl http://localhost:3000/api/utilities?action=memory&userId=user123
```

### Function Registry
```bash
curl http://localhost:3000/api/tools?action=functions
```

---

## 🔄 Migration Path

### From Original to Enhanced

**Phase 1: Backward Compatibility**
- Keep original endpoints working
- Add new endpoints alongside
- No breaking changes

**Phase 2: Gradual Migration**
- Update frontend to use new endpoints
- Monitor performance and stability
- Gather user feedback

**Phase 3: Full Transition**
- Deprecate old endpoints
- Archive legacy code
- Document migration guide

---

## 📚 API Reference

### Chat Endpoint (Enhanced)
```
POST /api/chat
Content-Type: application/json

{
  "message": "Your query here",
  "messages": [ /* optional conversation history */ ]
}

Response:
{
  "success": true,
  "reply": "Agent response",
  "model": "IlyassAI-Ultra-v3-Agentic",
  "tools_used": ["web_search"],
  "reasoning": {
    "intent": "...",
    "model_used": "Gemini",
    "tools_executed": 1
  }
}
```

### Tools Endpoint (Enhanced)
```
POST /api/tools?action=call_function
Content-Type: application/json

{
  "function_name": "web_search",
  "params": {
    "query": "search term",
    "limit": 10
  }
}

Response:
{
  "success": true,
  "provider": "Brave",
  "query": "search term",
  "results": [
    {
      "title": "...",
      "url": "...",
      "snippet": "...",
      "source": "Brave",
      "relevance": 0.95
    }
  ]
}
```

### Utilities Endpoint (Enhanced)
```
POST /api/utilities?action=memory
Content-Type: application/json

{
  "userId": "user123",
  "key": "memory_key",
  "value": "memory_value",
  "type": "fact"
}

Response:
{
  "success": true,
  "memoryId": "1234567890",
  "stored": { /* memory object */ },
  "persistent": true
}
```

---

## 🎓 Learning Resources

- [Tool Calling in LLMs](https://platform.openai.com/docs/guides/function-calling)
- [Agentic AI Patterns](https://www.anthropic.com/research/building-effective-agents)
- [Memory Systems](https://arxiv.org/abs/2304.04103)
- [Multi-step Reasoning](https://arxiv.org/abs/2201.11903)

---

## 🤝 Contributing

To add new tools or features:

1. Add function to `FUNCTION_REGISTRY` in `tools-enhanced.js`
2. Implement executor in `executeFunctionCall`
3. Update tool selection logic in `chat-enhanced.js`
4. Add tests and documentation
5. Submit PR with examples

---

## 📞 Support

For issues or questions:
- Check the troubleshooting section above
- Review API reference
- Check environment variables
- Enable debug logging
- Review provider health status

---

**Last Updated:** May 2025  
**Version:** 3.0  
**Status:** Production Ready ✅
