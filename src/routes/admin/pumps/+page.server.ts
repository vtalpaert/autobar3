import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }

    // Check if user is admin
    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, locals.user.id))
        .get();

    if (!profile?.isAdmin) {
        throw redirect(302, '/');
    }

    // Get all pumps with device and ingredient information
    const pumps = await db
        .select({
            id: table.pump.id,
            gpio: table.pump.gpio,
            isEmpty: table.pump.isEmpty,
            updatedAt: table.pump.updatedAt,
            device: {
                id: table.device.id,
                name: table.device.name,
                profileId: table.device.profileId
            },
            ingredient: {
                id: table.ingredient.id,
                name: table.ingredient.name
            },
            profile: {
                username: table.user.username,
                artistName: table.profile.artistName
            }
        })
        .from(table.pump)
        .leftJoin(table.device, eq(table.pump.deviceId, table.device.id))
        .leftJoin(table.ingredient, eq(table.pump.ingredientId, table.ingredient.id))
        .leftJoin(table.profile, eq(table.device.profileId, table.profile.id))
        .leftJoin(table.user, eq(table.profile.userId, table.user.id))
        .orderBy(table.pump.updatedAt);

    return {
        pumps,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    delete: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { error: 'Unauthorized' });
        }

        // Check if user is admin
        const profile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, locals.user.id))
            .get();

        if (!profile?.isAdmin) {
            return fail(403, { error: 'Forbidden' });
        }

        const formData = await request.formData();
        const pumpId = formData.get('pumpId')?.toString();

        if (!pumpId) {
            return fail(400, { error: 'Pump ID is required' });
        }

        try {
            await db.delete(table.pump).where(eq(table.pump.id, pumpId));

            return { success: true };
        } catch (error) {
            console.error('Error deleting pump:', error);
            return fail(500, { error: 'Failed to delete pump' });
        }
    }
};
