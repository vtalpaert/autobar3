// In-memory cache for device ingredients
// Map<deviceId, { ingredients: Ingredient[], timestamp: number }>
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';

// Cache structure for device ingredients
interface DeviceIngredientsCache {
    ingredients: (table.Ingredient & { pumps: table.Pump[] })[];
    timestamp: number;
}

// In-memory cache - Map<deviceId, cached data>
const deviceIngredientsCache = new Map<string, DeviceIngredientsCache>();

// Cleanup stale cache entries (older than 5 minutes)
function cleanupStaleCache() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [deviceId, cached] of deviceIngredientsCache.entries()) {
        if (now - cached.timestamp > staleThreshold) {
            deviceIngredientsCache.delete(deviceId);
        }
    }
}

/**
 * Get all available ingredients for a device
 * Returns ingredients that have at least one pump that is:
 * - Not empty (isEmpty = false)
 * - Has a valid GPIO pin (gpio is not null)
 * - Has an assigned ingredient
 */
export async function getDeviceAvailableIngredients(deviceId: string): Promise<(table.Ingredient & { pumps: table.Pump[] })[]> {
    cleanupStaleCache();

    // Check cache first
    const cached = deviceIngredientsCache.get(deviceId);
    if (cached) {
        return cached.ingredients;
    }

    // Query database for device pumps with their ingredients
    const pumpsWithIngredients = await db
        .select({
            pump: table.pump,
            ingredient: table.ingredient
        })
        .from(table.pump)
        .innerJoin(table.ingredient, eq(table.pump.ingredientId, table.ingredient.id))
        .where(
            and(
                eq(table.pump.deviceId, deviceId),
                eq(table.pump.isEmpty, false), // Pump is not empty
                isNotNull(table.pump.gpio), // Has valid GPIO pin
                isNotNull(table.pump.ingredientId) // Has assigned ingredient
            )
        );

    // Group pumps by ingredient
    const ingredientMap = new Map<string, table.Ingredient & { pumps: table.Pump[] }>();

    for (const { pump, ingredient } of pumpsWithIngredients) {
        if (!ingredientMap.has(ingredient.id)) {
            ingredientMap.set(ingredient.id, {
                ...ingredient,
                pumps: []
            });
        }
        ingredientMap.get(ingredient.id)!.pumps.push(pump);
    }

    const ingredients = Array.from(ingredientMap.values());

    // Cache the result
    const timestamp = Date.now();
    deviceIngredientsCache.set(deviceId, {
        ingredients,
        timestamp
    });

    return ingredients;
}

/**
 * Invalidate cache for a specific device
 * Call this when pump configurations change for the device
 */
export function invalidateDeviceIngredientsCache(deviceId: string): void {
    deviceIngredientsCache.delete(deviceId);
}

/**
 * Invalidate cache for all devices
 * Call this when global ingredient changes occur
 */
export function invalidateAllDeviceIngredientsCache(): void {
    deviceIngredientsCache.clear();
}

/**
 * Check if a device can make a specific cocktail
 * Returns detailed feasibility information including missing ingredients
 */
export async function canDeviceMakeCocktail(deviceId: string, cocktailId: string): Promise<{
    canMake: boolean;
    missingIngredients: string[];
    availableIngredients: string[];
    requiresManualAddition: string[];
}> {
    // Get all doses required for the cocktail
    const doses = await db
        .select({
            dose: table.dose,
            ingredient: table.ingredient
        })
        .from(table.dose)
        .innerJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .where(eq(table.dose.cocktailId, cocktailId))
        .orderBy(table.dose.number);

    if (doses.length === 0) {
        return {
            canMake: false,
            missingIngredients: [],
            availableIngredients: [],
            requiresManualAddition: []
        };
    }

    // Get available ingredients for the device
    const deviceIngredients = await getDeviceAvailableIngredients(deviceId);
    const availableIngredientIds = new Set(deviceIngredients.map(ing => ing.id));

    const missingIngredients: string[] = [];
    const availableIngredients: string[] = [];
    const requiresManualAddition: string[] = [];

    // Check each required ingredient
    for (const { ingredient } of doses) {
        if (ingredient.addedSeparately) {
            // Ingredients added separately don't block the order
            requiresManualAddition.push(ingredient.name);
        } else if (availableIngredientIds.has(ingredient.id)) {
            availableIngredients.push(ingredient.name);
        } else {
            missingIngredients.push(ingredient.name);
        }
    }

    // Can make if no missing ingredients (manual additions are allowed)
    const canMake = missingIngredients.length === 0;

    return {
        canMake,
        missingIngredients,
        availableIngredients,
        requiresManualAddition
    };
}

