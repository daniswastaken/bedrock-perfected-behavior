import { system, world } from "@minecraft/server";

export default function biomentry() {

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

            if (id.startsWith("minecraft:")) {
                id = id.slice(10);
            }

            id = id.replace(/_/g, " ");
            const pretty = caps(id);

            // Get previously stored biome for this player
            const prev = prevBiomes.get(p.name);

            // Show only if different biome
            if (pretty !== prev) {
                p.onScreenDisplay.setTitle(` §l${pretty}`, {
                    fadeInDuration: 10,  // half a second (20 ticks = 1s)
                    stayDuration: 25,    // 2,5 seconds
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

}