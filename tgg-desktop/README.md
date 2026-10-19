# TGG AI Ultra

A Windows desktop workspace beside the existing TGG Next.js game control panel. Includes single-turn local Ollama or OpenAI chat, password-protected local owner settings, operating-system encrypted API-key storage, a built-in TGG Source workspace and shortcuts to Projects/creative services, and an NSIS installer/update pipeline.

For chat without paid API calls, use [local Ollama setup](LOCAL-AI.md) in version 0.1.2. Ollama and a downloaded model are separate prerequisites; Source works without either provider.

## Start and test

Use Node.js 24 and the existing checkout; cloud tasks are already isolated, so do not create a worktree unless explicitly requested.

For complete Linux cloud installation, checks and the unsigned Windows preview build, run `bash /workspace/tggm/tgg-desktop/scripts/install-cloud.sh`. This Bash script belongs in the cloud environment; it is not a Windows CMD download command. It verifies prerequisites and checks that the installer was produced.

```sh
cd /workspace/tggm/tgg-desktop
export npm_config_cache=/workspace/.cache/npm
export XDG_CACHE_HOME=/workspace/.cache
export ELECTRON_CACHE=/workspace/.cache/electron
export electron_config_cache=/workspace/.cache/electron
export ELECTRON_BUILDER_CACHE=/workspace/.cache/electron-builder
export NODE_USE_ENV_PROXY=1
npm ci --no-audit --no-fund
node node_modules/electron/install.js
npm test
```

On a Windows development machine run `npm run prepare:git` then `npm start`, or use the installer. Create your owner password (12–256 characters), enter your OpenAI API key and an available model in Owner settings, save, and open AI workspace. Requests are independent and chats are not persisted. OpenAI sends messages to its fixed HTTPS endpoint; the local Ollama option sends them to this computer. Avoid sending secrets.

For a real Linux GUI smoke test on the Debian cloud host:

```sh
bash scripts/setup-cloud.sh
npm run smoke:cloud
```

Setup installs a small rootless Xvfb/keyring environment using signed Debian repositories. The smoke script creates an isolated profile and disposable test keyring, verifies real OS encryption and UI behavior, opens the real managed Source backend and creates a repository, and uses a fake AI provider response. It does not use or retain real API keys. It requires a host command context that allows Chromium's user namespace mappings. In Codex, run it outside the restrictive command filesystem sandbox using approved escalation. `--disable-setuid-sandbox` selects the working user-namespace sandbox; `chromiumSandbox:true` keeps sandboxing enabled. Never use `--no-sandbox`. No user-facing cloud preview or persistent background service is needed for this build/test workflow.

## Installer builds

**No-purchase route:** follow [FREE-RELEASE.md](FREE-RELEASE.md). `npm run dist:unsigned` builds on Windows without Microsoft signing or an Azure subscription. The separate **TGG AI Ultra free Windows preview** workflow tests the installer and provides downloadable artifacts with checksums. Unsigned builds use manual updates and may show Windows security warnings. TGGhub can host the downloads on an existing server; public hosting is not created automatically.

`npm run dist:preview` produces an **unsigned engineering installer** at `dist-preview/TGG-AI-Ultra-Setup-0.1.7-x64.exe`. The Linux build uses electron-builder's native UninstallerReader through a custom packaging target, avoiding Wine's unavailable 32-bit execution. This adapter uses the pinned builder version, changes no installed dependency files, and is separate from production signing. It does not prove the installer runs on Windows. Windows acceptance must pass before distribution.

`npm run dist:win` produces a **signed production installer** using Microsoft cloud signing. It requires the validated publisher and signing account settings; missing settings fail closed. See [WINDOWS-RELEASE.md](WINDOWS-RELEASE.md) for Azure OIDC configuration, required accounts, costs, the Windows workflow and secure publication steps. The workflow can also build/test an unsigned installer with `signed=false` before Azure setup. It uploads artifacts without publishing a release.

## Ownership and security

Owner administration protects this installation's provider settings. It does not confer remote service administration, global identity, Windows elevation or multiuser account management. The first Windows account to initialize the app becomes its local owner. Protect that Windows account; someone controlling it can reset app data. No default password or bypass is included. Settings lock after five minutes or on window blur; unlock attempts are rate-limited.

