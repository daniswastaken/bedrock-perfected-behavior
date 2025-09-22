import { world, system } from '@minecraft/server';

// Configuration
const RAYCAST_DISTANCE = 32; // Maximum distance to detect villagers
const CHECK_INTERVAL = 1; // Check every 5 ticks (4 times per second)

export default function raycast() {

    class VillagerDetector {
        constructor() {
            this.lastDetectedVillager = null;
            this.tickCount = 0;
        }

        // Initialize the raycast system
        init() {
            system.runInterval(() => {
                this.checkAllPlayers();
            }, CHECK_INTERVAL);
        }

        // Check raycast for all players
        checkAllPlayers() {
            for (const player of world.getAllPlayers()) {
                this.performRaycast(player);
            }
        }

        // Perform raycast from player's view
        performRaycast(player) {
            try {
                // Try the primary raycast method
                const viewDirection = player.getViewDirection();
                const headLocation = player.getHeadLocation();

                // Debug: Check if we can get basic player info
                if (!viewDirection || !headLocation) {
                    console.warn('Cannot get player view direction or head location');
                    return;
                }

                // Try getEntitiesFromViewDirection if available
                if (player.getEntitiesFromViewDirection) {
                    const raycastResult = player.getEntitiesFromViewDirection({
                        maxDistance: RAYCAST_DISTANCE,
                        includePassableBlocks: false,
                        includeLiquidBlocks: false
                    });

                    if (raycastResult && raycastResult.length > 0) {
                        const hitResult = raycastResult[0];
                        const hitEntity = hitResult.entity;

                        if (this.isVillager(hitEntity)) {
                            this.handleVillagerDetection(player, hitEntity, hitResult.distance);
                            return;
                        }
                    }
                }

                // If primary method didn't work, try fallback
                this.fallbackRaycast(player);

            } catch (error) {
                // Always try fallback if primary fails
                console.warn('Primary raycast failed, trying fallback:', error.message);
                this.fallbackRaycast(player);
            }
        }

        // Fallback raycast method using dimension raycast
        fallbackRaycast(player) {
            try {
                const dimension = player.dimension;
                const headLocation = player.getHeadLocation();
                const viewDirection = player.getViewDirection();

                // Try dimension.getEntitiesFromRay if available
                if (dimension.getEntitiesFromRay) {
                    const raycastHit = dimension.getEntitiesFromRay(headLocation, viewDirection, {
                        maxDistance: RAYCAST_DISTANCE
                    });

                    if (raycastHit && raycastHit.length > 0) {
                        const hitEntity = raycastHit[0].entity;
                        if (this.isVillager(hitEntity)) {
                            const distance = this.calculateDistance(headLocation, hitEntity.location);
                            this.handleVillagerDetection(player, hitEntity, distance);
                            return;
                        }
                    }
                }

                // If raycast methods don't work, use manual detection
                this.manualVillagerDetection(player);

            } catch (error) {
                console.warn('Fallback raycast failed, using manual detection:', error.message);
                this.manualVillagerDetection(player);
            }
        }

        // Manual villager detection by checking nearby entities
        manualVillagerDetection(player) {
            try {
                const dimension = player.dimension;
                const playerLocation = player.location;

                // Get all villagers in a radius
                const nearbyVillagers = dimension.getEntities({
                    location: playerLocation,
                    maxDistance: RAYCAST_DISTANCE,
                    type: 'minecraft:villager'
                });

                // Debug: Log if we found any villagers
                if (nearbyVillagers.length > 0) {
                    console.log(`Found ${nearbyVillagers.length} villagers nearby`);
                }

                let foundVillager = false;
                for (const villager of nearbyVillagers) {
                    if (this.isPlayerLookingAtEntity(player, villager)) {
                        const distance = this.calculateDistance(playerLocation, villager.location);
                        this.handleVillagerDetection(player, villager, distance);
                        foundVillager = true;
                        break;
                    }
                }

                if (!foundVillager) {
                    this.resetDetection(player);
                }

            } catch (error) {
                console.warn('Manual villager detection failed:', error.message);
                
                // Final fallback - just check if player is near any villagers
                try {
                    const dimension = player.dimension;
                    const playerLocation = player.location;
                    
                    const allEntities = dimension.getEntities({
                        location: playerLocation,
                        maxDistance: RAYCAST_DISTANCE
                    });
                    
                    for (const entity of allEntities) {
                        if (this.isVillager(entity)) {
                            const distance = this.calculateDistance(playerLocation, entity.location);
                            if (distance <= 3) { // Very close to villager
                                this.handleVillagerDetection(player, entity, distance);
                                return;
                            }
                        }
                    }
                    
                    this.resetDetection(player);
                } catch (finalError) {
                    console.error('All detection methods failed:', finalError.message);
                }
            }
        }

        // Check if player is looking at a specific entity
        isPlayerLookingAtEntity(player, entity) {
            try {
                const playerHead = player.getHeadLocation();
                const entityLocation = entity.location;
                const viewDirection = player.getViewDirection();

                // Calculate direction to entity
                const directionToEntity = {
                    x: entityLocation.x - playerHead.x,
                    y: entityLocation.y - playerHead.y,
                    z: entityLocation.z - playerHead.z
                };

                // Normalize the direction
                const distance = Math.sqrt(
                    directionToEntity.x ** 2 +
                    directionToEntity.y ** 2 +
                    directionToEntity.z ** 2
                );

                if (distance === 0) return false;

                directionToEntity.x /= distance;
                directionToEntity.y /= distance;
                directionToEntity.z /= distance;

                // Calculate dot product (cosine of angle)
                const dotProduct =
                    viewDirection.x * directionToEntity.x +
                    viewDirection.y * directionToEntity.y +
                    viewDirection.z * directionToEntity.z;

                // More lenient angle check (about 45 degrees instead of 30)
                const isLooking = dotProduct > 0.707; // cos(45°) ≈ 0.707
                
                // Debug logging
                if (isLooking) {
                    console.log(`Player looking at villager! Dot product: ${dotProduct.toFixed(3)}`);
                }
                
                return isLooking;
                
            } catch (error) {
                console.warn('Error checking if player looking at entity:', error.message);
                return false;
            }
        }

        // Check if entity is a villager
        isVillager(entity) {
            return entity && entity.typeId === 'minecraft:villager';
        }

        // Handle villager detection
        handleVillagerDetection(player, villager, distance) {
            const villagerId = villager.id;

            // Check if this is a new villager or we haven't sent a message recently
            if (this.lastDetectedVillager !== villagerId) {
                this.lastDetectedVillager = villagerId;
                this.sendVillagerMessage(player, villager, distance);
            }
        }

        // Reset detection state
        resetDetection(player) {
            if (this.lastDetectedVillager !== null) {
                this.lastDetectedVillager = null;
                // Optional: Send message when looking away
                // player.sendMessage('§7No longer looking at villager');
            }
        }

        // Send chat message about detected villager
        sendVillagerMessage(player, villager, distance) {
            try {
                // Get villager profession if available
                let profession = 'Villager';

                try {
                    // Try to get profession from variant or other properties
                    const variant = villager.getComponent('minecraft:variant');
                    if (variant) {
                        profession = this.getProfessionName(variant.value);
                    }
                } catch (e) {
                    // If profession detection fails, use generic name
                }

                // Format distance
                const distanceFormatted = Math.round(distance * 10) / 10;

                // Send message to player
                const message = `§eLooking at: §b${profession} §7(Distance: ${distanceFormatted} blocks)`;
                player.sendMessage(message);

                // Optional: Send to all players or chat
                // world.sendMessage(`§7${player.name} is looking at a ${profession}`);

            } catch (error) {
                player.sendMessage('§eLooking at: §bVillager');
            }
        }

        // Get profession name from variant (basic mapping)
        getProfessionName(variant) {
            const professions = {
                0: 'Unemployed Villager',
                1: 'Farmer',
                2: 'Fisherman',
                3: 'Shepherd',
                4: 'Fletcher',
                5: 'Librarian',
                6: 'Cartographer',
                7: 'Cleric',
                8: 'Armorer',
                9: 'Weaponsmith',
                10: 'Toolsmith',
                11: 'Butcher',
                12: 'Leatherworker',
                13: 'Mason'
            };
            return professions[variant] || 'Villager';
        }

        // Calculate distance between two points
        calculateDistance(pos1, pos2) {
            const dx = pos1.x - pos2.x;
            const dy = pos1.y - pos2.y;
            const dz = pos1.z - pos2.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
    }

    // Initialize the villager detector
    const villagerDetector = new VillagerDetector();

    // Start the system immediately (more compatible approach)
    try {
        // Try using worldInitialize if available
        if (world.afterEvents && world.afterEvents.worldInitialize) {
            world.afterEvents.worldInitialize.subscribe(() => {
                villagerDetector.init();
                console.log('Villager raycast detector initialized!');
            });
        } else {
            // Fallback: Initialize immediately
            villagerDetector.init();
            console.log('Villager raycast detector initialized (immediate)!');
        }
    } catch (error) {
        // Final fallback: Initialize with a delay
        system.runTimeout(() => {
            villagerDetector.init();
            console.log('Villager raycast detector initialized (delayed)!');
        }, 20); // Wait 1 second (20 ticks)
    }

    // Optional: Add command to toggle the system
    try {
        if (world.beforeEvents && world.beforeEvents.chatSend) {
            world.beforeEvents.chatSend.subscribe((eventData) => {
                if (eventData.message === '/togglevillager') {
                    eventData.cancel = true;
                    eventData.sender.sendMessage('§aVillager detector is running!');
                }
            });
        }
    } catch (error) {
        // Chat commands not available in this version
        console.warn('Chat commands not available');
    }

    // Return the detector instance for external access if needed
    return villagerDetector;
}