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

    // Get all devices with owner info
    const devices = await db
        .select({
            id: table.device.id,
            profileId: table.device.profileId,
            firmwareVersion: table.device.firmwareVersion,
            isDefault: table.device.isDefault,
            addedAt: table.device.addedAt,
            lastUsedAt: table.device.lastUsedAt,
            lastPingAt: table.device.lastPingAt,
            name: table.device.name,
            ownerUsername: table.user.username
        })
        .from(table.device)
        .innerJoin(table.profile, eq(table.profile.id, table.device.profileId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId));

    return {
        devices,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    deleteDevice: async ({ request, locals }) => {
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
        const deviceId = formData.get('deviceId')?.toString();

        if (!deviceId) {
            return { error: 'Device ID is required' };
        }

        await db
            .delete(table.device)
            .where(eq(table.device.id, deviceId));

        return { success: true };
    }
};
