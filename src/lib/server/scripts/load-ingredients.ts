import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { ingredient } from '../db/schema';
import { nanoid } from 'nanoid';
import ingredients from '../fixtures/ingredients.json';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get database URL from environment or use a default
const dbUrl = process.env.DATABASE_URL || 'file:sqlite.db';
console.log(`Using database at: ${dbUrl}`);

// Extract file path if it's a file URL
let dbPath = dbUrl;
if (dbUrl.startsWith('file:')) {
    dbPath = dbUrl.substring(5);
}

// Check if database exists if it's a file path
if (dbPath.startsWith('/') || dbPath.includes(':')) {
    if (!fs.existsSync(dbPath)) {
        console.error(`Database file not found at ${dbPath}`);
        process.exit(1);
    }
}

const client = createClient({
    url: dbUrl
});

const db = drizzle(client);

async function loadIngredients() {
    console.log('Loading ingredient fixtures...');

    try {
        for (const item of ingredients) {
            console.log(`Processing: ${item.name}`);

            // Check if ingredient already exists
            const existing = await db
                .select()
                .from(ingredient)
                .where(eq(ingredient.name, item.name))
                .get();

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
