import { system, world } from "@minecraft/server";

system.runInterval(() => {
    world.getPlayers().forEach(p => {
        const coords = { x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) };

        const hud = p.onScreenDisplay;
        const ss = p.selectedSlotIndex;
        const heldItem = p.getComponent("inventory").container.getItem(ss);

        if (heldItem && heldItem.typeId === "minecraft:compass") {
            hud.setActionBar(`Coords: ${coords.x}, ${coords.y}, ${coords.z}`);

        }
    }
    )
});