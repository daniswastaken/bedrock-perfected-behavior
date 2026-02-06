function caps(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.substring(1))
        .join(' ');
}

export function updateBiomeNotifier(player, prevBiomes) {
    const dim = player.dimension;
    if (typeof dim.getBiome !== "function") return;
    if (typeof dim.isChunkLoaded === "function" && !dim.isChunkLoaded(player.location)) return;

    const biome = dim.getBiome(player.location);
    let id = biome?.id ?? "unknown";

    if (id.includes(":")) {
        id = id.split(":")[1];
    }

    id = id.replace(/_/g, " ");
    let pretty = caps(id);

    const prev = prevBiomes.get(player.name);

    if (pretty.toLowerCase() === "hell") {
        pretty = "Nether Wastes";
    }

    if (pretty !== prev) {
        player.onScreenDisplay.setTitle(`§l${pretty}`, {
            fadeInDuration: 10,
            stayDuration: 25,
            fadeOutDuration: 10
        });
        prevBiomes.set(player.name, pretty);
        player.playSound("random.levelup", {
            volume: 1.0,
            pitch: 1.0
        });
    }
}
