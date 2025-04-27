import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request, locals }) {
    // Check if user is logged in
    if (!locals.user) {
        return json({
            message: "Unauthorized"
        }, { status: 401 });
    }

    const data = await request.json();
    const { orderId } = data;

    if (!orderId) {
        return json({
            message: "Missing order ID"
        }, { status: 400 });
    }

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

    // Check if the user is authorized to cancel this order
    // Either they are the customer or an admin
    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, locals.user.id))
        .get();

    if (!profile || (profile.id !== order.customerId && !profile.isAdmin)) {
        return json({
            message: "Not authorized to cancel this order"
        }, { status: 403 });
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
        message: "Order cancelled"
    });
}
