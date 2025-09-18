import { error, redirect } from '@sveltejs/kit';
import { eq, and, or } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);

    // Get pending requests (received)
    const pendingRequests = await db
        .select({
            id: table.collaborationRequest.id,
            senderId: table.collaborationRequest.senderId,
            message: table.collaborationRequest.message,
            createdAt: table.collaborationRequest.createdAt,
            sender: {
                username: table.user.username,
                artistName: table.profile.artistName
            }
        })
        .from(table.collaborationRequest)
        .innerJoin(table.profile, eq(table.profile.id, table.collaborationRequest.senderId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId))
        .where(
            and(
                eq(table.collaborationRequest.receiverId, profile.id),
                eq(table.collaborationRequest.status, 'pending')
            )
        )
        .orderBy(table.collaborationRequest.createdAt);

    // Get sent requests
    const sentRequests = await db
        .select({
            id: table.collaborationRequest.id,
            receiverId: table.collaborationRequest.receiverId,
            message: table.collaborationRequest.message,
            createdAt: table.collaborationRequest.createdAt,
            receiver: {
                username: table.user.username,
                artistName: table.profile.artistName
            }
        })
        .from(table.collaborationRequest)
        .innerJoin(table.profile, eq(table.profile.id, table.collaborationRequest.receiverId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId))
        .where(
            and(
                eq(table.collaborationRequest.senderId, profile.id),
                eq(table.collaborationRequest.status, 'pending')
            )
        )
        .orderBy(table.collaborationRequest.createdAt);

    // Get active collaborations
    const acceptedRequests = await db
        .select({
            id: table.collaborationRequest.id,
            senderId: table.collaborationRequest.senderId,
            receiverId: table.collaborationRequest.receiverId,
            updatedAt: table.collaborationRequest.updatedAt
        })
        .from(table.collaborationRequest)
        .where(
            and(
                or(
                    eq(table.collaborationRequest.senderId, profile.id),
                    eq(table.collaborationRequest.receiverId, profile.id)
                ),
                eq(table.collaborationRequest.status, 'accepted')
            )
        );

    // Get profiles for active collaborations
    const activeCollaborations = await Promise.all(
        acceptedRequests.map(async (request) => {
            const otherProfileId =
                request.senderId === profile.id ? request.receiverId : request.senderId;

            const otherProfileData = await db
                .select({
                    id: table.profile.id,
                    userId: table.profile.userId,
                    username: table.user.username,
                    artistName: table.profile.artistName
                })
                .from(table.profile)
                .innerJoin(table.user, eq(table.user.id, table.profile.userId))
                .where(eq(table.profile.id, otherProfileId))
                .get();

            return {
                request,
                otherProfile: otherProfileData
            };
        })
    );

    return {
        user: {
            ...locals.user,
            profile: {
                ...profile
            },
            isAdmin: profile.isAdmin
        },
        pendingRequests,
        sentRequests,
        activeCollaborations
    };
};

export const actions: Actions = {
    acceptRequest: async ({ request, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const requestId = formData.get('requestId')?.toString();

        if (!requestId) {
            return { error: 'Request ID is required' };
        }

        // Get collaboration request
        const collaborationRequest = await db
            .select()
            .from(table.collaborationRequest)
            .where(
                and(
                    eq(table.collaborationRequest.id, requestId),
                    eq(table.collaborationRequest.receiverId, profile.id),
                    eq(table.collaborationRequest.status, 'pending')
                )
            )
            .get();

        if (!collaborationRequest) {
            throw error(404, 'Collaboration request not found');
        }

        // Update request status
        await db
            .update(table.collaborationRequest)
            .set({
                status: 'accepted',
                updatedAt: new Date()
            })
            .where(eq(table.collaborationRequest.id, requestId));

        return { success: true };
    },

    rejectRequest: async ({ request, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const requestId = formData.get('requestId')?.toString();

        if (!requestId) {
            return { error: 'Request ID is required' };
        }

        // Get collaboration request
        const collaborationRequest = await db
            .select()
            .from(table.collaborationRequest)
            .where(
                and(
                    eq(table.collaborationRequest.id, requestId),
                    eq(table.collaborationRequest.receiverId, profile.id),
                    eq(table.collaborationRequest.status, 'pending')
                )
            )
            .get();

        if (!collaborationRequest) {
            throw error(404, 'Collaboration request not found');
        }

        // Update request status
        await db
            .update(table.collaborationRequest)
            .set({
                status: 'rejected',
                updatedAt: new Date()
            })
            .where(eq(table.collaborationRequest.id, requestId));

        return { success: true };
    },

    cancelRequest: async ({ request, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const requestId = formData.get('requestId')?.toString();

        if (!requestId) {
            return { error: 'Request ID is required' };
        }

        // Get collaboration request
        const collaborationRequest = await db
            .select()
            .from(table.collaborationRequest)
            .where(
                and(
                    eq(table.collaborationRequest.id, requestId),
                    eq(table.collaborationRequest.senderId, profile.id),
                    eq(table.collaborationRequest.status, 'pending')
                )
            )
            .get();

        if (!collaborationRequest) {
            throw error(404, 'Collaboration request not found');
        }

        // Delete the request
        await db
            .delete(table.collaborationRequest)
            .where(eq(table.collaborationRequest.id, requestId));

        return { success: true };
    },

    endCollaboration: async ({ request, locals }) => {
        // Check if user is logged in, profile exists and is verified
        const profile = await selectVerifiedProfile(locals.user);

        const formData = await request.formData();
        const requestId = formData.get('requestId')?.toString();

        if (!requestId) {
            return { error: 'Request ID is required' };
        }

        // Get collaboration request
        const collaborationRequest = await db
            .select()
            .from(table.collaborationRequest)
            .where(
                and(
                    eq(table.collaborationRequest.id, requestId),
                    or(
                        eq(table.collaborationRequest.senderId, profile.id),
                        eq(table.collaborationRequest.receiverId, profile.id)
                    ),
                    eq(table.collaborationRequest.status, 'accepted')
                )
            )
            .get();

        if (!collaborationRequest) {
            throw error(404, 'Collaboration not found');
        }

        // Delete the collaboration
        await db
            .delete(table.collaborationRequest)
            .where(eq(table.collaborationRequest.id, requestId));

        return { success: true };
    }
};
