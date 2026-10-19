# TGG Browser

Version 0.1.11 adds a separate browser window from the sidebar. It has an address bar, back/forward, reload/stop, and a ChatGPT shortcut. Only HTTPS website addresses are accepted. New-window links open in the same browsing view.

Website content runs in a sandboxed WebContentsView without Node, a preload bridge, or TGG project IPC. The trusted local toolbar is a separate renderer. The browser has its own persistent session; website cookies remain in that local Chromium profile. Permissions and downloads are disabled in this first version. Some sign-in flows or websites may require your regular browser. ChatGPT sign-in was not tested.

Opening ChatGPT here does not give this conversation access to your screen, files, mouse, keyboard or commands. It does not bypass subscriptions or usage limits. Live assistant control requires a supported tool connection; this browser does not implement one.
