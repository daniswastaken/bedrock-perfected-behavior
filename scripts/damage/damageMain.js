import { MolangVariableMap, world } from "@minecraft/server";

export default function damageMain() {

    // Configuration constants
    const DAMAGE_DISPLAY_CONFIG = {
        maxViewDistance: 48,
        particleDuration: 1.0,
        digitSpacing: 0.25,
        verticalOffset: 1.3,
        maxDamageValue: 999,
        particleName: "bedrock_perfected:damage" // Your custom particle
    };

    // Player settings management
    class PlayerSettingsManager {
        static getSettings(player) {
            const data = player.getDynamicProperty("damageDisplay");
            if (!data) {
                return {
                    enabled: true,
                    displayDuration: 0.55,
                    showCriticals: true
                };
            }
            return JSON.parse(data);
        }

        static saveSettings(player, settings) {
            player.setDynamicProperty("damageDisplay", JSON.stringify(settings));
        }

        static toggleDisplay(player) {
            const current = this.getSettings(player);
            current.enabled = !current.enabled;
            this.saveSettings(player, current);
            return current.enabled;
        }
    }

    // Damage calculation utilities
    class DamageCalculator {
        static calculateDamage(oldHealth, newHealth) {
            const rawDamage = oldHealth - newHealth;
            return Math.max(0, Math.floor(rawDamage));
        }

        static splitIntoDigits(damage) {
            if (damage <= 0) return [0];

            const clampedDamage = Math.min(damage, DAMAGE_DISPLAY_CONFIG.maxDamageValue);
            return clampedDamage.toString()
                .split('')
                .map(digit => parseInt(digit, 10));
        }

        static isCriticalHit(damage, entity) {
            // Simple critical detection - you can enhance this
            return damage > (entity.getComponent('minecraft:health')?.defaultValue || 20) * 0.3;
        }
    }

    // Particle positioning and spawning
    class ParticleRenderer {
        static calculateDisplayPosition(entity, viewer) {
            const entityPos = entity.location;
            const viewDirection = viewer.getViewDirection();

            // Position slightly towards the viewer and above the entity
            return {
                x: entityPos.x - (viewDirection.x * 1),
                y: entityPos.y + DAMAGE_DISPLAY_CONFIG.verticalOffset,
                z: entityPos.z - (viewDirection.z * 1)
            };
        }

        static calculateRightVector(viewDirection) {
            // Get perpendicular vector for horizontal spacing
            const rightVec = {
                x: -viewDirection.z,
                y: 0,
                z: viewDirection.x
            };

            // Normalize the vector
            const length = Math.sqrt(rightVec.x * rightVec.x + rightVec.z * rightVec.z);
            if (length > 0) {
                rightVec.x /= length;
                rightVec.z /= length;
            }

            return rightVec;
        }

        static createParticleVariables(digit, totalDamage, viewerRotation, duration, isCritical = false) {
            const molangVars = new MolangVariableMap();

            // Standard variables for your particle
            molangVars.setFloat("variable.digit", digit);
            molangVars.setFloat("variable.damage", totalDamage);
            molangVars.setFloat("variable.duration", duration);
            molangVars.setFloat("variable.rotation_x", -viewerRotation.x);
            molangVars.setFloat("variable.rotation_y", viewerRotation.y);
            molangVars.setFloat("variable.is_critical", isCritical ? 1.0 : 0.0);

            // Add some randomness for visual variety
            molangVars.setFloat("variable.random", Math.random());

            return molangVars;
        }

        static spawnDamageParticles(entity, damage, viewers) {
            if (damage <= 0) return;

            const digits = DamageCalculator.splitIntoDigits(damage);
            const isCritical = DamageCalculator.isCriticalHit(damage, entity);

            viewers.forEach(viewer => {
                const settings = PlayerSettingsManager.getSettings(viewer);
                if (!settings.enabled) return;

                if (!settings.showCriticals && isCritical) return;

                const centerPos = this.calculateDisplayPosition(entity, viewer);
                const rightVector = this.calculateRightVector(viewer.getViewDirection());
                const viewerRotation = viewer.getRotation();

                // Spawn each digit as a separate particle
                digits.forEach((digit, index) => {
                    const horizontalOffset = (index - (digits.length - 1) / 2) * DAMAGE_DISPLAY_CONFIG.digitSpacing;

                    const particlePos = {
                        x: centerPos.x + rightVector.x * horizontalOffset,
                        y: centerPos.y + (Math.random() * 0.1 - 0.05), // Small random Y variation
                        z: centerPos.z + rightVector.z * horizontalOffset
                    };

                    const molangVars = this.createParticleVariables(
                        digit,
                        damage,
                        viewerRotation,
                        settings.displayDuration,
                        isCritical
                    );

                    try {
                        viewer.spawnParticle(DAMAGE_DISPLAY_CONFIG.particleName, particlePos, molangVars);
                    } catch (error) {
                        console.warn(`Failed to spawn damage particle: ${error.message}`);
                    }
                });
            });
        }
    }

    // Main damage display system
    class DamageDisplaySystem {
        static findNearbyPlayers(entity) {
            try {
                return entity.dimension.getEntities({
                    type: "minecraft:player",
                    location: entity.location,
                    maxDistance: DAMAGE_DISPLAY_CONFIG.maxViewDistance
                });
            } catch (error) {
                return [];
            }
        }

        static handleEntityDamage(eventData) {
            const { entity, oldValue, newValue } = eventData;

            // Validate entity
            if (!entity || !entity.isValid) return;

            // Calculate damage taken
            const damage = DamageCalculator.calculateDamage(oldValue, newValue);
            if (damage <= 0) return;

            // Find players who should see this damage
            const nearbyPlayers = this.findNearbyPlayers(entity);
            if (nearbyPlayers.length === 0) return;

            // Display damage particles
            ParticleRenderer.spawnDamageParticles(entity, damage, nearbyPlayers);
        }
    }

    // Event subscription
    world.afterEvents.entityHealthChanged.subscribe((eventData) => {
        DamageDisplaySystem.handleEntityDamage(eventData);
    });

    // Chat commands for players to control settings DOESN'T WORK PRIOR 1.8.0

    /* world.beforeEvents.chatSend.subscribe((eventData) => {
        const { sender: player, message } = eventData;
        
        if (message.startsWith("!damage")) {
            eventData.cancel = true;
            
            const args = message.split(" ");
            const command = args[1]?.toLowerCase();
            
            switch (command) {
                case "toggle":
                    const enabled = PlayerSettingsManager.toggleDisplay(player);
                    player.sendMessage(`§aDamage display ${enabled ? "enabled" : "disabled"}`);
                    break;
                    
                case "duration":
                    const duration = parseFloat(args[2]);
                    if (duration && duration > 0 && duration <= 10) {
                        const settings = PlayerSettingsManager.getSettings(player);
                        settings.displayDuration = duration;
                        PlayerSettingsManager.saveSettings(player, settings);
                        player.sendMessage(`§aDamage display duration set to ${duration} seconds`);
                    } else {
                        player.sendMessage("§cUsage: !damage duration <1-10>");
                    }
                    break;
                    
                case "help":
                    player.sendMessage("§6Damage Display Commands:");
                    player.sendMessage("§7!damage toggle - Enable/disable damage display");
                    player.sendMessage("§7!damage duration <seconds> - Set display duration");
                    player.sendMessage("§7!damage help - Show this help");
                    break;
                    
                default:
                    player.sendMessage("§cUnknown command. Use '!damage help' for commands.");
            }
        }
    });
    
    // Initialize system
    system.run(() => {
        console.log("Custom Damage Display System loaded!");
    });
    
    */
}