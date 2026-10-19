# TGG Game Designer 0.2.1 — source candidate

Based on the owner's uploaded runtime/editor source and plugin descriptor from 2026-10-19. This is a source update for the existing plugin at D:\TGG\Projects\TGGWorld\Plugins\TGGGameDesigner, not a complete game or compiled plugin. Desktop AI Ultra remains 0.1.16.

## HUD connection in 0.2.1

The owner verified the 0.2.0 plugin compiled and installed on Unreal 5.8; Play showed delivery complete and $100. That screenshot showed only debug text. The uploaded DefaultEngine.ini contains Android file-server settings and no EngineSettings.GameMapsSettings section; the GameMode may be supplied by the map. DefaultInput.ini uses Enhanced Input. These uploaded settings are not overwritten or committed, and no pawn or input classes are changed.

The mission now waits for the local controller's existing HUD. When Enable Mission HUD is true (default), it replaces exactly the generic AHUD class with TGGWorldHUD. It leaves custom HUD classes and intentionally absent HUDs alone and logs a custom-HUD diagnostic once. The hook runs during Tick so controller creation or replacement after BeginPlay is handled. Once the TGG panel exists, the mission stops adding its duplicate debug text. A custom HUD can be integrated explicitly by selecting TGGWorldHUD as HUD Class in that active GameMode; its asset path is not guessed.

After the 0.2.1 build/install, Play should show the mint TGG WORLD panel with cash and objective. Stop/Play should retain $100 for an already completed save. If only debug text remains, inspect Output Log for the preserved custom HUD class and check Enable Mission HUD on the one mission actor. No shipping or gameplay acceptance is claimed for this new hook before target-machine verification. UHT and runtime checks require Unreal and cannot run here.

## Changes

The uploaded current delivery actor hard-coded Stage=2 and Cash=100 and omitted pickup, delivery and save/load. The 10:39 backup's mission flow and the 12:05 backup's root/offset properties are restored. Startup requires standalone play and exactly one mission actor; invalid saves stop progression without resetting existing data. An existing completed save remains completed. The delivery reward is added to the current balance, rather than replacing earned cash. Save failures leave in-memory progress and ownership unchanged. The HUD refuses to report completion while mission initialization has failed.

FTGGPropertyDefinition is a Blueprint/DataTable-compatible row with PropertyID, PurchasePrice, DailyRevenue and StaffHiredCount. Configure the mission's Property Catalog in Details; no sample business is silently added to your map. IDs must be unique, prices positive and revenue/staff nonnegative. StaffHiredCount is metadata, not a staff simulation.

AttemptPropertyPurchase keeps the existing Blueprint name and parameters. PropertyName must identify a catalog row, and PurchaseCost must equal its configured price. Negative/zero prices, duplicate purchases, unknown IDs and insufficient cash are rejected. Cash and ownership persist together in the existing TGG_Delivery_Prototype_v1 slot before memory is updated.

CollectBusinessRevenue(InGameDay) credits one day's revenue for owned properties. Call it from a trusted single-player in-game day controller with a monotonically increasing nonnegative day. Repeating or moving back to an already collected day is rejected. Skipping days gives one payout, not catch-up income. Missing catalog definitions and integer overflow reject the entire transaction. The collection marker persists with the balance. There is no automatic timer or offline income in this candidate.

## Apply only to a backup first

1. Close Unreal Editor. Copy the entire project and its Saved/SaveGames folder to a separate backup location. The plugin uses the existing save slot and adds ownership fields; an older binary may discard those fields if it later saves. Do not test rollback on the only save copy.
2. Overlay this source candidate into the existing Plugins/TGGGameDesigner folder in a project copy. Keep existing plugin Content and other project assets. Do not copy the uploaded old DLL/PDB files as substitutes for rebuilding.
3. Rebuild the plugin against the project's Unreal Engine 5.8 installation using your existing successful plugin build workflow. This source candidate has NOT passed UHT, Unreal C++ compilation or runtime acceptance here. A Blueprint-only .uproject may need the existing BuildPlugin workflow to compile its C++ plugin.
4. Open the project copy, compile dependent Blueprints and resolve any direct Stage/Cash setter nodes: those values are restored as read-only Blueprint properties, matching the backed-up mission. Keep exactly one delivery actor and check its restored offsets/radius.
5. With a separate fresh save, walk to pickup then delivery: stages must be 0 → 1 → 2 and the reward exactly $100 once. Reopen and confirm completion persists. With a copy of the old completed save, confirm it stays complete without another reward.
6. Add catalog row MusicVenue, price 60, revenue 10, staff 0. With $100, purchase once: $40 and one owned ID. A duplicate, mismatched price, negative price or missing ID must leave the balance unchanged. Reload and confirm $40 and ownership survive.
7. Collect day 0: $50. Repeat day 0: no change. Reload and repeat: no change. Collect day 1: $60. Test an unwritable save destination in a disposable profile: no transaction should be committed in memory when saving fails.

Current map, GameMode/HUD assignments, startup settings and assets cannot be verified without the project's Config and Content. Debug cylinders are prototype markers and may be absent in Shipping; shipping-visible marker assets are still needed. No business purchase UMG panel, character meshes/customization UI, local-model mesh binding, multiplayer economy or cooked Win64 game is included. The existing editor panel also references project Python scripts that were not uploaded.

## Checks performed here

The actual engine-independent transaction functions were compiled with g++ C++17, strict warnings, AddressSanitizer and UndefinedBehaviorSanitizer. Boundary cases plus 100,000 deterministic randomized transactions pass, covering invalid costs, insufficient cash, duplicate-ownership input, overflow and delivery credits. This verifies arithmetic, not Unreal reflection, actor/save integration, UI or Windows packaging. Unreal Engine is not installed in this environment.

Run from repository root:

```sh
g++ -std=c++17 -Wall -Wextra -Werror -pedantic -fsanitize=address,undefined -fno-omit-frame-pointer -I game/unreal/Plugins/TGGGameDesigner/Source/TGGGameDesigner/Public game/unreal/Tests/economy-rules.cpp -o /tmp/tgg-economy-rules
/tmp/tgg-economy-rules
```
