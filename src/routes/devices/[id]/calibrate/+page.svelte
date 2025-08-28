<script lang="ts">
    import { enhance } from '$app/forms';
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';
    import { currentLanguage } from '$lib/i18n/store';
    import { devices } from '$lib/i18n/translations/devices';

    export let data: PageData;

    $: t = devices[$currentLanguage].devices.calibration;

    let eventSource: EventSource | null = null;
    let isConnected = false;
    let currentWeight: number | null = null;
    let currentRawMeasure: number | null = null;

    // Calibration state
    let tareOffset: number | null = null;
    let knownWeight: number = 100; // Default 100g
    let calculatedScale: number | null = null;

    // Form state
    let dtPin = data.device.hx711Dt || 4;
    let sckPin = data.device.hx711Sck || 5;
    let pinsFormMessage = '';
    let calibrationFormMessage = '';
    let calibrationModeMessage = '';

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
                }
                if (weightData.rawMeasure !== undefined) {
                    currentRawMeasure = weightData.rawMeasure;
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
        if (currentRawMeasure !== null) {
            tareOffset = currentRawMeasure;
            calculatedScale = null; // Reset scale when taring
        }
    }

    function handleCalculateScale() {
        if (currentRawMeasure !== null && tareOffset !== null && knownWeight > 0) {
            const rawReading = currentRawMeasure - tareOffset;
            // Scale can be negative depending on hardware wiring
            // We just need a non-zero reading to calculate scale
            if (rawReading !== 0) {
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

    function handleCalibrationModeEnhance() {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                calibrationModeMessage = result.data?.message || t.calibrationModeEnabled;
                await update();
            } else if (result.type === 'failure') {
                calibrationModeMessage = result.data?.message || 'Failed to enable calibration mode';
            }
        };
    }

    // Format weight display
    function formatWeight(weight: number | null): string {
        if (weight === null) return t.noSignal;
        return `${weight.toFixed(1)}g`;
    }

    // Calculate server-side weight based on current calibration values
    function getServerCalculatedWeight(): number | null {
        if (currentRawMeasure === null || tareOffset === null) return null;
        
        const rawReading = currentRawMeasure - tareOffset;
        if (calculatedScale === null) return rawReading;
        
        return rawReading * calculatedScale;
    }

    // Check if device weight matches server calculation (within tolerance)
    function getWeightValidation(): { isValid: boolean; message: string } | null {
        if (currentWeight === null || currentRawMeasure === null) return null;
        
        const storedOffset = data.device.hx711Offset || 0;
        const storedScale = data.device.hx711Scale || 1.0;
        
        if (storedOffset === 0 && storedScale === 1.0) return null; // No calibration stored
        
        const serverCalculated = storedScale * (currentRawMeasure - storedOffset);
        const tolerance = Math.max(1.0, Math.abs(serverCalculated) * 0.05); // 5% tolerance, minimum 1g
        const difference = Math.abs(currentWeight - serverCalculated);
        
        if (difference > tolerance) {
            return {
                isValid: false,
                message: `Device weight (${currentWeight.toFixed(1)}g) doesn't match server calculation (${serverCalculated.toFixed(1)}g). Calibration may be out of sync.`
            };
        }
        
        return { isValid: true, message: '' };
    }

    // Format server calculated weight display
    function formatServerCalculatedWeight(): string {
        const serverWeight = getServerCalculatedWeight();
        if (serverWeight === null) return t.notCalibrated;
        return `${serverWeight.toFixed(1)}g`;
    }

    // Check if we have a recent weight reading (server handles staleness)
    function hasRecentReading(): boolean {
        return currentWeight !== null && currentRawMeasure !== null;
    }
</script>

<svelte:head>
    <title>{t.title} {data.device.name || data.device.id.substring(0, 8)} - Weight Scale</title>
</svelte:head>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="mb-8">
            <a 
                href="/devices" 
                class="text-blue-400 hover:text-blue-300 mb-6 inline-block"
            >
                {t.backToDevices}
            </a>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                    <h1 class="text-3xl font-bold mb-2">
                        {t.title}
                    </h1>
                    <p class="text-gray-400">
                        {t.device}: {data.device.name || data.device.id.substring(0, 8)}
                    </p>
                </div>
                <form method="POST" action="?/enableCalibrationMode" use:enhance={handleCalibrationModeEnhance}>
                    <button
                        type="submit"
                        disabled={isConnected && hasRecentReading()}
                        class="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors whitespace-nowrap"
                    >
                        {t.enableCalibrationMode}
                    </button>
                </form>
            </div>
            {#if calibrationModeMessage}
                <p class="text-sm {calibrationModeMessage.includes('success') || calibrationModeMessage === t.calibrationModeEnabled ? 'text-green-400' : 'text-red-400'}">
                    {calibrationModeMessage}
                </p>
            {/if}
        </div>

        <!-- Current Weight Display -->
        <div class="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold">{t.weightReadings}</h2>
                <div class="flex items-center space-x-2">
                    <div class={`w-2 h-2 rounded-full transition-colors duration-300 ${isConnected && hasRecentReading() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span class="text-sm text-gray-400">
                        {isConnected ? (hasRecentReading() ? t.live : t.stale) : t.disconnected}
                    </span>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Raw Measure -->
                <div class="text-center">
                    <h3 class="text-lg font-medium text-gray-300 mb-2">{t.rawMeasure}</h3>
                    <div class="text-3xl font-mono py-4">
                        {currentRawMeasure !== null ? currentRawMeasure.toString() : t.noSignal}
                    </div>
                    <p class="text-sm text-gray-400">{t.directSensorReading}</p>
                </div>
                
                <!-- Device Weight -->
                <div class="text-center">
                    <h3 class="text-lg font-medium text-gray-300 mb-2">{t.deviceWeight}</h3>
                    <div class="text-3xl font-mono py-4">
                        {formatWeight(currentWeight)}
                    </div>
                    <p class="text-sm text-gray-400">{t.calculatedByDevice}</p>
                </div>
                
                <!-- Server Calculated Weight -->
                <div class="text-center">
                    <h3 class="text-lg font-medium text-gray-300 mb-2">{t.serverWeight}</h3>
                    <div class="text-3xl font-mono py-4 {getServerCalculatedWeight() !== null ? 'text-green-400' : 'text-gray-500'}">
                        {formatServerCalculatedWeight()}
                    </div>
                    <p class="text-sm text-gray-400">
                        {tareOffset !== null && calculatedScale !== null ? t.withCurrentCalibrationShort : t.needsCalibrationShort}
                    </p>
                </div>
            </div>
            
            <!-- Weight Validation Warning -->
            {#if getWeightValidation()?.isValid === false}
                <div class="bg-yellow-900/20 border border-yellow-800/30 text-yellow-400 px-4 py-3 rounded mt-4">
                    <p class="text-sm">{getWeightValidation()?.message}</p>
                </div>
            {/if}
            
            {#if !isConnected}
                <p class="text-yellow-400 text-center mt-4">
                    {t.deviceConnectionWarning}
                </p>
            {:else if !hasRecentReading()}
                <p class="text-yellow-400 text-center mt-4">
                    {t.staleReadingWarning}
                </p>
            {/if}
        </div>

        <!-- GPIO Configuration Form -->
        <div class="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">{t.step1}</h2>
            <p class="text-gray-400 mb-6">
                {t.hardwareConfigDescription}
            </p>
            
            <form method="POST" action="?/savePins" use:enhance={handlePinsEnhance}>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="dtPin" class="block text-sm font-medium text-gray-300 mb-2">
                            {t.dtPin}
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
                            {t.sckPin}
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
                    {t.savePins}
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
            <h2 class="text-xl font-semibold mb-4">{t.step2}</h2>
            <p class="text-gray-400 mb-6">
                {t.calibrationDescription}
            </p>

            {#if !isConnected || !hasRecentReading()}
                <div class="bg-yellow-900/20 border border-yellow-800/30 text-yellow-400 px-4 py-3 rounded mb-6">
                    <p>{t.connectionRequiredWarning}</p>
                </div>
            {/if}

            <!-- Tare Step -->
            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">{t.step2a}</h3>
                <p class="text-gray-400 mb-4">
                    {t.tareDescription}
                </p>
                <button
                    type="button"
                    on:click={handleTare}
                    disabled={!isConnected || !hasRecentReading()}
                    class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded transition-colors"
                >
                    {t.tare}
                </button>
                {#if tareOffset !== null}
                    <p class="mt-2 text-sm text-green-400">
                        {t.tareCompleted} {tareOffset}
                    </p>
                {/if}
            </div>

            <!-- Known Weight Step -->
            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">{t.step2b}</h3>
                <p class="text-gray-400 mb-4">
                    {t.scaleDescription}
                </p>
                <div class="flex items-center space-x-4 mb-4">
                    <div>
                        <label for="knownWeight" class="block text-sm font-medium text-gray-300 mb-2">
                            {t.knownWeight}
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
                            disabled={!isConnected || !hasRecentReading() || tareOffset === null}
                            class="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded transition-colors"
                        >
                            {t.calculateScale}
                        </button>
                    </div>
                </div>
                {#if calculatedScale !== null}
                    <p class="text-sm text-green-400">
                        {t.scaleCalculated} {calculatedScale.toFixed(6)}
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
                        {t.saveCalibration}
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
                {t.backToDevicesButton}
            </a>
        </div>
    </div>
</div>
