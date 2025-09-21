import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// In-memory store for failed attempts (in production, use Redis or database)
const failedAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

let lastCleanup = 0;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

function getClientKey(request: Request): string {
    // Use IP address as client identifier
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `device_auth:${ip}`;
}

function isBlocked(clientKey: string): boolean {
    const attempts = failedAttempts.get(clientKey);
    if (!attempts) return false;
    
    if (attempts.blockedUntil && Date.now() < attempts.blockedUntil) {
        return true;
    }
    
    // Clean up expired block
    if (attempts.blockedUntil && Date.now() >= attempts.blockedUntil) {
        failedAttempts.delete(clientKey);
        return false;
    }
    
    return false;
}

function recordFailedAttempt(clientKey: string): void {
    const now = Date.now();
    const attempts = failedAttempts.get(clientKey) || { count: 0, lastAttempt: 0 };
    
    // Reset count if last attempt was outside the window
    if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
        attempts.count = 0;
    }
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    // Block if too many attempts
    if (attempts.count >= MAX_ATTEMPTS) {
        attempts.blockedUntil = now + BLOCK_DURATION;
    }
    
    failedAttempts.set(clientKey, attempts);
}

function recordSuccessfulAttempt(clientKey: string): void {
    failedAttempts.delete(clientKey);
}

export function cleanupFailedAttempts(): void {
    const now = Date.now();
    for (const [key, attempts] of failedAttempts.entries()) {
        if (attempts.blockedUntil && now >= attempts.blockedUntil) {
            failedAttempts.delete(key);
        } else if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
            failedAttempts.delete(key);
        }
    }
}

export async function authenticateDevice(
    request: Request,
    token: string
): Promise<{ success: true; device: table.Device } | { success: false; error: string; status: number }> {
    // Cleanup occasionally
    if (Date.now() - lastCleanup > CLEANUP_INTERVAL) {
        cleanupFailedAttempts();
        lastCleanup = Date.now();
    }
    
    const clientKey = getClientKey(request);
    
    if (isBlocked(clientKey)) {
        return { 
            success: false, 
            error: 'Too many failed attempts. Please try again later.', 
            status: 429 
        };
    }
    
    if (!token) {
        recordFailedAttempt(clientKey);
        return { 
            success: false, 
            error: 'Missing device token', 
            status: 400 
        };
    }
    
    try {
        // Small random delay for timing attack mitigation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 9 + 1));
        
        const device = await db
            .select()
            .from(table.device)
            .where(eq(table.device.apiToken, token))
            .get();
        
        if (!device) {
            recordFailedAttempt(clientKey);
            return { 
                success: false, 
                error: 'Invalid device token', 
                status: 401 
            };
        }
        
        recordSuccessfulAttempt(clientKey);
        
        // Update last ping time
        await db
            .update(table.device)
            .set({ lastPingAt: new Date() })
            .where(eq(table.device.id, device.id));
        
        return { success: true, device };
        
    } catch (error) {
        console.error('Device authentication error:', error);
        return { 
            success: false, 
            error: 'Authentication failed', 
            status: 500 
        };
    }
}
