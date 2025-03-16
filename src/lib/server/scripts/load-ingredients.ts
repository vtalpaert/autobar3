import { db } from '../db';
import { ingredient } from '../db/schema';
import { nanoid } from 'nanoid';
import ingredients from '../fixtures/ingredients.json';
import { eq } from 'drizzle-orm';

async function loadIngredients() {
  console.log('Loading ingredient fixtures...');
  
  try {
    for (const item of ingredients) {
      // Check if ingredient already exists
      const existing = await db.query.ingredient.findFirst({
        where: (fields, { eq }) => eq(fields.name, item.name)
      });
      
      if (!existing) {
        await db.insert(ingredient).values({
          id: nanoid(),
          name: item.name,
          alcoholPercentage: item.alcoholPercentage,
          density: item.density,
          addedSeparately: item.addedSeparately
        });
        console.log(`Added ingredient: ${item.name}`);
      } else {
        console.log(`Ingredient already exists: ${item.name}`);
      }
    }
    
    console.log('Ingredient fixtures loaded successfully');
  } catch (error) {
    console.error('Error loading ingredient fixtures:', error);
  }
}

loadIngredients();
