// ============================================================
// api/agent-orchestrator.js — AGENT ORCHESTRATION LAYER
// Integrates Memory, Search, Tools & Multi-step Reasoning
// ============================================================

import { ContextualMemory } from './utilities-enhanced.js';
import { 
  handleSearch, 
  handleParse, 
  executeFunctionCall, 
  FUNCTION_REGISTRY 
} from './tools-enhanced.js';

// ============================================================
// AGENT STATE MANAGEMENT
// ============================================================
class AgentState {
  constructor(userId = 'default') {
    this.userId = userId;
    this.memory = new ContextualMemory(userId);
    this.executedTools = [];
    this.toolResults = {};
    this.reasoning = [];
    this.startTime = Date.now();
  }

  addReasoning(step) {
    this.reasoning.push({
      step: step,
      timestamp: Date.now() - this.startTime
    });
  }

  addToolExecution(toolName, params, result) {
    this.executedTools.push(toolName);
    this.toolResults[toolName] = { params, result };
  }

  getExecutionTime() {
    return Date.now() - this.startTime;
  }
}

// ============================================================
// INTENT CLASSIFICATION ENGINE
// ============================================================
function classifyIntent(message) {
  const msg = message.toLowerCase();
  
  const intents = {
    search: {
      keywords: ['search', 'find', 'look up', 'what is', 'who is', 'latest', 'current', 'recent', 'news', 'information about'],
      priority: 'high'
    },
    code_generation: {
      keywords: ['create', 'write', 'generate', 'build', 'code', 'function', 'class', 'component'],
      priority: 'high'
    },
    memory_recall: {
      keywords: ['remember', 'recall', 'previous', 'earlier', 'context', 'history', 'before'],
      priority: 'high'
    },
    url_extraction: {
      keywords: ['http://', 'https://', 'url', 'link', 'website', 'page', 'read', 'extract from'],
      priority: 'high'
    },
    analysis: {
      keywords: ['analyze', 'review', 'check', 'examine', 'evaluate', 'assess', 'compare'],
      priority: 'medium'
    },
    conversation: {
      keywords: [],
      priority: 'low'
    }
  };

  const scores = {};
  for (const [intent, config] of Object.entries(intents)) {
    scores[intent] = config.keywords.filter(k => msg.includes(k)).length;
  }

  const topIntent = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return topIntent ? topIntent[0] : 'conversation';
}

// ============================================================
// TOOL SELECTION ENGINE (ENHANCED)
// ============================================================
async function selectTools(message, state) {
  const intent = classifyIntent(message);
  const tools = [];
  const msg = message.toLowerCase();

  state.addReasoning(`Classified intent as: ${intent}`);

  // Intent-based tool selection
  switch (intent) {
    case 'search':
      tools.push('web_search');
      state.addReasoning('Intent is search → Adding web_search tool');
      break;

    case 'code_generation':
      tools.push('github_action');
      state.addReasoning('Intent is code generation → Adding github_action tool');
      break;

    case 'memory_recall':
      tools.push('retrieve_memory');
      state.addReasoning('Intent is memory recall → Adding retrieve_memory tool');
      break;

    case 'url_extraction':
      tools.push('parse_url');
      state.addReasoning('Intent is URL extraction → Adding parse_url tool');
      break;

    case 'analysis':
      if (/code|function|class|algorithm/.test(msg)) {
        tools.push('code_analysis');
        state.addReasoning('Analysis type is code → Adding code_analysis tool');
      }
      break;
  }

  // Additional context-based tool selection
  if (/store|save|remember|keep|note/.test(msg)) {
    if (!tools.includes('store_memory')) {
      tools.push('store_memory');
      state.addReasoning('Message suggests storing info → Adding store_memory tool');
    }
  }

  if (/moderate|check|safe|appropriate/.test(msg)) {
    if (!tools.includes('moderate_content')) {
      tools.push('moderate_content');
      state.addReasoning('Message suggests content check → Adding moderate_content tool');
    }
  }

  return [...new Set(tools)]; // Remove duplicates
}

// ============================================================
// MEMORY CONTEXT INJECTION
// ============================================================
async function injectMemoryContext(state, message) {
  state.addReasoning('Retrieving user context from memory...');

  try {
    // Get recent memories
    const memories = await state.memory.getMemories(10);
    
    // Get conversation context
    const context = await state.memory.getContext('conversation');

    if (memories.length > 0 || Object.keys(context).length > 0) {
      state.addReasoning(`Found ${memories.length} memories and context`);
      
      return {
        memories: memories.slice(0, 5),
        context,
        summary: `User has ${memories.length} stored memories and active context: ${JSON.stringify(context).slice(0, 100)}`
      };
    }

    state.addReasoning('No prior context found');
    return null;
  } catch (err) {
    console.error('Memory retrieval error:', err);
    state.addReasoning(`Memory retrieval failed: ${err.message}`);
    return null;
  }
}

