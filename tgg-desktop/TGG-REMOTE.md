# TGG Remote project support — 0.1.4

TGG Remote's first implementation is embedded in TGG AI Ultra Owner settings. It lets the owner select project text, review filenames, save local Source history and export a support file to share deliberately. It is not a remote-desktop service and does not give this chat live access to a laptop, screen, keyboard, files or terminal. No inbound listener, unattended agent, remote shell, startup service or network upload is installed by this feature.

## Available tools

- **Choose project and review files:** owner-selected folder, bounded text scan, included/skipped file list.
- **Save reviewed text to Source:** managed local Source starts as needed and records revisions without changing the project.
- **Export reviewed support bundle:** readable JSON containing selected text and minimal app/system details.
- **Check local connections:** fixed-loopback Ollama model listing, authenticated Source repository check and configured Studio executable validation. No keys or environment dump are collected.
- **Save screenshot of this app:** captures the TGG AI Ultra window to an owner-selected PNG file; other applications/screens are not captured. Review the image for personal information before sharing.
- **Open TGG Studio / Open TGG Source:** existing separate app launcher and managed Source window.

Live screen viewing, mouse/keyboard control, arbitrary shell commands, unattended access and automatic uploads are not implemented. There is no live connection between this chat and the computer.

## Project snapshots

Unlock Owner settings. Under **TGG Remote · project support**, choose **Choose project and review files** and select the exact Studio project folder. The modal folder picker temporarily preserves the existing owner unlock; expiry is still enforced. Review included and skipped filenames. Then choose **Save reviewed text to Source**. Source starts inside the desktop app if necessary. Open TGG Source and Refresh to find the generated `studio-...` repository. Repeating review/save for the same canonical folder adds a commit to the same linked repository. Links are kept in OS-encrypted app settings.

This is a text snapshot, not Git synchronization or a complete backup. It copies the reviewed UTF-8 content into the separate Source store; it never writes to the Studio project folder. Changes after review are not included until a new review. Only additions and updates are copied; file deletions are not mirrored, so removed files can remain in Source. Existing repositories are not chosen or overwritten by name; a new repository is created for the first snapshot. Moving a project folder creates a new link. Each review expires after five minutes.

The scan is capped at 5,000 entries, 200 included files, 256 KiB per text file and 2 MiB total content. Generated/dependency/VCS folders, symlinks, binary or non-UTF-8 data, common secret filenames and unsupported file types are excluded. The list of skipped items is displayed. Exclusions do not detect all secrets: inspect actual file contents before sharing anything. This feature is unsuitable as the only backup of a project containing images, video, databases or other binary assets. A failed first snapshot may leave an initialized repository without a completed snapshot; review the resulting Source list before retrying.

## Share project support context

After choosing/reviewing a project, choose **Export reviewed support bundle** and select where to save the JSON file. The bundle includes the reviewed file contents, relative filenames, skipped filenames, app version, OS type and CPU architecture. The absolute project directory, provider configuration, API key, owner password and unrelated app data are not collected. Secrets you put inside included source files can still be present. Review the exported JSON, then attach it to this chat if you want help inspecting or changing that code. Export alone sends nothing.

The export is readable text, not encrypted. Keep it private unless you intend to share its contents. Receiving a bundle lets an assistant analyze that copy, not control the originating computer or continuously receive changes. Applying any proposed changes on the laptop remains a separate owner action.

## Screen and command access

Live screen/keyboard control and remote command execution require a supported remote-access connection and an authenticated client that this chat can actually use. No such connection is available here. Installing the desktop app or uploading TGG_Studio.exe cannot supply it. Full remote access must include explicit session approval, visible connection state, scoped access, an immediate disconnect and revocation mechanism, and logs of executed actions; it should not grant an AI unattended arbitrary shell access.

## Verification

Automated tests exercise filtering, traversal boundaries, bundle contents, locked-owner rejection and actual HTTP/Git Source commits over repeated snapshots and restart. GUI smoke uses a real temporary project and real Git/HTTP backend, with native dialogs stubbed to owner-test locations. It checks export contents, unchanged original files, diagnostic results and a saved PNG. The dialog stubs do not establish native Windows picker behavior; Windows end-to-end operation remains to be verified on the laptop. Live screen control and remote commands are unavailable, not tested or promised as implemented.
