import { world, system } from "@minecraft/server";

const CITY_DB_PROPERTY = "city_database";
let cityCache = new Map();
const playerSessionState = new Map();

function loadCities() {
    try {
        const data = world.getDynamicProperty(CITY_DB_PROPERTY);
        if (data) {
            const parsed = JSON.parse(data);
            cityCache = new Map(Object.entries(parsed));
        } else {
            cityCache = new Map();
        }
    } catch (e) {
        console.warn("[CityNotify] Error loading data: " + e);
        cityCache = new Map();
    }
}

function saveCities() {
    try {
        const obj = Object.fromEntries(cityCache);
        world.setDynamicProperty(CITY_DB_PROPERTY, JSON.stringify(obj));
    } catch (e) {
        console.warn("[CityNotify] Error saving data: " + e);
    }
}

export function initializeCityNotifier() {
    // 1. Initial Load (Safe to call in main execution if not accessing world properties too early, 
    // but better to defer to first tick just in case)
    system.run(() => {
        loadCities();
        startLoop();

        // 2. Command System via Script Events
        // Command: /scriptevent city:set <id> <rx> <rz> "<title>" "<subtitle>"
        // Command: /scriptevent city:del <id>
        // Command: /scriptevent city:list
        system.afterEvents.scriptEventReceive.subscribe(handleScriptEvent);
    });
}

function handleScriptEvent(event) {
    const { id, message, sourceEntity } = event;
    if (!sourceEntity || sourceEntity.typeId !== "minecraft:player") return;

    const player = sourceEntity;

    if (id === "city:set") {
        // Expected message: <id> <rx> <rz> "<title>" "<subtitle>"
        // Regex to parse
        const match = message.match(/^(\w+)\s+(\d+)\s+(\d+)\s+"(.*?)"\s+"(.*?)"$/);

        if (match) {
            const [_, cityId, rxStr, rzStr, title, subtitle] = match;
            const rx = parseInt(rxStr);
            const rz = parseInt(rzStr);

            const cityData = {
                x: Math.floor(player.location.x),
                z: Math.floor(player.location.z),
                rx: rx,
                rz: rz,
                title: title,
                subtitle: subtitle
            };

            cityCache.set(cityId, cityData);
            saveCities();
            player.sendMessage(`§a[CityNotifier] City '${cityId}' set at [${cityData.x}, ${cityData.z}] with size ${rx}x${rz}.`);
            console.warn(`[CityNotifier] Saved city ${cityId}: ${JSON.stringify(cityData)}`);
        } else {
            player.sendMessage(`§cUsage: /scriptevent city:set <id> <rx> <rz> "<title>" "<subtitle>"`);
        }

    } else if (id === "city:del") {
        const cityId = message.trim();
        if (cityCache.delete(cityId)) {
            saveCities();
            player.sendMessage(`§a[CityNotifier] City '${cityId}' deleted.`);
        } else {
            player.sendMessage(`§c[CityNotifier] City '${cityId}' not found.`);
        }

    } else if (id === "city:list") {
        const keys = Array.from(cityCache.keys());
        if (keys.length === 0) {
            player.sendMessage(`§e[CityNotifier] No cities registered.`);
        } else {
            player.sendMessage(`§a[CityNotifier] Cities: ${keys.join(", ")}`);
        }
    }
}

function startLoop() {
    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            // Use Math.floor on player coordinates to ensure block-aligned symmetry
            const px = Math.floor(player.location.x);
            const pz = Math.floor(player.location.z);

            let foundCityId = null;
            let foundCityData = null;

            for (const [id, city] of cityCache) {
                const minX = city.x - city.rx;
                const maxX = city.x + city.rx;
                const minZ = city.z - city.rz;
                const maxZ = city.z + city.rz;

                if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ) {
                    foundCityId = id;
                    foundCityData = city;
                    break;
                }
            }

            const lastId = playerSessionState.get(player.name);

            // State transition logic
            if (foundCityId) {
                // If we are in a city and it's a new entry
                if (foundCityId !== lastId) {
                    console.warn(`[CityNotify] Player ${player.name} entered ${foundCityId} at [${px}, ${pz}]`);

                    // Use updateSubtitle as confirmed by API inspection
                    player.onScreenDisplay.updateSubtitle(foundCityData.subtitle);
                    player.onScreenDisplay.setTitle(foundCityData.title);

                    playerSessionState.set(player.name, foundCityId);
                }
            } else {
                // If we are in wilderness but were previously in a city
                if (lastId !== null && lastId !== undefined) {
                    console.warn(`[CityNotify] Player ${player.name} left ${lastId} at [${px}, ${pz}]`);

                    player.onScreenDisplay.updateSubtitle("§7Wilderness");
                    player.onScreenDisplay.setTitle(" ");

                    playerSessionState.set(player.name, null);
                }
            }
        }
    }, 50);
}
