import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, selectVerifiedProfile, sessionCookieName } from '$lib/server/auth';
import { checkCocktailAccess } from '$lib/server/cocktail-permissions';
import { getCocktailImagePath } from '$lib/server/storage';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';

export const GET: RequestHandler = async ({ params, request, cookies }) => {
    try {
        // Get session token from cookie
        const sessionToken = cookies.get(sessionCookieName);
        if (!sessionToken) {
            throw error(401, 'Authentication required');
        }

        // Validate session and get user
        const sessionResult = await validateSessionToken(sessionToken);
        if (!sessionResult.session || !sessionResult.user) {
            throw error(401, 'Invalid session');
        }

        // Get verified profile (reusing existing function)
        const profile = await selectVerifiedProfile(sessionResult.user);

        // Check cocktail access (reusing permission logic)
        const { hasAccess, cocktail } = await checkCocktailAccess(profile, params.id);

        if (!hasAccess || !cocktail) {
            throw error(403, 'Access denied');
        }

        if (!cocktail.imageUri) {
            throw error(404, 'Image not found');
        }

        // Get the image file path
        const imagePath = getCocktailImagePath(cocktail.creatorId, cocktail.id);

        if (!existsSync(imagePath)) {
            throw error(404, 'Image file not found');
        }

        // Get file stats for ETag generation
        const stats = await stat(imagePath);
        const etag = `"${cocktail.id}-${stats.mtime.getTime()}"`;

        // Check if client has current version
        const clientETag = request.headers.get('if-none-match');
        if (clientETag === etag) {
            return new Response(null, {
                status: 304,
                headers: { ETag: etag }
            });
        }

        // Read and serve the image with ETag
        const imageBuffer = await readFile(imagePath);

        return new Response(imageBuffer, {
            headers: {
                'Content-Type': 'image/webp',
                ETag: etag,
                'Cache-Control': 'private, max-age=300, must-revalidate',
                'Content-Length': imageBuffer.length.toString()
            }
        });
    } catch (err) {
        if (err instanceof Error && 'status' in err) {
            throw err;
        }
        console.error('Error serving cocktail image:', err);
        throw error(500, 'Internal server error');
    }
};
