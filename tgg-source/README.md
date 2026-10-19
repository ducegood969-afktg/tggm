# TGG Source

TGG Source is the TGG-owned source-control service.

Current foundation:
- repository creation/listing
- Git-backed repositories
- branches
- commit history
- tree/file reads
- multi-file commits
- compare / diff
- code search
- merge operations
- tags / release markers
- issues
- pull requests
- pull-request merge
- health endpoint
- TGG web dashboard

Default storage: `/data/tgg-source/repos`
Default port: `10030`

TGG Source is the TGG-owned replacement path for the GitHub product experience. The next expansion areas are accounts/permissions, inline code review, webhooks, TGG Workflows, packages/artifacts, notifications, protected branches, and repository-level audit policy.

## Running the dashboard and avoiding HTTP 404

Serve the dashboard through `node tgg-source/server.mjs` (`npm run tgg:source`), not a static file server. The same service must serve the page and repository APIs. Both `/` and `/index.html` are supported entry points. Static hosts can display the HTML but cannot implement `/v1/repos`, imports, or Git operations.

For a writable cloud development data directory:

```sh
TGG_SOURCE_ROOT=/workspace/.state/tgg-source TGG_SOURCE_HOST=127.0.0.1 npm run tgg:source
```

Check the running service internally with `curl --fail http://127.0.0.1:10030/health` and `curl --fail http://127.0.0.1:10030/v1/repos`. The latter must return JSON with `ok: true` and a `repositories` array. An empty array is a valid empty store; it does not indicate a GitHub import has happened. Use Import / migrate repository to populate it deliberately.

If a reverse proxy mounts Source at `/source/`, keep the trailing slash and forward **all** routes under that prefix to Source with the prefix removed. For example, `/source/v1/repos` must reach Source as `/v1/repos`, and `/source/git/...` must reach `/git/...`. The dashboard resolves its API requests relative to its mount directory. Do not forward only the HTML page or replace API failures with an HTML fallback.

## Desktop users

Use **Open TGG Source** in TGG AI Ultra 0.1.1 or later. The Windows desktop installer includes the backend and Git runtime and starts Source automatically in an app window. No website URL or manual server command is required. Its data is kept in source-store under the desktop app user-data directory; standalone `/data/tgg-source` stores are not moved automatically. Keep the desktop app running while working in Source.
