import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function POST({ request }) {
    const deviceId = await request.text();
    const token = nanoid(32); // Generate a secure random token
    
    await db
        .update(table.device)
        .set({ apiToken: token })
        .where(eq(table.device.id, deviceId));
    
    return json({ token });
}
