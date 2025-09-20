import { world, system } from "@minecraft/server";

export default function hidePlayer() {

    world.afterEvents.playerSpawn.subscribe(({ player }) => {
        player.nameTag = "";
    });

    system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            player.nameTag = "";
        }
    }, 20);
}