API keys are encrypted with Electron safeStorage (DPAPI on Windows) and remain in the main process. Linux development requires a real keyring and rejects plaintext storage. Renderer pages use a sandbox, context isolation, a restrictive CSP, fixed IPC methods and caller validation. Navigation, popups and permission requests are denied. Provider output is rendered as text, not HTML.

Trusted packaged releases check for updates at startup and every four hours, download in the background, and install on quit. SHA-512 metadata and pinned Authenticode publisher checks protect the update. The custom verifier rejects unavailable PowerShell, invalid output, invalid signatures and mismatched publishers or file paths. Unsigned builds have no trusted publisher pin and cannot check or install updates. The GitHub release feed must be public; private update distribution needs a separate design and must not embed a GitHub token in the app.

TGG Source starts automatically inside the desktop app; click **Open TGG Source**. No website address, separate Node.js installation or separate Git installation is required by the Windows installer. The Source backend uses the app runtime, binds only to loopback on a free port, and is stopped when the app quits. Its API requires a private HTTP-only app-session cookie in an isolated in-memory browser partition; requests from outside that session are rejected. External Git clients need a separately configured Source service. Repositories persist under the Windows user-data directory in `source-store`. A fresh store starts empty: create a repository or import one through its form. Existing standalone Source data is not moved or overwritten automatically.

The Windows installer bundles MinGit 2.56.0.2 from the official Git for Windows release; build setup verifies its pinned SHA-256 before extraction. Vendor licenses are retained. Linux development uses the installed system Git.

Projects and Higgsfield remain separate optional services opened in the browser. OCI/GPU hosting, PostgreSQL, Steam, Discord and creative-provider accounts are separate requirements for those existing workflows, not prerequisites for this desktop text-chat app.

See [VALIDATION.md](VALIDATION.md) for executed checks and the remaining external requirements. No provider account, paid purchase, validated signing identity or public release is created by this code.

## TGG Studio launcher in 0.1.3

Owner settings includes a separate TGG Studio path form. Unlock, enter its shortcut Target (for example `C:\Users\you\AppData\Local\Programs\TGG Studio\TGG_Studio.exe`), and save. **Open TGG Studio** opens that existing installation. The default suggestion uses the current Windows user profile; a custom path is supported. Configuration is owner-protected and OS-encrypted. The launcher only accepts a real local file named TGG_Studio.exe, without URLs, UNC shares or arguments, and checks it again before opening. Windows performs the launch. This is a shortcut integration, not shared projects, synchronization, remote control or AI integration. Studio must already be installed. Actual Windows Studio launching remains to be checked on the owner laptop.

## TGG Remote project tools in 0.1.4

See [TGG-REMOTE.md](TGG-REMOTE.md) for owner-reviewed Studio project snapshots, support-file export, local connection diagnostics and app-window screenshots. Tools have a dedicated TGG Remote view; unlock in Owner settings first. Nothing is uploaded automatically, and no live remote-control connection is created. Source snapshots copy supported text only and do not mirror deletions or binary assets.

## Obsidian interface in 0.1.5

The desktop app now uses a charcoal/mint visual system, compact navigation, separate AI/Remote/Owner views, model labels, suggested prompts, New Chat and responsive forms. New Chat clears the current unsaved on-screen conversation; it is disabled while a request runs. Source and the separate Studio app retain their existing interfaces. Studio requires editable source or a replacement workspace for its own redesign.

## Integrated Studio workspace in 0.1.6

[STUDIO-WORKSPACE.md](STUDIO-WORKSPACE.md) describes the new Obsidian file explorer, existing-text-file editor and optional-context AI companion. Native folder selection scopes file access; explicit saves require owner unlock and reject detected external edits. The existing Studio executable remains available as External Studio. This preview does not create files, execute commands or automatically sync projects.

## Local coding companion in 0.1.7

[LOCAL-CODER.md](LOCAL-CODER.md) describes installed Ollama model discovery and reviewed single-file edit proposals. Generation is local-only; applying a proposal changes only the editor buffer and writing it still requires explicit Save file. Hosted Codex access is not required to use this feature. There is no automatic command execution or unattended cloud-to-laptop connection.
