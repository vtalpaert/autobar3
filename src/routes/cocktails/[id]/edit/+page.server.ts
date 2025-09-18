import { error, redirect } from '@sveltejs/kit';
import { eq, and, count } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';
import { checkCocktailEditAccess } from '$lib/server/cocktail-permissions';
import { saveCocktailImage, deleteCocktailImage } from '$lib/server/storage/images.js';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ params, locals }) => {
    // Get verified profile (reusing existing function)
    const profile = await selectVerifiedProfile(locals.user);

    // Check edit access (reusing permission logic)
    const { canEdit, cocktail } = await checkCocktailEditAccess(profile, params.id);

    if (!canEdit || !cocktail) {
        throw error(403, 'Not authorized to edit this cocktail');
    }

    // Get doses with ingredients for this cocktail
    const doses = await db
        .select({
            id: table.dose.id,
            quantity: table.dose.quantity,
            number: table.dose.number,
            ingredient: table.ingredient
        })
        .from(table.dose)
        .innerJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .where(eq(table.dose.cocktailId, params.id))
        .orderBy(table.dose.number);

    // Add doses to cocktail
    cocktail.doses = doses;

    // Get all ingredients for the dropdown
    const ingredients = await db.select().from(table.ingredient).orderBy(table.ingredient.name);

    return {
        cocktail,
        ingredients,
        user: {
            ...locals.user,
            isAdmin: profile.isAdmin
        },
        imageConfig: {
            targetSize: parseInt(env.IMAGE_WIDTH || '600'),
            webpQuality: parseInt(env.WEBP_QUALITY || '85') / 100,
            maxSizeMB: parseInt(env.MAX_IMAGE_SIZE || '10485760') / (1024 * 1024)
        }
    };
};

