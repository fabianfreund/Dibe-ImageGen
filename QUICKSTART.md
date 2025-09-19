# DIBE - Imagine - Quickstart Guide

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
npm run rebuild          # Rebuild native dependencies for Electron
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
npm run dist:mac         # macOS DMG installer only
npm run dist:win         # Windows NSIS installer only
npm run dist:linux       # Linux AppImage only
npm run pack             # Quick development package
```

## Internal Distribution (After Build)

After running `npm run dist`, distribute these files to users:

### For macOS Users
**Primary Files:**
- `build/DIBE - Imagine-1.0.1.dmg` (~98MB) - Intel x64
- `build/DIBE - Imagine-1.0.1-arm64.dmg` (~95MB) - Apple Silicon

**Installation:** Users double-click DMG, drag app to Applications folder

### For Windows Users
Run `npm run dist:win` to generate:
- `build/DIBE - Imagine Setup 1.0.1.exe` - NSIS installer

### For Linux Users
Run `npm run dist:linux` to generate:
- `build/DIBE - Imagine-1.0.1.AppImage` - Portable executable

### Distribution Checklist
- [ ] Test the installer on target platform
- [ ] Verify app launches and basic functionality works
- [ ] Include setup instructions: "Requires Gemini API key from Google AI Studio"
- [ ] Share the appropriate installer file (DMG/EXE/AppImage) with users

### Recent Fixes Applied
- ✅ Fixed electron-updater dependency (moved to production dependencies)
- ✅ Added app icons from assets folder
- ✅ Fixed file path loading in packaged app
- ✅ Disabled code signing for internal distribution
- ✅ Fixed Windows/Linux build configuration
- ✅ Fixed Sharp native dependency loading on macOS ARM64

## Troubleshooting

### App Won't Start
1. Check if Vite server is running on port 5173
2. Rebuild the main process: `npm run build:main`
3. Clear cache and reinstall: `npm cache clean --force && rm -rf node_modules && npm install`

### Build Errors
1. Run `npm run typecheck` to check for TypeScript errors
2. Run `npm run lint` to check for code quality issues
3. Ensure all files are saved before building

### Native Dependencies Issues (Sharp/Image Processing)
If you encounter Sharp library errors like "Could not load the sharp module":
1. Rebuild native dependencies: `npm run rebuild`
2. If that fails, try: `npm rebuild sharp`
3. On macOS ARM64, ensure you're using the correct architecture

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