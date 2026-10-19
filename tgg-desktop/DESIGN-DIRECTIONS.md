# TGG desktop visual redesign proposal

Scope: coordinated concepts for TGG AI Ultra, TGG Studio and the embedded TGG Remote tools. The generated boards are design concepts, not screenshots of shipped functionality.

## 01 — Obsidian (recommended)

Quiet developer workspace: near-black canvas, slate panels, mint actions, fine borders and dense but readable controls. Best fit for code, Source history and long AI sessions. Use Segoe UI Variable/system UI type; monospace only for code, paths and hashes. Strong headings, 14–16px body text and 36–40px standard controls replace oversized form elements.

## 02 — Graphite

Layered blue-gray panels, icy blue/lavender accents and subtle shadows. Rounded surfaces and measured depth create a calm Windows-native productivity feel. Avoid transparency that reduces contrast; motion should be short and respect reduced-motion settings.

## 03 — Pulse

Ink/plum surfaces with coral and electric blue accents. More expressive headings, visual project cards and a creative-workspace identity. Keep color focused on selection, primary actions and connection status, not every border.

## Shared structure

- Compact persistent navigation: AI, Studio, Source, Remote and Settings.
- Clear active destination; consistent icons accompanied by text.
- A focused content area rather than a single scrolling wall of headings and forms.
- Current model/provider and local connection status visible near the chat composer.
- Owner lock state visible in Settings; unrelated controls remain separate.
- Project explorer + editor + AI companion for a Studio workspace; collapsible side panels.
- Remote tools grouped by purpose, with clear disabled/unavailable states for live screen/command access.
- Dark/light-ready semantic tokens, visible keyboard focus, readable error messages, useful empty/loading/success states and a coherent spacing scale.
- Normal Windows window controls remain accessible. No borderless-window changes are required for the first redesign.

## Implementation boundaries

AI Ultra UI source is present in this repository and can be redesigned directly while retaining IPC/security behavior and automated smoke coverage. TGG Studio is a separate installed app; the supplied executable and screenshots do not provide its editable UI source. Updating that existing Studio UI requires its source or an explicitly built replacement workspace. A matching concept does not establish project synchronization or shared app storage.

The first pass should prioritize navigation, typography, chat composer, owner/provider forms and Remote tool presentation. Existing Source/Studio launchers, snapshots and encrypted settings must continue working. Validate real GUI behavior and responsive layouts, then build a new numbered installer. Do not call the redesign installed on the owner's laptop until the new build is installed there.
