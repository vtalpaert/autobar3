import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }

    const devices = await db
        .select()
        .from(table.device)
        .where(eq(table.device.userId, locals.user.id));

    return {
        devices,
        user: locals.user
    };
};
