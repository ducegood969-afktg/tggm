# Validation and remaining external requirements

Executed successfully in this cloud instance:

- Reproducible locked dependency installation with Node 24 and workspace caches; patched Electron download dependency. Full and production npm audits report zero known vulnerabilities.
- Eight desktop tests cover owner password hashing, settings validation, caller rejection, owner locking/rate limits, mocked provider requests, signing configuration schema, fail-closed update verification and managed Source startup/restart/persistence.
- Real sandboxed Electron GUI smoke test: first owner setup, actual OS keyring encryption/decryption, no plaintext API-key persistence, text-only rendering of a mocked AI response, owner lock enforcement and disabled unsigned updates. Backend: gnome_libsecret. The Source button starts its real backend, opens a sandboxed app window and successfully creates a Git repository without an external website. A screenshot is generated under test-results/desktop.png.
- Real Projects HTTP integration test: path-scoped event creation and filtering, cross-project isolation and compilation of the served dashboard JavaScript.
- Existing control-panel static check and Source/Projects/Higgsfield checks pass, including all three creative-provider router cases.
- Windows NSIS engineering installer generation succeeds using native uninstaller extraction; its archive is readable and passes 7-Zip integrity checks. The unsigned packaged app contains no trusted publisher pin. This is structural validation, not Windows installation acceptance.

Fixes to existing code/checks: corrected stale route-escaping assertions and provider-router location; restored missing Create tag controls; implemented missing project event endpoints; escaped embedded dashboard template literals that prevented the Projects server from parsing.

Still requires account access or Windows execution:

1. **OpenAI API access and billing.** No usable key is present in this environment. Live provider checks remain unrun. Supply TGG_AI_API_KEY through secure environment settings to run npm run check:provider, or enter a key inside Owner settings on Windows. Never send it in chat.
2. **Microsoft signing account and identity verification.** The chosen provider is Microsoft Artifact Signing (formerly Azure Trusted Signing). Azure subscription, public-trust profile and validated publisher are absent. These require owner identity verification and billing; no certificate or payment was fabricated. WINDOWS-RELEASE.md lists the OIDC variables and profile-scoped signing permissions.
3. **Windows acceptance and real upgrades.** The prepared workflow runs Windows UI/DPAPI tests, signed/unsigned installer builds, install/uninstall and signature/tamper rejection checks. It has not been executed here. Native Windows acceptance and an actual signed upgrade remain required before release; Linux GUI tests do not establish Windows readiness.
4. **GitHub API connectivity.** Existing native Git read access works. The available GitHub token is present, but API requests are blocked at the network proxy, before repository authorization can be established. No missing token is inferred. Required API/documentation domains are saved in the environment draft. No branch push, CI dispatch or release publication has been performed.

The Wine bundle and Linux 32-bit execution are no longer installer-build prerequisites: the engineering packaging adapter uses the same native extraction utility used by electron-builder's macOS fallback. Production Windows signing uses the standard builder path. New source and workflows remain local for review; configuration persistence is separate from running scripts and publication.

## Built-in Source in 0.1.1

Source now runs as a managed Electron utility process on a dynamically assigned loopback port, with a same-service dashboard and API. It is opened from the desktop Source button instead of an unverified static page. Data persists in source-store under app user data; closing the desktop app stops the managed backend. MinGit for Windows 2.56.0.2 is downloaded from the official upstream release and checked against upstream SHA-256 da35e72aa21c005a5a0d298cfbae110bc1609a815730ea0dde84b01a1b3cd3be before packaging. Its licenses are retained. Windows execution of the bundled Git and installed app remains part of the prepared Windows CI acceptance, not a claim made by the Linux tests. Local Source operations do not require the OpenAI account or signing account. Managed Source API tests also confirm that missing-session and cross-origin requests are rejected; the app uses an HTTP-only session cookie in an isolated browser partition.

The exact Windows-packaged application archive and bundled Source payload were also exercised with a relocated, packaged Linux Electron runtime. Managed Source startup, repository creation, HTTP-only cookie isolation, sandboxing and owner/OS-encryption checks passed from that packaged layout. This verifies archive/resource loading and utility-process startup outside the checkout; it does not substitute for Windows installer, MinGit execution, DPAPI or signing acceptance.
