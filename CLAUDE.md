# CLAUDE.md - DIBE - Imagine Project Context

## Project Overview

DIBE - Imagine is a cross-platform Electron application for AI image generation using Google's Gemini 2.5 Flash Image Preview API. The app follows a modular architecture designed for extensibility and maintainability.

## Architecture & Technology Stack

### Core Technologies
- **Electron**: Cross-platform desktop app framework
- **React + TypeScript**: Modern UI with type safety
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast development and build tooling
- **Node.js Worker Threads**: Isolated service processing

### Process Model
```
Main Process (Electron)
├── Window lifecycle management
├── Auto-updater integration
├── Secure IPC handling
└── Keytar for API key storage

Preload Script
├── Secure IPC bridge
└── Typed API exposure to renderer

Renderer Process (React)
├── User interface
├── Routing (Home, Settings)
└── Component library

Service Workers
├── Isolated processing
├── Image validation & encoding
└── Gemini API integration
```

## Directory Structure

```
app/
├── main/                 # Electron main process
│   ├── main.ts          # Application entry point
│   ├── store.ts         # Settings & presets management
│   ├── secrets.ts       # Secure API key handling
│   ├── ipc.ts           # IPC channel definitions
│   └── updater.ts       # Auto-update functionality
├── preload/
│   └── preload.ts       # Secure IPC bridge
├── renderer/            # React application
│   ├── App.tsx          # Main application component
│   ├── routes/          # Page components
│   ├── components/      # Reusable UI components
│   └── styles/          # CSS and styling
└── services/            # Worker thread services
    ├── core/            # Service architecture
    │   ├── ServiceContract.ts   # Service interface
    │   ├── JobQueue.ts         # Job processing
    │   └── imageUtils.ts       # Image utilities
    └── basic-image-gen/ # Basic image generation service
        ├── worker.ts    # Worker thread entry
        └── gemini.ts    # Gemini API client
```

## Development Patterns & Conventions

### TypeScript Usage
- Strict mode enabled across all modules
- Explicit typing for all service interfaces
- No `any` types except in rare, documented cases
- Prefer interfaces over types for object shapes

### React Components
- Functional components with hooks
- TypeScript props interfaces
- Consistent naming: PascalCase for components
- Props destructuring in component signatures

### Styling Guidelines
- Tailwind CSS utility classes preferred
- Responsive design with mobile-first approach
- Consistent spacing using Tailwind scale
- Dark mode support planned for future versions

### Service Architecture
- Each service implements `ServiceContract`
- Worker threads for CPU-intensive operations
- Job queue with configurable concurrency
- Comprehensive error handling and retry logic

### Security Practices
- API keys stored via keytar (system keychain)
- Context isolation in preload scripts
- No remote module or node integration in renderer
- IPC validation and sanitization

## Key Files & Their Roles

### Main Process
- `main.ts`: Application lifecycle, window management
- `store.ts`: Persistent settings and presets storage
- `secrets.ts`: Secure credential management
- `ipc.ts`: Inter-process communication definitions

### Renderer Process
- `App.tsx`: Root component with routing
- `Layout.tsx`: Sidebar navigation and layout
- `Home.tsx`: Image upload and generation interface
- `Settings.tsx`: Configuration and API key management

### Services
- `ServiceContract.ts`: Base service interface
- `JobQueue.ts`: Concurrent job processing
- `imageUtils.ts`: Image validation and encoding
- `worker.ts`: Worker thread implementation
- `gemini.ts`: Gemini API integration

## Development Workflow

### Local Development
```bash
npm run dev          # Start development servers
npm run lint         # Code linting
npm run typecheck    # TypeScript validation
npm test             # Run test suite
```

### Building & Distribution
```bash
npm run build        # Production build
npm run dist         # Create distributables
npm run dist:mac     # macOS-specific build
npm run dist:win     # Windows-specific build
```

### Service Integration
1. Implement `ServiceContract` interface
2. Create worker thread entry point
3. Add service configuration to main process
4. Register IPC handlers for service communication
5. Update UI to expose new service capabilities

## Error Handling Strategy

### API Errors
- Rate limiting: Exponential backoff (1s, 2s, 4s)
- Invalid API key: Clear user guidance
- Safety violations: Prompt adjustment suggestions
- Network errors: Connection status feedback

### User Experience
- Friendly error messages (no technical jargon)
- Loading states for all async operations
- Graceful degradation for missing features
- Input validation with immediate feedback

## Future Extensibility

### Adding New Services
1. Create service directory under `app/services/`
2. Implement worker thread and API client
3. Add service registration in main process
4. Update UI to include new service options
5. Add corresponding tests and documentation

### Planned Features
- Multiple AI provider support
- Batch processing capabilities
- Custom model parameters
- Result history and management
- Plugin system for custom services

## Testing Strategy

### Unit Tests
- Service logic and utilities
- Image processing functions
- API client error handling
- IPC message validation

### Integration Tests
- Main process initialization
- Service worker communication
- File system operations
- Settings persistence

## Build & Distribution

### Electron Builder Configuration
- Multi-platform targets (macOS, Windows, Linux)
- Code signing for macOS/Windows
- Auto-updater with GitHub releases
- Asset optimization and bundling

### Environment Variables
- `NODE_ENV`: Development vs production mode
- Build-time configuration via electron-builder
- Runtime settings via app configuration files

## Performance Considerations

### Memory Management
- Worker thread isolation prevents main thread blocking
- Image processing in separate contexts
- Garbage collection optimization for large files
- Resource cleanup on service completion

### Network Optimization
- Request pooling for multiple images
- Retry logic with backoff strategies
- Progress reporting for long-running operations
- Efficient base64 encoding for image data

---

This architecture supports the current basic image generation service while providing a foundation for adding new AI services and capabilities in the future.