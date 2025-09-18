import { eq, and, inArray, desc, or, gte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

// Simple cache for cocktail data to avoid re-sending same cocktail info
const cocktailCache = new Map<string, any>();

async function getCocktailWithDetails(cocktailId: string) {
    if (cocktailCache.has(cocktailId)) {
        return cocktailCache.get(cocktailId);
    }

    const cocktailWithDetails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            description: table.cocktail.description,
            instructions: table.cocktail.instructions,
            imageUri: table.cocktail.imageUri,
            creator: {
                username: table.user.username,
                artistName: table.profile.artistName
            }
        })
        .from(table.cocktail)
        .innerJoin(table.profile, eq(table.cocktail.creatorId, table.profile.id))
        .innerJoin(table.user, eq(table.profile.userId, table.user.id))
        .where(eq(table.cocktail.id, cocktailId))
        .get();

    if (cocktailWithDetails) {
        // Get doses for this cocktail
        const doses = await db
            .select({
                id: table.dose.id,
                number: table.dose.number,
                quantity: table.dose.quantity,
                ingredient: {
                    id: table.ingredient.id,
                    name: table.ingredient.name
                }
            })
            .from(table.dose)
            .innerJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
            .where(eq(table.dose.cocktailId, cocktailId))
            .orderBy(table.dose.number);

        const result = {
            ...cocktailWithDetails,
            doses
        };

        cocktailCache.set(cocktailId, result);
        return result;
    }

    return null;
}

export async function GET({ locals }) {
    const profile = await selectVerifiedProfile(locals.user);

    let interval: NodeJS.Timeout;
    let isClosed = false;
    let knownCocktailIds = new Set<string>();

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
                if (isClosed) return;

                try {
                    // Get active and recently completed orders (within last 10 minutes)
                    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

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
                                or(
                                    // Active orders
                                    inArray(table.order.status, ['pending', 'in_progress']),
                                    // Recently completed orders (within last 10 minutes)
                                    and(
                                        inArray(table.order.status, [
                                            'completed',
                                            'failed',
                                            'cancelled'
                                        ]),
                                        gte(table.order.updatedAt, tenMinutesAgo)
                                    )
                                )
                            )
                        )
                        .orderBy(desc(table.order.createdAt));

                    // Get device info for orders that have devices
                    const deviceIds = rawActiveOrders
                        .map((o) => o.deviceId)
                        .filter(Boolean) as string[];

                    const devices =
                        deviceIds.length > 0
                            ? await db
                                  .select({ id: table.device.id, name: table.device.name })
                                  .from(table.device)
                                  .where(inArray(table.device.id, deviceIds))
                            : [];

                    const deviceMap = new Map(devices.map((d) => [d.id, d]));

                    // Get current dose info
                    const currentDoseIds = rawActiveOrders
                        .map((o) => o.currentDoseId)
                        .filter(Boolean) as string[];

                    const currentDoses =
                        currentDoseIds.length > 0
                            ? await db
                                  .select({
                                      id: table.dose.id,
                                      number: table.dose.number,
                                      quantity: table.dose.quantity,
                                      ingredient: {
                                          id: table.ingredient.id,
                                          name: table.ingredient.name
                                      }
                                  })
                                  .from(table.dose)
                                  .innerJoin(
                                      table.ingredient,
                                      eq(table.dose.ingredientId, table.ingredient.id)
                                  )
                                  .where(inArray(table.dose.id, currentDoseIds))
                            : [];

                    const currentDoseMap = new Map(currentDoses.map((d) => [d.id, d]));

                    // Determine which cocktails need full data
                    const newCocktailIds = rawActiveOrders
                        .map((o) => o.cocktailId)
                        .filter((id) => !knownCocktailIds.has(id));

                    // Get full cocktail data for new cocktails
                    const newCocktails = new Map();
                    for (const cocktailId of newCocktailIds) {
                        const cocktailDetails = await getCocktailWithDetails(cocktailId);
                        if (cocktailDetails) {
                            newCocktails.set(cocktailId, cocktailDetails);
                            knownCocktailIds.add(cocktailId);
                        }
                    }

                    // Build enriched active orders
                    const activeOrders = rawActiveOrders.map((order) => {
                        const device = order.deviceId ? deviceMap.get(order.deviceId) : null;
                        const currentDose = order.currentDoseId
                            ? currentDoseMap.get(order.currentDoseId)
                            : null;

                        return {
                            id: order.id,
                            createdAt: order.createdAt,
                            updatedAt: order.updatedAt,
                            status: order.status,
                            doseProgress: order.doseProgress,
                            errorMessage: order.errorMessage,
                            cocktailId: order.cocktailId,
                            device: device ? { id: device.id, name: device.name } : null,
                            currentDose: currentDose
                                ? {
                                      id: currentDose.id,
                                      number: currentDose.number,
                                      quantity: currentDose.quantity,
                                      ingredient: currentDose.ingredient
                                  }
                                : null
                        };
                    });

                    // Determine polling frequency based on order status
                    const hasInProgressOrders = activeOrders.some(
                        (o) => o.status === 'in_progress'
                    );
                    const hasActiveOrders = activeOrders.some((o) =>
                        ['pending', 'in_progress'].includes(o.status)
                    );
                    const nextInterval = hasInProgressOrders ? 1000 : hasActiveOrders ? 3000 : 5000;

                    // Update interval if needed
                    if (interval) {
                        clearInterval(interval);
                    }
                    if (!isClosed) {
                        interval = setInterval(sendUpdate, nextInterval);
                    }

                    if (!isClosed) {
                        const response: any = { activeOrders };

                        // Include full cocktail data for new cocktails
                        if (newCocktails.size > 0) {
                            response.newCocktails = Object.fromEntries(newCocktails);
                        }

                        controller.enqueue(`data: ${JSON.stringify(response)}\n\n`);
                    }
                } catch (error) {
                    console.error('SSE error:', error);
                    if (!isClosed) {
                        try {
                            controller.enqueue(
                                `data: ${JSON.stringify({ error: 'Failed to fetch orders' })}\n\n`
                            );
                        } catch (enqueueError) {
                            cleanup();
                        }
                    }
                }
            };

            // Send initial data
            sendUpdate();

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
