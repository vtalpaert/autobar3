import { error, fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals, params }) => {
    const profile = await selectVerifiedProfile(locals.user);
    const deviceId = params.id;

    if (!deviceId) {
        throw error(400, 'Device ID is required');
    }

    // Get device and verify ownership
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
        throw error(404, 'Device not found');
    }

    return {
        device,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    savePins: async ({ request, locals, params }) => {
        const profile = await selectVerifiedProfile(locals.user);
        const deviceId = params.id;
        const formData = await request.formData();
        
        const dtPin = parseInt(formData.get('dtPin')?.toString() || '0');
        const sckPin = parseInt(formData.get('sckPin')?.toString() || '0');

        if (!deviceId) {
            return fail(400, { success: false, message: 'Device ID is required' });
        }

        if (!dtPin || !sckPin) {
            return fail(400, { success: false, message: 'Both DT and SCK pins are required' });
        }

        // Verify device ownership
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

        try {
            // Update GPIO pins, keep needCalibration = true
            await db
                .update(table.device)
                .set({
                    hx711Dt: dtPin,
                    hx711Sck: sckPin,
                    needCalibration: true // Keep true until full calibration is complete
                })
                .where(eq(table.device.id, deviceId));

            return { success: true, message: 'GPIO pins saved. Device will reinitialize hardware.' };
        } catch (error) {
            console.error('Error saving GPIO pins:', error);
            return fail(500, {
                success: false,
                message: 'Failed to save GPIO pins. Please try again.'
            });
        }
    },

    saveCalibration: async ({ request, locals, params }) => {
        const profile = await selectVerifiedProfile(locals.user);
        const deviceId = params.id;
        const formData = await request.formData();
        
        const offset = parseInt(formData.get('offset')?.toString() || '0');
        const scale = parseFloat(formData.get('scale')?.toString() || '0');

        if (!deviceId) {
            return fail(400, { success: false, message: 'Device ID is required' });
        }

        if (!offset || !scale) {
            return fail(400, { success: false, message: 'Both offset and scale are required' });
        }

        // Verify device ownership
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

        try {
            // Update calibration values and mark as calibrated
            await db
                .update(table.device)
                .set({
                    hx711Offset: offset,
                    hx711Scale: scale,
                    needCalibration: false // Calibration is now complete
                })
                .where(eq(table.device.id, deviceId));

            return { success: true, message: 'Calibration saved successfully. Device is now ready to use.' };
        } catch (error) {
            console.error('Error saving calibration:', error);
            return fail(500, {
                success: false,
                message: 'Failed to save calibration. Please try again.'
            });
        }
    }
};
