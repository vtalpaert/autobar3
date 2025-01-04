import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const cocktails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            description: table.cocktail.description,
            instructions: table.cocktail.instructions,
            creatorName: table.user.username,
            createdAt: table.cocktail.createdAt
        })
        .from(table.cocktail)
        .innerJoin(table.user, eq(table.user.id, table.cocktail.creatorId))
        .where(eq(table.cocktail.id, params.id));

    const cocktail = cocktails[0];
    
    if (!cocktail) {
        throw error(404, 'Cocktail not found');
    }

    return { cocktail };
};
