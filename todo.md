# Manus Pro Clone - Project TODO

## Database & Schema
- [x] Create conversations table with user_id, title, created_at, updated_at
- [x] Create messages table with conversation_id, role, content, created_at
- [x] Create connectors table with user_id, type, status, credentials
- [x] Create scheduled_tasks table with user_id, cron_expression, task_data
- [x] Create projects table with user_id, name, description, created_at
- [x] Create project_conversations junction table
- [x] Create skills table with name, description, system_prompt, enabled
- [x] Create user_skills junction table for skill preferences
- [x] Run migrations and verify schema

## Frontend UI - Premium Design
- [x] Design and implement light sidebar with navigation items
- [x] Implement top bar with model selector and user profile
- [x] Create centered chat input with Lucide icons
- [x] Design action chips (Create slides, Build website, etc.)
- [x] Implement user profile dropdown with logout
- [x] Add Free plan / Upgrade badge
- [ ] Create conversation history list in sidebar
- [ ] Implement responsive layout for mobile/tablet
- [ ] Add smooth animations and transitions
- [ ] Ensure pixel-perfect alignment with Manus design

## Chat System
- [x] Create chat message component with markdown rendering (Streamdown)
- [ ] Implement typing indicator
- [ ] Add auto-scroll to latest message
- [ ] Create message input with file upload capability
- [x] Implement message sending logic
- [ ] Add error handling and retry logic
- [ ] Create conversation list and switching
- [ ] Implement conversation creation and deletion

## LLM Integration
- [x] Set up invokeLLM with streaming support
- [ ] Implement message streaming to frontend
- [x] Create system prompt injection based on selected skill
- [x] Add model selector functionality
- [ ] Implement token counting (optional)
- [ ] Add cost tracking (optional)

## Skills System
- [ ] Parse SKILL.md files from backup
- [ ] Create skills database records
- [ ] Implement skill picker UI in sidebar
- [x] Add skill selection to chat context
- [x] Inject system prompts per skill
- [ ] Create skill description modal
- [ ] Implement skill enable/disable toggle

## Connectors System
- [ ] Design connector card UI
- [ ] Implement OAuth flow for Gmail
- [ ] Implement OAuth flow for Google Calendar
- [ ] Implement OAuth flow for Notion
- [ ] Implement OAuth flow for Slack
- [x] Store connector credentials securely
- [ ] Display connector status in sidebar
- [ ] Create connector disconnect functionality
- [ ] Add connector permission scopes

## Scheduled Tasks
- [ ] Create scheduled tasks UI panel
- [ ] Implement cron expression input
- [ ] Add task creation form
- [ ] Implement task listing
- [ ] Add task enable/disable toggle
- [ ] Create task deletion functionality
- [x] Implement task execution history (backend ready)
- [ ] Add task status indicator

## Projects Management
- [ ] Create projects UI panel
- [ ] Implement project creation form
- [ ] Add project listing
- [ ] Implement project deletion
- [x] Create project-conversation association (backend ready)
- [ ] Add project filtering in conversation list
- [ ] Implement project editing

## Authentication & User Profile
- [x] Verify Manus OAuth integration
- [x] Display user name and avatar
- [x] Implement logout functionality
- [ ] Create user profile settings page
- [ ] Add account information display
- [x] Implement plan/subscription display
- [ ] Create upgrade flow (UI only)

## Testing & Polish
- [ ] Write vitest tests for chat logic
- [ ] Write vitest tests for database queries
- [ ] Test OAuth flow
- [ ] Test LLM streaming
- [ ] Test responsive design
- [ ] Verify accessibility (keyboard nav, ARIA)
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Final UI polish and refinement

## Deployment
- [ ] Create checkpoint before deployment
- [ ] Deploy to Manus platform
- [ ] Verify all features work in production
- [ ] Monitor error logs
- [ ] Gather client feedback
