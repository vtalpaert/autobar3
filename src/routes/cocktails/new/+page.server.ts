import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }
    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, locals.user.id))
        .get();

    return {
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    default: async ({ request, locals }) => {
        if (!locals.user) {
            throw redirect(302, '/auth/login');
        }

        const formData = await request.formData();
        const name = formData.get('name')?.toString();
        const description = formData.get('description')?.toString();
        const instructions = formData.get('instructions')?.toString();

        if (!name) {
            return { error: 'Name is required' };
        }

        const cocktailId = crypto.randomUUID();
        
        await db.insert(table.cocktail).values({
            id: cocktailId,
            name,
            description,
            instructions,
            creatorId: locals.user.id,
            createdAt: new Date()
        });

        throw redirect(302, `/cocktails/${cocktailId}`);
    }
};
