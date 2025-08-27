import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';
import { getCurrentWeight } from '$lib/server/weight-store.js';

export async function GET({ locals, params }) {
    const profile = await selectVerifiedProfile(locals.user);
    const deviceId = params.deviceId;
    
    if (!deviceId) {
        return new Response('Device ID required', { status: 400 });
    }

    // Verify device belongs to user
    const device = await db
        .select()
        .from(table.device)
        .where(eq(table.device.id, deviceId))
        .get();

    if (!device || device.profileId !== profile.id) {
        return new Response('Device not found or access denied', { status: 404 });
    }
    
    let interval: NodeJS.Timeout;
    let isClosed = false;
    
    const cleanup = () => {
        if (!isClosed) {
            isClosed = true;
            if (interval) {
                clearInterval(interval);
            }
        }
    };
    
    const stream = new ReadableStream({
        start(controller) {
            const sendUpdate = async () => {
                if (isClosed) {
                    return;
                }

                try {
                    const currentWeight = getCurrentWeight(deviceId);
                    
                    if (!isClosed) {
                        try {
                            controller.enqueue(`data: ${JSON.stringify({ 
                                weight: currentWeight
                            })}\n\n`);
                        } catch (enqueueError) {
                            cleanup();
                        }
                    }
                } catch (error) {
                    console.error('Calibration SSE error:', error);
                    if (!isClosed) {
                        try {
                            controller.enqueue(`data: ${JSON.stringify({ 
                                error: 'Failed to fetch weight' 
                            })}\n\n`);
                        } catch (enqueueError) {
                            cleanup();
                        }
                    }
                }
            };

            // Send initial data
            sendUpdate();
            
            // Send updates every 1 second for calibration
            interval = setInterval(sendUpdate, 1000);
            
            return cleanup;
        },
        cancel: cleanup
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        }
    });
}
