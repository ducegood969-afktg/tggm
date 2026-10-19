# Microsoft cloud signing and Windows release

The selected default is **Microsoft Artifact Signing (formerly Azure Trusted Signing)** using electron-builder's supported signing hook and Microsoft's ArtifactSigning PowerShell module (pinned to 0.1.20). It keeps private signing keys in Microsoft's managed service. Do not purchase/export a PFX for this workflow. The existing PFX option remains available only when explicitly selected.

## Owner actions that cannot be automated here

1. Create an Azure subscription with billing. Register a signing account in a supported region and complete Microsoft's identity validation. Eligibility depends on the identity's location and type. Check current Microsoft eligibility/pricing before purchasing: https://learn.microsoft.com/azure/artifact-signing/quickstart and https://azure.microsoft.com/pricing/calculator/ . The service has recurring and/or usage charges; exact pricing is set by Microsoft. A GitHub account alone cannot supply a trusted signing identity.
2. Create a **public trust** certificate profile for the validated identity. Keep the exact resulting publisher common name; do not invent one before approval.
3. Create a Microsoft Entra app/service principal and a federated identity credential for `repo:tggm803sc/tggm:environment:windows-release`, issuer `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`. Grant **Artifact Signing Certificate Profile Signer** scoped only to the chosen certificate profile. This is the current role name in Microsoft documentation.
4. Create the GitHub `windows-release` environment. Require owner approval and restrict its deployment branches to reviewed release branches. Set these nonsecret environment variables:

| Variable | Value |
| --- | --- |
| TGG_AZURE_CLIENT_ID | Entra application client ID |
| TGG_AZURE_TENANT_ID | Entra tenant ID |
| TGG_AZURE_SUBSCRIPTION_ID | Azure subscription ID |
| TGG_WINDOWS_PUBLISHER | Exact validated certificate publisher common name |
| TGG_AZURE_SIGNING_ENDPOINT | Regional HTTPS endpoint, e.g. https://eus.codesigning.azure.net |
| TGG_AZURE_SIGNING_ACCOUNT | Signing account name |
| TGG_AZURE_CERTIFICATE_PROFILE | Public-trust certificate profile name |

No long-lived Azure client secret or signing certificate is required. The workflow uses `azure/login` OIDC, and the pinned Microsoft module authenticates through the logged-in Azure CLI. Each file's signature is checked immediately after signing. The PowerShell hook is used instead of the builder's legacy TrustedSigning module.

## Builds and acceptance

Run the manual **TGG AI Ultra Windows installer** workflow. `signed=true` is the default; missing identity/account configuration fails closed. For an engineering-only installer test before Azure setup, choose `signed=false`; that output cannot install automatic updates and is not a trusted release.

The workflow runs unit/integration tests, the real UI with Windows credential encryption, builds the installer, tests installation and uninstall, and repeats the UI test against the installed executable. Signed builds additionally verify real Authenticode signatures, wrong-publisher rejection, tamper rejection, publisher pins and SHA-512 metadata. These Windows checks are prepared but have not been run from this cloud instance. Artifacts are uploaded without publishing a release.

After successful Windows acceptance, a repository owner can review and publish the signed installer, blockmap and latest.yml together as a stable GitHub Release. Confirm the repository/feed is publicly reachable first; the current updater configuration does not support private releases. Test an actual upgrade from the previous signed version before making the feed public to users. Each release needs an increased version. Do not rename or modify signed artifacts or latest.yml after generating them. Signing permits trust validation but does not guarantee SmartScreen reputation.

For existing compatible exportable certificates only, set `TGG_SIGNING_PROVIDER=pfx`, `TGG_WINDOWS_PUBLISHER`, `CSC_LINK`, and `CSC_KEY_PASSWORD` on a secure Windows runner. Never enter private certificate material in chat or source control.

## AI provider

Text chat uses an OpenAI API key with API billing and access to the chosen model; ChatGPT subscription billing is separate. Enter the key inside the installed app's Owner settings. For a live cloud smoke check, supply `TGG_AI_API_KEY` securely through environment settings and run `node scripts/provider-check.cjs`; do not send the value in chat. Azure signing and OpenAI are separate accounts.

Current integration references: [Microsoft signing integrations](https://learn.microsoft.com/azure/artifact-signing/how-to-signing-integrations) and the [official action implementation](https://github.com/Azure/artifact-signing-action). Microsoft documents that identity validation can be completed only in the Azure portal; it cannot be completed by CLI. Individual public-trust applicants must currently be in the United States or Canada; organization eligibility covers additional listed countries. Check the quickstart against your legal identity before enrolling.
