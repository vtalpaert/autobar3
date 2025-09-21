import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateDevice } from '$lib/server/device-auth';

export async function POST({ request }) {
    const data = await request.json();
    const { token, orderId, errorCode, message } = data;

    if (!orderId || !message) {
        return json(
            {
                success: false,
                message: 'Missing orderId or message'
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

    // Create a formatted error message combining error code and message
    const errorCodeNames = {
        0: 'Unknown error code',
        1: 'General/unknown error',
        2: 'Weight scale error',
        3: 'No weight change',
        4: 'Negative weight change',
        5: 'Unable to report progress'
    };

    const errorCodeName = errorCodeNames[errorCode] || 'Unknown error code';
    const formattedErrorMessage = `[${errorCode}] ${errorCodeName}: ${message}`;

    // Update the order with the error
    await db
        .update(table.order)
        .set({
            status: 'failed',
            errorMessage: formattedErrorMessage,
            updatedAt: new Date()
        })
        .where(eq(table.order.id, orderId));

    return json({
        success: true,
        message: 'Error recorded'
    });
}
