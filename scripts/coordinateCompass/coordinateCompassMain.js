export function updateCoordinateCompass(player) {
    const coords = { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) };
    const hud = player.onScreenDisplay;
    const ss = player.selectedSlotIndex;
    const heldItem = player.getComponent("inventory").container.getItem(ss);

    if (heldItem && heldItem.typeId === "minecraft:compass") {
        hud.setActionBar(`§lCoords: §r§c${coords.x}, §a${coords.y}, §b${coords.z}`);
    }
}
