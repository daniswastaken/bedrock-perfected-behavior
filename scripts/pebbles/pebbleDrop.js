import { world, GameMode } from "@minecraft/server";

/**
 * Registers a custom block component "bedrock_perfected:pebble_drop"
 * that spawns loot when a player breaks a pebble block in Survival mode.
 * 
 * Usage in block JSON:
 *   "bedrock_perfected:pebble_drop": { "count": 1 }
 * 
 * This is needed because minecraft:loot does NOT reliably fire for
 * custom blocks with seconds_to_destroy: 0.
 */
export function registerPebbleDrop(startupEvent) {
    startupEvent.blockComponentRegistry.registerCustomComponent(
        "bedrock_perfected:pebble_drop",
        {
            onPlayerBreak({ block, player }, { params }) {
                // Don't drop in creative
                if (player.getGameMode() === GameMode.creative) return;

                const count = params?.count ?? 1;
                const { x, y, z } = block.location;
                const dim = player.dimension;

                // Spawn the stone_pebble item directly
                dim.spawnItem(
                    { typeId: "bedrock_perfected:stone_pebble", amount: count },
                    { x: x + 0.5, y: y + 0.5, z: z + 0.5 }
                );
            }
        }
    );
}
