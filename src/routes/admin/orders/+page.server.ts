import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
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

    // Get all orders with related information
    const orders = await db
        .select({
            id: table.order.id,
            createdAt: table.order.createdAt,
            updatedAt: table.order.updatedAt,
            status: table.order.status,
            doseProgress: table.order.doseProgress,
            errorMessage: table.order.errorMessage,
            customer: {
                username: table.user.username,
                artistName: table.profile.artistName
            },
            device: {
                id: table.device.id,
                name: table.device.name
            },
            cocktail: {
                name: table.cocktail.name
            }
        })
        .from(table.order)
        .innerJoin(table.profile, eq(table.profile.id, table.order.customerId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId))
        .innerJoin(table.device, eq(table.device.id, table.order.deviceId))
        .innerJoin(table.cocktail, eq(table.cocktail.id, table.order.cocktailId))
        .orderBy(table.order.createdAt);

    return {
        orders,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};

export const actions: Actions = {
    deleteOrder: async ({ request, locals }) => {
        if (!locals.user) {
            throw redirect(302, '/auth/login');
        }

        const adminProfile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, locals.user.id))
            .get();

        if (!adminProfile?.isAdmin) {
            throw redirect(302, '/');
        }

        const formData = await request.formData();
        const orderId = formData.get('orderId')?.toString();

        if (!orderId) {
            return { error: 'Order ID is required' };
        }

        await db
            .delete(table.order)
            .where(eq(table.order.id, orderId));

        return { success: true };
    },

    cancelOrder: async ({ request, locals }) => {
        if (!locals.user) {
            throw redirect(302, '/auth/login');
        }

        const adminProfile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, locals.user.id))
            .get();

        if (!adminProfile?.isAdmin) {
            throw redirect(302, '/');
        }

        const formData = await request.formData();
        const orderId = formData.get('orderId')?.toString();

        if (!orderId) {
            return { error: 'Order ID is required' };
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
