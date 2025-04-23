import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

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
	name: text('name'), // Human friendly name
	firmwareVersion: text('firmware_version').notNull().default('unknown'),
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
	lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
	lastPingAt: integer('last_ping_at', { mode: 'timestamp' }), // Track when device was last online
	apiToken: text('api_token').unique()
});

export const ingredient = sqliteTable('ingredient', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	alcoholPercentage: real('alcohol_percentage').notNull(),
	density: real('density').notNull().default(1000), // Default 1000 g/L (water)
	addedSeparately: integer('added_separately', { mode: 'boolean' }).notNull().default(false)
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

export const dose = sqliteTable('dose', {
	id: text('id').primaryKey(),
	cocktailId: text('cocktail_id')
		.notNull()
		.references(() => cocktail.id, { onDelete: 'cascade' }),
	ingredientId: text('ingredient_id')
		.notNull()
		.references(() => ingredient.id, { onDelete: 'cascade' }),
	quantity: real('quantity').notNull(), // Volume in ml
	number: integer('number').notNull(), // Order in which the dose must be served
});

export const collaborationRequest = sqliteTable('collaboration_request', {
	id: text('id').primaryKey(),
	senderId: text('sender_id')
		.notNull()
		.references(() => profile.id, { onDelete: 'cascade' }),
	receiverId: text('receiver_id')
		.notNull()
		.references(() => profile.id, { onDelete: 'cascade' }),
	status: text('status').notNull().default('pending'), // pending, accepted, rejected
	message: text('message'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Cocktail = typeof cocktail.$inferSelect;
export type Device = typeof device.$inferSelect;
export type Ingredient = typeof ingredient.$inferSelect;
export type Dose = typeof dose.$inferSelect;
export type CollaborationRequest = typeof collaborationRequest.$inferSelect;

// Extended types for UI
export type CocktailWithDoses = Cocktail & {
    doses: (Dose & { ingredient: Ingredient })[];
};

// Extended types for collaboration requests
export type CollaborationRequestWithProfiles = CollaborationRequest & {
    sender: { username: string, artistName: string | null };
    receiver: { username: string, artistName: string | null };
};

// Order table for tracking cocktail orders
export const order = sqliteTable('order', {
	id: text('id').primaryKey(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	customerId: text('customer_id')
		.notNull()
		.references(() => profile.id),
	deviceId: text('device_id')
		.notNull()
		.references(() => device.id),
	cocktailId: text('cocktail_id')
		.notNull()
		.references(() => cocktail.id),
	currentDoseId: text('current_dose_id')
		.references(() => dose.id),
	doseProgress: real('dose_progress').notNull().default(0), // amount poured of current dose in ml
	status: text('status').notNull().default('pending'), // enum: 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
	errorMessage: text('error_message')
});

export type Order = typeof order.$inferSelect;

// Extended types for orders
export type OrderWithDetails = Order & {
    customer: { username: string, artistName: string | null };
    device: { id: string };
    cocktail: { name: string };
    currentDose?: { id: string, ingredientId: string, quantity: number, number: number };
};
