# TGG shared development workspace

Development repository: https://github.com/ducegood969-afktg/tggm

Current work is on `codex/tgg-ai-ultra-windows-release`, reviewed in https://github.com/ducegood969-afktg/tggm/pull/1 . Select that branch when browsing code; main is not the current app. The source branch contains the Windows desktop app, built-in Studio workspace, managed Source backend and owner-reviewed Remote support tools.

This cloud session can change, test and push repository code. It does not have access to your laptop's screen, terminal or private folders. The GitHub connection does not grant those capabilities. Never share account passwords, API keys, SSH private keys or remote-access codes in chat. No unattended agent is installed.

## Build an update on Windows

For no command typing, save `Update-TGG.cmd` to your desktop and double-click it. It resolves the latest commit on the fixed TGG development branch, validates the full SHA, downloads the PowerShell helper at that immutable commit, and runs the existing builder. Node.js 24 and Internet access are still required. PowerShell runs underneath; there is no system-wide execution-policy change. Each click builds the current development preview rather than a signed stable release. It opens the installer folder but does not install or close TGG automatically. This `.cmd` wrapper has been reviewed in Linux but still requires a Windows run to verify.

`Update-TGG.ps1` is a manual helper that works from any current directory and requires Node.js 24. Download that script from a reviewed commit, then run it with the full 40-character commit you intend to build:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Update-TGG.ps1" -Commit <FULL_COMMIT_SHA>
```

Replace the placeholder; do not include angle brackets. The helper downloads an immutable source archive into a new Downloads subfolder, runs dependency installation, tests, UI smoke and unsigned installer build, and opens the resulting dist folder. It stops on failures. It does not install the app, delete app data, buy a service or start a remote shell. This is manual rebuilding, not a trusted automatic updater. Close TGG before running its installer. Keep repository backups separately. The helper must be tested on Windows; it cannot be executed in this Linux cloud environment.

## Work on a laptop-only project

Open the exact project folder in TGG Studio workspace. Use TGG Remote to review supported text and export a support bundle if you want to share it in chat. Check the bundle contents first. A Source snapshot is a separate local Git history copy; it does not automatically upload your project to GitHub. Binary assets, generated files and deletions are not mirrored.

A local Codex workspace session, when supported by your installed Codex application, can work with local files/commands using that application's own permissions. This chat cannot start that session on your behalf, transfer its approval, or assume it exists.