// ============================================================
// TOOL EXECUTION ENGINE (ENHANCED)
// ============================================================
async function executeTool(toolName, message, state) {
  state.addReasoning(`Executing tool: ${toolName}`);

  try {
    let result;

    switch (toolName) {
      case 'web_search':
        const query = message.replace(/search|find|look up|what is|who is/gi, '').trim();
        result = await handleSearch(query, 10);
        break;

      case 'parse_url':
        const urlMatch = message.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          result = await handleParse(urlMatch[0], 'web');
        } else {
          result = { success: false, error: 'No URL found in message' };
        }
        break;

      case 'retrieve_memory':
        const memoryQuery = message.replace(/remember|recall|previous|earlier|context|history/gi, '').trim();
        result = await state.memory.search(memoryQuery, 10);
        break;

      case 'store_memory':
        const keyMatch = message.match(/store|save|remember\s+(.+?)\s+as|remember\s+(.+)/i);
        const key = keyMatch ? (keyMatch[1] || keyMatch[2]) : 'general';
        result = await state.memory.store(key, message, 'fact');
        break;

      case 'github_action':
        result = await executeFunctionCall('github_action', {
          action_type: 'create',
          file_path: 'generated_file.js',
          prompt: message
        });
        break;

      case 'code_analysis':
        const codeMatch = message.match(/```([\s\S]*?)```/);
        if (codeMatch) {
          result = await executeFunctionCall('code_analysis', {
            code: codeMatch[1],
            language: 'javascript',
            focus: 'all'
          });
        } else {
          result = { success: false, error: 'No code block found' };
        }
        break;

      case 'moderate_content':
        result = await executeFunctionCall('moderate_content', {
          text: message
        });
        break;

      default:
        result = { success: false, error: `Unknown tool: ${toolName}` };
    }

    state.addToolExecution(toolName, {}, result);
    state.addReasoning(`Tool ${toolName} completed: ${result.success ? 'success' : 'failed'}`);

    return result;
  } catch (err) {
    state.addReasoning(`Tool execution error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ============================================================
// CONTEXT BUILDING FOR LLM
// ============================================================
function buildLLMContext(state, memoryContext, toolResults) {
  let context = '';

  // Add memory context
  if (memoryContext) {
    context += '\n[USER CONTEXT]\n';
    if (memoryContext.memories.length > 0) {
      context += 'Recent memories:\n';
      memoryContext.memories.forEach(m => {
        context += `- ${m.key}: ${m.value}\n`;
      });
    }
    if (Object.keys(memoryContext.context).length > 0) {
      context += `Active context: ${JSON.stringify(memoryContext.context)}\n`;
    }
  }

  // Add tool results
  if (Object.keys(toolResults).length > 0) {
    context += '\n[TOOL RESULTS]\n';
    for (const [toolName, data] of Object.entries(toolResults)) {
      if (data.result.success) {
        if (toolName === 'web_search' && data.result.results) {
          context += `\nSearch results for "${data.result.query}":\n`;
          data.result.results.slice(0, 3).forEach((r, i) => {
            context += `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet.slice(0, 150)}...\n`;
          });
        } else if (toolName === 'parse_url' && data.result.text) {
          context += `\nExtracted content from ${data.result.url}:\n`;
          context += `Title: ${data.result.title}\n`;
          context += `Content: ${data.result.text.slice(0, 300)}...\n`;
        } else if (toolName === 'retrieve_memory') {
          context += `\nMemory search results:\n`;
          data.result.forEach(m => {
            context += `- ${m.key}: ${m.value}\n`;
          });
        }
      }
    }
  }

  return context;
}

// ============================================================
// ORCHESTRATION HANDLER
// ============================================================
export async function orchestrateAgent(message, userId = 'default', conversationHistory = []) {
  const state = new AgentState(userId);
  
  state.addReasoning('Starting agent orchestration...');
  state.addReasoning(`User message: "${message.slice(0, 100)}..."`);

  // Step 1: Classify intent
  state.addReasoning('Step 1: Classifying user intent');
  const intent = classifyIntent(message);

  // Step 2: Retrieve memory context
  state.addReasoning('Step 2: Retrieving user context from memory');
  const memoryContext = await injectMemoryContext(state, message);

  // Step 3: Select tools
  state.addReasoning('Step 3: Selecting appropriate tools');
  const selectedTools = await selectTools(message, state);

  // Step 4: Execute tools
  state.addReasoning(`Step 4: Executing ${selectedTools.length} tool(s)`);
  for (const tool of selectedTools) {
    await executeTool(tool, message, state);
  }

  // Step 5: Build LLM context
  state.addReasoning('Step 5: Building context for LLM');
  const llmContext = buildLLMContext(state, memoryContext, state.toolResults);

  // Step 6: Prepare response
  state.addReasoning('Step 6: Preparing final response');

  return {
    success: true,
    state: {
      userId,
      intent,
      tools_used: state.executedTools,
      tool_results: state.toolResults,
      reasoning_steps: state.reasoning,
      execution_time_ms: state.getExecutionTime()
    },
    llm_context: llmContext,
    memory_context: memoryContext
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, userId = 'default', conversation_history = [] } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const orchestration = await orchestrateAgent(message, userId, conversation_history);
    
    return res.status(200).json({
      success: true,
      orchestration,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Orchestration error:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// Export for internal use
export { AgentState, classifyIntent, selectTools, injectMemoryContext, executeTool, buildLLMContext };
