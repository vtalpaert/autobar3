import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and, or, gt, isNull } from 'drizzle-orm';

export async function POST({ request }) {
    const data = await request.json();
    const { token } = data;

    if (!token) {
        return json({
            error: "Missing device token"
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
            error: "Invalid device token"
        }, { status: 401 });
    }

    // Update last ping time
    await db
        .update(table.device)
        .set({ lastPingAt: new Date() })
        .where(eq(table.device.id, device.id));

    // Find pending or in-progress orders for this device
    // Process in creation order (oldest first)
    const order = await db
        .select()
        .from(table.order)
        .where(
            and(
                eq(table.order.deviceId, device.id),
                // Check for both pending and in-progress orders
                or(
                    eq(table.order.status, 'pending'),
                    eq(table.order.status, 'in_progress')
                )
            )
        )
        .orderBy(table.order.createdAt)
        .limit(1)
        .get();

    if (!order) {
        return json({
            action: "standby"
        });
    }

    // If we have an order but no current dose, get the first dose
    let currentDose;
    if (!order.currentDoseId) {
        // Get the first dose (lowest number) for this cocktail
        currentDose = await db
            .select()
            .from(table.dose)
            .where(eq(table.dose.cocktailId, order.cocktailId))
            .orderBy(table.dose.number)
            .limit(1)
            .get();

        if (currentDose) {
            // Update the order with the first dose
            await db
                .update(table.order)
                .set({
                    currentDoseId: currentDose.id,
                    doseProgress: 0, // Reset dose progress when setting a new dose
                    updatedAt: new Date()
                })
                .where(eq(table.order.id, order.id));
        }
    } else {
        // Get the current dose
        currentDose = await db
            .select()
            .from(table.dose)
            .where(eq(table.dose.id, order.currentDoseId))
            .get();
    }

    // Verify the doseProgress of the Order
    if (currentDose && order.doseProgress >= currentDose.quantity) {
        // Find the next dose
        const nextDose = await db
            .select()
            .from(table.dose)
            .where(
                and(
                    eq(table.dose.cocktailId, order.cocktailId),
                    gt(table.dose.number, currentDose.number)
                )
            )
            .orderBy(table.dose.number)
            .limit(1)
            .get();

        if (nextDose) {
            // Move to the next dose and reset progress
            await db
                .update(table.order)
                .set({
                    currentDoseId: nextDose.id,
                    doseProgress: 0,
                    updatedAt: new Date()
                })
                .where(eq(table.order.id, order.id));

            // Update currentDose to the next dose
            currentDose = nextDose;
        } else {
            // No more doses, order is complete
            await db
                .update(table.order)
                .set({
                    status: 'completed',
                    updatedAt: new Date()
                })
                .where(eq(table.order.id, order.id));

            return json({
                action: "standby",
                message: "Order completed"
            });
        }
    }

    if (!currentDose) {
        return json({
            action: "standby",
            message: "No doses found or left for this order"
        });
    }

    // Calculate quantity left to pour
    const quantityLeft = Math.max(0, currentDose.quantity - (order.doseProgress || 0));

    return json({
        action: "pour",
        orderId: order.id,
        doseId: currentDose.id,
        ingredientId: currentDose.ingredientId,
        quantityLeft: quantityLeft
    });
}
