import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
    const data = await request.json();
    const { token, orderId } = data;

    if (!token || !orderId) {
        return json(
            {
                success: false,
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
                success: false,
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
                success: false,
                message: 'Order not found'
            },
            { status: 404 }
        );
    }

    // Check if the order belongs to this device
    if (order.deviceId !== device.id) {
        return json(
            {
                success: false,
                message: 'Order does not belong to this device'
            },
            { status: 403 }
        );
    }

    // Update the order status to cancelled
    await db
        .update(table.order)
        .set({
            status: 'cancelled',
            updatedAt: new Date()
        })
        .where(eq(table.order.id, orderId));

    return json({
        success: true,
        message: 'Order cancelled'
    });
}
