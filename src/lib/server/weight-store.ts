// In-memory store for current weight measurements
// Map<deviceId, { weight: number, timestamp: number }>
const weightMeasurements = new Map<string, { weight: number; timestamp: number }>();

// Cleanup stale measurements (older than 30 seconds)
function cleanupStaleWeights() {
    const now = Date.now();
    const staleThreshold = 30 * 1000; // 30 seconds
    
    for (const [deviceId, measurement] of weightMeasurements.entries()) {
        if (now - measurement.timestamp > staleThreshold) {
            weightMeasurements.delete(deviceId);
        }
    }
}

// Store weight measurement for a device
export function storeWeight(deviceId: string, weight: number): void {
    weightMeasurements.set(deviceId, {
        weight,
        timestamp: Date.now()
    });
}

// Get current weight for a device
export function getCurrentWeight(deviceId: string): number | null {
    cleanupStaleWeights();
    const measurement = weightMeasurements.get(deviceId);
    return measurement ? measurement.weight : null;
}
