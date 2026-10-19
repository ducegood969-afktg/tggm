# Free release route

Microsoft Artifact Signing and Azure billing are optional. The default no-purchase route is an unsigned Windows preview with manual downloads. It requires no signing identity, certificate purchase or Azure subscription. It does not provide a Microsoft-trusted publisher or enable automatic updates.

## Build and test on Windows

Use Node.js 24, then run from `tgg-desktop`:

```powershell
npm ci
npm test
npm run prepare:git
npm run smoke
npm run dist:unsigned
```

The installer is written to `dist`. The **TGG AI Ultra free Windows preview** GitHub workflow performs these steps and tests installation and uninstall. It needs no signing secrets or protected signing environment. Standard GitHub-hosted Actions runners for public repositories are generally free; verify GitHub's current account and usage terms. This workflow does not use paid runner types or publish a public release automatically. It must first be uploaded to the repository and be available for workflow dispatch. Current cloud GitHub write access remains denied.

Download the successful workflow's artifact archive from GitHub Actions. It includes the installer, SHA-256 and an unsigned-preview notice. Windows acceptance must pass before calling the installer validated. A repository owner can also attach those files to an explicitly labeled GitHub prerelease for public downloads. GitHub's release upload limits and usage terms apply. Never publish unsigned `latest.yml` into a stable update feed.

## Our own hosting

TGGhub is free software included in this repository. Run it on an existing computer/server or a suitable free hosting allowance with persistent disk, inbound connectivity and HTTPS. It cannot make a cloud task publicly reachable or guarantee a free host/domain. The cloud workspace is not a public download host. See `../tgg-hub/README.md` for owner publication and hosting instructions. The local TGGhub store already contains the 0.1.1 engineering preview; do not overwrite that version.

## What free signing does and does not provide

A self-signed certificate costs nothing, but Windows does not trust it by default. It would require each user to install and maintain trust manually; it is not a replacement for public publisher trust. This project does not install a new trust root, disable Windows checks, or weaken the existing signature verifier. Unsigned builds use manual downloads and have automatic updates disabled.

OpenAI API usage is separately billed; avoiding signing fees does not make hosted AI inference free. TGG Source and local owner administration do not require an AI key.
