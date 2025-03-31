import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);

    const devices = await db
        .select()
        .from(table.device)
        .where(eq(table.device.profileId, profile.id));

    return {
        devices,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};
