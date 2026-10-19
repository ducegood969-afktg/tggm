# Validation and remaining external requirements

## 0.1.15 combined desktop update (2026-10-19)

Current checks supersede historical counts below. All 37 desktop tests pass (zero skipped), including schema-bounded local agent proposals, rejection of unsupported tools/paths/stale edits, check review expiry and manifest revisions, cancellation/timeouts, encrypted edit undo with CRLF/BOM preservation, owner-data fallback and blocked corrupt resets, real Git bundle clone/fsck, fixed-folder installer hash verification and Unreal generated-directory exclusions. Source syntax checks pass.

The real sandboxed Electron GUI smoke passes: existing owner/chat/Studio/Source workflow, multi-file agent proposal review and explicit apply, approved npm test, Stop during a check and model generation, edit undo, encrypted owner export/restore, real Git bundle restoration into a new repository, and restart recovery from a deliberately corrupted current owner file. Linux encryption backend: gnome_libsecret. AI tool responses are mocked; actual local-model agent quality is not established.

Unsigned Windows NSIS engineering packaging completed successfully for 0.1.15. The packaged app.asar version and presence of the agent, owner store, check runner, edit journal and prepared-installer modules were verified. Linux GUI and packaging checks do not prove Windows installation, DPAPI, process-tree termination or the enhanced quiet PowerShell helper on The Studio. The owner previously demonstrated quiet builds and installed 0.1.14; 0.1.15 still needs target-machine acceptance.

Remaining scope: the legacy Everything OS and Service Hub sources are absent, so their internal polling processes were not patched. Their startup entries were disabled by the owner to stop flashing consoles. Source Git subprocesses in this checkout now use windowsHide. Optional Projects/creative service health is checked and failures are explained; services are not provisioned automatically. Browser websites and this cloud chat have no native control connection.

The complete TGGWorld Unreal project is only on The Studio according to the owner. This checkout has some Unreal C++ fragments but no .uproject. No real-estate or character-customization integration, UBA timing, cooked assets or Shipping game executable is claimed. Unreal build/package work requires the complete project and a supported Unreal Windows toolchain.

See [Local agent](LOCAL-AGENT.md) and [Recovery](RECOVERY.md) for exact limits and recovery coverage. No promise of error-free software or automatic installation rollback is made.


Executed successfully in this cloud instance:

- Reproducible locked dependency installation with Node 24 and workspace caches; patched Electron download dependency. Full and production npm audits report zero known vulnerabilities.
- Nine desktop tests cover owner password hashing, settings validation, caller rejection, owner locking/rate limits, mocked provider requests, signing configuration schema, fail-closed update verification and managed Source startup/restart/persistence.
- Real sandboxed Electron GUI smoke test: first owner setup, actual OS keyring encryption/decryption, no plaintext API-key persistence, text-only rendering of a mocked AI response, owner lock enforcement and disabled unsigned updates. Backend: gnome_libsecret. The Source button starts its real backend, opens a sandboxed app window and successfully creates a Git repository without an external website. A screenshot is generated under test-results/desktop.png.
- Real Projects HTTP integration test: path-scoped event creation and filtering, cross-project isolation and compilation of the served dashboard JavaScript.
- Existing control-panel static check and Source/Projects/Higgsfield checks pass, including all three creative-provider router cases.
- Windows NSIS engineering installer generation succeeds using native uninstaller extraction; its archive is readable and passes 7-Zip integrity checks. The unsigned packaged app contains no trusted publisher pin. This is structural validation, not Windows installation acceptance.

Fixes to existing code/checks: corrected stale route-escaping assertions and provider-router location; restored missing Create tag controls; implemented missing project event endpoints; escaped embedded dashboard template literals that prevented the Projects server from parsing.

## Windows checks completed by the owner

The owner built the unsigned 0.1.1 installer on Windows and supplied screenshots showing installer generation, the running installed app, unlocked owner settings, managed Source startup, repository `tgg` creation and its initial commit. After a reported full app restart, the same repository and commit remained listed. Source also reported “TGG backup saved.” These are user-performed checks, not an automated Windows CI result.

The backup action writes a Git bundle in the local Source export store and initiates a browser download. The success notification alone does not establish that a separate downloaded copy exists or that restore works. Confirm the `.bundle` file in Downloads and preserve a copy outside the app data directory. Restore and uninstall remain unverified. Live AI requests, Windows DPAPI inspection and signed upgrades have not been separately validated.

## Current release state and remaining requirements

1. **Free release preference:** Microsoft signing is optional. The chosen route is an unsigned preview with manual downloads and disabled automatic updates. No Azure purchase or identity enrollment is required. See FREE-RELEASE.md.
2. **GitHub source upload:** the release branch is uploaded to `ducegood969-afktg/tggm`; draft pull request https://github.com/ducegood969-afktg/tggm/pull/1 preserves main unchanged. The integration can push code there. It cannot administer `tggm803sc/tggm`.
3. **Hosted Windows acceptance:** GitHub check annotations report “The job was not started because your account is locked due to a billing issue.” This is an account restriction, not a failed app test. The owner used the local Windows build instead. Do not imply that purchasing Microsoft signing fixes this restriction.
4. **Installer distribution:** engineering preview draft `desktop-v0.1.1-preview` exists in the owner repository, with no assets. This integration's requests to `uploads.github.com` returned 401 Bad credentials. The owner can upload the Windows-built installer through the GitHub browser release editor, add its checksum, and publish it explicitly as a prerelease. No public installer release has been published.
5. **TGGhub hosting:** local release-store HTTP and real-installer download checks pass. No public HTTPS host or domain is configured. Preview downloads remain separate from the stable signed-update feed.
6. **OpenAI API:** hosted chat requires a separately billed key. Live provider checks remain unverified; Source/owner administration require no AI key. Never send keys in chat.

