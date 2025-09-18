import { nanoid } from 'nanoid';
import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

// Constant for density conversion (from ml to g)
const FACTOR_VOLUME_TO_MASS = 1; // Adjust as needed

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);
    // Check if user is admin
    if (!profile?.isAdmin) {
        throw redirect(302, '/');
    }

    // Get all doses with related data
    const doses = await db
        .select({
            id: table.dose.id,
            cocktailId: table.dose.cocktailId,
            ingredientId: table.dose.ingredientId,
            quantity: table.dose.quantity,
            number: table.dose.number,
            // Include ingredient data for weight calculation
            ingredientDensity: table.ingredient.density,
            ingredientAddedSeparately: table.ingredient.addedSeparately
        })
        .from(table.dose)
        .innerJoin(table.ingredient, eq(table.ingredient.id, table.dose.ingredientId))
        .orderBy(table.dose.cocktailId, table.dose.number);

    // Get all cocktails for the dropdown
    const cocktails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name
        })
        .from(table.cocktail)
        .orderBy(table.cocktail.name);

    // Get all ingredients for the dropdown
    const ingredients = await db
        .select({
            id: table.ingredient.id,
            name: table.ingredient.name,
            density: table.ingredient.density,
            addedSeparately: table.ingredient.addedSeparately
        })
        .from(table.ingredient)
        .orderBy(table.ingredient.name);

    // Calculate weight for each dose
    const dosesWithWeight = doses.map((dose) => ({
        id: dose.id,
        cocktailId: dose.cocktailId,
        ingredientId: dose.ingredientId,
        quantity: dose.quantity,
        number: dose.number,
        weight: (dose.ingredientDensity / 1000) * dose.quantity * FACTOR_VOLUME_TO_MASS,
        addedSeparately: dose.ingredientAddedSeparately
    }));

    return {
        doses: dosesWithWeight,
        cocktails,
        ingredients,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    addDose: async ({ request, locals }) => {
        // Check if user is logged in
        if (!locals.user) {
            return fail(401, { message: 'Not authenticated' });
        }

        // Get user profile and check if admin
        const profile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, locals.user.id))
            .get();

        if (!profile?.isAdmin) {
            return fail(403, { message: 'Unauthorized - Admin access required' });
        }

        const formData = await request.formData();
        const cocktailId = formData.get('cocktailId')?.toString();
        const ingredientId = formData.get('ingredientId')?.toString();
        const quantityStr = formData.get('quantity')?.toString();
        const numberStr = formData.get('number')?.toString();

        if (!cocktailId || !ingredientId || !quantityStr || !numberStr) {
            return fail(400, { message: 'All fields are required' });
        }

        const quantity = parseFloat(quantityStr);
        const number = parseInt(numberStr);

        if (isNaN(quantity) || quantity < 0) {
            return fail(400, { message: 'Quantity must be a positive number' });
        }

        if (isNaN(number) || number < 1) {
            return fail(400, { message: 'Order number must be a positive integer' });
        }

        // Check if cocktail exists
        const cocktail = await db
            .select()
            .from(table.cocktail)
            .where(eq(table.cocktail.id, cocktailId))
            .get();

        if (!cocktail) {
            return fail(400, { message: 'Selected cocktail does not exist' });
        }

        // Check if ingredient exists
        const ingredient = await db
            .select()
            .from(table.ingredient)
            .where(eq(table.ingredient.id, ingredientId))
            .get();

        if (!ingredient) {
            return fail(400, { message: 'Selected ingredient does not exist' });
        }

        // Check if this dose already exists
        const existingDose = await db
            .select()
            .from(table.dose)
            .where(eq(table.dose.cocktailId, cocktailId))
            .where(eq(table.dose.ingredientId, ingredientId))
            .get();

        if (existingDose) {
            return fail(400, { message: 'This ingredient is already added to the cocktail' });
        }

        // Add the new dose
        await db.insert(table.dose).values({
            id: nanoid(),
            cocktailId,
            ingredientId,
            quantity,
            number
        });

        return {
            success: true,
            message: `Successfully added dose to cocktail`
        };
    },

    deleteDose: async ({ request, locals }) => {
        // Check if user is logged in
        if (!locals.user) {
            return fail(401, { message: 'Not authenticated' });
        }

        // Get user profile and check if admin
        const profile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, locals.user.id))
            .get();

        if (!profile?.isAdmin) {
            return fail(403, { message: 'Unauthorized - Admin access required' });
        }

        const formData = await request.formData();
        const id = formData.get('id')?.toString();

        if (!id) {
            return fail(400, { message: 'Dose ID is required' });
        }

        try {
            console.log('Deleting dose with ID:', id);
            await db.delete(table.dose).where(eq(table.dose.id, id));
            console.log('Dose deleted successfully');
            return { success: true };
        } catch (error) {
            console.error('Error deleting dose:', error);
            return fail(500, { message: 'Failed to delete dose' });
        }
    }
};
