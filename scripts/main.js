import { world, system } from "@minecraft/server";
import { ConfigManager, FEATURES } from "./configuration/configManager.js";
import { showConfigUI } from "./configuration/configUI.js";

// Import feature logic
import { handleMobNaming } from "./fxname/namesMain.js";
import { updateCoordinateCompass } from "./coordinateCompass/coordinateCompassMain.js";
import { handleDamageDisplay } from "./damage/damageMain.js";
import { updateBiomeNotifier } from "./biomeNotifier/biomeNotifier.js";
import { initializeStarterKits } from "./starterKits/starterKits.js"; // Import starter kits
import { initializeSettlementNotifier } from "./cityNotifier/cityNotifier.js";

// Persistant state for biome notifier
const playerBiomeMap = new Map();

// --- Event Subscriptions ---

// 1. Mob Naming (Always On)
world.afterEvents.entitySpawn.subscribe(event => {
    handleMobNaming(event.entity);
});

// 2. Damage Display (Per-Player Dynamic)
world.afterEvents.entityHealthChanged.subscribe(event => {
    handleDamageDisplay(event, (player) => {
        return ConfigManager.getEnabled(player, FEATURES.DAMAGE_DISPLAY);
    });
});

// 3. Item Use (Configuration UI)
world.afterEvents.itemUse.subscribe(event => {
    const { source: player, itemStack } = event;
    if (itemStack.typeId === "bedrock_perfected:addon_configuration") {
        showConfigUI(player);
    }
});

// --- Intervals ---

// Coordinate Compass (Always On) - Runs every 5 ticks for smoothness
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        updateCoordinateCompass(player);
    }
}, 5);

// Biome Notifier (Per-Player) - Runs every 50 ticks to match original behavior
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (ConfigManager.getEnabled(player, FEATURES.BIOME_NOTIFIER)) {
            updateBiomeNotifier(player, playerBiomeMap);
        }
    }
}, 50);

// Initialize Starter Kits
initializeStarterKits();

// Initialize City Notifier
initializeSettlementNotifier();


