import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import * as table from '$lib/server/db/schema';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

export function generateUserId() {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  const id = encodeBase32LowerCase(bytes);
  return id;
}

export function validateUsername(username: unknown): username is string {
  return (
    typeof username === 'string' &&
    username.length >= 3 &&
    username.length <= 31 &&
    /^[a-z0-9_-]+$/.test(username)
  );
}

export function validatePassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}

export async function createUser(
  db: LibSQLDatabase<typeof table>,
  username: string, 
  password: string, 
  isVerified = false, 
  isAdmin = false
) {
  const userId = generateUserId();
  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
  });

  // Create user
  await db.insert(table.user).values({ id: userId, username, passwordHash });
  
  // Create profile
  const profileId = crypto.randomUUID();
  await db.insert(table.profile).values({
    id: profileId,
    userId,
    createdAt: new Date(),
    isVerified,
    isAdmin,
    artistName: isAdmin ? `${username} (Admin)` : null
  });

  return { userId, profileId };
}
