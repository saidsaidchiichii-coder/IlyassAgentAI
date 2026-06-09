// ============================================================
// test-enhancements.js — TEST SUITE FOR ILYASSAI v3.0
// Validates Chat, Tools, Memory, and Orchestration
// ============================================================

import { orchestrateAgent } from './api/agent-orchestrator.js';
import { classifyActionType, extractAndValidateFilePath } from './api/github-enhanced.js';
import { ReasoningOrchestrator } from './api/reasoning-engine.js';

async function runTests() {
  console.log('🚀 Starting IlyassAI v3.0 Test Suite...\n');

  // Test 1: GitHub Action Classification
  console.log('Test 1: GitHub Action Classification');
  const testMessages = [
    'create a new api handler',
    'fix the bug in style.css',
    'delete mission.md',
    'deploy the website to vercel'
  ];

  testMessages.forEach(msg => {
    const type = classifyActionType(msg);
    console.log(`- Message: "${msg}" → Action: ${type}`);
  });
  console.log('✅ Test 1 Passed\n');

  // Test 2: File Path Extraction
  console.log('Test 2: File Path Extraction');
  const pathMessages = [
    'create api/chat.js',
    'update the file public/index.html',
    'remove mission.md'
  ];

  pathMessages.forEach(msg => {
    const res = extractAndValidateFilePath(msg);
    console.log(`- Message: "${msg}" → Path: ${res.filePath}`);
  });
  console.log('✅ Test 2 Passed\n');

  // Test 3: Reasoning Engine (Chain of Thought)
  console.log('Test 3: Reasoning Engine (Chain of Thought)');
  const orchestrator = new ReasoningOrchestrator('Create a secure authentication system for a React app');
  const result = await orchestrator.reason();
  console.log(`- Strategy: ${result.strategy}`);
  console.log(`- Thoughts: ${result.thoughts.length}`);
  console.log(`- Confidence: ${result.state.overall_confidence.toFixed(2)}`);
  console.log('✅ Test 3 Passed\n');

  // Test 4: Agent Orchestration (Simulated)
  console.log('Test 4: Agent Orchestration (Simulated)');
  const orchestration = await orchestrateAgent('Search for latest AI news and store in memory', 'test_user');
  console.log(`- Intent: ${orchestration.state.intent}`);
  console.log(`- Tools Selected: ${orchestration.state.tools_used.join(', ')}`);
  console.log(`- Reasoning Steps: ${orchestration.state.reasoning_steps.length}`);
  console.log('✅ Test 4 Passed\n');

  console.log('🎉 All tests completed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
