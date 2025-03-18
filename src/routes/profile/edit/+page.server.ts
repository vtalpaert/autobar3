import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';
import { translations } from '$lib/i18n/translations/index';

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user;
    if (!user) throw redirect(302, '/auth/login');

    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, user.id))
        .get();

    if (!profile) throw error(404, 'Profile not found');
    
    // Check if profile is verified
    if (!profile.isVerified) {
        throw redirect(302, '/profile/unverified');
    }

    return {
        user: {
            ...user,
            isAdmin: profile.isAdmin
        },
        profile
    };
};

export const actions: Actions = {
    updateProfile: async (event) => {
        const user = event.locals.user;
        if (!user) throw redirect(302, '/auth/login');

        const formData = await event.request.formData();
        const artistName = formData.get('artistName')?.toString() || '';

        try {
            await db
                .update(table.profile)
                .set({ artistName })
                .where(eq(table.profile.userId, user.id))
                .run();

            return {
                success: true,
                message: translations.en.profile.updateSuccess
            };
        } catch (err) {
            return fail(400, {
                error: 'Failed to update profile'
            });
        }
    },

    changePassword: async (event) => {
        const user = event.locals.user;
        if (!user) throw redirect(302, '/auth/login');

        const formData = await event.request.formData();
        const currentPassword = formData.get('currentPassword')?.toString();
        const newPassword = formData.get('newPassword')?.toString();

        if (!currentPassword || !newPassword) {
            return fail(400, {
                error: 'Missing required fields'
            });
        }

        try {
            // Get current user's password hash
            const userData = await db
                .select({ passwordHash: table.user.passwordHash })
                .from(table.user)
                .where(eq(table.user.id, user.id))
                .get();

            if (!userData) {
                return fail(400, { error: 'User not found' });
            }

            // Verify current password
            const validPassword = await new Argon2id().verify(
                userData.passwordHash,
                currentPassword
            );

            if (!validPassword) {
                return fail(400, { error: 'Current password is incorrect' });
            }

            // Hash new password
            const newPasswordHash = await new Argon2id().hash(newPassword);

            // Update password in database
            await db
                .update(table.user)
                .set({ passwordHash: newPasswordHash })
                .where(eq(table.user.id, user.id))
                .run();

            return {
                success: true,
                message: translations.en.profile.passwordSuccess
            };
        } catch (err) {
            console.error('Password change error:', err);
            return fail(400, {
                error: 'Failed to change password'
            });
        }
    }
};
