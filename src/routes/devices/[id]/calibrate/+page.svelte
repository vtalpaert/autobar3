<script lang="ts">
    import { enhance } from '$app/forms';
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;

    let eventSource: EventSource | null = null;
    let isConnected = false;
    let currentWeight: number | null = null;
    let lastUpdate: number | null = null;

    // Calibration state
    let tareOffset: number | null = null;
    let knownWeight: number = 100; // Default 100g
    let calculatedScale: number | null = null;

    // Form state
    let dtPin = data.device.hx711Dt || 4;
    let sckPin = data.device.hx711Sck || 5;
    let pinsFormMessage = '';
    let calibrationFormMessage = '';

    // Setup Server-Sent Events for real-time weight updates
    onMount(() => {
        if (browser) {
            connectSSE();
        }
    });

    onDestroy(() => {
        disconnectSSE();
    });

    function connectSSE() {
        if (eventSource) {
            return;
        }

        eventSource = new EventSource(`/api/sse/calibration/${data.device.id}`);
        
        eventSource.onopen = () => {
            isConnected = true;
        };

        eventSource.onmessage = (event) => {
            try {
                const weightData = JSON.parse(event.data);
                if (weightData.weight !== undefined) {
                    currentWeight = weightData.weight;
                    lastUpdate = weightData.timestamp;
                }
            } catch (error) {
                console.error('Failed to parse weight data:', error);
            }
        };
        
        eventSource.onerror = (error) => {
            isConnected = false;
            
            if (eventSource?.readyState === EventSource.CLOSED) {
                eventSource = null;
                setTimeout(() => {
                    if (!eventSource) {
                        connectSSE();
                    }
                }, 5000);
            }
        };

        eventSource.onclose = () => {
            isConnected = false;
            eventSource = null;
        };
    }

    function disconnectSSE() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
            isConnected = false;
        }
    }

    function handleTare() {
        if (currentWeight !== null) {
            tareOffset = Math.round(currentWeight);
            calculatedScale = null; // Reset scale when taring
        }
    }

    function handleCalculateScale() {
        if (currentWeight !== null && tareOffset !== null && knownWeight > 0) {
            const rawReading = currentWeight - tareOffset;
            if (rawReading > 0) {
                calculatedScale = knownWeight / rawReading;
            }
        }
    }

    function handlePinsEnhance() {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                pinsFormMessage = result.data?.message || 'GPIO pins saved successfully';
                // Reset calibration state when pins change
                tareOffset = null;
                calculatedScale = null;
                await update();
            } else if (result.type === 'failure') {
                pinsFormMessage = result.data?.message || 'Failed to save GPIO pins';
            }
        };
    }

    function handleCalibrationEnhance() {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                calibrationFormMessage = result.data?.message || 'Calibration saved successfully';
                await update();
            } else if (result.type === 'failure') {
                calibrationFormMessage = result.data?.message || 'Failed to save calibration';
            }
        };
    }

    // Format weight display
    function formatWeight(weight: number | null): string {
        if (weight === null) return 'No signal';
        return `${weight.toFixed(1)}g`;
    }

    // Check if we have a stable weight reading
    function isWeightStable(): boolean {
        if (!lastUpdate) return false;
        const timeSinceUpdate = Date.now() - lastUpdate;
        return timeSinceUpdate < 5000; // Consider stable if updated within 5 seconds
    }
</script>

<svelte:head>
    <title>Calibrate {data.device.name || data.device.id.substring(0, 8)} - Weight Scale</title>
