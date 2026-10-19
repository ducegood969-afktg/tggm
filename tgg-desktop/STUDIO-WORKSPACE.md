# Studio workspace preview — 0.1.6

A new Obsidian workspace is included inside AI Ultra. It is not a patch or replacement for the separately installed TGG Studio 0.1.0. The old app remains available through **External Studio**. The uploaded connector, intake and index scripts are supporting utilities, not that application's editable UI source; they were inspected without being run or imported.

## Use

Unlock Owner settings, select **Studio workspace**, and choose **Open folder**. Select the exact project folder with the native picker. Only the supported UTF-8 text files accepted by the existing project-review filter are listed. Select a filename to load it, edit in the central pane, then choose **Save file**. Changing a selected folder or file with unsaved text prompts you to keep editing or discard the buffer. Closing the app with unsaved changes is prevented; save or discard first.

This preview edits existing files only. It does not create, rename or delete files, recursively move folders, run a terminal, provide syntax highlighting or install language servers. File lists are flat relative paths. Reopen the folder to refresh the list or after an app restart. The existing bounded scan excludes common secrets, symlinks, binary data and generated folders; it is not a general secret detector.

Opening a folder does not modify files. Only **Save file** writes your selected file. Each save checks its original SHA-256 against the current file before replacement, rejects outside/linked paths and reports a conflict instead of overwriting a detected external edit. Reopen the file to load that external version (discarding the buffer only after your confirmation). Writes use a temporary same-directory file and rename; existing CRLF and UTF-8 BOM are retained. This is not cross-process file locking: another process can still race a save. The editor is capped at 256 KiB per file; normal backups/version control remain necessary. Opening folders and saving files require owner unlock. Previously selected file reads are scoped to the opened workspace.

## Companion

The right panel uses the same saved AI provider as AI workspace. Local Ollama needs no API key; OpenAI uses its separately billed API. Editor content is included only if **Include editor text** is selected, with a 12,000-character limit. Requests are independent and companion history is not persisted. AI suggestions are rendered as text and are not executed or written to a file automatically. Review project code for private content before including it with a cloud provider.

## Source history

Use TGG Remote to review this project folder and save its text snapshot to Source. Editor saves do not automatically create commits, upload to GitHub or synchronize with the old Studio app. The original Studio can edit the same files separately; the workspace's conflict check guards against detected external edits.

## Validation

Fifteen desktop tests pass. Tests cover scoped reads/writes, excluded private files, CRLF preservation, rejection of stale revisions and oversized content, linked-file rejection and cleanup of temporary saves. The real sandboxed Linux GUI smoke opens a temporary project, saves text, obtains a mocked local companion answer with editor context, and verifies that an external edit is not overwritten. Native folder selections are stubbed for deterministic tests. Windows native pickers, installation/upgrade of 0.1.6 and use with the owner's project remain acceptance checks.
