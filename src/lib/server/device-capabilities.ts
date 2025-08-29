// In-memory cache for device ingredients
// Map<deviceId, { ingredients: Ingredient[], timestamp: number }>
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

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
 * Get all cocktails that can be made by a specific device
 * Filters out cocktails with missing required ingredients
 */
export async function getAvailableCocktailsForDevice(deviceId: string): Promise<table.CocktailWithDoses[]> {
    // Get all cocktails with their doses
    const cocktailsWithDoses = await db
        .select({
            cocktail: table.cocktail,
            dose: table.dose,
            ingredient: table.ingredient
        })
        .from(table.cocktail)
        .leftJoin(table.dose, eq(table.cocktail.id, table.dose.cocktailId))
        .leftJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .orderBy(table.cocktail.name, table.dose.number);

    // Group by cocktail
    const cocktailMap = new Map<string, table.CocktailWithDoses>();
    
    for (const row of cocktailsWithDoses) {
        const cocktailId = row.cocktail.id;
        
        if (!cocktailMap.has(cocktailId)) {
            cocktailMap.set(cocktailId, {
                ...row.cocktail,
                doses: []
            });
        }
        
        // Add dose if it exists (leftJoin might return null)
        if (row.dose && row.ingredient) {
            cocktailMap.get(cocktailId)!.doses.push({
                ...row.dose,
                ingredient: row.ingredient
            });
        }
    }

    const allCocktails = Array.from(cocktailMap.values());
    
    // Get device available ingredients once
    const deviceIngredients = await getDeviceAvailableIngredients(deviceId);
    const availableIngredientIds = new Set(deviceIngredients.map(ing => ing.id));

    // Filter cocktails that can be made
    const availableCocktails: table.CocktailWithDoses[] = [];

    for (const cocktail of allCocktails) {
        let canMake = true;
        
        // Check if all required ingredients are available
        for (const dose of cocktail.doses) {
            // Skip ingredients that are added separately
            if (!dose.ingredient.addedSeparately) {
                if (!availableIngredientIds.has(dose.ingredient.id)) {
                    canMake = false;
                    break;
                }
            }
        }
        
        if (canMake) {
            availableCocktails.push(cocktail);
        }
    }

    return availableCocktails;
}
