import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and, or, count } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
    const currentUser = event.locals.user;

    // Default to viewing own profile if no ID is provided
    const userId = event.url.searchParams.get('id') || (currentUser?.id || '');
    const isOwnProfile = currentUser && userId === currentUser.id;

    // If not logged in and no specific profile requested, redirect to login
    if (!currentUser && !event.url.searchParams.get('id')) {
        throw redirect(302, '/auth/login');
    }

    // If trying to view someone else's profile, check if logged in
    if (event.url.searchParams.get('id') && !currentUser) {
        throw redirect(302, '/auth/login');
    }

    // Get the user data
    const viewedUser = await db
        .select({
            id: table.user.id,
            username: table.user.username
        })
        .from(table.user)
        .where(eq(table.user.id, userId))
        .get();

    if (!viewedUser) {
        throw error(404, 'User not found');
    }

    // Get the profile data
    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, viewedUser.id))
        .get();

    if (!profile) {
        throw error(404, 'Profile not found');
    }

    // Count cocktails created by this user
    const cocktailCountResult = await db
        .select({ value: count() })
        .from(table.cocktail)
        .where(eq(table.cocktail.creatorId, profile.id))
        .get();

    const cocktailCount = cocktailCountResult?.value || 0;

    // Get collaboration data if the current user is logged in
    let collaborationStatus = 'none';
    let collaborationRequestId = '';
    let collaborationCount = 0;
    let hasActiveCollaboration = false;

    if (currentUser) {
        // Get current user's profile
        const currentProfile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, currentUser.id))
            .get();

        if (currentProfile && !isOwnProfile) {
            // Check for pending requests
            const pendingSentRequest = await db
                .select()
                .from(table.collaborationRequest)
                .where(
                    and(
                        eq(table.collaborationRequest.senderId, currentProfile.id),
                        eq(table.collaborationRequest.receiverId, profile.id),
                        eq(table.collaborationRequest.status, 'pending')
                    )
                )
                .get();

            if (pendingSentRequest) {
                collaborationStatus = 'pending_sent';
                collaborationRequestId = pendingSentRequest.id;
            } else {
                const pendingReceivedRequest = await db
                    .select()
                    .from(table.collaborationRequest)
                    .where(
                        and(
                            eq(table.collaborationRequest.senderId, profile.id),
                            eq(table.collaborationRequest.receiverId, currentProfile.id),
                            eq(table.collaborationRequest.status, 'pending')
                        )
                    )
                    .get();

                if (pendingReceivedRequest) {
                    collaborationStatus = 'pending_received';
                    collaborationRequestId = pendingReceivedRequest.id;
                } else {
                    // Check for active collaboration
                    const activeCollaboration = await db
                        .select()
                        .from(table.collaborationRequest)
                        .where(
                            and(
                                or(
                                    and(
                                        eq(table.collaborationRequest.senderId, currentProfile.id),
                                        eq(table.collaborationRequest.receiverId, profile.id)
                                    ),
                                    and(
                                        eq(table.collaborationRequest.senderId, profile.id),
                                        eq(table.collaborationRequest.receiverId, currentProfile.id)
                                    )
                                ),
                                eq(table.collaborationRequest.status, 'accepted')
                            )
                        )
                        .get();

                    if (activeCollaboration) {
                        collaborationStatus = 'active';
                        collaborationRequestId = activeCollaboration.id;
                        hasActiveCollaboration = true;
                    }
                }
            }
        }

        // Count active collaborations for this user
        const collaborationCountResult = await db
            .select({ value: count() })
            .from(table.collaborationRequest)
            .where(
                and(
                    or(
                        eq(table.collaborationRequest.senderId, profile.id),
                        eq(table.collaborationRequest.receiverId, profile.id)
                    ),
                    eq(table.collaborationRequest.status, 'accepted')
                )
            )
            .get();

        collaborationCount = collaborationCountResult?.value || 0;
    }

    // If trying to view someone else's profile without an active collaboration
    if (!isOwnProfile && currentUser && !hasActiveCollaboration) {
        const currentProfile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, currentUser.id))
            .get();

        // Only allow admins to view any profile
        if (!currentProfile?.isAdmin) {
            throw error(403, 'You can only view profiles of users you are collaborating with');
        }
    }

    // Get current user's profile for admin check
    const currentProfile = currentUser ? await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, currentUser.id))
        .get() : null;

    return {
        user: currentUser ? {
            ...currentUser,
            isAdmin: currentProfile?.isAdmin || false
        } : null,
        viewedUser,
        profile,
        isOwnProfile,
        cocktailCount,
        collaborationCount,
        collaborationStatus,
        collaborationRequestId,
        hasActiveCollaboration
    };
};
