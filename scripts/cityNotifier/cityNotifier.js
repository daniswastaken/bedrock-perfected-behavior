import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const SETTLEMENT_DB_PROPERTY = "settlement_database";
let settlementCache = new Map();
const playerSessionState = new Map();

function loadSettlements() {
    try {
        const data = world.getDynamicProperty(SETTLEMENT_DB_PROPERTY);
        if (data) {
            const parsed = JSON.parse(data);
            settlementCache = new Map(Object.entries(parsed));
        } else {
            settlementCache = new Map();
        }
    } catch (e) {
        console.warn("[Bedrock Perfected] Error loading data: " + e);
        settlementCache = new Map();
    }
}

function saveSettlements() {
    try {
        const obj = Object.fromEntries(settlementCache);
        world.setDynamicProperty(SETTLEMENT_DB_PROPERTY, JSON.stringify(obj));
    } catch (e) {
        console.warn("[Bedrock Perfected] Error saving data: " + e);
    }
}

export function initializeSettlementNotifier() {
    // 1. Initial Load
    system.run(() => {
        loadSettlements();
        startLoop();

        // 2. UI System via Scroll of the Hearth
        world.afterEvents.itemUse.subscribe(handleItemUse);
    });
}

function handleItemUse(event) {
    const { source: player, itemStack } = event;
    // Check for specific item type
    if (itemStack.typeId === "bedrock_perfected:scroll_of_the_hearth") {
        openMainMenu(player);
    }
}

function openMainMenu(player) {
    new ActionFormData()
        .title("Settlement")
        .body("Manage your settlement.")
        .button("Add Settlement")
        .button("Remove Settlement")
        .button("List Settlements")
        .show(player)
        .then(response => {
            if (response.canceled) return;
            switch (response.selection) {
                case 0: openAddSettlementForm(player); break;
                case 1: openRemoveSettlementForm(player); break;
                case 2: listSettlements(player); break;
            }
        });
}

function openAddSettlementForm(player) {
    const x = Math.floor(player.location.x);
    const z = Math.floor(player.location.z);

    new ModalFormData()
        .title("Add Settlement")
        .textField(`Settlement ID`, "e.g. my_town")
        .textField("Radius X", "10", { defaultValue: "10" })
        .textField("Radius Z", "10", { defaultValue: "10" })
        .textField("Welcome Message", "Welcome To")
        .textField("Settlement Name", "My City")
        .show(player)
        .then(response => {
            if (response.canceled) return;
            const [settlementId, rxStr, rzStr, subtitle, title] = response.formValues;

            if (!settlementId || typeof settlementId !== 'string' || settlementId.trim() === "") {
                player.sendMessage("§cError: Invalid Settlement ID.");
                return;
            }

            if (settlementCache.has(settlementId)) {
                player.sendMessage(`§cError: Settlement '${settlementId}' already exists.`);
                return;
            }

            const rx = parseInt(rxStr);
            const rz = parseInt(rzStr);

            if (isNaN(rx) || isNaN(rz)) {
                player.sendMessage("§cError: Radius must be a valid number.");
                return;
            }

            const settlementData = {
                x: x,
                z: z,
                rx: rx,
                rz: rz,
                title: title || "",
                subtitle: subtitle || ""
            };

            settlementCache.set(settlementId, settlementData);
            saveSettlements();
            player.sendMessage(`§a[Bedrock Perfected] Settlement '${settlementId}' created at [${x}, ${z}] with size ${rx}x${rz}.`);
        });
}

function openRemoveSettlementForm(player) {
    const settlements = Array.from(settlementCache.keys());
    if (settlements.length === 0) {
        player.sendMessage("§e[Bedrock Perfected] No settlements to remove.");
        return;
    }

    new ModalFormData()
        .title("Remove Settlement")
        .dropdown("Select Settlement to Remove", settlements)
        .show(player)
        .then(response => {
            if (response.canceled) return;
            const index = response.formValues[0];
            const settlementId = settlements[index];

            if (settlementCache.delete(settlementId)) {
                saveSettlements();
                player.sendMessage(`§a[Bedrock Perfected] Settlement '${settlementId}' removed.`);
            } else {
                player.sendMessage(`§c[Bedrock Perfected] Error: Could not remove settlement.`);
            }
        });
}

function listSettlements(player) {
    const settlements = [];
    for (const [id, data] of settlementCache) {
        settlements.push(`§b${id}§r: [${data.x}, ${data.z}] (r: ${data.rx}x${data.rz}) - "${data.title}"`);
    }

    if (settlements.length === 0) {
        player.sendMessage(`§e[Bedrock Perfected] No settlements registered.`);
    } else {
        player.sendMessage(`§a[Bedrock Perfected] Registered Settlements:\n${settlements.join("\n")}`);
    }
}

function startLoop() {
    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            // Use Math.floor on player coordinates to ensure block-aligned symmetry
            const px = Math.floor(player.location.x);
            const pz = Math.floor(player.location.z);

            let foundSettlementId = null;
            let foundSettlementData = null;

            for (const [id, settlement] of settlementCache) {
                const minX = settlement.x - settlement.rx;
                const maxX = settlement.x + settlement.rx;
                const minZ = settlement.z - settlement.rz;
                const maxZ = settlement.z + settlement.rz;

                if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ) {
                    foundSettlementId = id;
                    foundSettlementData = settlement;
                    break;
                }
            }

            const lastId = playerSessionState.get(player.name);

            // State transition logic
            if (foundSettlementId) {
                // If we are in a settlement and it's a new entry
                if (foundSettlementId !== lastId) {
                    // console.warn(`[Bedrock Perfected] Player ${player.name} entered ${foundSettlementId} at [${px}, ${pz}]`);

                    // Use updateSubtitle as confirmed by API inspection
                    player.onScreenDisplay.updateSubtitle(foundSettlementData.subtitle);
                    player.onScreenDisplay.setTitle(foundSettlementData.title);

                    playerSessionState.set(player.name, foundSettlementId);
                }
            } else {
                // If we are in wilderness but were previously in a settlement
                if (lastId !== null && lastId !== undefined) {
                    // console.warn(`[Bedrock Perfected] Player ${player.name} left ${lastId} at [${px}, ${pz}]`);

                    player.onScreenDisplay.updateSubtitle("§7Wilderness");
                    player.onScreenDisplay.setTitle(" ");

                    playerSessionState.set(player.name, null);
                }
            }
        }
    }, 50);
}
