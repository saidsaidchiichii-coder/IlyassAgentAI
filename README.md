# Grok Clone - High-Fidelity UI Recreation

A meticulously crafted clone of the Grok AI interface, featuring a dark theme with cyan accents, responsive design, and a modern chat-based user experience.

## Overview

This project recreates the Grok AI web interface with precision attention to design details, color schemes, typography, and user interactions. The interface includes a collapsible sidebar navigation, a central chat area, and action cards for different AI capabilities.

## Features

### Design Elements
- **Dark Theme**: Navy/black background (#0a0e27 equivalent) for reduced eye strain
- **Cyan Accents**: Bright cyan accent colors (#00d9ff equivalent) for interactive elements
- **Responsive Layout**: Fully responsive design that works on mobile, tablet, and desktop
- **Smooth Animations**: Subtle transitions and animations for enhanced user experience
- **Modern Typography**: System font stack for optimal readability

### Core Components

#### Sidebar Navigation
- Collapsible menu with toggle button
- Grok logo with gradient styling
- New chat button with prominent placement
- Navigation items: Explore, Conversations, Voice, Discover
- Recent conversation history
- Settings and sign-out options

#### Chat Interface
- Centered welcome screen with Grok logo
- Large heading: "What do you want to know?"
- Descriptive subtitle about Grok capabilities
- Mode selector buttons (Auto, DeepSearch, Think)
- Three action cards:
  - **DeepSearch**: Search deeply for detailed, well-reasoned answers
  - **Think**: Solve complex problems in math, science, and coding
  - **Image Analysis**: Analyze and understand images with advanced capabilities

#### Input Area
- Fixed bottom input field with rounded borders
- Attachment button for file uploads
- Clear button when text is present
- Send button with gradient styling
- Disclaimer text about accuracy

#### Message Display
- User messages styled with cyan gradient background
- Grok responses with subtle card styling
- Timestamps for each message
- Hover effects for message actions
- Delete button for user messages
- Smooth animations for new messages

## Technology Stack

- **Frontend Framework**: React 18+
- **Styling**: Tailwind CSS 4 with custom OKLCH color system
- **UI Components**: shadcn/ui components
- **Icons**: Lucide React
- **Routing**: Wouter
- **Build Tool**: Vite
- **Language**: TypeScript

## Color Palette

| Element | OKLCH Value | Hex Equivalent |
|---------|-------------|----------------|
| Background | oklch(0.065 0.008 262) | #0a0e27 |
| Card | oklch(0.11 0.015 262) | #1a1f3a |
| Sidebar | oklch(0.095 0.012 262) | #0f1428 |
| Accent | oklch(0.68 0.22 200) | #00d9ff |
| Text Primary | oklch(0.97 0.01 0) | #f8f8f8 |
| Text Secondary | oklch(0.62 0.018 0) | #9e9e9e |
| Border | oklch(0.18 0.020 262) | #252d48 |

## Project Structure

```
grok-clone/
├── client/
│   ├── src/
│   │   ├── App.tsx              # Main app component with routing
│   │   ├── index.css            # Global styles and theme
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Main chat interface
│   │   │   └── NotFound.tsx     # 404 page
│   │   ├── components/
│   │   │   └── ui/              # shadcn/ui components
│   │   └── contexts/
│   │       └── ThemeContext.tsx # Theme management
│   └── index.html
├── server/                       # Backend server (optional)
├── shared/                       # Shared types and utilities
├── GROK_DESIGN_ANALYSIS.md      # Design documentation
└── README.md                     # This file
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/saidsaidchiichii-coder/grok-clone.git
cd grok-clone

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The development server will start at `http://localhost:3001/` (or another available port).

## Usage

### Basic Interaction
1. Type a message in the input field at the bottom
2. Press Enter or click the send button
3. View the response in the chat area
4. Use the sidebar to navigate or start a new chat

### Sidebar Features
- **Toggle Menu**: Click the menu button to collapse/expand the sidebar
- **New Chat**: Click the "New chat" button to start a fresh conversation
- **Navigation**: Use the navigation items to explore different sections
- **History**: View recent conversations in the history section

### Chat Modes
- **Auto**: Automatic mode selection based on query
- **DeepSearch**: Deep search for detailed answers
- **Think**: Extended reasoning for complex problems

## Customization

### Changing Colors
Edit the color values in `/client/src/index.css` in the `:root` and `.dark` sections. The colors use the OKLCH color space for better perceptual uniformity.

### Modifying Layout
The main layout is defined in `/client/src/pages/Home.tsx`. Adjust the grid layouts, spacing, and component sizes as needed.

### Adding New Features
1. Create new components in `/client/src/components/`
2. Add new pages in `/client/src/pages/`
3. Update the router in `/client/src/App.tsx` if adding new routes

## API Integration

To connect this interface to a real Grok API:

1. Create an API service in `/client/src/services/api.ts`
2. Update the `handleSendMessage` function in `Home.tsx` to call your API
3. Handle streaming responses if needed
4. Add error handling and loading states

Example:
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: input, mode: selectedMode })
});
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimizations

- Lazy loading of components
- Optimized animations with CSS transforms
- Efficient state management with React hooks
- Tailwind CSS purging for production

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- High contrast text for readability
- Focus indicators for keyboard users

## Known Limitations

- This is a frontend-only clone without backend integration
- Messages are simulated and not persisted
- No actual AI responses (placeholder responses only)
- Voice input not implemented
- Image upload not connected to backend

## Future Enhancements

- [ ] Backend API integration
- [ ] Real-time message streaming
- [ ] Voice input/output support
- [ ] Image upload and analysis
- [ ] Conversation persistence
- [ ] User authentication
- [ ] Dark/light theme toggle
- [ ] Mobile app version
- [ ] Keyboard shortcuts
- [ ] Message search functionality

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

This project is provided as-is for educational and demonstration purposes.

## Disclaimer

This is a fan-made recreation of the Grok interface for learning and demonstration purposes. It is not affiliated with or endorsed by xAI or the official Grok project. All design elements are recreated from publicly available screenshots and information.

## Repository

GitHub: [saidsaidchiichii-coder/grok-clone](https://github.com/saidsaidchiichii-coder/grok-clone)

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

---

**Last Updated**: May 4, 2026
**Version**: 1.0.0
