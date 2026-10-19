# TGG connected workspace — 0.1.12

Home is the shared launcher for the installed TGG tools. Existing owner settings, Source repositories, browser sessions and recent-project shortcuts are preserved.

| Tool | Integration |
| --- | --- |
| Studio workspace | Edits selected project files; local AI proposals require review and a separate save. |
| TGG Remote | Reviews the open project and records text snapshots in managed Source. |
| TGG Source | Runs as the managed local repository service with its own window. |
| TGG Browser | Opens websites in a separate sandboxed browsing view without project-tool access. |
| External Studio | Launches the executable configured in Owner settings. |
| TGG Everything OS | Launches the existing Windows app; optional encrypted path override in Owner settings. |
| Ollama | Supplies local AI to Ultra's chat and Studio companion. |
| Projects / Creative engine | Existing optional links; their separate backends must be running. |

The OS default path uses the current Windows profile and `AppData\Local\TGG Everything OS\TGG_EVERYTHING_OS_v1.7.4.exe`, identified from the owner's shortcut. Launch validates a real local versioned TGG OS executable each time. If it moves or changes version, save its new Target in Owner settings. URLs, network shares, command arguments and unrelated executables are rejected. A valid filename is not a cryptographic publisher verification.

Remote connection checks now report whether the OS executable is available as well as Studio, Source and Ollama. Checking availability does not start the OS app or establish an internal API connection. OS and External Studio data, settings and models remain separate; no supported integration API or source code for those apps has been provided. No live mouse/keyboard, arbitrary command executor, remote session, or connection to this ChatGPT conversation is added.

Validation: desktop unit/integration tests cover path constraints and diagnostics. Electron smoke covers Home actions, configuration form, recent files, browser separation, reviewed edits and Source snapshots. Launching the actual TGG OS executable must be checked on the owner's Windows computer; it is not installed in the Linux build environment.

## 0.1.15 combined local tools

AI Ultra now shares its own owner settings with its bounded local agent, reviewed edit journal, explicit npm checks and Recovery page. See [Local agent](LOCAL-AGENT.md) and [Recovery](RECOVERY.md). This does not synchronize the separately installed OS or Service Hub. Their source and the complete TGGWorld Unreal project are not present in this checkout. Browser websites remain isolated from native project tools.