/**
 * Get all cocktails that a specific profile can access (regardless of device capabilities)
 * Respects collaboration permissions only
 */
export async function getAllAccessibleCocktailsForProfile(profileId: string): Promise<table.CocktailWithDoses[]> {
    // Step 1: Get cocktails the profile has access to (collaboration logic)
    const collaborations = await db
        .select({
            collaboratorProfileId: table.collaborationRequest.receiverId,
        })
        .from(table.collaborationRequest)
        .where(
            and(
                eq(table.collaborationRequest.senderId, profileId),
                eq(table.collaborationRequest.status, 'accepted')
            )
        )
        .union(
            db.select({
                collaboratorProfileId: table.collaborationRequest.senderId,
            })
                .from(table.collaborationRequest)
                .where(
                    and(
                        eq(table.collaborationRequest.receiverId, profileId),
                        eq(table.collaborationRequest.status, 'accepted')
                    )
                )
        );

    const collaboratorProfileIds = collaborations.map(c => c.collaboratorProfileId);
    const allowedProfileIds = [profileId, ...collaboratorProfileIds];

    // Step 2: Get accessible cocktails with their doses
    const accessibleCocktailsData = await db
        .select({
            cocktail: table.cocktail,
            dose: table.dose,
            ingredient: table.ingredient
        })
        .from(table.cocktail)
        .leftJoin(table.dose, eq(table.cocktail.id, table.dose.cocktailId))
        .leftJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .where(inArray(table.cocktail.creatorId, allowedProfileIds))
        .orderBy(table.cocktail.name, table.dose.number);

    // Step 3: Group by cocktail
    const cocktailMap = new Map<string, table.CocktailWithDoses>();
    
    for (const row of accessibleCocktailsData) {
        const cocktailId = row.cocktail.id;
        
        if (!cocktailMap.has(cocktailId)) {
            cocktailMap.set(cocktailId, {
                ...row.cocktail,
                doses: []
            });
        }
        
        if (row.dose && row.ingredient) {
            cocktailMap.get(cocktailId)!.doses.push({
                ...row.dose,
                ingredient: row.ingredient
            });
        }
    }

    return Array.from(cocktailMap.values());
}

/**
 * Get device capabilities summary
 */
export async function getDeviceCapabilities(deviceId: string): Promise<{
    availableIngredients: table.Ingredient[];
    isConfigured: boolean;
    needsCalibration: boolean;
}> {
    const device = await db
        .select()
        .from(table.device)
        .where(eq(table.device.id, deviceId))
        .get();

    if (!device) {
        return {
            availableIngredients: [],
            isConfigured: false,
            needsCalibration: false
        };
    }

    const availableIngredientsWithPumps = await getDeviceAvailableIngredients(deviceId);
    
    return {
        availableIngredients: availableIngredientsWithPumps.map(ing => ({
            id: ing.id,
            name: ing.name,
            alcoholPercentage: ing.alcoholPercentage,
            density: ing.density,
            addedSeparately: ing.addedSeparately
        })),
        isConfigured: true,
        needsCalibration: device.needCalibration
    };
}

/**
 * Enhance cocktails with availability information based on device capabilities
 */
export function enhanceCocktailsWithAvailability(
    cocktails: table.CocktailWithDoses[],
    deviceCapabilities: { availableIngredients: table.Ingredient[] } | null
): (table.CocktailWithDoses & {
    availability: 'available' | 'partial' | 'unavailable' | 'no-device';
    missingIngredients: string[];
    availableIngredients: string[];
    manualIngredients: string[];
})[] {
    if (!deviceCapabilities) {
        return cocktails.map(cocktail => ({
            ...cocktail,
            availability: 'no-device' as const,
            missingIngredients: [],
            availableIngredients: [],
            manualIngredients: cocktail.doses
                .filter(dose => dose.ingredient.addedSeparately)
                .map(dose => dose.ingredient.name)
        }));
    }

    const availableIngredientIds = new Set(deviceCapabilities.availableIngredients.map(ing => ing.id));

    return cocktails.map(cocktail => {
        const missingIngredients: string[] = [];
        const availableIngredients: string[] = [];
        const manualIngredients: string[] = [];

        for (const dose of cocktail.doses) {
            if (dose.ingredient.addedSeparately) {
                manualIngredients.push(dose.ingredient.name);
            } else if (availableIngredientIds.has(dose.ingredient.id)) {
                availableIngredients.push(dose.ingredient.name);
            } else {
                missingIngredients.push(dose.ingredient.name);
            }
        }

        let availability: 'available' | 'partial' | 'unavailable';
        if (missingIngredients.length === 0) {
            availability = 'available';
        } else if (availableIngredients.length > 0) {
            availability = 'partial';
        } else {
            availability = 'unavailable';
        }

        return {
            ...cocktail,
            availability,
            missingIngredients,
            availableIngredients,
            manualIngredients
        };
    });
}

