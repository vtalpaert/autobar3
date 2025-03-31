import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);
    // Check if user is admin
    if (!profile?.isAdmin) {
        throw redirect(302, '/');
    }

    // Get all cocktails with creator info
    const cocktails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            creatorName: table.user.username,
            createdAt: table.cocktail.createdAt,
            description: table.cocktail.description
        })
        .from(table.cocktail)
        .innerJoin(table.profile, eq(table.profile.id, table.cocktail.creatorId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId))
        .orderBy(table.cocktail.createdAt);

    return {
        cocktails,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    deleteCocktail: async ({ request, locals }) => {
        if (!locals.user) {
            throw redirect(302, '/auth/login');
        }

        const adminProfile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, locals.user.id))
            .get();

        if (!adminProfile?.isAdmin) {
            throw redirect(302, '/');
        }

        const formData = await request.formData();
        const cocktailId = formData.get('cocktailId')?.toString();

        if (!cocktailId) {
            return { error: 'Cocktail ID is required' };
        }

        await db
            .delete(table.cocktail)
            .where(eq(table.cocktail.id, cocktailId));

        return { success: true };
    }
};
