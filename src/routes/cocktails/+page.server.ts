import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }
    const cocktails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            description: table.cocktail.description,
            creatorName: table.user.username
        })
        .from(table.cocktail)
        .innerJoin(table.user, eq(table.user.id, table.cocktail.creatorId));

    return { 
        cocktails,
        user: locals.user
    };
};
