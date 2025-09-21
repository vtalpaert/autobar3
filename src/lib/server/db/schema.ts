import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

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
    needCalibration: integer('need_calibration', { mode: 'boolean' }).notNull().default(true),
    addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
    lastPingAt: integer('last_ping_at', { mode: 'timestamp' }), // Track when device was last online
    apiToken: text('api_token').unique(),
    hx711Dt: integer('hx711_dt'), // GPIO pin for HX711 DT (data)
    hx711Sck: integer('hx711_sck'), // GPIO pin for HX711 SCK (clock)
    hx711Offset: integer('hx711_offset'), // HX711 calibration offset (signed int)
    hx711Scale: real('hx711_scale'), // HX711 calibration scale (float)
    rgbRedPin: integer('rgb_red_pin'), // GPIO pin for RGB LED red channel
    rgbGreenPin: integer('rgb_green_pin'), // GPIO pin for RGB LED green channel
    rgbBluePin: integer('rgb_blue_pin'), // GPIO pin for RGB LED blue channel
    switchPin: integer('switch_pin'), // GPIO pin for switch/button input
    switchIsInvertedLogic: integer('switch_is_inverted_logic', { mode: 'boolean' }).notNull().default(false) // true if low is active (pull-up), false if high is active (pull-down)
});

export const pump = sqliteTable('pump', {
    id: text('id').primaryKey(),
    deviceId: text('device_id')
        .notNull()
        .references(() => device.id, { onDelete: 'cascade' }),
    gpio: integer('gpio'), // GPIO pin number (nullable, no default to avoid 0)
    isEmpty: integer('is_empty', { mode: 'boolean' }).notNull().default(true),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    ingredientId: text('ingredient_id').references(() => ingredient.id)
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
    imageUri: text('image_uri'), // Path to cocktail image like /uploads/<user-id>/cocktails/<cocktail-id>.webp
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
    number: integer('number').notNull() // Order in which the dose must be served
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

// Order table for tracking cocktail orders
export const order = sqliteTable('order', {
    id: text('id').primaryKey(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    customerId: text('customer_id')
        .notNull()
        .references(() => profile.id),
    deviceId: text('device_id').references(() => device.id),
    cocktailId: text('cocktail_id')
        .notNull()
        .references(() => cocktail.id),
    currentDoseId: text('current_dose_id').references(() => dose.id),
    doseProgress: real('dose_progress').notNull().default(0), // amount poured of current dose in ml
    status: text('status').notNull().default('pending'), // enum: 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
    errorMessage: text('error_message')
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Cocktail = typeof cocktail.$inferSelect;
export type Device = typeof device.$inferSelect;
export type Pump = typeof pump.$inferSelect;
export type Ingredient = typeof ingredient.$inferSelect;
export type Dose = typeof dose.$inferSelect;
export type CollaborationRequest = typeof collaborationRequest.$inferSelect;
export type Order = typeof order.$inferSelect;

// Extended types for UI
export type CocktailWithDoses = Cocktail & {
    doses: (Dose & { ingredient: Ingredient })[];
};

// Extended types for collaboration requests
export type CollaborationRequestWithProfiles = CollaborationRequest & {
    sender: { username: string; artistName: string | null };
    receiver: { username: string; artistName: string | null };
};

// Extended types for orders
export type OrderWithDetails = Order & {
    customer: { username: string; artistName: string | null };
    device: { id: string } | null;
    cocktail: { name: string };
    currentDose?: { id: string; ingredientId: string; quantity: number; number: number };
};

// Database indexes for performance
export const orderCustomerStatusIndex = index('idx_order_customer_status').on(
    order.customerId,
    order.status
);
export const orderUpdatedAtIndex = index('idx_order_updated_at').on(order.updatedAt);
export const deviceProfileIndex = index('idx_device_profile').on(device.profileId);
export const orderCustomerStatusUpdatedIndex = index('idx_order_customer_status_updated').on(
    order.customerId,
    order.status,
    order.updatedAt
);
