import { eq, or, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Profile } from '$lib/server/db/schema';

/**
 * Check if a user has access to view a cocktail
 * Access is granted if:
 * 1. User is the creator
 * 2. User is an admin
 * 3. User has an accepted collaboration with the creator
 */
export async function checkCocktailAccess(
    profile: Profile,
    cocktailId: string
): Promise<{ hasAccess: boolean; cocktail?: any }> {
    // Get cocktail with creator info
    const cocktail = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            description: table.cocktail.description,
            instructions: table.cocktail.instructions,
            imageUri: table.cocktail.imageUri,
            creatorId: table.cocktail.creatorId,
            createdAt: table.cocktail.createdAt
        })
        .from(table.cocktail)
        .where(eq(table.cocktail.id, cocktailId))
        .get();

    if (!cocktail) {
        return { hasAccess: false };
    }

    // Admin or creator always has access
    if (profile.isAdmin || profile.id === cocktail.creatorId) {
        return { hasAccess: true, cocktail };
    }

    // Check for accepted collaboration
    const collaboration = await db
        .select()
        .from(table.collaborationRequest)
        .where(
            and(
                or(
                    and(
                        eq(table.collaborationRequest.senderId, profile.id),
                        eq(table.collaborationRequest.receiverId, cocktail.creatorId)
                    ),
                    and(
                        eq(table.collaborationRequest.senderId, cocktail.creatorId),
                        eq(table.collaborationRequest.receiverId, profile.id)
                    )
                ),
                eq(table.collaborationRequest.status, 'accepted')
            )
        )
        .get();

    return { hasAccess: !!collaboration, cocktail };
}

/**
 * Check if a user can edit a cocktail (creator or admin only)
 */
export async function checkCocktailEditAccess(
    profile: Profile,
    cocktailId: string
): Promise<{ canEdit: boolean; cocktail?: any }> {
    const cocktail = await db
        .select()
        .from(table.cocktail)
        .where(eq(table.cocktail.id, cocktailId))
        .get();

    if (!cocktail) {
        return { canEdit: false };
    }

    const canEdit = profile.isAdmin || profile.id === cocktail.creatorId;
    return { canEdit, cocktail };
}
