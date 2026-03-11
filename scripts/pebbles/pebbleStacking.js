import { world, system, EquipmentSlot, EntityComponentTypes } from "@minecraft/server";

export function initializePebbleStacking() {
    world.afterEvents.playerPlaceBlock.subscribe((e) => {
        const { block, dimension, player } = e;
        const blockBelow = block.below();

        if (blockBelow && blockBelow.typeId.startsWith("bedrock_perfected:stone_pebble_")) {
            const typeId = block.typeId;
            const nonStackableTypes = [
                "minecraft:snow_layer",
                "minecraft:carpet",
                "minecraft:wooden_pressure_plate",
                "minecraft:stone_pressure_plate",
                "minecraft:light_weighted_pressure_plate",
                "minecraft:heavy_weighted_pressure_plate",
                "minecraft:redstone_wire",
                "minecraft:torch",
                "minecraft:soul_torch",
                "minecraft:redstone_torch",
                "minecraft:lantern",
                "minecraft:soul_lantern"
            ];

            const shouldIntercept = nonStackableTypes.some(t => typeId.includes(t.replace("minecraft:", "")));

            if (shouldIntercept) {
                // Remove the poorly placed block
                system.run(() => {
                    block.setType("minecraft:air");
                    // Refund if not creative
                    if (player && player.getGameMode() !== "Creative" && player.getGameMode() !== "creative") {
                        const equippable = player.getComponent(EntityComponentTypes.Equippable);
                        if (equippable) {
                            const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
                            if (mainhand && mainhand.typeId === typeId) {
                                // They just placed it, so give them 1 back.
                                mainhand.amount += 1;
                                equippable.setEquipment(EquipmentSlot.Mainhand, mainhand);
                            } else {
                                // Fallback: just drop the item on them
                                dimension.runCommand(`summon item ${block.x} ${block.y + 0.5} ${block.z} 0 0 0 {Item:{id:"${typeId}",Count:1b}}`);
                            }
                        }
                    }
                });
            }
        }
    });
}
