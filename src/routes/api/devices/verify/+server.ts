import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateDevice } from '$lib/server/device-auth';

export async function POST({ request }) {
    const data = await request.json();
    const { token, firmwareVersion, needsCalibration } = data;

    if (!firmwareVersion) {
        return json(
            {
                tokenValid: false,
                message: 'Missing firmware version'
            },
            { status: 400 }
        );
    }

    // Authenticate device
    const authResult = await authenticateDevice(request, token);
    if (!authResult.success) {
        return json(
            {
                tokenValid: false,
                message: authResult.error
            },
            { status: authResult.status }
        );
    }

    const device = authResult.device;

    // Update the firmware version and calibration status if provided
    const updateData: any = {
        firmwareVersion
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
