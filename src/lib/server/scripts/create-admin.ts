import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';
import { user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createUser } from '../auth/utils';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get database URL from environment or use a default
const dbUrl = process.env.DATABASE_URL || 'file:sqlite.db';
console.log(`Using database at: ${dbUrl}`);

// Get admin credentials from environment variables
const adminUsername = process.env.ADMIN_USER;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminUsername || !adminPassword) {
  console.error('Error: ADMIN_USER and ADMIN_PASSWORD must be set in .env file');
  process.exit(1);
}

const client = createClient({
  url: dbUrl
});

const db = drizzle(client, { schema });

async function createAdmin() {
  console.log(`Creating admin user: ${adminUsername}`);
  
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.username, adminUsername))
      .get();
    
    if (existingUser) {
      console.log(`User ${adminUsername} already exists`);
      process.exit(0);
    }
    
    // Create user with admin privileges
    const { userId, profileId } = await createUser(db, adminUsername, adminPassword, true, true);
    
    console.log(`Created user: ${adminUsername} (ID: ${userId})`);
    console.log(`Created admin profile: ${profileId}`);
    console.log('Admin user created successfully');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
