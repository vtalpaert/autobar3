import { error, redirect } from '@sveltejs/kit';
import { eq, desc, and, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
    const profile = await selectVerifiedProfile(locals.user);
    
    // Get user's devices
    const devices = await db
        .select({
            id: table.device.id,
            name: table.device.name,
            firmwareVersion: table.device.firmwareVersion,
            isDefault: table.device.isDefault,
            addedAt: table.device.addedAt,
            lastUsedAt: table.device.lastUsedAt,
            lastPingAt: table.device.lastPingAt
        })
        .from(table.device)
        .where(eq(table.device.profileId, profile.id));
    
    // Get active orders (pending or in_progress)
    const activeOrders = await db
        .select({
            id: table.order.id,
            createdAt: table.order.createdAt,
            updatedAt: table.order.updatedAt,
            status: table.order.status,
            doseProgress: table.order.doseProgress,
            errorMessage: table.order.errorMessage,
            cocktail: {
                id: table.cocktail.id,
                name: table.cocktail.name
            },
            device: {
                id: table.device.id,
                name: table.device.name
            },
            currentDose: {
                id: table.dose.id,
                number: table.dose.number,
                quantity: table.dose.quantity,
                ingredient: {
                    id: table.ingredient.id,
                    name: table.ingredient.name
                }
            }
        })
        .from(table.order)
        .innerJoin(table.cocktail, eq(table.order.cocktailId, table.cocktail.id))
        .innerJoin(table.device, eq(table.order.deviceId, table.device.id))
        .leftJoin(table.dose, eq(table.order.currentDoseId, table.dose.id))
        .leftJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .where(
            and(
                eq(table.order.customerId, profile.id),
                inArray(table.order.status, ['pending', 'in_progress'])
            )
        )
        .orderBy(desc(table.order.createdAt));
    
    // Get completed orders (completed, failed, cancelled)
    const pastOrders = await db
        .select({
            id: table.order.id,
            createdAt: table.order.createdAt,
            updatedAt: table.order.updatedAt,
            status: table.order.status,
            errorMessage: table.order.errorMessage,
            cocktail: {
                id: table.cocktail.id,
                name: table.cocktail.name
            },
            device: {
                id: table.device.id,
                name: table.device.name
            }
        })
        .from(table.order)
        .innerJoin(table.cocktail, eq(table.order.cocktailId, table.cocktail.id))
        .innerJoin(table.device, eq(table.order.deviceId, table.device.id))
        .where(
            and(
                eq(table.order.customerId, profile.id),
                inArray(table.order.status, ['completed', 'failed', 'cancelled'])
            )
        )
        .orderBy(desc(table.order.createdAt))
        .limit(10); // Limit to last 10 orders
    
    return {
        devices,
        activeOrders,
        pastOrders,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    cancelOrder: async ({ request, locals }) => {
        const profile = await selectVerifiedProfile(locals.user);
        const formData = await request.formData();
        const orderId = formData.get('orderId')?.toString();
        
        if (!orderId) {
            throw error(400, 'Order ID is required');
        }
        
        // Verify the order belongs to the user
        const order = await db
            .select()
            .from(table.order)
            .where(
                and(
                    eq(table.order.id, orderId),
                    eq(table.order.customerId, profile.id)
                )
            )
            .get();
        
        if (!order) {
            throw error(404, 'Order not found');
        }
        
        // Only allow cancellation of pending or in-progress orders
        if (order.status !== 'pending' && order.status !== 'in_progress') {
            throw error(400, 'Cannot cancel an order that is not pending or in progress');
        }
        
        // Update order status to cancelled
        await db
            .update(table.order)
            .set({
                status: 'cancelled',
                updatedAt: new Date()
            })
            .where(eq(table.order.id, orderId));
        
        return { success: true };
    }
};
