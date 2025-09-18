import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
    const data = await request.json();
    const { token, firmwareVersion, needsCalibration } = data;

    if (!token || !firmwareVersion) {
        return json(
            {
                tokenValid: false,
                message: 'Missing token or firmware version'
            },
            { status: 401 }
        );
    }

    const device = await db
        .select()
        .from(table.device)
        .where(eq(table.device.apiToken, token))
        .get();

    if (!device) {
        return json(
            {
                tokenValid: false,
                message: `Your token '${token}' is invalid, you should enroll again`
            },
            { status: 401 }
        );
    }

    // Update the firmware version, ping time, and calibration status if provided
    const updateData: any = {
        firmwareVersion,
        lastPingAt: new Date()
    };

    // If device reports it needs calibration, update the database
    if (needsCalibration === true) {
        updateData.needCalibration = true;
    }

    await db.update(table.device).set(updateData).where(eq(table.device.id, device.id));

    return json({
        tokenValid: true,
        message: 'Hello from the server',
        needCalibration: device.needCalibration
    });
}
