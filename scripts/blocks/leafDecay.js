import { world, system } from "@minecraft/server";

// Define valid logs for decay checking
const validLogBlocks = new Set([
    "bedrock_perfected:lunafir_log",
    "minecraft:birch_log", "minecraft:spruce_log", "minecraft:acacia_log",
    "minecraft:dark_oak_log", "minecraft:cherry_log", "minecraft:mangrove_log",
    "minecraft:jungle_log", "minecraft:oak_log", "minecraft:pale_oak_log",
    "minecraft:birch_wood", "minecraft:spruce_wood", "minecraft:acacia_wood",
    "minecraft:dark_oak_wood", "minecraft:cherry_wood", "minecraft:mangrove_wood",
    "minecraft:jungle_wood", "minecraft:oak_wood", "minecraft:pale_oak_wood"
]);

// Define leaf loot tables (path relative to loot_tables/ without extension)
const lootTables = {
    "bedrock_perfected:lunafir_leaves": "blocks/lunafir_leaves"
};

// Define leaf decay radius per type
const leafRadii = {
    "bedrock_perfected:lunafir_leaves": 4
};

// LRU Cache for log searches
const decayCache = new Map();
const MAX_CACHE_SIZE = 5000;

// Directional offsets for checking logs (precomputed per radius for optimization)
const logOffsetsByRadius = {};
for (let radius = 1; radius <= 6; radius++) {
    const offsets = [];
    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            for (let z = -radius; z <= radius; z++) {
                offsets.push({ x, y, z }); // Use full cube, not sphere
            }
        }
    }
    logOffsetsByRadius[radius] = offsets;
}

// Queue for batch leaf decay processing
const leafDecayQueue = [];

// Check if a log exists nearby
function hasNearbyLog(block, radius) {
    const loc = block.location;
    const cacheKey = `${loc.x},${loc.y},${loc.z},${radius}`;

    if (decayCache.has(cacheKey)) {
        // Move accessed key to end for LRU
        const value = decayCache.get(cacheKey);
        decayCache.delete(cacheKey);
        decayCache.set(cacheKey, value);
        return value;
    }

    let foundLog = false;
    const offsets = logOffsetsByRadius[radius] || [];
    for (let i = 0; i < offsets.length; i++) {
        const offset = offsets[i];
        const checkLoc = {
            x: loc.x + offset.x,
            y: loc.y + offset.y,
            z: loc.z + offset.z
        };
        const nearbyBlock = block.dimension.getBlock(checkLoc);
        if (!nearbyBlock) continue;
        if (validLogBlocks.has(nearbyBlock.typeId)) {
            foundLog = true;
            break;
        }
    }

    // Store in cache (LRU: move oldest out)
    decayCache.set(cacheKey, foundLog);
    if (decayCache.size > MAX_CACHE_SIZE) {
        // Remove oldest entry
        const oldestKey = decayCache.keys().next().value;
        decayCache.delete(oldestKey);
    }

    return foundLog;
}

// Process the leaf decay queue in batches
function processLeafDecayQueue() {
    if (leafDecayQueue.length === 0) return;

    const batchSize = Math.min(leafDecayQueue.length, 75); // Matcha reference batch size
    for (let i = 0; i < batchSize; i++) {
        const item = leafDecayQueue.shift();
        if (!item) continue;
        const { block, blockType } = item;

        try {
            const isPlayerPlaced = block.permutation.getState("bedrock_perfected:playerPlaced");
            if (isPlayerPlaced) continue;  // Skip if the block was placed by the player
        } catch (err) { continue; }

        const radius = leafRadii[blockType];
        if (!radius) continue;

        if (!hasNearbyLog(block, radius)) {
            const lootTable = lootTables[blockType] || "blocks/default_loot";
            block.setType("minecraft:air");
            block.dimension.runCommand(`loot spawn ${block.location.x} ${block.location.y} ${block.location.z} loot "${lootTable}"`);
        }
    }
}

// Function to restart the script
function restartScript() {
    // Clear the leaf decay queue
    leafDecayQueue.length = 0;
    // Clear the cache
    decayCache.clear();
}

// Run decay queue processing every few ticks (matches reference)
system.runInterval(processLeafDecayQueue, 5);

// Schedule script restart every 3 minutes (matches reference)
system.runInterval(restartScript, 3600);

// Register the custom component for leaf decay
system.beforeEvents.startup.subscribe(initEvent => {
    initEvent.blockComponentRegistry.registerCustomComponent('bedrock_perfected:leaf_decay', {
        beforeOnPlayerPlace: e => {
            // Properly set the state with 'permutationToPlace'
            e.permutationToPlace = e.permutationToPlace.withState('bedrock_perfected:playerPlaced', true);  // Tag the block as player-placed
        },
        onRandomTick: e => {
            if (Math.random() < 0.2) return; // Matches reference 20% skip chance

            const blockType = e.block.typeId;
            if (!leafRadii[blockType]) return;

            leafDecayQueue.push({ block: e.block, blockType });
        }
    });
});
