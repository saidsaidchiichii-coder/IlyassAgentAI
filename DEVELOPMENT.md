# Grok Clone - Development Guide

This guide provides information for developers working on the Grok clone project.

## Project Overview

The Grok clone is a high-fidelity recreation of the Grok AI interface using React, TypeScript, and Tailwind CSS. The project is structured as a full-stack application with a frontend (React) and optional backend server.

## Technology Stack

### Frontend
- **React 18+**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS 4**: Utility-first CSS framework
- **Vite**: Build tool and dev server
- **Wouter**: Lightweight routing
- **shadcn/ui**: Pre-built UI components
- **Lucide React**: Icon library

### Backend (Optional)
- **Express.js**: Web framework
- **Node.js**: Runtime

### Development Tools
- **pnpm**: Package manager
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking

## Project Structure

```
grok-clone/
├── client/                          # Frontend application
│   ├── src/
│   │   ├── App.tsx                 # Main app component
│   │   ├── index.css               # Global styles
│   │   ├── main.tsx                # Entry point
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Main chat interface
│   │   │   └── NotFound.tsx        # 404 page
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx   # Error handling
│   │   │   ├── ManusDialog.tsx     # Dialog component
│   │   │   └── ui/                 # shadcn/ui components
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx    # Theme management
│   │   ├── hooks/                  # Custom React hooks
│   │   └── utils/                  # Utility functions
│   ├── index.html                  # HTML template
│   └── tsconfig.json               # TypeScript config
│
├── server/                          # Backend server (optional)
│   ├── index.ts                    # Server entry point
│   └── routes/                     # API routes
│
├── shared/                          # Shared types and utilities
│   └── types.ts                    # Shared TypeScript types
│
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # Root TypeScript config
├── package.json                    # Dependencies
├── pnpm-lock.yaml                  # Lock file
├── README.md                       # Project overview
├── DESIGN_GUIDE.md                 # Design documentation
├── DEVELOPMENT.md                  # This file
└── GROK_DESIGN_ANALYSIS.md         # Design analysis
```

## Getting Started

### Prerequisites
- Node.js 18 or higher
- pnpm 8 or higher (or npm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/saidsaidchiichii-coder/grok-clone.git
cd grok-clone

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open browser to http://localhost:3001
```

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm dev:server       # Start backend server (if available)

# Building
pnpm build            # Build for production
pnpm build:server     # Build backend server
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm type-check       # Run TypeScript type checking

# Testing
pnpm test             # Run tests (if configured)
pnpm test:watch       # Run tests in watch mode
```

## Development Workflow

### 1. Creating a New Component

```typescript
// client/src/components/MyComponent.tsx
import { FC } from 'react';

interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

const MyComponent: FC<MyComponentProps> = ({ title, onClick }) => {
  return (
    <div className="p-4 bg-card rounded-lg hover:border-accent transition-colors">
      <h3 className="text-foreground font-semibold">{title}</h3>
      {onClick && (
        <button onClick={onClick} className="mt-2 px-3 py-1 bg-accent text-sidebar rounded">
          Click me
        </button>
      )}
    </div>
  );
};

export default MyComponent;
```

### 2. Adding a New Page

```typescript
// client/src/pages/MyPage.tsx
import { FC } from 'react';

const MyPage: FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-4">My Page</h1>
      {/* Page content */}
    </div>
  );
};

export default MyPage;
```

Then update the router in `App.tsx`:

```typescript
import MyPage from './pages/MyPage';

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/my-page"} component={MyPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}
```

### 3. Using Theme Colors

Always use the predefined theme colors from `index.css`:

```typescript
// ✅ Good
<div className="bg-card text-foreground border border-border">
  <button className="bg-accent text-sidebar hover:bg-accent/90">
    Click me
  </button>
</div>

// ❌ Avoid
<div style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
  <button style={{ backgroundColor: '#00d9ff' }}>
    Click me
  </button>
</div>
```

### 4. Implementing Responsive Design

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Single column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

### 5. Adding Animations

```typescript
<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
  {/* Content with animation */}
</div>
```

## Code Style Guidelines

### TypeScript

- Use explicit type annotations for function parameters and return types
- Prefer interfaces over types for object shapes
- Use const assertions for literal types
- Avoid `any` type; use `unknown` if necessary

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = (id: string): Promise<User> => {
  // ...
};

// ❌ Avoid
const getUser = (id) => {
  // ...
};
```

### React

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper TypeScript types for props

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

const Button: FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded ${
        variant === 'primary' ? 'bg-accent' : 'bg-card'
      }`}
    >
      {label}
    </button>
  );
};

