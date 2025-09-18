import { error, fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth';

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
        .where(and(eq(table.device.id, deviceId), eq(table.device.profileId, profile.id)))
        .get();

    if (!device) {
        throw error(404, 'Device not found');
    }

    // Get existing pumps for this device
    const pumps = await db
        .select({
            id: table.pump.id,
            gpio: table.pump.gpio,
            isEmpty: table.pump.isEmpty,
            updatedAt: table.pump.updatedAt,
            ingredient: {
                id: table.ingredient.id,
                name: table.ingredient.name
            }
        })
        .from(table.pump)
        .leftJoin(table.ingredient, eq(table.pump.ingredientId, table.ingredient.id))
        .where(eq(table.pump.deviceId, deviceId));

    // Get all ingredients for dropdown
    const ingredients = await db.select().from(table.ingredient).orderBy(table.ingredient.name);

    return {
        device,
        pumps,
        ingredients,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        const profile = await selectVerifiedProfile(locals.user);
        const deviceId = params.id;

        if (!deviceId) {
            return fail(400, { error: 'Device ID is required' });
        }

        // Verify device ownership
        const device = await db
            .select()
            .from(table.device)
            .where(and(eq(table.device.id, deviceId), eq(table.device.profileId, profile.id)))
            .get();

        if (!device) {
            return fail(404, { error: 'Device not found' });
        }

        const formData = await request.formData();
        const entries = Array.from(formData.entries());

        // Parse existing pumps
        const existingPumpEntries = entries.filter(([key]) => key.startsWith('existingPumps['));
        const existingPumpsByIndex = {};

        for (const [key, value] of existingPumpEntries) {
            const match = key.match(/existingPumps\[(\d+)\]\.(.+)/);
            if (match) {
                const [, index, property] = match;
                if (!existingPumpsByIndex[index]) {
                    existingPumpsByIndex[index] = {};
                }
                existingPumpsByIndex[index][property] = value;
            }
        }

        // Parse new pumps
        const newPumpEntries = entries.filter(([key]) => key.startsWith('newPumps['));
        const newPumpsByIndex = {};

        for (const [key, value] of newPumpEntries) {
            const match = key.match(/newPumps\[(\d+)\]\.(.+)/);
            if (match) {
                const [, index, property] = match;
                if (!newPumpsByIndex[index]) {
                    newPumpsByIndex[index] = {};
                }
                newPumpsByIndex[index][property] = value;
            }
        }

        // Parse deleted pumps
        const deletedPumpEntries = entries.filter(([key]) => key.startsWith('deletedPumps['));
        const deletedPumpIds = deletedPumpEntries.map(([, value]) => value.toString());

        try {
            // Validate GPIO uniqueness
            const allGpios = [];

            // Check existing pumps
            for (const pump of Object.values(existingPumpsByIndex)) {
                if (pump.gpio) {
                    const gpio = parseInt(pump.gpio.toString());
                    if (allGpios.includes(gpio)) {
                        return fail(400, { error: `GPIO ${gpio} is used by multiple pumps` });
                    }
                    allGpios.push(gpio);
                }
            }

            // Check new pumps
            for (const pump of Object.values(newPumpsByIndex)) {
                if (pump.gpio) {
                    const gpio = parseInt(pump.gpio.toString());
                    if (allGpios.includes(gpio)) {
                        return fail(400, { error: `GPIO ${gpio} is used by multiple pumps` });
                    }
                    allGpios.push(gpio);
                }
            }

            // Delete removed pumps
            for (const pumpId of deletedPumpIds) {
                await db.delete(table.pump).where(eq(table.pump.id, pumpId));
            }

            // Update existing pumps
            for (const pump of Object.values(existingPumpsByIndex)) {
                if (pump.id) {
                    await db
                        .update(table.pump)
                        .set({
                            gpio: pump.gpio ? parseInt(pump.gpio.toString()) : null,
                            isEmpty: pump.isEmpty === 'on',
                            ingredientId: pump.ingredientId?.toString() || null,
                            updatedAt: new Date()
                        })
                        .where(eq(table.pump.id, pump.id.toString()));
                }
            }

            // Create new pumps
            for (const pump of Object.values(newPumpsByIndex)) {
                if (pump.ingredientId || pump.gpio) {
                    await db.insert(table.pump).values({
                        id: crypto.randomUUID(),
                        deviceId,
                        gpio: pump.gpio ? parseInt(pump.gpio.toString()) : null,
                        isEmpty: pump.isEmpty === 'on',
                        ingredientId: pump.ingredientId?.toString() || null,
                        updatedAt: new Date()
                    });
                }
            }
        } catch (error) {
            console.error('Error saving pump configuration:', error);
            return fail(500, { error: 'Failed to save pump configuration' });
        }

        // console.log('All pump operations completed successfully');

        // Add a small delay to ensure database transaction is fully committed
        // await new Promise(resolve => setTimeout(resolve, 200));

        // Debug: Read the pumps immediately after creation to verify they exist
        /*const debugPumps = await db
            .select({
                id: table.pump.id,
                gpio: table.pump.gpio,
                isEmpty: table.pump.isEmpty,
                updatedAt: table.pump.updatedAt,
                ingredient: {
                    id: table.ingredient.id,
                    name: table.ingredient.name
                }
            })
            .from(table.pump)
            .leftJoin(table.ingredient, eq(table.pump.ingredientId, table.ingredient.id))
            .where(eq(table.pump.deviceId, deviceId));
            
        console.log('Debug: Pumps immediately after creation:', debugPumps);
        console.log('Debug: Total pump count:', debugPumps.length);
        */

        throw redirect(303, `/devices/${deviceId}/configure`);
    }
};