export const actions: Actions = {
    moveDoseUp: async ({ request, params, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const doseId = formData.get('doseId')?.toString();

        if (!doseId) {
            return { error: 'Dose ID is required' };
        }

        // Get cocktail to check permissions
        const cocktail = await db
            .select()
            .from(table.cocktail)
            .where(eq(table.cocktail.id, params.id))
            .get();

        if (!cocktail) {
            throw error(404, 'Cocktail not found');
        }

        // Check if user is creator or admin
        if (cocktail.creatorId !== profile.id && !profile.isAdmin) {
            throw error(403, 'Not authorized to edit this cocktail');
        }

        // Get the dose to be moved
        const doseToMove = await db
            .select()
            .from(table.dose)
            .where(and(eq(table.dose.id, doseId), eq(table.dose.cocktailId, params.id)))
            .get();

        if (!doseToMove || doseToMove.number <= 1) {
            return { error: 'Cannot move dose up' };
        }

        // Get the dose above it
        const doseAbove = await db
            .select()
            .from(table.dose)
            .where(
                and(
                    eq(table.dose.cocktailId, params.id),
                    eq(table.dose.number, doseToMove.number - 1)
                )
            )
            .get();

        if (!doseAbove) {
            return { error: 'Dose above not found' };
        }

        // Swap the numbers
        await db
            .update(table.dose)
            .set({ number: doseToMove.number })
            .where(eq(table.dose.id, doseAbove.id));

        await db
            .update(table.dose)
            .set({ number: doseAbove.number })
            .where(eq(table.dose.id, doseToMove.id));

        return { success: true };
    },

    moveDoseDown: async ({ request, params, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const doseId = formData.get('doseId')?.toString();

        if (!doseId) {
            return { error: 'Dose ID is required' };
        }

        // Get cocktail to check permissions
        const cocktail = await db
            .select()
            .from(table.cocktail)
            .where(eq(table.cocktail.id, params.id))
            .get();

        if (!cocktail) {
            throw error(404, 'Cocktail not found');
        }

        // Check if user is creator or admin
        if (cocktail.creatorId !== profile.id && !profile.isAdmin) {
            throw error(403, 'Not authorized to edit this cocktail');
        }

        // Get the dose to be moved
        const doseToMove = await db
            .select()
            .from(table.dose)
            .where(and(eq(table.dose.id, doseId), eq(table.dose.cocktailId, params.id)))
            .get();

        if (!doseToMove) {
            return { error: 'Dose not found' };
        }

        // Get the total number of doses
        const dosesCount = await db
            .select({ count: count() })
            .from(table.dose)
            .where(eq(table.dose.cocktailId, params.id))
            .get();

        if (!dosesCount || doseToMove.number >= dosesCount.count) {
            return { error: 'Cannot move dose down' };
        }

        // Get the dose below it
        const doseBelow = await db
            .select()
            .from(table.dose)
            .where(
                and(
                    eq(table.dose.cocktailId, params.id),
                    eq(table.dose.number, doseToMove.number + 1)
                )
            )
            .get();

        if (!doseBelow) {
            return { error: 'Dose below not found' };
        }

        // Swap the numbers
        await db
            .update(table.dose)
            .set({ number: doseToMove.number })
            .where(eq(table.dose.id, doseBelow.id));

        await db
            .update(table.dose)
            .set({ number: doseBelow.number })
            .where(eq(table.dose.id, doseToMove.id));

        return { success: true };
    },

    updateCocktail: async ({ request, params, locals }) => {
        // Get verified profile (reusing existing function)
        const profile = await selectVerifiedProfile(locals.user);

        // Check edit access (reusing permission logic)
        const { canEdit, cocktail } = await checkCocktailEditAccess(profile, params.id);

        if (!canEdit || !cocktail) {
            throw error(403, 'Not authorized to edit this cocktail');
        }

        const formData = await request.formData();
        const name = formData.get('name')?.toString();
        const description = formData.get('description')?.toString();
        const instructions = formData.get('instructions')?.toString();
        const imageChanged = formData.get('imageChanged') === 'true';
        const imageRemoved = formData.get('imageRemoved') === 'true';
        const imageFile = formData.get('image') as File | null;

        if (!name) {
            return { error: 'Name is required' };
        }

        // Handle image changes
        let imageUri = cocktail.imageUri;
        if (imageChanged) {
            // If image was removed or we're replacing it, delete the old one
            if (cocktail.imageUri && (imageRemoved || (imageFile && imageFile.size > 0))) {
                try {
                    await deleteCocktailImage(cocktail.creatorId, cocktail.id);
                } catch (err) {
                    // Log error but don't fail the update
                    console.warn('Failed to delete old cocktail image:', err);
                }
            }

            // Save new image if provided
            if (imageFile && imageFile.size > 0) {
                try {
                    imageUri = await saveCocktailImage(
                        { id: cocktail.id, creatorId: cocktail.creatorId },
                        imageFile
                    );
                } catch (error) {
                    return {
                        error: `Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    };
                }
            } else if (imageRemoved) {
                // Image was explicitly removed
                imageUri = null;
            }
        }

        // Update cocktail
        await db
            .update(table.cocktail)
            .set({
                name,
                description,
                instructions,
                imageUri
            })
            .where(eq(table.cocktail.id, params.id));

        throw redirect(302, `/cocktails/${params.id}`);
    },

    addDose: async ({ request, params, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const ingredientId = formData.get('ingredientId')?.toString();
        const quantityStr = formData.get('quantity')?.toString();

        if (!ingredientId || !quantityStr) {
            return { error: 'Ingredient and quantity are required' };
        }

        const quantity = parseFloat(quantityStr);
        if (isNaN(quantity) || quantity <= 0) {
            return { error: 'Quantity must be a positive number' };
        }

        // Get cocktail to check permissions
        const cocktail = await db
            .select()
            .from(table.cocktail)
            .where(eq(table.cocktail.id, params.id))
            .get();

        if (!cocktail) {
            throw error(404, 'Cocktail not found');
        }

        // Check if user is creator or admin
        if (cocktail.creatorId !== profile.id && !profile.isAdmin) {
            throw error(403, 'Not authorized to edit this cocktail');
        }

        // Count existing doses to determine the next number
        const dosesCount = await db
            .select({ count: count() })
            .from(table.dose)
            .where(eq(table.dose.cocktailId, params.id))
            .get();

        const nextNumber = dosesCount ? dosesCount.count + 1 : 1;

        // Add new dose
        await db.insert(table.dose).values({
            id: crypto.randomUUID(),
            cocktailId: params.id,
            ingredientId,
            quantity,
            number: nextNumber
        });

        // Redirect back to edit page
        return { success: true };
    },

    deleteCocktail: async ({ params, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        // Get cocktail to check permissions
        const cocktail = await db
            .select()
            .from(table.cocktail)
            .where(eq(table.cocktail.id, params.id))
            .get();

        if (!cocktail) {
            throw error(404, 'Cocktail not found');
        }

        // Check if user is creator or admin
        if (cocktail.creatorId !== profile.id && !profile.isAdmin) {
            throw error(403, 'Not authorized to delete this cocktail');
        }

        // Delete cocktail image if it exists
        if (cocktail.imageUri) {
            try {
                await deleteCocktailImage(cocktail.creatorId, cocktail.id);
            } catch (err) {
                // Log error but don't fail the deletion
                console.warn('Failed to delete cocktail image:', err);
            }
        }

        // Delete the cocktail (doses will be cascade deleted due to foreign key constraint)
        await db.delete(table.cocktail).where(eq(table.cocktail.id, params.id));

        // Redirect to cocktails list
        throw redirect(302, '/cocktails');
    },

    removeDose: async ({ request, params, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const doseId = formData.get('doseId')?.toString();

        if (!doseId) {
            return { error: 'Dose ID is required' };
        }

        // Get cocktail to check permissions
        const cocktail = await db
            .select()
            .from(table.cocktail)
            .where(eq(table.cocktail.id, params.id))
            .get();

        if (!cocktail) {
            throw error(404, 'Cocktail not found');
        }

        // Check if user is creator or admin
        if (cocktail.creatorId !== profile.id && !profile.isAdmin) {
            throw error(403, 'Not authorized to edit this cocktail');
        }

        // Get the dose to be deleted to know its number
        const doseToDelete = await db
            .select()
            .from(table.dose)
            .where(and(eq(table.dose.id, doseId), eq(table.dose.cocktailId, params.id)))
            .get();

        if (!doseToDelete) {
            return { error: 'Dose not found' };
        }

        // Delete the dose
        await db
            .delete(table.dose)
            .where(and(eq(table.dose.id, doseId), eq(table.dose.cocktailId, params.id)));

        // Update the numbers of all doses with higher numbers
        // to maintain continuous ordering starting from 1
        const dosesToUpdate = await db
            .select()
            .from(table.dose)
            .where(
                and(eq(table.dose.cocktailId, params.id), table.dose.number.gt(doseToDelete.number))
            )
            .orderBy(table.dose.number);

        for (const dose of dosesToUpdate) {
            await db
                .update(table.dose)
                .set({ number: dose.number - 1 })
                .where(eq(table.dose.id, dose.id));
        }

        // Redirect back to edit page
        return { success: true };
    }
};
