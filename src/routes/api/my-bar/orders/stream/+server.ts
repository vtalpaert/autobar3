import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export async function GET({ locals }) {
    const profile = await selectVerifiedProfile(locals.user);
    
    let interval: NodeJS.Timeout;
    let isClosed = false;
    
    // Track this controller for cleanup
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
                // Check if controller is closed before trying to enqueue
                if (isClosed) {
                    return;
                }

                try {
                    const activeOrders = await db
                        .select({
                            id: table.order.id,
                            createdAt: table.order.createdAt,
                            updatedAt: table.order.updatedAt,
                            status: table.order.status,
                            doseProgress: table.order.doseProgress,
                            errorMessage: table.order.errorMessage,
                            cocktail: {
                                id: table.cocktail.id,
                                name: table.cocktail.name
                            },
                            device: {
                                id: table.device.id,
                                name: table.device.name
                            },
                            currentDose: {
                                id: table.dose.id,
                                number: table.dose.number,
                                quantity: table.dose.quantity,
                                ingredient: {
                                    id: table.ingredient.id,
                                    name: table.ingredient.name
                                }
                            }
                        })
                        .from(table.order)
                        .innerJoin(table.cocktail, eq(table.order.cocktailId, table.cocktail.id))
                        .innerJoin(table.device, eq(table.order.deviceId, table.device.id))
                        .leftJoin(table.dose, eq(table.order.currentDoseId, table.dose.id))
                        .leftJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
                        .where(
                            and(
                                eq(table.order.customerId, profile.id),
                                inArray(table.order.status, ['pending', 'in_progress'])
                            )
                        )
                        .orderBy(desc(table.order.createdAt));

                    // Double-check before enqueueing
                    if (!isClosed) {
                        try {
                            controller.enqueue(`data: ${JSON.stringify({ activeOrders })}\n\n`);
                        } catch (enqueueError) {
                            // Controller was closed between checks
                            cleanup();
                        }
                    }
                } catch (error) {
                    console.error('SSE error:', error);
                    if (!isClosed) {
                        try {
                            controller.enqueue(`data: ${JSON.stringify({ error: 'Failed to fetch orders' })}\n\n`);
                        } catch (enqueueError) {
                            // Controller is already closed, stop the interval
                            cleanup();
                        }
                    }
                }
            };

            // Send initial data
            sendUpdate();
            
            // Send updates every 2 seconds
            interval = setInterval(sendUpdate, 2000);
            
            // Cleanup on close
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
