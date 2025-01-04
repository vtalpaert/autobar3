import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const profile = sqliteTable('profile', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id)
		.unique(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	artistName: text('artist_name')
});

export const device = sqliteTable('device', {
	id: text('id').primaryKey(),
	profileId: text('profile_id')
		.notNull()
		.references(() => profile.id),
	firmwareVersion: text('firmware_version').notNull().default('unknown'),
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
	lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
});

export const cocktail = sqliteTable('cocktail', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	creatorId: text('creator_id')
		.notNull()
		.references(() => profile.id),
	description: text('description'),
	instructions: text('instructions'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Cocktail = typeof cocktail.$inferSelect;
export type Device = typeof device.$inferSelect;
