import { json } from '@sveltejs/kit';
import { storeWeight } from '$lib/server/weight-store.js';
import { authenticateDevice } from '$lib/server/device-auth';

export async function POST({ request }) {
    const data = await request.json();
    const { token, weight, rawMeasure } = data;

    if (weight === undefined || rawMeasure === undefined) {
        return json(
            {
                error: 'Missing weight or rawMeasure'
            },
            { status: 400 }
        );
    }

    // Authenticate device
    const authResult = await authenticateDevice(request, token);
    if (!authResult.success) {
        return json({ error: authResult.error }, { status: authResult.status });
    }

    const device = authResult.device;

    // Store current weight measurement in memory
    storeWeight(device.id, weight, rawMeasure);

    // Return device calibration configuration
    const response = {
        needCalibration: device.needCalibration,
        hx711Dt: device.hx711Dt,
        hx711Sck: device.hx711Sck,
        hx711Offset: device.hx711Offset,
        hx711Scale: device.hx711Scale
    };

    return json(response);
}
