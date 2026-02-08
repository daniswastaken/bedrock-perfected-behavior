import { world, ItemStack } from "@minecraft/server";

const STARTER_KIT_TAG = "received_starter_kit";

/**
 * Gives a starter kit to the player if they haven't received it yet.
 * @param {import("@minecraft/server").Player} player
 */
function giveStarterKit(player) {
    if (player.hasTag(STARTER_KIT_TAG)) {
        return;
    }

    const inventory = player.getComponent("inventory");
    if (!inventory || !inventory.container) {
        return;
    }

    const container = inventory.container;

    // Define starter items
    const items = [
        new ItemStack("minecraft:wooden_pickaxe", 1),
        new ItemStack("minecraft:wooden_axe", 1),
        new ItemStack("minecraft:bread", 16),
        new ItemStack("bedrock_perfected:addon_configuration", 1)
    ];

    // Add items to inventory
    for (const item of items) {
        container.addItem(item);
    }

    // Mark as received
    player.addTag(STARTER_KIT_TAG);
}

/**
 * Initializes the starter kit system.
 */
export function initializeStarterKits() {
    world.afterEvents.playerSpawn.subscribe((event) => {
        const { player, initialSpawn } = event;

        // Only run on initial spawn (first join or death respawn)
        // But we check the tag, so it's safe to run on any spawn, 
        // though typically we only care about the *first* time they ever join.
        // initialSpawn is true when the player joins the world.
        if (initialSpawn) {
            giveStarterKit(player);
        }
    });
}
