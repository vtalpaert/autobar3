import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function POST({ request }) {
    const data = await request.json();
    const { token, orderId, doseId, weightProgress } = data;

    if (!token || !orderId || !doseId || weightProgress === undefined) {
        return json(
            {
                message: 'Missing required fields'
            },
            { status: 400 }
        );
    }

    // Find the device by token
    const device = await db
        .select()
        .from(table.device)
        .where(eq(table.device.apiToken, token))
        .get();

    if (!device) {
        return json(
            {
                message: 'Invalid device token'
            },
            { status: 401 }
        );
    }

    // Update last ping time
    await db
        .update(table.device)
        .set({ lastPingAt: new Date() })
        .where(eq(table.device.id, device.id));

    // Find the order
    const order = await db.select().from(table.order).where(eq(table.order.id, orderId)).get();

    if (!order) {
        return json(
            {
                message: 'Order not found'
            },
            { status: 404 }
        );
    }

    // Check if order status is valid for progress updates
    if (order.status !== 'pending' && order.status !== 'in_progress') {
        // For cancelled/completed orders, tell device to stop but don't error
        return json(
            {
                message: `Order status is ${order.status} - stopping pump`,
                continue: false
            },
            { status: 200 }
        );
    }

    // If order is pending, update it to in_progress
    if (order.status === 'pending') {
        await db
            .update(table.order)
            .set({
                status: 'in_progress',
                updatedAt: new Date()
            })
            .where(eq(table.order.id, orderId));
    }

    // Verify if the doseId in the request corresponds to the currentDose for this Order
    if (order.currentDoseId !== doseId) {
        return json(
            {
                message: 'Reported dose does not match current dose for this order',
                continue: false
            },
            { status: 400 }
        );
    }

    // Get the current dose with ingredient information
    const currentDose = await db
        .select({
            dose: table.dose,
            ingredient: table.ingredient
        })
        .from(table.dose)
        .innerJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .where(eq(table.dose.id, doseId))
        .get();

    if (!currentDose) {
        return json(
            {
                message: 'Dose not found'
            },
            { status: 404 }
        );
    }

    // Convert weight progress to volume progress using ingredient density
    // Formula: volume (ml) = weight (g) / density (g/L) * 1000
    const volumeProgress = (weightProgress / currentDose.ingredient.density) * 1000;

    // Update the progress after verification (store volume progress)
    await db
        .update(table.order)
        .set({
            doseProgress: volumeProgress,
            updatedAt: new Date()
        })
        .where(eq(table.order.id, orderId));

    // We don't update the order status or move to the next dose here
    // That will be handled by the action API when the device requests the next action

    // If the volume progress >= dose quantity, tell the device to stop pouring
    const shouldContinue = volumeProgress < currentDose.dose.quantity;

    return json({
        message: 'Progress updated',
        continue: shouldContinue
    });
}
