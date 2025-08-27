import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { storeWeight } from '$lib/server/weight-store.js';

export async function POST({ request }) {
    const data = await request.json();
    const { token, weightGrams } = data;

    if (!token || weightGrams === undefined) {
        return json({
            error: "Missing token or weight measurement"
        }, { status: 400 });
    }

    // Find the device by token
    const device = await db
        .select()
        .from(table.device)
        .where(eq(table.device.apiToken, token))
        .get();

    if (!device) {
        return json({
            error: "Invalid device token"
        }, { status: 401 });
    }

    // Store current weight measurement in memory
    storeWeight(device.id, weightGrams);

    // Update last ping time
    await db
        .update(table.device)
        .set({ lastPingAt: new Date() })
        .where(eq(table.device.id, device.id));

    // Return device calibration configuration
    return json({
        needCalibration: device.needCalibration,
        hx711Dt: device.hx711Dt,
        hx711Sck: device.hx711Sck,
        hx711Offset: device.hx711Offset,
        hx711Scale: device.hx711Scale
    });
}
