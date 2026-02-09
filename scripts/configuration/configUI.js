import { ModalFormData } from "@minecraft/server-ui";
import { ConfigManager, FEATURES } from "./configManager.js";

export function showConfigUI(player) {
    const form = new ModalFormData();
    form.title("Addon Configuration");

    // Only Damage Display and Biome Notifier are toggleable
    const damageDisplay = ConfigManager.getEnabled(player, FEATURES.DAMAGE_DISPLAY);
    const biomeNotifier = ConfigManager.getEnabled(player, FEATURES.BIOME_NOTIFIER);

    form.toggle("Damage Display", { defaultValue: damageDisplay });
    form.toggle("Biome Notifier", { defaultValue: biomeNotifier });

    form.show(player).then(response => {
        if (response.canceled) return;

        const [newDamageDisplay, newBiomeNotifier] = response.formValues;

        ConfigManager.setEnabled(player, FEATURES.DAMAGE_DISPLAY, newDamageDisplay);
        ConfigManager.setEnabled(player, FEATURES.BIOME_NOTIFIER, newBiomeNotifier);

        player.sendMessage("§l[Bedrock Perfected] §r§aConfiguration updated! Changes take effect immediately.");
    });
}


