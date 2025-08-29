import { eq, and, inArray, desc, gte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

// Cache for static data to avoid repeated JOINs
const staticDataCache = new Map<string, {
    cocktails: Map<string, { id: string, name: string }>,
    devices: Map<string, { id: string, name: string }>,
    ingredients: Map<string, { id: string, name: string }>,
    doses: Map<string, { id: string, number: number, quantity: number, ingredientId: string }>,
    lastUpdated: number
}>();

async function getStaticData(profileId: string) {
    const cacheKey = profileId;
    const cached = staticDataCache.get(cacheKey);
    const now = Date.now();
    
    // Cache for 30 seconds
    if (cached && (now - cached.lastUpdated) < 30000) {
        return cached;
    }
    
    // Fetch all static data in parallel
    const [cocktails, devices, ingredients, doses] = await Promise.all([
        db.select({ id: table.cocktail.id, name: table.cocktail.name })
          .from(table.cocktail),
        db.select({ id: table.device.id, name: table.device.name })
          .from(table.device)
          .where(eq(table.device.profileId, profileId)),
        db.select({ id: table.ingredient.id, name: table.ingredient.name })
          .from(table.ingredient),
        db.select({ 
            id: table.dose.id, 
            number: table.dose.number, 
            quantity: table.dose.quantity, 
            ingredientId: table.dose.ingredientId 
        }).from(table.dose)
    ]);
    
    const staticData = {
        cocktails: new Map(cocktails.map(c => [c.id, c])),
        devices: new Map(devices.map(d => [d.id, d])),
        ingredients: new Map(ingredients.map(i => [i.id, i])),
        doses: new Map(doses.map(d => [d.id, d])),
        lastUpdated: now
    };
    
    staticDataCache.set(cacheKey, staticData);
    return staticData;
}

export async function GET({ locals }) {
    const profile = await selectVerifiedProfile(locals.user);
    
    let interval: NodeJS.Timeout;
    let isClosed = false;
    let previousActiveOrderIds = new Set<string>();
    
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
                    // Simplified query - no JOINs, just essential order data
                    const rawActiveOrders = await db
                        .select({
                            id: table.order.id,
                            createdAt: table.order.createdAt,
                            updatedAt: table.order.updatedAt,
                            status: table.order.status,
                            doseProgress: table.order.doseProgress,
                            errorMessage: table.order.errorMessage,
                            cocktailId: table.order.cocktailId,
                            deviceId: table.order.deviceId,
                            currentDoseId: table.order.currentDoseId
                        })
                        .from(table.order)
                        .where(
                            and(
                                eq(table.order.customerId, profile.id),
                                inArray(table.order.status, ['pending', 'in_progress'])
                            )
                        )
                        .orderBy(desc(table.order.createdAt));

                    // Get cached static data
                    const staticData = await getStaticData(profile.id);
                    
                    // Enrich orders with cached data
                    const activeOrders = rawActiveOrders.map(order => {
                        const cocktail = staticData.cocktails.get(order.cocktailId);
                        const device = order.deviceId ? staticData.devices.get(order.deviceId) : null;
                        const currentDose = order.currentDoseId ? staticData.doses.get(order.currentDoseId) : null;
                        const ingredient = currentDose?.ingredientId ? staticData.ingredients.get(currentDose.ingredientId) : null;
                        
                        return {
                            id: order.id,
                            createdAt: order.createdAt,
                            updatedAt: order.updatedAt,
                            status: order.status,
                            doseProgress: order.doseProgress,
                            errorMessage: order.errorMessage,
                            cocktail: cocktail ? { id: cocktail.id, name: cocktail.name } : null,
                            device: device ? { id: device.id, name: device.name } : null,
                            currentDose: currentDose && ingredient ? {
                                id: currentDose.id,
                                number: currentDose.number,
                                quantity: currentDose.quantity,
                                ingredient: { id: ingredient.id, name: ingredient.name }
                            } : null
                        };
                    });

                    const currentActiveOrderIds = new Set(activeOrders.map(o => o.id));
                    let completedOrders: any[] = [];
                    
                    if (previousActiveOrderIds.size > 0) {
                        // Normal case: detect orders that were active but now aren't
                        const completedOrderIds = [...previousActiveOrderIds].filter(id => !currentActiveOrderIds.has(id));
                        
                        if (completedOrderIds.length > 0) {
                            const rawCompletedOrders = await db
                                .select({
                                    id: table.order.id,
                                    createdAt: table.order.createdAt,
                                    updatedAt: table.order.updatedAt,
                                    status: table.order.status,
                                    errorMessage: table.order.errorMessage,
                                    cocktailId: table.order.cocktailId,
                                    deviceId: table.order.deviceId
                                })
                                .from(table.order)
                                .where(
                                    and(
                                        eq(table.order.customerId, profile.id),
                                        inArray(table.order.id, completedOrderIds)
                                    )
                                );
                            
                            // Enrich with cached data
                            completedOrders = rawCompletedOrders.map(order => {
                                const cocktail = staticData.cocktails.get(order.cocktailId);
                                const device = order.deviceId ? staticData.devices.get(order.deviceId) : null;
                                
                                return {
                                    id: order.id,
                                    createdAt: order.createdAt,
                                    updatedAt: order.updatedAt,
                                    status: order.status,
                                    errorMessage: order.errorMessage,
                                    cocktail: cocktail ? { id: cocktail.id, name: cocktail.name } : null,
                                    device: device ? { id: device.id, name: device.name } : null
                                };
                            });
                        }
                    } else {
                        // First connection: check for very recently completed orders (last 10 seconds)
                        // This catches orders cancelled via form action before SSE reconnection
                        const tenSecondsAgo = new Date(Date.now() - 10000);
                        
                        const rawRecentOrders = await db
                            .select({
                                id: table.order.id,
                                createdAt: table.order.createdAt,
                                updatedAt: table.order.updatedAt,
                                status: table.order.status,
                                errorMessage: table.order.errorMessage,
                                cocktailId: table.order.cocktailId,
                                deviceId: table.order.deviceId
                            })
                            .from(table.order)
                            .where(
                                and(
                                    eq(table.order.customerId, profile.id),
                                    inArray(table.order.status, ['completed', 'failed', 'cancelled']),
                                    // Only orders updated in last 10 seconds
                                    gte(table.order.updatedAt, tenSecondsAgo)
                                )
                            )
                            .orderBy(desc(table.order.updatedAt));
                        
                        // Enrich with cached data
                        completedOrders = rawRecentOrders.map(order => {
                            const cocktail = staticData.cocktails.get(order.cocktailId);
                            const device = order.deviceId ? staticData.devices.get(order.deviceId) : null;
                            
                            return {
                                id: order.id,
                                createdAt: order.createdAt,
                                updatedAt: order.updatedAt,
                                status: order.status,
                                errorMessage: order.errorMessage,
                                cocktail: cocktail ? { id: cocktail.id, name: cocktail.name } : null,
                                device: device ? { id: device.id, name: device.name } : null
                            };
                        });
                    }
                    
                    // Update previous state
                    previousActiveOrderIds = currentActiveOrderIds;

                    // Double-check before enqueueing
                    if (!isClosed) {
                        try {
                            controller.enqueue(`data: ${JSON.stringify({ 
                                activeOrders,
                                completedOrders: completedOrders.length > 0 ? completedOrders : undefined
                            })}\n\n`);
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
            
            // Send updates every 1 second for good balance of real-time feel and performance
            interval = setInterval(sendUpdate, 1000);
            
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
