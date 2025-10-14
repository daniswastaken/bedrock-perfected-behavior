import { system, world } from "@minecraft/server";

function caps(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.substring(1))
        .join(' ');
}

// Store previous biomes for each player by name
const prevBiomes = new Map();

system.runInterval(() => {
    world.getPlayers().forEach(p => {
        const dim = p.dimension;
        if (typeof dim.getBiome !== "function") return;
        if (typeof dim.isChunkLoaded === "function" && !dim.isChunkLoaded(p.location)) return;
        
        const biome = dim.getBiome(p.location);
        let id = biome?.id ?? "unknown";
        
        // Remove namespace (everything before and including ":")
        if (id.includes(":")) {
            id = id.split(":")[1];
        }
        
        // Replace underscores with spaces
        id = id.replace(/_/g, " ");
        
        // Capitalize each word
        let pretty = caps(id);
        
        // Get previously stored biome for this player
        const prev = prevBiomes.get(p.name);
        
        // Replace nether hell to wastes
        if (pretty.toLowerCase() === "hell") {
            pretty = "Nether Wastes";
        }
       
        // Show only if different biome
        if (pretty !== prev) {
            p.onScreenDisplay.setTitle(`§l${pretty}`, {
                fadeInDuration: 10,  // half a second (20 ticks = 1s)
                stayDuration: 25,    // 2 seconds
                fadeOutDuration: 10  // half a second fade out
            });
            prevBiomes.set(p.name, pretty);
            p.playSound("random.levelup", {
                volume: 1.0,
                pitch: 1.0
            });
        }
    });
}, 50);