The Linux engineering packaging adapter avoids Wine using native uninstaller extraction. Signed Windows builds retain the normal builder/signature verification path. Windows screenshots establish the observed operations above, not universal Windows compatibility or trusted signing.

## Built-in Source in 0.1.1

Source now runs as a managed Electron utility process on a dynamically assigned loopback port, with a same-service dashboard and API. It is opened from the desktop Source button instead of an unverified static page. Data persists in source-store under app user data; closing the desktop app stops the managed backend. MinGit for Windows 2.56.0.2 is downloaded from the official upstream release and checked against upstream SHA-256 da35e72aa21c005a5a0d298cfbae110bc1609a815730ea0dde84b01a1b3cd3be before packaging. Its licenses are retained. The owner has now demonstrated Windows execution of the installed app and bundled Git through repository creation; automated Windows CI acceptance remains blocked as described above. Local Source operations do not require the OpenAI account or signing account. Managed Source API tests also confirm that missing-session and cross-origin requests are rejected; the app uses an HTTP-only session cookie in an isolated browser partition.

The exact Windows-packaged application archive and bundled Source payload were also exercised with a relocated, packaged Linux Electron runtime. Managed Source startup, repository creation, HTTP-only cookie isolation, sandboxing and owner/OS-encryption checks passed from that packaged layout. This verifies archive/resource loading and utility-process startup outside the checkout; it does not substitute for Windows installer, MinGit execution, DPAPI or signing acceptance.

## 0.1.2 local AI development

Ten desktop tests pass, including fixed-loopback Ollama requests, no forwarded API key, redirect rejection, provider validation and readable model/connectivity errors. The real sandboxed Linux GUI smoke also exercised provider switching, keyless local settings and a mocked local answer, while retaining owner locking and managed Source tests. Actual model inference, 0.1.2 Windows installation and upgrading the existing 0.1.1 user data remain unverified. TGG Studio has not been identified or connected.

## 0.1.3 Studio launcher

Eleven desktop tests pass, including rejection of remote/argument-bearing Studio paths, missing executables, unexpected resolved filenames, OS launch errors and locked-owner path changes. The owner supplied an installed Studio executable path under their Windows profile; no Studio API/version or project integration is known. Local Ollama inference inside 0.1.2 and saved settings were demonstrated by owner screenshots. Actual Studio launch on Windows and 0.1.3 upgrade acceptance remain unverified.

## 0.1.4 project and TGG Remote tools

Fourteen desktop tests pass. The managed Source integration test now creates successive real Git snapshots from a temporary project, checks no-change behavior and retained repositories after backend restart. Project filtering excludes common secrets, dependency folders, binary/non-UTF-8 content and symlinks. Remote bundle tests verify that only reviewed text and selected metadata are exported. Locked-owner tool requests are rejected. Real sandboxed Linux GUI smoke exercises review, JSON export, local Source snapshot, diagnostics and app PNG capture; native dialog selections and Ollama answers are stubbed to deterministic test fixtures. The original project text remains unchanged. Windows native pickers, 0.1.4 upgrade and live screen/command access have not been verified; live screen/command access is not implemented.

## 0.1.5 Obsidian redesign

Fourteen desktop tests pass. Real sandboxed GUI smoke checks AI/Owner/Remote navigation, existing owner/provider behavior, local AI protocol, Source and support tools, New Chat and suggested prompts. Screenshots were inspected at 1160px and 760px window widths, with no horizontal body overflow at the compact size and a visible Send action. Native Windows 0.1.5 upgrade and visual acceptance remain to be checked on the owner laptop. The separate Studio executable was not modified.

## 0.1.6 Studio workspace preview

Fifteen desktop tests pass. Real sandboxed GUI checks exercised scoped project opening, file editing and actual save, optional-context companion chat with a mocked local response, stale-revision rejection and the inline unsaved-change dialog. The three-panel layout was inspected from a real app screenshot. Existing owner, Source, local AI and Remote smoke checks also pass. Windows 0.1.6 acceptance remains unverified; no claim is made that the original Studio UI was modified.

## 0.1.7 local edit proposals

Eighteen desktop tests pass. The real sandboxed GUI smoke additionally exercises installed-model selection, local edit review/reject, applying text without a file write, and separately saving that buffer. AI completions are mocked in the cloud; real target-model proposal quality and Windows 0.1.7 upgrade remain unverified. Existing local model inference was previously demonstrated by the owner in 0.1.2 and later screenshots. No claim is made that a new TGG foundation model or remote-control agent was trained or deployed.

## 0.1.8 proposal truncation fix

Twenty desktop tests pass, including a regression reproducing the owner screenshot: a full README cannot be replaced by only the requested Overview sentence. A valid single-sentence edit preserves every other byte. Missing, ambiguous, overlapping and unchanged edits are rejected. Actual local-model reliability and Windows 0.1.8 acceptance remain separate checks.
