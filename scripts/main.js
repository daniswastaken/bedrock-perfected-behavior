import registerMobNaming from "./fxname/namesMain.js";
import coordinateCompass from "./coordinateCompass/coordinateCompassMain.js";
import damageMain from "./damage/damageMain.js";
import biomentry from "./biomentry/biomentryMain.js";


import raycast from "./labs/raycast.js";

biomentry();

registerMobNaming();
coordinateCompass();
damageMain();

raycast();