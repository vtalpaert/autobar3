import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

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

    // Get counts for dashboard
    const [userCount] = await db
        .select({ count: count() })
        .from(table.user);
    
    const [unverifiedCount] = await db
        .select({ count: count() })
        .from(table.profile)
        .where(eq(table.profile.isVerified, false));
    
    const [cocktailCount] = await db
        .select({ count: count() })
        .from(table.cocktail);
    
    const [deviceCount] = await db
        .select({ count: count() })
        .from(table.device);
        
    const [ingredientCount] = await db
        .select({ count: count() })
        .from(table.ingredient);
        
    const [doseCount] = await db
        .select({ count: count() })
        .from(table.dose);

    return {
        counts: {
            users: userCount.count,
            unverifiedProfiles: unverifiedCount.count,
            cocktails: cocktailCount.count,
            devices: deviceCount.count,
            ingredients: ingredientCount.count,
            doses: doseCount.count
        },
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};
