import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);

    // Generate a unique token
    const token = nanoid(32);

    return {
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        },
        token,
        profile
    };
};

export const actions = {
    enrollDevice: async ({ request, locals }) => {
        const data = await request.formData();
        const token = data.get('token')?.toString();

        if (!token) {
            return fail(400, { error: 'Token is required' });
        }

        const profile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, locals.user.id))
            .get();

        if (!profile) {
            return fail(400, { error: 'Profile not found' });
        }

        // Create a new device entry
        await db.insert(table.device).values({
            id: nanoid(),
            profileId: profile.id,
            apiToken: token,
            addedAt: new Date()
        });

        throw redirect(303, '/devices');
    }
};
