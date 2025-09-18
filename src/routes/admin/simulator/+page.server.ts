import { redirect, fail } from '@sveltejs/kit';
import { eq, or } from 'drizzle-orm';
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
            name: table.device.name,
            apiToken: table.device.apiToken,
            ownerUsername: table.user.username
        })
        .from(table.device)
        .innerJoin(table.profile, eq(table.profile.id, table.device.profileId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId));

    // Get active orders with detailed information
    const activeOrders = await db
        .select({
            id: table.order.id,
            status: table.order.status,
            createdAt: table.order.createdAt,
            updatedAt: table.order.updatedAt,
            deviceId: table.order.deviceId,
            cocktailId: table.order.cocktailId,
            currentDoseId: table.order.currentDoseId,
            doseProgress: table.order.doseProgress,
            cocktailName: table.cocktail.name,
            customerUsername: table.user.username,
            customerArtistName: table.profile.artistName,
            // Current dose details
            currentDoseQuantity: table.dose.quantity,
            currentDoseNumber: table.dose.number,
            currentIngredientId: table.ingredient.id,
            currentIngredientName: table.ingredient.name
        })
        .from(table.order)
        .innerJoin(table.cocktail, eq(table.order.cocktailId, table.cocktail.id))
        .innerJoin(table.profile, eq(table.order.customerId, table.profile.id))
        .innerJoin(table.user, eq(table.profile.userId, table.user.id))
        .leftJoin(table.dose, eq(table.order.currentDoseId, table.dose.id))
        .leftJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .where(or(eq(table.order.status, 'pending'), eq(table.order.status, 'in_progress')));

    return {
        devices,
        activeOrders,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    verify: async ({ request, locals, fetch }) => {
        const profile = await selectVerifiedProfile(locals.user);
        if (!profile?.isAdmin) {
            return fail(403, { message: 'Unauthorized' });
        }

        const formData = await request.formData();
        const deviceId = formData.get('deviceId')?.toString();

        if (!deviceId) {
            return fail(400, { message: 'Device ID is required' });
        }

        // Get device token
        const device = await db
            .select({ apiToken: table.device.apiToken })
            .from(table.device)
            .where(eq(table.device.id, deviceId))
            .get();

        if (!device) {
            return fail(404, { message: 'Device not found' });
        }

        try {
            const response = await fetch('/api/devices/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: device.apiToken,
                    firmwareVersion: '1.0.0-simulator'
                })
            });

            const result = await response.json();
            if (result.tokenValid) {
                return { success: true, message: 'Device verification successful' };
            } else {
                return fail(400, { message: `Verification failed: ${result.message}` });
            }
        } catch (error) {
            return fail(500, { message: `Error: ${error.message}` });
        }
    },

    checkAction: async ({ request, locals, fetch }) => {
        const profile = await selectVerifiedProfile(locals.user);
        if (!profile?.isAdmin) {
            return fail(403, { message: 'Unauthorized' });
        }

        const formData = await request.formData();
        const deviceId = formData.get('deviceId')?.toString();

        if (!deviceId) {
            return fail(400, { message: 'Device ID is required' });
        }

        // Get device token
        const device = await db
            .select({ apiToken: table.device.apiToken })
            .from(table.device)
            .where(eq(table.device.id, deviceId))
            .get();

        if (!device) {
            return fail(404, { message: 'Device not found' });
        }

        try {
            const response = await fetch('/api/devices/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: device.apiToken
                })
            });

            const result = await response.json();

            // Get ingredient name if we have an ingredientId
            let ingredientName = null;
            if (result.ingredientId) {
                const ingredient = await db
                    .select({ name: table.ingredient.name })
                    .from(table.ingredient)
                    .where(eq(table.ingredient.id, result.ingredientId))
                    .get();
                ingredientName = ingredient?.name || 'Unknown';
            }

            return {
                success: true,
                action: result.action,
                orderId: result.orderId,
                doseId: result.doseId,
                pumpGpio: result.pumpGpio,
                doseWeight: result.doseWeight,
                doseWeightProgress: result.doseWeightProgress,
                message:
                    result.action === 'pump'
                        ? `Ready to pump: ${result.doseWeight - result.doseWeightProgress}g remaining for order ${result.orderId} (${result.doseWeightProgress}g/${result.doseWeight}g done) on GPIO ${result.pumpGpio}`
                        : result.action === 'standby'
                          ? `Device on standby, idle for ${result.idle}ms`
                          : result.action === 'completed'
                            ? `Order ${result.orderId} completed: ${result.message}`
                            : `Device status: ${result.action}`
                // Don't refresh for checkAction - it's just reading state
            };
        } catch (error) {
            return fail(500, { message: `Error: ${error.message}` });
        }
    },

    progress: async ({ request, locals, fetch }) => {
        const profile = await selectVerifiedProfile(locals.user);
        if (!profile?.isAdmin) {
            return fail(403, { message: 'Unauthorized' });
        }

        const formData = await request.formData();
        const deviceId = formData.get('deviceId')?.toString();
        const orderId = formData.get('orderId')?.toString();
        const doseId = formData.get('doseId')?.toString();
        const progressAmount = parseFloat(formData.get('progressAmount')?.toString() || '0');

        if (!deviceId || !orderId || !doseId || progressAmount <= 0) {
            return fail(400, { message: 'Missing required fields or invalid progress amount' });
        }

        // Get device token (or use override device)
        const overrideDeviceId = formData.get('overrideDeviceId')?.toString();
        const targetDeviceId = overrideDeviceId || deviceId;

        const device = await db
            .select({ apiToken: table.device.apiToken, name: table.device.name })
            .from(table.device)
            .where(eq(table.device.id, targetDeviceId))
            .get();

        if (!device) {
            return fail(404, { message: 'Device not found' });
        }

        try {
            const response = await fetch('/api/devices/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: device.apiToken,
                    orderId: orderId,
                    doseId: doseId,
                    weightProgress: progressAmount
                })
            });

            const result = await response.json();
            const deviceName = overrideDeviceId
                ? `${device.name || `Device ${targetDeviceId.slice(0, 8)}`} (WRONG DEVICE)`
                : 'selected device';
            const isManual = formData.get('isManual') === 'true';
            const orderInfo = isManual ? `${orderId} (MANUAL)` : orderId;

            if (result.continue) {
                return {
                    success: true,
                    message: `Progress reported from ${deviceName}: Set weight to ${progressAmount}g for order ${orderInfo}`,
                    completed: false,
                    refreshOrders: true
                };
            } else {
                return {
                    success: true,
                    message: result.message || 'Order was cancelled or completed',
                    cancelled: true,
                    refreshOrders: true
                };
            }
        } catch (error) {
            return fail(500, { message: `Error: ${error.message}` });
        }
    },

    error: async ({ request, locals, fetch }) => {
        const profile = await selectVerifiedProfile(locals.user);
        if (!profile?.isAdmin) {
            return fail(403, { message: 'Unauthorized' });
        }

        const formData = await request.formData();
        const deviceId = formData.get('deviceId')?.toString();
        const orderId = formData.get('orderId')?.toString();
        const errorMessage = formData.get('errorMessage')?.toString();

        if (!deviceId || !orderId || !errorMessage) {
            return fail(400, { message: 'Missing required fields' });
        }

        // Get device token (or use override device)
        const overrideDeviceId = formData.get('overrideDeviceId')?.toString();
        const targetDeviceId = overrideDeviceId || deviceId;

        const device = await db
            .select({ apiToken: table.device.apiToken, name: table.device.name })
            .from(table.device)
            .where(eq(table.device.id, targetDeviceId))
            .get();

        if (!device) {
            return fail(404, { message: 'Device not found' });
        }

        try {
            const errorCode = formData.get('errorCode')?.toString() || '1'; // Default to general error

            const response = await fetch('/api/devices/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: device.apiToken,
                    orderId: orderId,
                    errorCode: parseInt(errorCode),
                    message: errorMessage
                })
            });

            const result = await response.json();
            const deviceName = overrideDeviceId
                ? `${device.name || `Device ${targetDeviceId.slice(0, 8)}`} (WRONG DEVICE)`
                : 'selected device';

            return {
                success: true,
                message: `Error reported from ${deviceName}: ${result.message}`,
                errorReported: true,
                refreshOrders: true
            };
        } catch (error) {
            return fail(500, { message: `Error: ${error.message}` });
        }
    }
};
