import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }

    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, locals.user.id))
        .get();

    if (!profile || !profile.isVerified) {
        throw redirect(302, '/profile/unverified');
    }

    // Get all active collaborations for the current user
    const collaborations = await db
        .select({
            collaboratorProfileId: table.collaborationRequest.receiverId,
        })
        .from(table.collaborationRequest)
        .where(
            and(
                eq(table.collaborationRequest.senderId, profile.id),
                eq(table.collaborationRequest.status, 'accepted')
            )
        )
        .union(
            db.select({
                collaboratorProfileId: table.collaborationRequest.senderId,
            })
            .from(table.collaborationRequest)
            .where(
                and(
                    eq(table.collaborationRequest.receiverId, profile.id),
                    eq(table.collaborationRequest.status, 'accepted')
                )
            )
        );
    
    // Extract profile IDs of collaborators
    const collaboratorProfileIds = collaborations.map(c => c.collaboratorProfileId);
    
    // Add the user's own profile ID to include their own cocktails
    const allowedProfileIds = [profile.id, ...collaboratorProfileIds];
    
    // Get cocktails created by the user and their collaborators
    const cocktails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            description: table.cocktail.description,
            creatorId: table.cocktail.creatorId,
            creatorName: table.user.username
        })
        .from(table.cocktail)
        .innerJoin(table.profile, eq(table.profile.id, table.cocktail.creatorId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId))
        .where(inArray(table.cocktail.creatorId, allowedProfileIds));

    return { 
        cocktails,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        },
        profile
    };
};
