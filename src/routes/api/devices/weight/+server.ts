import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// In-memory store for current weight measurements
// Map<deviceId, { weight: number, timestamp: number }>
const weightMeasurements = new Map<string, { weight: number; timestamp: number }>();

// Cleanup stale measurements (older than 30 seconds)
function cleanupStaleWeights() {
    const now = Date.now();
    const staleThreshold = 30 * 1000; // 30 seconds
    
    for (const [deviceId, measurement] of weightMeasurements.entries()) {
        if (now - measurement.timestamp > staleThreshold) {
            weightMeasurements.delete(deviceId);
        }
    }
}

// Export function to get current weight for SSE
export function getCurrentWeight(deviceId: string): number | null {
    cleanupStaleWeights();
    const measurement = weightMeasurements.get(deviceId);
    return measurement ? measurement.weight : null;
}

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
    weightMeasurements.set(device.id, {
        weight: weightGrams,
        timestamp: Date.now()
    });

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
