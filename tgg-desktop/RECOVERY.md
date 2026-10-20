# Recovery and updates in 0.1.15

Recovery shows local owner-data status, edit recovery copies, owner backup import/export, Git bundle verification and a prepared Windows installer. Recovery actions require owner authentication except importing an owner backup when current data cannot be opened.

## Owner data

Owner metadata is written atomically. A valid previous record is retained before replacement. Startup validates/decrypts the current record and can load its valid previous copy. If both records are unreadable, owner setup is blocked instead of silently resetting the password. Unreadable current data is preserved on a later successful save.

Export owner data before updates. This encrypted JSON backup needs the backup's owner password and the same operating-system account encryption context. It is not a portable password recovery mechanism. Import validates the password and encrypted contents, replaces owner metadata, clears the UI session and locks settings. It does not back up working project files, Source repositories or external applications.

## Project edits

Studio saves and approved agent edits record encrypted before-copies before writing. Recovery lists the newest 50 entries; older files remain on disk. Restore requires the original project folder and the exact post-edit file revision. A newer edit from another application is never overwritten automatically. Existing CRLF line endings and UTF-8 BOM are preserved. Keep independent backups: this journal is local history, not a separate-device backup.

## Source bundles

Choose a local Git bundle up to 64 MiB. Verification uses a disposable bare clone and git fsck, showing its checksum and references. Restore creates a new recovered repository rather than overwriting an existing repository or project folder. Review/restore authorization expires after five minutes and rechecks the bundle hash. Verified import copies may remain in the local Source exports directory after expiry or failure.

## Quiet manual updates

Double-click the existing Update-TGG-Quiet.vbs shortcut once. It resolves the development branch to an immutable commit and runs tests and packaging with build windows hidden. Read Downloads\TGG-Update.log for READY or failure. The updated helper copies the checksum-verified installer into Downloads\TGG Updates and writes Downloads\TGG-Update-Ready.json. Previous differently hashed installers are retained.

In the new app, Check for updates opens Recovery for unsigned builds. Check prepared installer validates the fixed folder, filename and SHA-256; Open installer rechecks before Windows launch. A local checksum detects corruption, not publisher identity. Installation remains an explicit action. Close TGG before installing; Windows security/installer prompts remain visible. No startup task, recurring polling process, automatic installation or paid signing service is added.

The enhanced helper and Windows installer launch still require Windows acceptance. Linux tests cannot establish Windows installation behavior. There is no automatic binary rollback: retain a known working installer and owner/project/Source backups. Restoring a Git snapshot does not roll back an installed executable.
