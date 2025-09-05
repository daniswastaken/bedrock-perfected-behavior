import { world } from "@minecraft/server";
import humanNameList from "./array/humanNames.js";
import fantasyNames from "./array/fantasyNames.js";

const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

world.afterEvents.entitySpawn.subscribe(event => {
  const mob = event.entity;

  if (!mob) return;

  switch (mob.typeId) {
    case "minecraft:villager_v2":
      mob.nameTag = pickRandom(humanNameList);
      break;

    case "minecraft:wandering_trader":
      mob.nameTag = pickRandom(humanNameList);
      break;

    case "minecraft:iron_golem":
      mob.nameTag = pickRandom(fantasyNames);
      break;
  }
});
