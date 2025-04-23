import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
    const data = await request.json();
    const { token, firmwareVersion } = data;

    if (!token || !firmwareVersion) {
        return json({
            tokenValid: false,
            message: "Missing token or firmware version"
        });
    }

    const device = await db
        .select()
        .from(table.device)
        .where(eq(table.device.apiToken, token))
        .get();

    if (!device) {
        return json({
            tokenValid: false,
            message: `Your token '${token}' is invalid, you should enroll again`
        });
    }

    // Update the firmware version and ping time
    await db
        .update(table.device)
        .set({ 
            firmwareVersion,
            lastPingAt: new Date()
        })
        .where(eq(table.device.id, device.id));

    const response = {
        tokenValid: true,
        message: "Hello from the server"
    };
    
    return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': JSON.stringify(response).length.toString()
        }
    });
}
