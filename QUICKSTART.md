# DIBE ImageGen - Quickstart Guide

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)
- **Git** for version control

### Platform-Specific Requirements

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`
- For distribution: Apple Developer account and certificates

**Windows:**
- Visual Studio Build Tools or Visual Studio Community
- Windows SDK (installed with Visual Studio)

**Linux:**
- Build essentials: `sudo apt-get install build-essential`
- Additional libraries may be required for specific distributions

## Initial Setup

### 1. Install Dependencies

```bash
# Install all project dependencies
npm install

# Verify installation
npm run typecheck
```

### 2. Environment Setup

Create any necessary environment files (none required for basic development).

### 3. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Keep it handy for testing - you'll enter it in the app settings

## Development Workflow

### Start Development Environment

```bash
# Start both renderer and main process in development mode
npm run dev

# The app will open automatically
# Vite dev server runs on http://localhost:5173
# Electron will hot-reload on main process changes
```

### Development Commands

```bash
# Code quality checks
npm run lint              # ESLint code analysis
npm run typecheck         # TypeScript validation

# Testing
npm test                  # Run Jest test suite
npm test -- --watch       # Run tests in watch mode
npm test -- --coverage    # Generate coverage report

# Individual builds (for debugging)
npm run build:renderer    # Build React app only
npm run build:main        # Build main process only
npm run build:preload     # Build preload script only
```

## Testing the Application

### 1. First Launch

1. Run `npm run dev`
2. The app should open with the home screen
3. Navigate to Settings (sidebar)
4. Enter your Gemini API key
5. Click "Test API Key" to verify connectivity

### 2. Basic Image Generation Test

1. Go to the home screen
2. Upload one or more images (PNG, JPG, WebP up to 10MB)
3. Select a preset or enter a custom prompt
4. Click "Generate Images"
5. Wait for processing (placeholder functionality in current version)

### 3. Settings Verification

Test all settings functionality:
- API key storage and retrieval
- Theme selection
- Output directory selection
- Image format and quality settings
- Prompt presets editing (JSON format)

## Building for Production

### Full Production Build

```bash
# Build all components for production
npm run build

# Verify the build works
npm run electron
```

### Create Distribution Packages

```bash
# Build for all platforms (requires platform-specific setup)
npm run dist

# Platform-specific builds
npm run dist:mac          # macOS DMG (requires macOS)
npm run dist:win          # Windows NSIS installer (requires Windows)
npm run dist:linux        # Linux AppImage

# Development package (faster, no signing)
npm run pack
```

### Distribution Files

Built packages will be in the `build/` directory:
- **macOS**: `.dmg` installer
- **Windows**: `.exe` NSIS installer
- **Linux**: `.AppImage` portable executable

## Common Issues & Solutions

### Installation Problems

**Error: `node-gyp` build failures**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Error: `keytar` compilation issues**
```bash
# Install platform build tools
# macOS: xcode-select --install
# Windows: npm install --global windows-build-tools
# Linux: sudo apt-get install build-essential python3-dev
```

### Development Issues

**Electron window doesn't open:**
- Check if port 5173 is available
- Verify main process compilation: `npm run build:main`
- Check console for TypeScript errors

**React hot reload not working:**
- Restart the development server
- Clear browser cache if using external browser
- Check Vite configuration in `vite.config.ts`

**API key not persisting:**
- Verify keytar is properly installed
- Check system keychain permissions
- Try deleting and re-entering the API key

### Build Issues

**TypeScript compilation errors:**
```bash
# Check all TypeScript configurations
npm run typecheck
# Fix errors before building
```

**Electron builder failures:**
- Ensure all dependencies are installed
- Check `electron-builder.yml` configuration
- Verify code signing certificates (for distribution)

**Missing dependencies in built app:**
- Check `files` section in `package.json` build config
- Verify all runtime dependencies are included
- Test with `npm run pack` before full distribution

## Development Best Practices

### Code Quality

1. **Always run checks before commits:**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

2. **Use TypeScript strictly:**
   - No `any` types without explicit documentation
   - Provide interfaces for all data structures
   - Enable strict mode in all tsconfig files

3. **Follow naming conventions:**
   - Components: PascalCase (`ImageUpload.tsx`)
   - Files: camelCase (`imageUtils.ts`)
   - Constants: UPPER_SNAKE_CASE

### Security Guidelines

1. **Never commit API keys or secrets**
2. **Always validate IPC messages**
3. **Use keytar for credential storage**
4. **Sanitize user inputs**

### Performance Tips

1. **Use worker threads for heavy processing**
2. **Implement proper error boundaries**
3. **Optimize image sizes before processing**
4. **Clean up resources in useEffect cleanup**

## Project Structure Reference

```
dibe-image-gen/
├── app/                  # Source code
│   ├── main/            # Electron main process
│   ├── preload/         # Secure IPC bridge
│   ├── renderer/        # React UI
│   └── services/        # Worker thread services
├── assets/              # Static assets
├── presets/             # Default prompt presets
├── build/               # Distribution output
├── dist/                # Compiled code
└── node_modules/        # Dependencies
```

## Next Steps

1. **Set up your API key** in the application settings
2. **Test basic functionality** with sample images
3. **Explore the codebase** using the CLAUDE.md documentation
4. **Run the test suite** to understand expected behavior
5. **Try building** for your target platform

For detailed architecture information, see `CLAUDE.md`.
For specific implementation details, see `DIBE-ImageGen-Overview.md`.