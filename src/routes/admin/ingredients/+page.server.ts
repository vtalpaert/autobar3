import { db } from '$lib/server/db';
import { ingredient } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if user is admin
  if (!locals.user?.isAdmin) {
    throw redirect(302, '/');
  }
  
  const ingredients = await db.query.ingredient.findMany({
    orderBy: (fields, { asc }) => [asc(fields.name)]
  });
  
  return { ingredients };
};

export const actions: Actions = {
  delete: async ({ request, locals }) => {
    // Check if user is admin
    if (!locals.user?.isAdmin) {
      return fail(403, { message: 'Unauthorized' });
    }
    
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    
    if (!id) {
      return fail(400, { message: 'Invalid ingredient ID' });
    }
    
    await db.delete(ingredient).where(eq(ingredient.id, id));
    
    return { success: true };
  },
  
  upload: async ({ request, locals }) => {
    // Check if user is admin
    if (!locals.user?.isAdmin) {
      return fail(403, { message: 'Unauthorized' });
    }
    
    const formData = await request.formData();
    const file = formData.get('ingredientsFile') as File;
    
    if (!file) {
      return fail(400, { message: 'No file uploaded' });
    }
    
    try {
      const content = await file.text();
      const ingredients = JSON.parse(content);
      
      if (!Array.isArray(ingredients)) {
        return fail(400, { message: 'Invalid JSON format. Expected an array.' });
      }
      
      for (const item of ingredients) {
        if (!item.name || typeof item.alcoholPercentage !== 'number') {
          return fail(400, { 
            message: 'Invalid ingredient data. Each item must have name and alcoholPercentage.' 
          });
        }
        
        // Check if ingredient already exists
        const existing = await db.query.ingredient.findFirst({
          where: (fields, { eq }) => eq(fields.name, item.name)
        });
        
        if (!existing) {
          await db.insert(ingredient).values({
            id: nanoid(),
            name: item.name,
            alcoholPercentage: item.alcoholPercentage,
            density: item.density || 1000,
            addedSeparately: item.addedSeparately || false
          });
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error processing ingredient upload:', error);
      return fail(500, { message: 'Error processing file' });
    }
  }
};
