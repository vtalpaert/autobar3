import { redirect } from '@sveltejs/kit';
import { eq, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
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

    // Get all devices with owner info
    const devices = await db
        .select({
            id: table.device.id,
            profileId: table.device.profileId,
            name: table.device.name,
            apiToken: table.device.apiToken,
            ownerUsername: table.user.username
        })
        .from(table.device)
        .innerJoin(table.profile, eq(table.profile.id, table.device.profileId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId));

    // Get active orders
    const activeOrders = await db
        .select({
            id: table.order.id,
            status: table.order.status,
            createdAt: table.order.createdAt,
            deviceId: table.order.deviceId,
            cocktailId: table.order.cocktailId,
            currentDoseId: table.order.currentDoseId,
            doseProgress: table.order.doseProgress,
            cocktailName: table.cocktail.name
        })
        .from(table.order)
        .innerJoin(table.cocktail, eq(table.order.cocktailId, table.cocktail.id))
        .where(or(
            eq(table.order.status, 'pending'),
            eq(table.order.status, 'in_progress')
        ));

    return {
        devices,
        activeOrders,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};
