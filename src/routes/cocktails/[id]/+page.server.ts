import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { selectVerifiedProfile } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ params, locals }) => {
    // Check if user is logged in, profile exists and is verified
    const profile = await selectVerifiedProfile(locals.user);

    const cocktails = await db
        .select({
            id: table.cocktail.id,
            name: table.cocktail.name,
            description: table.cocktail.description,
            instructions: table.cocktail.instructions,
            creatorName: table.user.username,
            creatorId: table.cocktail.creatorId,
            createdAt: table.cocktail.createdAt
        })
        .from(table.cocktail)
        .innerJoin(table.profile, eq(table.profile.id, table.cocktail.creatorId))
        .innerJoin(table.user, eq(table.user.id, table.profile.userId))
        .where(eq(table.cocktail.id, params.id));

    const cocktail = cocktails[0];

    if (!cocktail) {
        throw error(404, 'Cocktail not found');
    }

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
