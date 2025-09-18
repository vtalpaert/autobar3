import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user;
    if (user) {
        const profile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, user.id))
            .get();

        return {
            user: {
                ...user,
                isAdmin: profile?.isAdmin || false
            }
        };
    }
    return { user: null };
};
