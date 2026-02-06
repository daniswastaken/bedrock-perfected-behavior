import humanNameList from "./array/humanNames.js";
import fantasyNames from "./array/fantasyNames.js";

const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

export function handleMobNaming(entity) {
  if (!entity) return;

  switch (entity.typeId) {
    case "minecraft:villager_v2":
      entity.nameTag = pickRandom(humanNameList);
      break;

    case "minecraft:wandering_trader":
      entity.nameTag = pickRandom(humanNameList);
      break;

    case "minecraft:iron_golem":
      entity.nameTag = pickRandom(fantasyNames);
      break;
  }
}
