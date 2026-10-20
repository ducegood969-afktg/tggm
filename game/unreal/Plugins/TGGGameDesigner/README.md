# TGG Game Designer 0.3.0 — businesses and daily income

Source update for the existing plugin at D:\TGG\Projects\TGGWorld\Plugins\TGGGameDesigner. AI Ultra desktop remains 0.1.16. This is not a cooked game or a complete project archive.

## In-game business menu

Click the Play viewport, then press B. Use Up/Down and Enter to select/buy, or click Buy. Prev/Next browse longer catalogs with the mouse. B or the Close control closes the panel. Escape also closes it if Unreal's editor shortcut does not stop Play first. The menu temporarily blocks gameplay input and balances its own look/movement locks, restoring the prior cursor/click flags when closed or destroyed. It reserves B while the TGG HUD is active; it does not edit DefaultInput.ini or Enhanced Input assets. The UI is a native Canvas HUD, not an asset-based UMG widget.

If the mission's catalog is empty and Use Starter Catalog When Empty is enabled (default), startup supplies MusicVenue ($60, +$10/day), CornerCafe ($80, +$15/day), RentalApartment ($100, +$20/day), each with zero staff. This fallback changes runtime data only, not maps or existing saved cash/ownership. A configured catalog is preserved. These are prototype ledger entries; buying does not alter a building mesh or assign a physical venue.

Prices must match the catalog, IDs must be unique/nonempty, purchase prices positive and revenue/staff nonnegative. Purchases reject duplicates, unknown IDs, wrong prices, insufficient cash and failed saves. The HUD shows owned count, income rate, day and time to payout. The menu shows transaction status. Staff counts remain metadata, not hiring or payroll simulation.

## Business days and saves

Default day duration is 300 seconds of active world time. Change Business Day Length Seconds on the one mission actor in the editor if needed (5–86,400 seconds). Paused world time does not count. A frame hitch closes at most one day rather than generating a payout burst. A new day, cash credit, last-collected marker and ownership are saved before memory is updated. Failed day saves retry after three seconds without advancing the day or duplicating cash. Invalid catalog/unknown owned IDs and integer overflow pause day advancement.

Cash, ownership, current day and last-paid day persist in TGG_Delivery_Prototype_v1. Existing completed delivery saves remain completed; no fresh reward is granted. Older save fields are migrated by taking at least the last previously collected day. The partial-day countdown restarts when Play/game reloads; there is no offline income or catch-up income. CollectBusinessRevenue retains its public signature but can only collect the current completed day once; arbitrary future-day arguments no longer grant revenue. Normal timed closure has already paid that day, so calling it again does nothing.

The mission is single-player/standalone and requires exactly one actor. Corrupt save data disables progression without resetting the save. Delivery pickup/offsets and once-only reward were restored from the owner's backups. The module does not offer a network-authoritative multiplayer economy.

## Editor tools

Tools → TGG World Designer now includes Install Starter Businesses (empty catalog only) and Check Business Catalog. Both require an editor map with one mission and refuse Play/Simulate. Catalog creation uses an Unreal transaction, supports Undo and marks the map dirty; review and save explicitly. Existing rows are never overwritten. Selecting the mission exposes catalog, day duration and HUD options in Details. Direct Stage/Cash Blueprint setter nodes may need removal: those saved values are read-only to Blueprints.

## HUD connection

The mission waits for the local controller's existing HUD and, when Enable Mission HUD is true, replaces exactly Unreal's generic AHUD with TGGWorldHUD. Custom HUDs and intentionally absent HUDs are preserved. No GameMode, pawn, map or input configuration is replaced. If a custom HUD is preserved, Output Log reports its class; set HUD Class in that active GameMode explicitly to use this panel. The uploaded engine configuration had no global GameMapsSettings section, so map overrides are not guessed.

## Apply and verify

Keep Unreal, TGGWorld and other Unreal builds closed. Use the root Update-TGGGameDesigner.ps1 helper, preferably with -VerifyAutomation. It stages pinned checksum-verified source, builds with Unreal 5.8, optionally runs two native checks in a disposable empty project, then backs up the complete original plugin and project Saved/SaveGames before copying verified built files. Existing plugin Content remains untouched. A failed build/check aborts before installation. The backup does not include every project map/asset or save directory of separately packaged games; retain a separate full project backup. An older binary can discard newer save fields if it later saves, so test rollback only on a save copy.

Target acceptance after BUILT AND COPIED:

1. Play: the existing completed delivery should still have $100 before any business purchase.
2. B → MusicVenue → Buy/Enter: balance becomes $40, venue is OWNED and income +$10/day. A duplicate attempt must not spend more. Buying an $80 cafe with $40 must be refused.
3. Close the menu: movement/look resume. Reopen: ownership remains. Stop/Play: $40 and MusicVenue remain; countdown starts a fresh partial day.
4. Wait for the five-minute day (or use a separate test-save copy and a short editor day setting): day 1 becomes $50, day 2 $60. Reopening the menu does not trigger an extra payout.
5. Use a disposable profile to test failed saves; an unsuccessful purchase/day save must leave the previous balance and ownership unchanged.
6. Test mouse Buy, Prev/Next, B close, controller/HUD destruction and different viewport sizes. Native automation does not establish UI acceptance.

## Validation evidence and remaining scope

Owner confirmed 0.2.0 compiled/installed and 0.2.1 compiled and showed the custom HUD with Stage 2/$100 on Unreal 5.8. Those observations do not validate the new 0.3.0 UI/clock. The engine-independent transaction functions pass boundary cases plus 100,000 deterministic randomized transactions under g++ C++17 with AddressSanitizer/UndefinedBehaviorSanitizer. New cases cover purchase → daily credit → replay refusal and atomic output on balance/day overflow.

Two Unreal development automation checks are included: TGG.Business.TransactionRules and TGG.Business.SaveRoundTrip. The latter uses Unreal SaveGame-to-memory serialization for ownership, cash and day markers without touching player saves. They cannot run here because Unreal is absent. The helper's -VerifyAutomation mode requires both tests to report Success before installing; logs/reports remain in its Downloads staging directory. Windows compilation, native checks, input, frame timing, disk-save behavior and gameplay for 0.3.0 remain target-machine checks.

No character mesh assets, character customization UI, local-model mesh binding, real venue placement, payroll, multiplayer or Shipping game package is included. Existing project scripts referenced by the editor panel were not uploaded. Prototype debug delivery markers may not appear in Shipping.
