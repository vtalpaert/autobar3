import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateDevice } from '$lib/server/device-auth';

export async function POST({ request }) {
    const data = await request.json();
    const { token, orderId } = data;

    if (!orderId) {
        return json(
            {
                success: false,
                message: 'Missing orderId'
            },
            { status: 400 }
        );
    }

    // Authenticate device
    const authResult = await authenticateDevice(request, token);
    if (!authResult.success) {
        return json(
            {
                success: false,
                message: authResult.error
            },
            { status: authResult.status }
        );
    }

    const device = authResult.device;

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
