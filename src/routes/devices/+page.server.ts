import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';

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

export const actions: Actions = {
    renameDevice: async ({ request, locals }) => {
        const profile = await selectVerifiedProfile(locals.user);
        const formData = await request.formData();
        const deviceId = formData.get('deviceId')?.toString();
        const deviceName = formData.get('deviceName')?.toString();

        if (!deviceId) {
            return fail(400, { success: false, message: 'Device ID is required' });
        }

        if (!deviceName) {
            return fail(400, { success: false, message: 'Device name is required' });
        }

        // Verify the device belongs to the user
        const device = await db
            .select()
            .from(table.device)
            .where(
                and(
                    eq(table.device.id, deviceId),
                    eq(table.device.profileId, profile.id)
                )
            )
            .get();

        if (!device) {
            return fail(404, { success: false, message: 'Device not found' });
        }

        // Update device name
        await db
            .update(table.device)
            .set({ name: deviceName })
            .where(eq(table.device.id, deviceId));

        return { success: true };
    }
};
