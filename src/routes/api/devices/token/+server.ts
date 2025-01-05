import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function POST({ request, locals }) {
    // Check if user is logged in and has a verified profile
    if (!locals.user?.profile?.verified) {
        return new Response('Unauthorized - Profile not verified', { status: 401 });
    }

    const deviceId = await request.text();
    const token = nanoid(32); // Generate a secure random token
    
    await db
        .update(table.device)
        .set({ apiToken: token })
        .where(eq(table.device.id, deviceId));
    
    return json({ token });
}
