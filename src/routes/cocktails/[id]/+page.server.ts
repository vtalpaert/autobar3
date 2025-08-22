import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';
import { checkCocktailAccess } from '$lib/server/cocktail-permissions';

export const load: PageServerLoad = async ({ params, locals }) => {
    // Get verified profile (reusing existing function)
    const profile = await selectVerifiedProfile(locals.user);

    // Check cocktail access and get cocktail data (reusing permission logic)
    const { hasAccess, cocktail } = await checkCocktailAccess(profile, params.id);
    
    if (!hasAccess || !cocktail) {
        throw error(404, 'Cocktail not found');
    }

    // Get creator name
    const creator = await db
        .select({ username: table.user.username })
        .from(table.user)
        .innerJoin(table.profile, eq(table.profile.userId, table.user.id))
        .where(eq(table.profile.id, cocktail.creatorId))
        .get();

    // Add creator name to cocktail
    cocktail.creatorName = creator?.username || 'Unknown';

    // Get doses with ingredients for this cocktail
    const doses = await db
        .select({
            id: table.dose.id,
            quantity: table.dose.quantity,
            number: table.dose.number,
            ingredient: table.ingredient
        })
        .from(table.dose)
        .innerJoin(table.ingredient, eq(table.dose.ingredientId, table.ingredient.id))
        .where(eq(table.dose.cocktailId, params.id))
        .orderBy(table.dose.number);

    // Add doses to cocktail
    cocktail.doses = doses;

    // Get user's devices
    const devices = await db
        .select()
        .from(table.device)
        .where(eq(table.device.profileId, profile.id));

    // Find default device if exists
    const defaultDevice = devices.find(device => device.isDefault) || devices[0];

    return {
        cocktail,
        user: {
            ...locals.user,
            isAdmin: profile?.isAdmin || false
        },
        devices,
        defaultDevice
    };
};

export const actions: Actions = {
    createOrder: async ({ params, locals, request }) => {
        const profile = await selectVerifiedProfile(locals.user);

        // Get form data
        const formData = await request.formData();
        const deviceId = formData.get('deviceId')?.toString() || null;

        // Get cocktail ID from params
        const cocktailId = params.id;

        // If no device ID was provided in the form, find the default device
        let selectedDeviceId = deviceId;
        if (!selectedDeviceId) {
            const devices = await db
                .select()
                .from(table.device)
                .where(eq(table.device.profileId, profile.id));

            // Use default device or first device
            const defaultDevice = devices.find(device => device.isDefault) || devices[0];
            if (defaultDevice) {
                selectedDeviceId = defaultDevice.id;
            } else {
                throw error(400, 'No device available for order');
            }
        }

        // Get the first dose for the cocktail to set as current
        const firstDose = await db
            .select()
            .from(table.dose)
            .where(eq(table.dose.cocktailId, cocktailId))
            .orderBy(table.dose.number)
            .limit(1)
            .get();

        if (!firstDose) {
            throw error(400, 'Cocktail has no doses');
        }

        // Create new order
        const newOrder = {
            id: nanoid(),
            createdAt: new Date(),
            updatedAt: new Date(),
            customerId: profile.id,
            deviceId: selectedDeviceId,
            cocktailId: cocktailId,
            currentDoseId: firstDose.id,
            doseProgress: 0,
            status: 'pending'
        };

        await db.insert(table.order).values(newOrder);

        // Redirect to my bar page (will be created in next step)
        throw redirect(303, '/my-bar');
    }
};
