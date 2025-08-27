// In-memory store for current weight measurements
// Map<deviceId, { weight: number, timestamp: number }>
const weightMeasurements = new Map<string, { weight: number; timestamp: number }>();

// Cleanup stale measurements (older than 10 seconds)
function cleanupStaleWeights() {
    const now = Date.now();
    const staleThreshold = 10 * 1000; // 10 seconds
    
    for (const [deviceId, measurement] of weightMeasurements.entries()) {
        if (now - measurement.timestamp > staleThreshold) {
            weightMeasurements.delete(deviceId);
        }
    }
}

// Store weight measurement for a device
export function storeWeight(deviceId: string, weight: number): void {
    const timestamp = Date.now();
    weightMeasurements.set(deviceId, {
        weight,
        timestamp
    });
}

// Get current weight for a device
export function getCurrentWeight(deviceId: string): number | null {
    cleanupStaleWeights();
    const measurement = weightMeasurements.get(deviceId);
    if (measurement) {
        const age = Date.now() - measurement.timestamp;
        return measurement.weight;
    } else {
        return null;
    }
}