/**
 * Get cocktails that a specific profile can access and make with a specific device
 * Respects collaboration permissions and device capabilities
 */
export async function getAvailableCocktailsForProfileAndDevice(
    profileId: string, 
    deviceId: string
): Promise<table.CocktailWithDoses[]> {
    // Step 1: Get cocktails the profile has access to (collaboration logic)
    const collaborations = await db
        .select({
            collaboratorProfileId: table.collaborationRequest.receiverId,
        })
        .from(table.collaborationRequest)
        .where(
            and(
                eq(table.collaborationRequest.senderId, profileId),
                eq(table.collaborationRequest.status, 'accepted')
            )
        )
        .union(
            db.select({
                collaboratorProfileId: table.collaborationRequest.senderId,
            })
                .from(table.collaborationRequest)
                .where(
                    and(
                        eq(table.collaborationRequest.receiverId, profileId),
                        eq(table.collaborationRequest.status, 'accepted')
                    )
                )
        );

    const collaboratorProfileIds = collaborations.map(c => c.collaboratorProfileId);
    const allowedProfileIds = [profileId, ...collaboratorProfileIds];

    // Step 2: Get accessible cocktails with their doses
    const accessibleCocktailsData = await db
        .select({
            cocktail: table.cocktail,
            dose: table.dose,
            ingredient: table.ingredient
        })
        .from(table.cocktail)
        .leftJoin(table.dose, eq(table.cocktail.id, table.dose.cocktailId))
        .leftJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .where(inArray(table.cocktail.creatorId, allowedProfileIds))
        .orderBy(table.cocktail.name, table.dose.number);

    // Step 3: Group by cocktail
    const cocktailMap = new Map<string, table.CocktailWithDoses>();
    
    for (const row of accessibleCocktailsData) {
        const cocktailId = row.cocktail.id;
        
        if (!cocktailMap.has(cocktailId)) {
            cocktailMap.set(cocktailId, {
                ...row.cocktail,
                doses: []
            });
        }
        
        if (row.dose && row.ingredient) {
            cocktailMap.get(cocktailId)!.doses.push({
                ...row.dose,
                ingredient: row.ingredient
            });
        }
    }

    const accessibleCocktails = Array.from(cocktailMap.values());

    // Step 4: Filter by device capabilities
    const deviceIngredients = await getDeviceAvailableIngredients(deviceId);
    const availableIngredientIds = new Set(deviceIngredients.map(ing => ing.id));

    const makeableCocktails: table.CocktailWithDoses[] = [];

    for (const cocktail of accessibleCocktails) {
        let canMake = true;
        
        for (const dose of cocktail.doses) {
            if (!dose.ingredient.addedSeparately) {
                if (!availableIngredientIds.has(dose.ingredient.id)) {
                    canMake = false;
                    break;
                }
            }
        }
        
        if (canMake) {
            makeableCocktails.push(cocktail);
        }
    }

    return makeableCocktails;
}

/**
 * Find an available pump for a specific order and dose
 * Returns the pump that should be used to dispense the given dose
 */
export async function findPumpForOrderAndDose(orderId: string, doseId: string): Promise<table.Pump | null> {
    // Get the order to find the device
    const order = await db
        .select()
        .from(table.order)
        .where(eq(table.order.id, orderId))
        .get();

    if (!order || !order.deviceId) {
        return null;
    }

    // Get the dose to find the required ingredient
    const dose = await db
        .select()
        .from(table.dose)
        .where(eq(table.dose.id, doseId))
        .get();

    if (!dose) {
        return null;
    }

    // Find available pumps for this device and ingredient
    const availablePumps = await db
        .select()
        .from(table.pump)
        .where(
            and(
                eq(table.pump.deviceId, order.deviceId),
                eq(table.pump.ingredientId, dose.ingredientId),
                eq(table.pump.isEmpty, false), // Pump is not empty
                isNotNull(table.pump.gpio) // Has valid GPIO pin
            )
        );

    // Return the first available pump (TODO: implement priority logic later)
    return availablePumps.length > 0 ? availablePumps[0] : null;
}
