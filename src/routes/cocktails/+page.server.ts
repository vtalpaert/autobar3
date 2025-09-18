import { redirect } from '@sveltejs/kit';
import { eq, and, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';
import {
    getAllAccessibleCocktailsForProfile,
    getDeviceCapabilities,
    enhanceCocktailsWithAvailability
} from '$lib/server/device-capabilities.js';

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);

    // Get user's default device
    const defaultDevice = await db
        .select()
        .from(table.device)
        .where(and(eq(table.device.profileId, profile.id), eq(table.device.isDefault, true)))
        .get();

    // Get ALL accessible cocktails (regardless of device availability)
    const allAccessibleCocktails = await getAllAccessibleCocktailsForProfile(profile.id);

    // Get device capabilities if device exists
    const deviceCapabilities = defaultDevice ? await getDeviceCapabilities(defaultDevice.id) : null;

    // Enhance cocktails with availability information
    const cocktailsWithAvailability = enhanceCocktailsWithAvailability(
        allAccessibleCocktails,
        deviceCapabilities
    );

    // Get creator names for all cocktails
    const cocktailIds = cocktailsWithAvailability.map((c) => c.id);
    let cocktailsWithCreators: any[] = [];

    if (cocktailIds.length > 0) {
        const creatorsData = await db
            .select({
                id: table.cocktail.id,
                name: table.cocktail.name,
                description: table.cocktail.description,
                imageUri: table.cocktail.imageUri,
                creatorId: table.cocktail.creatorId,
                creator: {
                    username: table.user.username,
                    artistName: table.profile.artistName
                }
            })
            .from(table.cocktail)
            .innerJoin(table.profile, eq(table.profile.id, table.cocktail.creatorId))
            .innerJoin(table.user, eq(table.user.id, table.profile.userId))
            .where(inArray(table.cocktail.id, cocktailIds));

        // Merge creator data with availability data
        cocktailsWithCreators = cocktailsWithAvailability.map((cocktail) => {
            const creatorData = creatorsData.find((c) => c.id === cocktail.id);
            return {
                ...creatorData,
                ...cocktail,
                // Preserve the enhanced availability data
                availability: cocktail.availability,
                missingIngredients: cocktail.missingIngredients,
                availableIngredients: cocktail.availableIngredients,
                manualIngredients: cocktail.manualIngredients
            };
        });
    }

    return {
        cocktails: cocktailsWithCreators,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        },
        profile,
        defaultDevice,
        deviceCapabilities
    };
};
