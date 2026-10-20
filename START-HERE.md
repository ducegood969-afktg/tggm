# TGG shared development workspace

Development repository: https://github.com/ducegood969-afktg/tggm

Current work is on `codex/tgg-ai-ultra-windows-release`, reviewed in https://github.com/ducegood969-afktg/tggm/pull/1 . Select that branch when browsing code; main is not the current app. The source branch contains the Windows desktop app, built-in Studio workspace, managed Source backend and owner-reviewed Remote support tools.

This cloud session can change, test and push repository code. It does not have access to your laptop's screen, terminal or private folders. The GitHub connection does not grant those capabilities. Never share account passwords, API keys, SSH private keys or remote-access codes in chat. No unattended agent is installed.

## Combined desktop update: 0.1.15

Local agent, reviewed per-file edits, explicit npm Test/Build, Stop, encrypted edit recovery, owner backups and verified Source bundle restore are documented in [Local agent](tgg-desktop/LOCAL-AGENT.md) and [Recovery](tgg-desktop/RECOVERY.md). OS and External Studio remain separate applications; their internal settings and service code are not synchronized.

## Build an update on Windows

For a console-free, user-started build, save `Update-TGG-Quiet.vbs` to your desktop and double-click it. It resolves the same development branch and downloads the commit-pinned helper, using its `-Quiet` switch. No scheduled task, startup entry or automatic installation is added. Progress and failure summaries are in `Downloads\TGG-Update.log`; detailed build logs are in the unique `Downloads\TGG-build-*` directory. The final log lists the installer folder. The updated helper also places a verified copy in `Downloads\TGG Updates` for the new Recovery page. No Explorer window opens. The builder still runs all checks, with smoke-test application windows hidden. Node.js 24 and network access remain required. This wrapper requires Windows Script Host (which some Windows installations disable); actual Windows execution is not validated by Linux testing. OS security or installer prompts are not suppressed.

For no command typing with visible progress, save `Update-TGG.cmd` to your desktop and double-click it. It resolves the latest commit on the fixed TGG development branch, validates the full SHA, downloads the PowerShell helper at that immutable commit, and runs the existing builder. Node.js 24 and Internet access are still required. PowerShell runs underneath; there is no system-wide execution-policy change. Each click builds the current development preview rather than a signed stable release. It opens the installer folder but does not install or close TGG automatically. This `.cmd` wrapper has been reviewed in Linux but still requires a Windows run to verify.

`Update-TGG.ps1` is a manual helper that works from any current directory and requires Node.js 24. Download that script from a reviewed commit, then run it with the full 40-character commit you intend to build:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Update-TGG.ps1" -Commit <FULL_COMMIT_SHA>
```

Replace the placeholder; do not include angle brackets. The helper downloads an immutable source archive into a new Downloads subfolder, runs dependency installation, tests, UI smoke and unsigned installer build, and opens the resulting dist folder. It stops on failures. It does not install the app, delete app data, buy a service or start a remote shell. This is manual rebuilding, not a trusted automatic updater. Close TGG before running its installer. Keep repository backups separately. The helper must be tested on Windows; it cannot be executed in this Linux cloud environment.

## Work on a laptop-only project

Open the exact project folder in TGG Studio workspace. Use TGG Remote to review supported text and export a support bundle if you want to share it in chat. Check the bundle contents first. A Source snapshot is a separate local Git history copy; it does not automatically upload your project to GitHub. Binary assets, generated files and deletions are not mirrored.

A local Codex workspace session, when supported by your installed Codex application, can work with local files/commands using that application's own permissions. This chat cannot start that session on your behalf, transfer its approval, or assume it exists.

## Identify a flashing console window

Double-click `Diagnose-TGG-Popup.vbs` once. It downloads a commit-pinned read-only watcher and runs it without a console for 90 seconds. The result is `Downloads\TGG-Popup-Diagnostic.json`. It samples process names, executable paths, parent/grandparent identities and timestamps, with an initial baseline of already running console-related programs. No command lines, environment values or file contents are collected, and no process or startup setting is changed. Inspect paths before sharing. Very short processes or exited parents can be missed; protected process paths can be blank. Standard-user Windows execution is still to be validated on the affected machine; Linux cannot reproduce its popups.
