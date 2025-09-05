import { world } from "@minecraft/server";
import nameList from "./array/nameList.js";

const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

world.afterEvents.entitySpawn.subscribe(event => {
  const mob = event.entity;

  if (!mob) return;

  switch (mob.typeId) {
    case "minecraft:villager_v2":
      mob.nameTag = pickRandom(nameList);
      break;

    case "minecraft:wandering_trader":
      mob.nameTag = pickRandom(nameList);
      break;
  }
});
