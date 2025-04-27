import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function POST({ request }) {
    const data = await request.json();
    const { token, orderId, doseId, progress } = data;

    if (!token || !orderId || !doseId || progress === undefined) {
        return json({
            message: "Missing required fields"
        }, { status: 400 });
    }

    // Find the device by token
    const device = await db
        .select()
        .from(table.device)
        .where(eq(table.device.apiToken, token))
        .get();

    if (!device) {
        return json({
            message: "Invalid device token"
        }, { status: 401 });
    }

    // Update last ping time
    await db
        .update(table.device)
        .set({ lastPingAt: new Date() })
        .where(eq(table.device.id, device.id));

    // Find the order
    const order = await db
        .select()
        .from(table.order)
        .where(eq(table.order.id, orderId))
        .get();

    if (!order) {
        return json({
            message: "Order not found"
        }, { status: 404 });
    }

    // Check if order status is valid for progress updates
    if (order.status !== 'pending' && order.status !== 'in_progress') {
        return json({
            message: `Cannot update progress for order with status: ${order.status}`,
            continue: false
        }, { status: 400 });
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
        return json({
            message: "Reported dose does not match current dose for this order",
            continue: false
        }, { status: 400 });
    }

    // Get the current dose
    const currentDose = await db
        .select()
        .from(table.dose)
        .where(eq(table.dose.id, doseId))
        .get();

    if (!currentDose) {
        return json({
            message: "Dose not found"
        }, { status: 404 });
    }

    // Update the progress after verification
    await db
        .update(table.order)
        .set({
            doseProgress: progress,
            updatedAt: new Date()
        })
        .where(eq(table.order.id, orderId));

    // We don't update the order status or move to the next dose here
    // That will be handled by the action API when the device requests the next action

    // If the progress >= currentDose.quantity, tell the device to stop pouring
    const shouldContinue = progress < currentDose.quantity;

    return json({
        message: "Progress updated",
        continue: shouldContinue
    });
}
