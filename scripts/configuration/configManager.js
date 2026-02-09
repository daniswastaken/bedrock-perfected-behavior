import { world } from "@minecraft/server";

export const FEATURES = {
    DAMAGE_DISPLAY: "damageDisplay",
    BIOME_NOTIFIER: "biomeNotifier"
};

export class ConfigManager {
    /**
     * Get the status of a feature for a specific player.
     * Defaults to true if not set.
     */
    static getEnabled(player, feature) {
        if (!player) return this.getGlobalEnabled(feature);
        const value = player.getDynamicProperty(`bp_${feature}`);
        return typeof value === "boolean" ? value : true;
    }

    static setEnabled(player, feature, status) {
        if (!player) return this.setGlobalEnabled(feature, status);
        player.setDynamicProperty(`bp_${feature}`, status);
    }

    static getGlobalEnabled(feature) {
        const value = world.getDynamicProperty(`bp_${feature}`);
        return typeof value === "boolean" ? value : true;
    }

    static setGlobalEnabled(feature, status) {
        world.setDynamicProperty(`bp_${feature}`, status);
    }
}