</svelte:head>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="mb-8">
            <h1 class="text-3xl font-bold mb-2">
                Calibrate Weight Scale
            </h1>
            <p class="text-gray-400">
                Device: {data.device.name || data.device.id.substring(0, 8)}
            </p>
        </div>

        <!-- Current Weight Display -->
        <div class="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold">Current Weight Reading</h2>
                <div class="flex items-center space-x-2">
                    <div class={`w-2 h-2 rounded-full transition-colors duration-300 ${isConnected && isWeightStable() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span class="text-sm text-gray-400">
                        {isConnected ? (isWeightStable() ? 'Live' : 'Stale') : 'Disconnected'}
                    </span>
                </div>
            </div>
            <div class="text-4xl font-mono text-center py-8">
                {formatWeight(currentWeight)}
            </div>
            {#if !isConnected}
                <p class="text-yellow-400 text-center">
                    Make sure your device is powered on and connected to the internet.
                </p>
            {:else if !isWeightStable()}
                <p class="text-yellow-400 text-center">
                    Weight reading is stale. Check device connection.
                </p>
            {/if}
        </div>

        <!-- GPIO Configuration Form -->
        <div class="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">Step 1: Hardware Configuration</h2>
            <p class="text-gray-400 mb-6">
                Configure the GPIO pins for your HX711 weight sensor. After saving, the device will reinitialize its hardware.
            </p>
            
            <form method="POST" action="?/savePins" use:enhance={handlePinsEnhance}>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="dtPin" class="block text-sm font-medium text-gray-300 mb-2">
                            DT Pin (Data)
                        </label>
                        <input
                            type="number"
                            id="dtPin"
                            name="dtPin"
                            bind:value={dtPin}
                            min="0"
                            max="39"
                            class="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label for="sckPin" class="block text-sm font-medium text-gray-300 mb-2">
                            SCK Pin (Clock)
                        </label>
                        <input
                            type="number"
                            id="sckPin"
                            name="sckPin"
                            bind:value={sckPin}
                            min="0"
                            max="39"
                            class="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>
                
                <button
                    type="submit"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors"
                >
                    Save Pins
                </button>
                
                {#if pinsFormMessage}
                    <p class="mt-2 text-sm {pinsFormMessage.includes('success') || pinsFormMessage.includes('saved') ? 'text-green-400' : 'text-red-400'}">
                        {pinsFormMessage}
                    </p>
                {/if}
            </form>
        </div>

        <!-- Calibration Process -->
        <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Step 2: Weight Calibration</h2>
            <p class="text-gray-400 mb-6">
                Calibrate the weight sensor by first taring (zeroing) the scale, then using a known weight to calculate the scale factor.
            </p>

            {#if !isConnected || !isWeightStable()}
                <div class="bg-yellow-900/20 border border-yellow-800/30 text-yellow-400 px-4 py-3 rounded mb-6">
                    <p>Please ensure the device is connected and sending stable weight readings before calibrating.</p>
                </div>
            {/if}

            <!-- Tare Step -->
            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">Step 2a: Tare (Zero the Scale)</h3>
                <p class="text-gray-400 mb-4">
                    Remove all weight from the scale and click "Tare" to set the zero point.
                </p>
                <button
                    type="button"
                    on:click={handleTare}
                    disabled={!isConnected || !isWeightStable()}
                    class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded transition-colors"
                >
                    Tare
                </button>
                {#if tareOffset !== null}
                    <p class="mt-2 text-sm text-green-400">
                        ✓ Tare completed. Offset: {tareOffset}
                    </p>
                {/if}
            </div>

            <!-- Known Weight Step -->
            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">Step 2b: Calculate Scale</h3>
                <p class="text-gray-400 mb-4">
                    Place a known weight on the scale and enter its value below, then click "Calculate Scale".
                </p>
                <div class="flex items-center space-x-4 mb-4">
                    <div>
                        <label for="knownWeight" class="block text-sm font-medium text-gray-300 mb-2">
                            Known Weight (grams)
                        </label>
                        <input
                            type="number"
                            id="knownWeight"
                            bind:value={knownWeight}
                            min="1"
                            step="0.1"
                            class="bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div class="pt-6">
                        <button
                            type="button"
                            on:click={handleCalculateScale}
                            disabled={!isConnected || !isWeightStable() || tareOffset === null}
                            class="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded transition-colors"
                        >
                            Calculate Scale
                        </button>
                    </div>
                </div>
                {#if calculatedScale !== null}
                    <p class="text-sm text-green-400">
                        ✓ Scale calculated: {calculatedScale.toFixed(6)}
                    </p>
                {/if}
            </div>

            <!-- Save Calibration -->
            <div class="border-t border-gray-700 pt-6">
                <form method="POST" action="?/saveCalibration" use:enhance={handleCalibrationEnhance}>
                    <input type="hidden" name="offset" value={tareOffset || 0} />
                    <input type="hidden" name="scale" value={calculatedScale || 0} />
                    
                    <button
                        type="submit"
                        disabled={tareOffset === null || calculatedScale === null}
                        class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded transition-colors"
                    >
                        Save Calibration
                    </button>
                    
                    {#if calibrationFormMessage}
                        <p class="mt-2 text-sm {calibrationFormMessage.includes('success') || calibrationFormMessage.includes('saved') ? 'text-green-400' : 'text-red-400'}">
                            {calibrationFormMessage}
                        </p>
                    {/if}
                </form>
            </div>
        </div>

        <!-- Navigation -->
        <div class="mt-8 text-center">
            <a
                href="/devices"
                class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors"
            >
                Back to Devices
            </a>
        </div>
    </div>
</div>
