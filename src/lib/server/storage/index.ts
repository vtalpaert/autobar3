import { env } from '$env/dynamic/private';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Get the base uploads directory path from environment
 */
export function getUploadsPath(): string {
    return env.UPLOADS_PATH || 'uploads';
}

/**
 * Create directories recursively if they don't exist
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
    }
}

/**
 * Generate the directory path for a user's cocktail images
 */
export function getCocktailImageDir(userId: string): string {
    const uploadsPath = getUploadsPath();
    return join(uploadsPath, userId, 'cocktails');
}

/**
 * Generate the full file path for a cocktail image
 */
export function getCocktailImagePath(userId: string, cocktailId: string): string {
    const dir = getCocktailImageDir(userId);
    return join(dir, `${cocktailId}.webp`);
}

/**
 * Generate the URI path for a cocktail image (for database storage)
 */
export function getCocktailImageUri(userId: string, cocktailId: string): string {
    const uploadsPath = getUploadsPath();
    return `/${uploadsPath}/${userId}/cocktails/${cocktailId}.webp`;
}

/**
 * Ensure the directory structure exists for a given file path
 */
export async function ensureFileDirectoryExists(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    await ensureDirectoryExists(dir);
}
