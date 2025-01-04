import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }

    // Check if user is admin
    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, locals.user.id))
        .get();

    if (!profile?.isAdmin) {
        throw redirect(302, '/');
    }

    // Get all profiles with user info
    const profiles = await db
        .select({
            id: table.profile.id,
            userId: table.profile.userId,
            username: table.user.username,
            isVerified: table.profile.isVerified,
            createdAt: table.profile.createdAt
        })
        .from(table.profile)
        .innerJoin(table.user, eq(table.user.id, table.profile.userId));

    // Get all cocktails with creator info
    const cocktails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            creatorName: table.user.username
        })
        .from(table.cocktail)
        .innerJoin(table.profile, eq(table.profile.id, table.cocktail.creatorId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId));

    // Get all devices
    const devices = await db
        .select()
        .from(table.device);

    return {
        profiles,
        cocktails,
        devices,
        user: locals.user
    };
};

export const actions: Actions = {
    verifyProfile: async ({ request, locals }) => {
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
        const profileId = formData.get('profileId')?.toString();

        if (!profileId) {
            return { error: 'Profile ID is required' };
        }

        await db
            .update(table.profile)
            .set({ isVerified: true })
            .where(eq(table.profile.id, profileId));

        return { success: true };
    },

    deleteUser: async ({ request, locals }) => {
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
        const userId = formData.get('userId')?.toString();

        if (!userId) {
            return { error: 'User ID is required' };
        }

        // Delete associated profile first (due to foreign key constraints)
        await db
            .delete(table.profile)
            .where(eq(table.profile.userId, userId));

        // Delete the user
        await db
            .delete(table.user)
            .where(eq(table.user.id, userId));

        return { success: true };
    },

    deleteCocktail: async ({ request, locals }) => {
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
        const cocktailId = formData.get('cocktailId')?.toString();

        if (!cocktailId) {
            return { error: 'Cocktail ID is required' };
        }

        await db
            .delete(table.cocktail)
            .where(eq(table.cocktail.id, cocktailId));

        return { success: true };
    },

    deleteDevice: async ({ request, locals }) => {
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
        const deviceId = formData.get('deviceId')?.toString();

        if (!deviceId) {
            return { error: 'Device ID is required' };
        }

        await db
            .delete(table.device)
            .where(eq(table.device.id, deviceId));

        return { success: true };
    }
};
