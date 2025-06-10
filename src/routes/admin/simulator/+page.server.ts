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
            return { 
                success: true, 
                action: result.action,
                orderId: result.orderId,
                doseId: result.doseId,
                ingredientId: result.ingredientId,
                doseQuantity: result.doseQuantity,
                doseProgress: result.doseProgress,
                message: result.action === 'pour' 
                    ? `Ready to pour: ${result.doseQuantity - result.doseProgress}ml remaining for order ${result.orderId} (${result.doseProgress}ml/${result.doseQuantity}ml done)`
                    : `Device status: ${result.action}`
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
                    progress: progressAmount
                })
            });

            const result = await response.json();
            const deviceName = overrideDeviceId ? `${device.name || `Device ${targetDeviceId.slice(0, 8)}`} (WRONG DEVICE)` : 'selected device';
            const isManual = formData.get('isManual') === 'true';
            const orderInfo = isManual ? `${orderId} (MANUAL)` : orderId;
            
            if (result.continue) {
                return { 
                    success: true, 
                    message: `Progress reported from ${deviceName}: ${(progressAmount / 10).toFixed(1)}cL (${progressAmount}ml) for order ${orderInfo}`,
                    completed: false // We don't know completion status from absolute amounts
                };
            } else {
                return { 
                    success: true, 
                    message: 'Order was cancelled or completed',
                    cancelled: true
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
            const response = await fetch('/api/devices/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: device.apiToken,
                    orderId: orderId,
                    message: errorMessage
                })
            });

            const result = await response.json();
            const deviceName = overrideDeviceId ? `${device.name || `Device ${targetDeviceId.slice(0, 8)}`} (WRONG DEVICE)` : 'selected device';
            
            return { 
                success: true, 
                message: `Error reported from ${deviceName}: ${result.message}`,
                errorReported: true
            };
        } catch (error) {
            return fail(500, { message: `Error: ${error.message}` });
        }
    }
};
