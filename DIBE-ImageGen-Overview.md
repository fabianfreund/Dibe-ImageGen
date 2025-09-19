# DIBE – Image Gen (Electron) — Overview

## Goals
- Cross-platform Electron app (macOS 13+ / Windows 10+).
- v1 service: **Basic Image Gen** — send image(s) + prompt → get generated image back from **Gemini 2.5 Flash Image Preview**.
- Architecture split so new “subservices” are easy to add without breaking each other.
- Minimal, modern UI with Settings (API key + prompt presets in JSON), and a simple way to download results.
- Auto-updates from GitHub (stable channel only).
- Local only: no external telemetry; friendly error messages.

---

## Architecture

### Tech Stack
- **Electron + React + TypeScript + Tailwind** (lightweight, modern UI).
- **electron-builder** for packaging + **GitHub provider** for auto-updates.
- **keytar** for API key storage; **app.getPath('userData')** JSON for prompts/settings.
- **Node “service workers”** (worker_threads) for each subservice (keeps UI snappy and services isolated).
- **REST** calls to Gemini (as in your Swift guide). No seed control in v1 (let Google default).

### Process Model
- **Main** (Electron): window lifecycle, auto-update, secure IPC, secrets (keytar).
- **Renderer** (React): UI, user actions, renders results.
- **Preload**: expose a minimal, typed IPC bridge.
- **Service Workers** (per subservice): do the heavy work (image validation, resize → base64 → REST → parse response).

```
Main  ──IPC──► Service Worker(s)
  ▲              ▲
  │              │
  └──Preload◄──Renderer (React)
```

---

## Directory Layout

```
dibe-image-gen/
├─ app/
│  ├─ main/               # Electron main process
│  │  ├─ main.ts
│  │  ├─ updater.ts
│  │  ├─ store.ts         # settings/presets load/save
│  │  ├─ secrets.ts       # keytar helpers
│  │  └─ ipc.ts           # IPC channel registration
│  ├─ preload/
│  │  └─ preload.ts       # secure API exposed to renderer
│  ├─ renderer/           # React UI
│  │  ├─ App.tsx
│  │  ├─ routes/          # Home, Settings, (future) Services
│  │  ├─ components/
│  │  └─ styles/
│  └─ services/
│     ├─ core/            # common contracts + helpers
│     │  ├─ ServiceContract.ts
│     │  ├─ JobQueue.ts
│     │  └─ imageUtils.ts # validate, resize→base64
│     └─ basic-image-gen/
│        ├─ worker.ts     # worker_thread entry
│        └─ gemini.ts     # REST call + parse
├─ assets/
├─ presets/               # default prompt presets (editable copy)
│  └─ prompts.json
├─ build/
├─ package.json
└─ electron-builder.yml
```

---

## Prompt Presets (Example)

```json
[
  {
    "name": "Beige Studio Food Shot",
    "tags": ["food","studio","beige","advertising"],
    "prompt": "Create a professional studio photograph of this food product. Place the food in the center of the frame and rotate it so it is clearly presented at a 45-degree angle to the camera. Use a clean, seamless beige studio background (#D9C7A1), often used in advertising. Light the scene with professional studio lighting — soft, even illumination with gentle highlights that emphasize texture and freshness, avoiding harsh shadows. Keep the product in sharp focus with a subtle depth of field, making it look appetizing and styled for a high-end restaurant menu or advertisement. Ensure balanced proportions, natural contact shadows, and a polished commercial look."
  }
]
```

---

## Error Handling
- Invalid API key → “Check your Gemini API key.”
- Rate limit → “Rate limit reached. Try again shortly.”
- Safety/policy → “The model flagged this prompt. Try adjusting wording.”
- Invalid image → dimension hints.
- Temporary failure → retry with backoff (1s, 4s, 9s).
- Network failures: “No internet or API unreachable.”

---

## v1 Development Checklist

**Core**
- [ ] Main/Preload/Renderer scaffolding
- [ ] Keytar + settings store + prompts bootstrap
- [ ] IPC routes (settings, prompts, generate, file save)
- [ ] Image utils: validate, resize, base64
- [ ] Gemini REST client (retry/backoff, parsing)
- [ ] Basic Image Gen worker (implements contract)
- [ ] JobQueue (concurrency 2)

**UI**
- [ ] Home page with DnD + prompt + presets
- [ ] Result cards with Save As / Copy
- [ ] Settings page (API key test + JSON editor)
- [ ] Minimal left rail for future services

**DX & Ship**
- [ ] Vite + Tailwind setup
- [ ] electron-builder config + GitHub publish
- [ ] Windows NSIS + macOS DMG targets
- [ ] README with environment vars & signing notes
