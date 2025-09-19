# DIBE ImageGen - Quickstart Guide

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
This will:
- Start the Vite dev server on http://localhost:5173
- Build and launch the Electron app
- Enable hot-reload for both frontend and backend

### 3. Get API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Enter it in the app's Settings page

## Essential Commands

### Development
```bash
npm run dev              # Start development environment
npm run lint             # Check code quality
npm run typecheck        # Validate TypeScript
```

### Building
```bash
npm run build            # Build for production
npm run build:main       # Rebuild main process only
npm run build:preload    # Rebuild preload script only
npm run build:renderer   # Rebuild React app only
```

### Distribution
```bash
npm run dist             # Create platform-specific installer
npm run pack             # Quick development package
```

## Troubleshooting

### App Won't Start
1. Check if Vite server is running on port 5173
2. Rebuild the main process: `npm run build:main`
3. Clear cache and reinstall: `npm cache clean --force && rm -rf node_modules && npm install`

### Build Errors
1. Run `npm run typecheck` to check for TypeScript errors
2. Run `npm run lint` to check for code quality issues
3. Ensure all files are saved before building

### API Issues
- Verify your Gemini API key is correct
- Check network connectivity
- Test the API key in the Settings page

## Project Structure
```
app/
├── main/          # Electron main process
├── preload/       # IPC bridge (secure)
├── renderer/      # React frontend
└── services/      # Worker threads
```

That's it! Run `npm run dev` to get started.