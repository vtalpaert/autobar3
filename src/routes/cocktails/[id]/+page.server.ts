import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }
    
    const cocktails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            description: table.cocktail.description,
            instructions: table.cocktail.instructions,
            creatorName: table.user.username,
            creatorId: table.cocktail.creatorId,
            createdAt: table.cocktail.createdAt
        })
        .from(table.cocktail)
        .innerJoin(table.profile, eq(table.profile.id, table.cocktail.creatorId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId))
        .where(eq(table.cocktail.id, params.id));

    const cocktail = cocktails[0];
    
    if (!cocktail) {
        throw error(404, 'Cocktail not found');
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

    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, locals.user.id))
        .get();

    return { 
        cocktail,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};
