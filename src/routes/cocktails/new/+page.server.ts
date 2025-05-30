import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);

    // Get all ingredients for the dropdown
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
    default: async ({ request, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const name = formData.get('name')?.toString();
        const description = formData.get('description')?.toString();
        const instructions = formData.get('instructions')?.toString();

        if (!name) {
            return { error: 'Name is required' };
        }

        const cocktailId = crypto.randomUUID();

        // Create the cocktail
        await db.insert(table.cocktail).values({
            id: cocktailId,
            name,
            description,
            instructions,
            creatorId: profile.id,
            createdAt: new Date()
        });

        // Process doses if any
        const entries = Array.from(formData.entries());
        const doseEntries = entries.filter(([key]) => key.startsWith('doses['));

        // Group by index
        const dosesByIndex = {};
        for (const [key, value] of doseEntries) {
            const match = key.match(/doses\[(\d+)\]\.(.+)/);
            if (match) {
                const [, index, property] = match;
                if (!dosesByIndex[index]) {
                    dosesByIndex[index] = {};
                }
                dosesByIndex[index][property] = value;
            }
        }

        // Insert doses
        const doseValues = Object.values(dosesByIndex);

        // Sort by index to ensure proper ordering
        const sortedDoseValues = doseValues.sort((a, b) => {
            const indexA = parseInt(Object.keys(dosesByIndex).find(key => dosesByIndex[key] === a) || '0');
            const indexB = parseInt(Object.keys(dosesByIndex).find(key => dosesByIndex[key] === b) || '0');
            return indexA - indexB;
        });

        // Insert with sequential numbers
        for (let i = 0; i < sortedDoseValues.length; i++) {
            const dose = sortedDoseValues[i];
            if (dose.ingredientId && dose.quantity) {
                await db.insert(table.dose).values({
                    id: crypto.randomUUID(),
                    cocktailId,
                    ingredientId: dose.ingredientId.toString(),
                    quantity: parseFloat(dose.quantity.toString()),
                    number: i + 1 // Order starting from 1
                });
            }
        }

        throw redirect(302, `/cocktails/${cocktailId}`);
    }
};
