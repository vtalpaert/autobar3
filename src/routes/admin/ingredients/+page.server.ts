import { nanoid } from 'nanoid';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ingredient } from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);
    // Check if user is admin
    if (!profile?.isAdmin) {
        throw redirect(302, '/');
    }

    const ingredients = await db
        .select()
        .from(table.ingredient)
        .orderBy(table.ingredient.name);

    return {
        ingredients,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    delete: async ({ request, locals }) => {
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
            return fail(400, { message: 'Invalid ingredient ID' });
        }

        try {
            console.log('Deleting ingredient with ID:', id);
            await db.delete(table.ingredient).where(eq(table.ingredient.id, id));
            console.log('Ingredient deleted successfully');
            return { success: true };
        } catch (error) {
            console.error('Error deleting ingredient:', error);
            return fail(500, { message: 'Failed to delete ingredient' });
        }
    },

    addIngredient: async ({ request, locals }) => {
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
        const name = formData.get('name')?.toString();
        const alcoholPercentageStr = formData.get('alcoholPercentage')?.toString();
        const densityStr = formData.get('density')?.toString();
        const addedSeparately = formData.get('addedSeparately') === 'on';

        if (!name || !alcoholPercentageStr) {
            return fail(400, { message: 'Name and alcohol percentage are required' });
        }

        const alcoholPercentage = parseFloat(alcoholPercentageStr);
        if (isNaN(alcoholPercentage) || alcoholPercentage < 0 || alcoholPercentage > 100) {
            return fail(400, { message: 'Alcohol percentage must be between 0 and 100' });
        }

        let density = 1000; // Default density (water)
        if (densityStr) {
            density = parseFloat(densityStr);
            if (isNaN(density) || density < 800 || density > 2000) {
                return fail(400, { message: 'Density must be between 800 and 2000 g/L' });
            }
        }

        // Check if ingredient already exists
        const [existing] = await db
            .select()
            .from(table.ingredient)
            .where(eq(table.ingredient.name, name));

        if (existing) {
            return fail(400, { message: `Ingredient "${name}" already exists` });
        }

        // Add the new ingredient
        await db.insert(table.ingredient).values({
            id: nanoid(),
            name,
            alcoholPercentage,
            density,
            addedSeparately
        });

        return {
            success: true,
            message: `Successfully added ingredient: ${name}`
        };
    },

    upload: async ({ request, locals }) => {
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
        const file = formData.get('ingredientsFile') as File;

        if (!file) {
            return fail(400, { message: 'No file uploaded' });
        }

        try {
            console.log('Processing file upload:', file.name, file.type, file.size);
            const content = await file.text();
            console.log('File content:', content.substring(0, 100) + '...');

            let ingredients;
            try {
                ingredients = JSON.parse(content);
                console.log('Parsed ingredients:', ingredients.length, 'items');
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                return fail(400, { message: 'Invalid JSON format: ' + parseError.message });
            }

            if (!Array.isArray(ingredients)) {
                console.error('Not an array:', typeof ingredients);
                return fail(400, { message: 'Invalid JSON format. Expected an array.' });
            }

            let added = 0;
            let skipped = 0;

            for (const item of ingredients) {
                console.log('Processing ingredient:', item.name);

                if (!item.name || typeof item.alcoholPercentage !== 'number') {
                    console.error('Invalid ingredient data:', item);
                    return fail(400, {
                        message: `Invalid ingredient data: ${JSON.stringify(item)}. Each item must have name and alcoholPercentage.`
                    });
                }

                // Check if ingredient already exists
                const [existing] = await db
                    .select()
                    .from(table.ingredient)
                    .where(eq(table.ingredient.name, item.name));

                if (!existing) {
                    await db.insert(ingredient).values({
                        id: nanoid(),
                        name: item.name,
                        alcoholPercentage: item.alcoholPercentage,
                        density: item.density || 1000,
                        addedSeparately: item.addedSeparately || false
                    });
                    added++;
                    console.log('Added ingredient:', item.name);
                } else {
                    skipped++;
                    console.log('Skipped existing ingredient:', item.name);
                }
            }

            return {
                success: true,
                message: `Successfully processed ${ingredients.length} ingredients. Added: ${added}, Skipped: ${skipped}`
            };
        } catch (error) {
            console.error('Error processing ingredient upload:', error);
            return fail(500, { message: 'Error processing file' });
        }
    }
};