// ❌ Avoid
const Button = (props) => {
  return <button onClick={props.onClick}>{props.label}</button>;
};
```

### CSS/Tailwind

- Use Tailwind utility classes instead of custom CSS
- Follow the spacing system (4px grid)
- Use theme colors from CSS variables
- Group related utilities logically

```typescript
// ✅ Good
<div className="p-4 bg-card rounded-lg border border-border hover:border-accent transition-colors">
  {/* Content */}
</div>

// ❌ Avoid
<div style={{ padding: '16px', backgroundColor: '#1a1f3a', borderRadius: '8px' }}>
  {/* Content */}
</div>
```

## Common Tasks

### Adding a New API Endpoint

1. Create a new route file in `server/routes/`:

```typescript
// server/routes/chat.ts
import { Router } from 'express';

const router = Router();

router.post('/chat', (req, res) => {
  const { message } = req.body;
  // Process message
  res.json({ response: 'Grok response' });
});

export default router;
```

2. Register the route in `server/index.ts`:

```typescript
import chatRoutes from './routes/chat';
app.use('/api', chatRoutes);
```

3. Call the API from the frontend:

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: input })
});
```

### Updating the Theme

Edit the color values in `client/src/index.css`:

```css
:root {
  --background: oklch(0.065 0.008 262);
  --foreground: oklch(0.97 0.01 0);
  --accent: oklch(0.68 0.22 200);
  /* ... other colors ... */
}
```

### Adding a New Icon

Import from Lucide React:

```typescript
import { Heart, Star, Settings } from 'lucide-react';

export default function MyComponent() {
  return (
    <div>
      <Heart className="w-5 h-5 text-accent" />
      <Star className="w-6 h-6 text-foreground" />
      <Settings className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}
```

## Performance Optimization

### Code Splitting

Use React's lazy loading for routes:

```typescript
import { lazy, Suspense } from 'react';

const MyPage = lazy(() => import('./pages/MyPage'));

function Router() {
  return (
    <Switch>
      <Route path={"/my-page"}>
        <Suspense fallback={<div>Loading...</div>}>
          <MyPage />
        </Suspense>
      </Route>
    </Switch>
  );
}
```

### Memoization

Use React.memo for expensive components:

```typescript
import { memo, FC } from 'react';

interface CardProps {
  title: string;
  content: string;
}

const Card: FC<CardProps> = memo(({ title, content }) => {
  return (
    <div className="p-4 bg-card rounded-lg">
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
});

export default Card;
```

### Image Optimization

Use modern image formats and lazy loading:

```typescript
<img
  src="image.webp"
  alt="Description"
  loading="lazy"
  className="w-full h-auto"
/>
```

## Debugging

### Browser DevTools

- Use React Developer Tools extension
- Check the Network tab for API calls
- Use the Console for debugging
- Use the Performance tab to identify bottlenecks

### Server Logs

```bash
# View server logs
tail -f .manus-logs/devserver.log

# View browser console logs
tail -f .manus-logs/browserConsole.log

# View network requests
tail -f .manus-logs/networkRequests.log
```

### TypeScript Errors

```bash
# Check for TypeScript errors
pnpm type-check

# Watch mode for continuous checking
pnpm type-check --watch
```

## Testing

### Unit Tests (if configured)

```bash
pnpm test
pnpm test:watch
```

### Manual Testing Checklist

- [ ] Test on mobile devices
- [ ] Test keyboard navigation
- [ ] Test with screen readers
- [ ] Test in different browsers
- [ ] Test with slow network
- [ ] Test with reduced motion enabled

## Deployment

### Building for Production

```bash
pnpm build
```

This creates an optimized production build in the `dist/` directory.

### Environment Variables

Create a `.env.local` file for local development:

```
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Grok Clone
```

## Troubleshooting

### Port Already in Use

```bash
# Kill the process using port 3001
lsof -i :3001
kill -9 <PID>

# Or use a different port
pnpm dev -- --port 3002
```

### Dependencies Issues

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Build Errors

```bash
# Check for TypeScript errors
pnpm type-check

# Clear build cache
rm -rf dist

# Rebuild
pnpm build
```

## Contributing

1. Create a new branch for your feature
2. Make your changes following the code style guidelines
3. Test your changes thoroughly
4. Commit with descriptive messages
5. Push to your fork and create a pull request

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)

## Support

For questions or issues, please open an issue on the GitHub repository.

---

**Last Updated**: May 4, 2026
**Version**: 1.0.0
