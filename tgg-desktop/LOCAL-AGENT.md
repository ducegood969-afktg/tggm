# Local agent in 0.1.15

Open a project in Studio workspace, unlock Owner settings, then choose Local agent. The agent uses the selected local Ollama model and the shared AI Ultra owner settings. It does not connect this cloud chat or browser websites to your computer.

The schema allows listing reviewed project files, reading them, proposing exact text replacements, requesting a check, and finishing. Paths must belong to the selected workspace. One run permits at most ten tool steps and five changed files; model reads are bounded. Invalid tools, ambiguous matches, stale files and malformed responses fail closed. Model requests go to the fixed local Ollama endpoint without an API key.

Edits appear as current/proposed text. Applying a file explicitly writes it to disk and records an encrypted recovery copy first. Each file is approved separately; a group is not an atomic transaction. Save any editor changes before starting. No arbitrary shell or mouse/keyboard tool is exposed.

Test and Build are separate owner-approved actions. The preview shows the exact package.json script and expires after 90 seconds. Node.js 24 with npm on PATH is required. No dependencies are installed automatically. npm pre/post hooks are disabled, but the selected script can run other programs with your account permissions: this is not an operating-system sandbox. Manifest revisions are checked again before execution. Output is capped at 256 KiB and runtime at 120 seconds.

Stop cancels active model requests and attempts to terminate the owned check process tree. It cannot undo completed writes or guarantee termination of programs that detach themselves. Locking or closing the app stops active work. Agent activity records contain action labels rather than prompts or file contents; they are encrypted locally and rotate at 4 MiB, retaining one previous log.

Unreal descriptors (.uproject and .uplugin), C++ source, build-rule .cs files and configuration text can be reviewed. Generated Binaries, Intermediate, Saved, DerivedDataCache and .vs directories are excluded. Existing limits remain 200 text files, 2 MiB total, 256 KiB per file and 5,000 scanned entries; select a smaller source folder for larger projects. Unreal binary assets are not included. The check runner currently supports npm Test/Build, not Unreal AutomationTool or UBA.
