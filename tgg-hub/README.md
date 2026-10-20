# TGGhub

TGG's release download service. It hosts Windows installers, release metadata and a signed-release feed for TGG AI Ultra. GitHub remains an optional code/CI host. This service does not create a domain, rent a server, sign Windows binaries or grant GitHub permissions.

## Run

Requires Node.js 24 and a persistent disk. No npm dependencies are needed.

```sh
export TGG_HUB_ROOT=/workspace/.state/tgg-hub
npm run tgg:hub
```

The default bind address is loopback, port 10040. `GET /health` verifies readiness. The download page is `/`, JSON listing is `/v1/releases`, and signed updates are `/updates/latest.yml`. A fresh store displays no releases. Processes must be restarted after environment restoration.

For public hosting, run on a server you control with HTTPS in front of it, persistent storage and a process supervisor. Forward all routes to the same service at the domain root, and preserve Range headers. Bind only to loopback behind a proxy. Set `TGG_HUB_ROOT` to the persistent store location and keep it writable only by the service/owner operating-system account. Do not expose the store directly through a static web server. The HTTP service accepts only GET/HEAD; owner publishing uses the CLI through authenticated server access. No public upload/admin endpoint exists.

A container can serve an existing store using `docker build -t tgg-hub tgg-hub`, then `docker run --rm -p 127.0.0.1:10040:10040 -v /your/persistent/store:/data:ro tgg-hub`. The image serves files read-only; publish from the owner host. Place HTTPS in front of the mapped port. Container startup alone does not make a public website.

## Owner publishing

Publish an unsigned engineering preview from the repository root:

```sh
TGG_HUB_ROOT=/workspace/.state/tgg-hub node tgg-hub/publish.mjs tgg-desktop/dist-preview/TGG-AI-Ultra-Setup-0.1.1-x64.exe 0.1.1 --preview
```

Previews are labeled unsigned and never replace the automatic-update feed. Release versions cannot be overwritten. The CLI copies into a staging directory, computes hashes, and serializes publishers with an exclusive lock. Do not delete an active lock; after an interrupted publication, inspect the store before removing a stale lock. Back up the entire store. Serve one persistent store per publisher; replicas need their own deployment/storage design.

For trusted releases, build on Windows using the existing signing workflow. Set `TGG_UPDATE_URL` to your actual HTTPS TGGhub directory ending in `/updates/` **before building**. Set it as a GitHub `windows-release` environment variable if using Actions. Without that variable, the existing GitHub update provider is retained. Preview builds never enable updates.

On the Windows owner host with the complete repository and built installer plus adjacent `.exe.blockmap`, set `TGG_HUB_ROOT` and the exact `TGG_WINDOWS_PUBLISHER`, then run `node tgg-hub/publish.mjs <installer-path> <version>` without `--preview`. The CLI requires Windows Authenticode validation and the expected publisher, copies the blockmap, and generates SHA-512 update metadata from the verified installer. Stable versions must increase. Keep a fixed validated publisher identity across releases. Test an actual signed upgrade before public distribution. Linux publication of signed updates is intentionally rejected because Windows trust validation is unavailable.

For a separate Linux download host, securely copy the owner-validated release store from Windows to a staging location, verify transfer hashes, then switch the host to the completed store. Never copy private certificates or API keys. The container itself does not perform publication or signing.

## Accounts and costs

Local preview hosting needs no Microsoft account. Public availability requires an HTTPS host and address, which can use an existing server; hosting/domain charges depend on your provider. Trusted Windows signing requires Microsoft Artifact Signing billing and owner identity verification, or an alternative publicly trusted Windows code-signing certificate. TGGhub cannot issue that trust. OpenAI API billing is separate and unnecessary for downloads/Source.

Run `npm run check:tgg-hub` for real HTTP publication/download tests. The installer preview fixture is synthetic; a real engineering installer is validated separately. Windows signed publication and public HTTPS deployment remain separate acceptance checks.
