import sharp from 'sharp';
import { writeFile } from 'fs/promises';
import { lookup } from 'mime-types';
import { env } from '$env/dynamic/private';
import type { Cocktail } from '../db/schema';
import { 
	getCocktailImagePath, 
	getCocktailImageUri, 
	ensureFileDirectoryExists 
} from './index';

// Configuration from environment variables
const MAX_FILE_SIZE = parseInt(env.MAX_IMAGE_SIZE || '10485760');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_WIDTH = parseInt(env.IMAGE_WIDTH || '600');
const IMAGE_HEIGHT = parseInt(env.IMAGE_HEIGHT || '600');
const WEBP_QUALITY = parseInt(env.WEBP_QUALITY || '85');

/**
 * Validate image file
 */
function validateImageFile(file: File): void {
	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`File size too large. Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
	}

	// Check MIME type
	const mimeType = file.type || lookup(file.name) || '';
	if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
		throw new Error(`Unsupported file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
	}
}

/**
 * Process image: resize and convert to WebP
 */
async function processImage(imageBuffer: ArrayBuffer): Promise<Buffer> {
	return await sharp(imageBuffer)
		.resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
			fit: 'cover',
			position: 'center'
		})
		.webp({ quality: WEBP_QUALITY })
		.toBuffer();
}

/**
 * Save cocktail image and return the URI path
 */
export async function saveCocktailImage(
	cocktail: Pick<Cocktail, 'id' | 'creatorId'>, 
	imageFile: File
): Promise<string> {
	try {
		// Validate the image file
		validateImageFile(imageFile);

		// Get file paths
		const filePath = getCocktailImagePath(cocktail.creatorId, cocktail.id);
		const uriPath = getCocktailImageUri(cocktail.creatorId, cocktail.id);

		// Ensure directory exists
		await ensureFileDirectoryExists(filePath);

		// Process image
		const imageBuffer = await imageFile.arrayBuffer();
		const processedImage = await processImage(imageBuffer);

		// Save processed image
		await writeFile(filePath, processedImage);

		return uriPath;
	} catch (error) {
		throw new Error(`Failed to save cocktail image: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * Delete cocktail image file
 */
export async function deleteCocktailImage(userId: string, cocktailId: string): Promise<void> {
	try {
		const filePath = getCocktailImagePath(userId, cocktailId);
		const { unlink } = await import('fs/promises');
		await unlink(filePath);
	} catch (error) {
		// Ignore file not found errors
		if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
			throw new Error(`Failed to delete cocktail image: ${error.message}`);
		}
	}
}
