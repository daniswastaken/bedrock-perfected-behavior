import { MolangVariableMap } from "@minecraft/server";

// Configuration constants
const DAMAGE_DISPLAY_CONFIG = {
    maxViewDistance: 48,
    particleDuration: 1.0,
    digitSpacing: 0.14,
    verticalOffset: 1.3,
    maxDamageValue: 999,
    particleName: "bedrock_perfected:damage"
};

// Damage calculation utilities
class DamageCalculator {
    static calculateDamage(oldHealth, newHealth) {
        const rawDamage = oldHealth - newHealth;
        return Math.max(0, Math.floor(rawDamage));
    }

    static splitIntoDigits(damage) {
        if (damage <= 0) return [0];
        const clampedDamage = Math.min(damage, DAMAGE_DISPLAY_CONFIG.maxDamageValue);
        return clampedDamage.toString().split('').map(digit => parseInt(digit, 10));
    }

    static isCriticalHit(damage, entity) {
        return damage > (entity.getComponent('minecraft:health')?.defaultValue || 20) * 0.3;
    }
}

// Particle rendering logic
class ParticleRenderer {
    static calculateDisplayPosition(entity, viewer) {
        const entityPos = entity.location;
        const viewDirection = viewer.getViewDirection();
        return {
            x: entityPos.x - (viewDirection.x * 0.5),
            y: entityPos.y + DAMAGE_DISPLAY_CONFIG.verticalOffset,
            z: entityPos.z - (viewDirection.z * 0.5)
        };
    }

    static calculateRightVector(viewDirection) {
        const rightVec = { x: -viewDirection.z, y: 0, z: viewDirection.x };
        const length = Math.sqrt(rightVec.x * rightVec.x + rightVec.z * rightVec.z);
        if (length > 0) {
            rightVec.x /= length;
            rightVec.z /= length;
        }
        return rightVec;
    }

    static createParticleVariables(digit, totalDamage, viewerRotation, duration, isCritical = false) {
        const molangVars = new MolangVariableMap();
        molangVars.setFloat("variable.digit", digit);
        molangVars.setFloat("variable.damage", totalDamage);
        molangVars.setFloat("variable.duration", duration);
        molangVars.setFloat("variable.rotation_x", -viewerRotation.x);
        molangVars.setFloat("variable.rotation_y", viewerRotation.y);
        molangVars.setFloat("variable.is_critical", isCritical ? 1.0 : 0.0);
        molangVars.setFloat("variable.random", Math.random());
        return molangVars;
    }

    static spawnDamageParticles(entity, damage, viewers) {
        if (damage <= 0) return;
        const digits = DamageCalculator.splitIntoDigits(damage);
        const isCritical = DamageCalculator.isCriticalHit(damage, entity);

        viewers.forEach(viewer => {
            const centerPos = this.calculateDisplayPosition(entity, viewer);
            const rightVector = this.calculateRightVector(viewer.getViewDirection());
            const viewerRotation = viewer.getRotation();

            // Default duration if not specified
            const duration = 0.55;

            digits.forEach((digit, index) => {
                const horizontalOffset = (index - (digits.length - 1) / 2) * DAMAGE_DISPLAY_CONFIG.digitSpacing;
                const particlePos = {
                    x: centerPos.x + rightVector.x * horizontalOffset,
                    y: centerPos.y + 0.1,
                    z: centerPos.z + rightVector.z * horizontalOffset
                };

                const molangVars = this.createParticleVariables(digit, damage, viewerRotation, duration, isCritical);
                try {
                    viewer.spawnParticle(DAMAGE_DISPLAY_CONFIG.particleName, particlePos, molangVars);
                } catch (error) { }
            });
        });
    }
}

export function handleDamageDisplay(eventData, checkEnabledCallback) {
    const { entity, oldValue, newValue } = eventData;
    if (!entity || !entity.isValid) return;

    const damage = DamageCalculator.calculateDamage(oldValue, newValue);
    if (damage <= 0) return;

    const nearbyPlayers = entity.dimension.getEntities({
        type: "minecraft:player",
        location: entity.location,
        maxDistance: DAMAGE_DISPLAY_CONFIG.maxViewDistance
    });

    const activeViewers = nearbyPlayers.filter(p => checkEnabledCallback(p));
    if (activeViewers.length === 0) return;

    ParticleRenderer.spawnDamageParticles(entity, damage, activeViewers);
}
