# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
│   ├── store.ts         # Settings, presets, and library management
│   ├── secrets.ts       # Secure API key handling (keytar)
│   ├── ipc.ts           # IPC channel definitions
│   └── updater.ts       # Auto-update functionality
├── preload/
│   └── preload.ts       # Secure IPC bridge
├── renderer/            # React application
│   ├── App.tsx          # Main application component with routing
│   ├── routes/          # Page components (Home, Library, Settings)
│   ├── components/      # UI components (modals, layout)
│   │   ├── ImagePreviewModal.tsx    # Full-screen image viewing
│   │   ├── ImageEditorModal.tsx     # Built-in image editor
│   │   ├── PresetManagerModal.tsx   # Preset management
│   │   └── Layout.tsx               # Sidebar navigation
│   └── styles/          # CSS and styling
└── services/            # Worker thread services
    ├── core/
    │   ├── ServiceContract.ts   # Service interface
    │   ├── ServiceManager.ts    # Service orchestration and worker management
    │   ├── JobQueue.ts         # Job processing
    │   └── imageUtils.ts       # Image optimization and encoding
    └── basic-image-gen/         # Gemini image generation service
        ├── worker.ts            # Worker thread entry
        └── gemini.ts            # Gemini API client
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

## Key Application Features

### Home (routes/Home.tsx)
- Drag-and-drop image upload with multi-image support
- Prompt presets with tag-based filtering
- Real-time generation status and progress
- Auto-save to library (configurable)
- Built-in image editor integration
- URL parameters for reusing prompts and images (?prompt=...&image=...)

### Library (routes/Library.tsx)
- Persistent storage of generated images with metadata
- Grid and list view modes
- Sorting by date, prompt, file size
- Search and filter functionality
- Batch download and delete operations
- Direct editing and regeneration from library items

### Settings (routes/Settings.tsx)
- Google Gemini API key management (stored in system keychain)
- Output directory configuration
- Library auto-save toggle
- Theme preferences (planned)

## Development Commands

### Local Development
```bash
npm run dev                # Start both renderer and main process in dev mode
npm run dev:renderer       # Start Vite dev server only (port 5173)
npm run dev:main           # Build and run Electron main process

npm run build              # Full production build (all components)
npm run build:renderer     # Build renderer with Vite
npm run build:main         # Compile main process TypeScript
npm run build:preload      # Compile preload script
npm run build:services     # Compile service workers

npm run lint               # ESLint check
npm run typecheck          # TypeScript validation across all tsconfig files
npm test                   # Run Jest tests
```

### Building & Distribution
```bash
npm run dist               # Build and package for current platform
npm run dist:mac           # Package for macOS (DMG for x64 and arm64)
npm run dist:win           # Package for Windows (NSIS installer)
npm run dist:linux         # Package for Linux (AppImage)
npm run pack               # Package without creating installer (for testing)
```

### Important Build Notes
- **Sharp dependency**: Native module for image processing, configured with `asarUnpack` in electron-builder
- **Multi-stage build**: Renderer → Preload → Services → Main (dependencies matter!)
- **Path aliases**: Configured in vite.config.ts (@renderer, @main, @services, etc.)

## Architecture Details

### Worker Thread Service Pattern
Services run in isolated Node.js worker threads to prevent blocking the main process:
1. **ServiceManager** (main/services/core/ServiceManager.ts) orchestrates worker lifecycle
2. Each service implements the **ServiceContract** interface
3. Workers communicate via messages: `status`, `result`, `error`
4. Job tracking with unique IDs for async operations
5. Automatic cleanup after job completion (1 minute retention for debugging)

### IPC Communication Flow
```
Renderer → Preload (typed API) → Main Process → ServiceManager → Worker Thread
                                                     ↓
                                              Store/Keytar/FS
```

### Data Persistence
- **Settings & Library**: JSON files in app.getPath('userData')
- **API Keys**: System keychain via keytar (never in files)
- **Generated Images**: Stored in user-configured directory with library metadata
- **Presets**: Bundled defaults in `presets/prompts.json`, user edits saved to userData

## Adding New AI Services

To add support for a new AI provider (e.g., OpenAI, Stability AI):

1. **Create service directory**: `app/services/your-service-name/`
   - `worker.ts`: Worker thread entry point with job processing logic
   - `api-client.ts`: API integration with the provider

2. **Implement ServiceContract**: Define service configuration in worker.ts

3. **Register in ServiceManager**: Add to `services` object in `app/services/core/ServiceManager.ts`

4. **Update UI**: Add service selection option in Home.tsx (currently hardcoded to 'basic-image-gen')

5. **Update IPC types**: Add any new IPC channels needed in `app/main/ipc.ts`

## Common Development Patterns

### Working with Images
- Images are optimized using Sharp before upload (resizing, format conversion)
- Base64 encoding for transferring between processes
- File validation in `app/services/core/imageUtils.ts`

### State Management
- React hooks for local component state
- IPC calls for persistent data (settings, library, presets)
- No external state management library (Redux, Zustand, etc.)

### Modal Pattern
All major modals (ImagePreviewModal, ImageEditorModal, PresetManagerModal) follow:
- Controlled component pattern (isOpen, onClose props)
- Portal rendering for proper z-index
- Keyboard shortcuts (ESC to close, arrow keys for navigation)
- Dark overlay with click-outside-to-close

### Error Handling
- Worker threads catch and send error messages to main process
- User-friendly error messages in UI (no stack traces)
- Retry logic with exponential backoff for API rate limits
- Validation before expensive operations (API calls, image processing)

---

This architecture supports the current Gemini-based image generation while providing a foundation for adding new AI services and capabilities.