import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and, or, ne, count } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }
    
    // Get user profile
    const profile = await db
        .select()
        .from(table.profile)
        .where(eq(table.profile.userId, locals.user.id))
        .get();
        
    if (!profile) {
        throw error(404, 'Profile not found');
    }
    
    // Get all verified profiles except the current user
    const artistsWithCocktails = await db
        .select({
            id: table.profile.id,
            userId: table.profile.userId,
            username: table.user.username,
            artistName: table.profile.artistName,
            cocktailCount: count(table.cocktail.id)
        })
        .from(table.profile)
        .innerJoin(table.user, eq(table.user.id, table.profile.userId))
        .leftJoin(table.cocktail, eq(table.cocktail.creatorId, table.profile.id))
        .where(
            and(
                ne(table.profile.id, profile.id),
                eq(table.profile.isVerified, true)
            )
        )
        .groupBy(table.profile.id, table.user.username, table.profile.artistName)
        .orderBy(table.user.username);
    
    // Get pending requests (received)
    const pendingRequests = await db
        .select({
            id: table.collaborationRequest.id,
            senderId: table.collaborationRequest.senderId,
            message: table.collaborationRequest.message,
            createdAt: table.collaborationRequest.createdAt
        })
        .from(table.collaborationRequest)
        .where(
            and(
                eq(table.collaborationRequest.receiverId, profile.id),
                eq(table.collaborationRequest.status, 'pending')
            )
        );
    
    // Get sent requests
    const sentRequests = await db
        .select({
            id: table.collaborationRequest.id,
            receiverId: table.collaborationRequest.receiverId,
            message: table.collaborationRequest.message,
            createdAt: table.collaborationRequest.createdAt
        })
        .from(table.collaborationRequest)
        .where(
            and(
                eq(table.collaborationRequest.senderId, profile.id),
                eq(table.collaborationRequest.status, 'pending')
            )
        );
    
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
            const otherProfileId = request.senderId === profile.id 
                ? request.receiverId 
                : request.senderId;
            
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
            isAdmin: profile.isAdmin
        },
        artists: artistsWithCocktails,
        pendingRequests,
        sentRequests,
        activeCollaborations
    };
};

export const actions: Actions = {
    sendRequest: async ({ request, locals }) => {
        if (!locals.user) {
            throw redirect(302, '/auth/login');
        }
        
        const formData = await request.formData();
        const receiverId = formData.get('receiverId')?.toString();
        const message = formData.get('message')?.toString() || '';
        
        if (!receiverId) {
            return { error: 'Receiver ID is required' };
        }
        
        // Get user profile
        const profile = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.userId, locals.user.id))
            .get();
            
        if (!profile) {
            throw error(404, 'Profile not found');
        }
        
        // Check if receiver exists
        const receiver = await db
            .select()
            .from(table.profile)
            .where(eq(table.profile.id, receiverId))
            .get();
            
        if (!receiver) {
            throw error(404, 'Receiver not found');
        }
        
        // Check if a request already exists
        const existingRequest = await db
            .select()
            .from(table.collaborationRequest)
            .where(
                and(
                    eq(table.collaborationRequest.senderId, profile.id),
                    eq(table.collaborationRequest.receiverId, receiverId),
                    eq(table.collaborationRequest.status, 'pending')
                )
            )
            .get();
            
        if (existingRequest) {
            return { error: 'A request already exists' };
        }
        
        // Create the collaboration request
        await db.insert(table.collaborationRequest).values({
            id: crypto.randomUUID(),
            senderId: profile.id,
            receiverId,
            message,
            status: 'pending',
            createdAt: new Date()
        });
        
        return { 
            success: true,
            receiverId
        };
    }
};
