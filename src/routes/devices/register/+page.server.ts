import type { PageServerLoad } from './$types';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);

    return {
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        }
    };
};
