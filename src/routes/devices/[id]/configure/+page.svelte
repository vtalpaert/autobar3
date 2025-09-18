<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';
    import Header from '$lib/components/Header.svelte';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';

    $: t = translations[$currentLanguage];

    export let data: PageData;
    export let form: ActionData;

    // For new pump form
    let selectedIngredientId = '';
    let gpioNumber: number | null = null;
    let isEmpty = false;
    let pendingPumps = [];
    let showAddPump = false;

    // Track form submission state
    let isSubmitting = false;

    // Clear pending pumps after successful submission
    $: if (form?.success) {
        pendingPumps = [];
        showAddPump = false;
        isSubmitting = false;
    }

    // Track deleted pumps
    let deletedPumpIds = [];

    // For existing pumps editing
    let existingPumps = data.pumps.map((pump) => ({
        id: pump.id,
        gpio: pump.gpio === null || pump.gpio === undefined ? '' : pump.gpio,
        isEmpty: pump.isEmpty,
        ingredientId: pump.ingredient?.id || '',
        ingredientName: pump.ingredient?.name || 'No ingredient'
    }));

    // Format date helper
    function formatDateTime(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Check if device is online
    function isDeviceOnline(lastPingAt: string | null): boolean {
        if (!lastPingAt) return false;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return new Date(lastPingAt).getTime() > fiveMinutesAgo;
    }

    // Get relative time
    function getRelativeTime(dateString: string): string {
        const now = Date.now();
        const date = new Date(dateString).getTime();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return t.devices.configure.justNow;
        if (diffMins < 60) return t.devices.configure.minutesAgo.replace('{count}', diffMins);
        if (diffHours < 24) return t.devices.configure.hoursAgo.replace('{count}', diffHours);
        if (diffDays < 7) return t.devices.configure.daysAgo.replace('{count}', diffDays);
        return formatDateTime(dateString);
    }

    function addLocalPump() {
        if (!selectedIngredientId && !gpioNumber) return;

        // Check for duplicates
        const existingPump = pendingPumps.find(
            (p) =>
                (p.gpio === gpioNumber && gpioNumber !== null) ||
                (p.ingredientId === selectedIngredientId && selectedIngredientId !== '')
        );

        if (existingPump) return; // Prevent duplicates

        const ingredient = data.ingredients.find((i) => i.id === selectedIngredientId);

        pendingPumps = [
            ...pendingPumps,
            {
                ingredientId: selectedIngredientId,
                ingredientName: ingredient?.name || t.devices.configure.noIngredient,
                gpio: gpioNumber,
                isEmpty
            }
        ];

        // Reset form
        selectedIngredientId = '';
        gpioNumber = null;
        isEmpty = false;
        showAddPump = false;
    }

    function removeLocalPump(index: number) {
        pendingPumps = pendingPumps.filter((_, i) => i !== index);
    }

    function removeExistingPump(index: number) {
        const pump = existingPumps[index];
        if (pump.id) {
            deletedPumpIds = [...deletedPumpIds, pump.id];
        }
        existingPumps = existingPumps.filter((_, i) => i !== index);
    }

    // Validate GPIO uniqueness
    function validateGpios(): string | null {
        const allGpios = [];

        // Check existing pumps (but exclude those marked for deletion)
        for (const pump of existingPumps) {
            // Skip validation for pumps that are marked for deletion
            if (pump.id && deletedPumpIds.includes(pump.id)) {
                continue;
            }

            if (pump.gpio !== null && pump.gpio !== undefined && pump.gpio !== '') {
                const gpioNum = typeof pump.gpio === 'string' ? parseInt(pump.gpio) : pump.gpio;
                if (allGpios.includes(gpioNum)) {
                    return t.devices.configure.gpioConflictError.replace('{gpio}', gpioNum);
                }
                allGpios.push(gpioNum);
            }
        }

        // Check new pumps
        for (const pump of pendingPumps) {
            if (pump.gpio !== null && pump.gpio !== undefined) {
                if (allGpios.includes(pump.gpio)) {
                    return t.devices.configure.gpioConflictError.replace('{gpio}', pump.gpio);
                }
                allGpios.push(pump.gpio);
            }
        }

        return null;
    }

    $: gpioError = validateGpios();
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg p-8">
            <a href="/devices" class="text-blue-400 hover:text-blue-300 mb-6 inline-block">
                {t.devices.configure.backToDevices}
            </a>

            <h1 class="text-3xl font-bold mb-6">{t.devices.configure.title}</h1>

            <!-- Device Info -->
            <div class="mb-8 p-6 bg-gray-700 rounded-lg">
                <div class="flex flex-wrap items-center gap-2 mb-4">
                    <h2 class="text-2xl font-bold">
                        {data.device.name || `Device ${data.device.id.slice(0, 8)}`}
                    </h2>
                    {#if data.device.isDefault}
                        <span class="bg-green-600 text-white text-xs px-2 py-1 rounded">
                            {t.devices.default}
                        </span>
                    {/if}
                    {#if data.device.lastPingAt && isDeviceOnline(data.device.lastPingAt)}
                        <span
                            class="bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
                        >
                            <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            {t.devices.online}
                        </span>
                    {:else if data.device.lastPingAt}
                        <span class="bg-gray-500 text-white text-xs px-2 py-1 rounded">
                            {t.devices.offline}
                        </span>
                    {:else}
                        <span class="bg-red-500 text-white text-xs px-2 py-1 rounded">
                            {t.devices.neverConnected}
                        </span>
                    {/if}
                    {#if data.device.needCalibration}
                        <span class="bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                            {t.devices.needsCalibration}
                        </span>
                    {/if}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p class="text-gray-400">
                            {t.devices.configure.deviceId}: {data.device.id.slice(0, 8)}
                        </p>
                        <p class="text-gray-300">
                            {t.devices.configure.firmware}: {data.device.firmwareVersion}
                        </p>
                    </div>
                    <div>
                        {#if data.device.lastUsedAt}
                            <p class="text-gray-400">
                                {t.devices.configure.lastUsed}: {getRelativeTime(
                                    data.device.lastUsedAt
                                )}
                            </p>
                        {:else}
                            <p class="text-gray-500">{t.devices.configure.neverUsed}</p>
                        {/if}
                        {#if data.device.lastPingAt}
                            <p class="text-gray-400">
                                {t.devices.configure.lastSeen}: {getRelativeTime(
                                    data.device.lastPingAt
                                )}
                            </p>
                        {:else}
                            <p class="text-gray-500">{t.devices.configure.neverSeen}</p>
                        {/if}
                    </div>
                </div>
            </div>

            {#if form?.error}
                <div class="mb-4 p-3 bg-red-900 text-white rounded">
                    {form.error}
                </div>
            {/if}

            {#if form?.success}
                <div class="mb-4 p-3 bg-green-900 text-white rounded">
                    {t.devices.configure.configurationSaved}
                </div>
            {/if}

            {#if gpioError}
                <div class="mb-4 p-3 bg-red-900 text-white rounded">
                    {gpioError}
                </div>
            {/if}

            <form
                method="POST"
                use:enhance={() => {
                    isSubmitting = true;
                    // Clear pending pumps immediately when form is submitted
                    pendingPumps = [];
                    showAddPump = false;

                    return async ({ result, update }) => {
                        if (result.type === 'redirect') {
                            // Force a full page reload instead of client-side navigation
                            window.location.href = result.location;
                        } else {
                            await update();
                            isSubmitting = false;
                        }
                    };
                }}
            >
                <!-- Existing Pumps Section -->
                {#if existingPumps.length > 0}
                    <div class="mb-8 border-t border-gray-700 pt-6">
                        <h2 class="text-2xl font-bold mb-4">{t.devices.configure.currentPumps}</h2>

                        <div class="space-y-4">
                            {#each existingPumps as pump, index}
                                <div class="p-4 bg-gray-700 rounded-lg">
                                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div>
                                            <label
                                                for="existing-ingredient-{index}"
                                                class="block text-sm font-medium mb-2"
                                            >
                                                {t.devices.configure.ingredient}
                                            </label>
                                            <select
                                                id="existing-ingredient-{index}"
                                                bind:value={pump.ingredientId}
                                                class="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value=""
                                                    >{t.devices.configure.noIngredient}</option
                                                >
                                                {#each data.ingredients as ingredient}
                                                    <option value={ingredient.id}
                                                        >{ingredient.name}</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                for="existing-gpio-{index}"
                                                class="block text-sm font-medium mb-2"
                                            >
                                                {t.devices.configure.gpioPin}
                                            </label>
                                            <input
                                                id="existing-gpio-{index}"
                                                type="number"
                                                bind:value={pump.gpio}
                                                min="0"
                                                max="39"
                                                class="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="GPIO"
                                                on:input={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '') {
                                                        pump.gpio = '';
                                                    } else {
                                                        const parsed = parseInt(value);
                                                        pump.gpio = isNaN(parsed) ? '' : parsed;
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label class="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    bind:checked={pump.isEmpty}
                                                    class="mr-2"
                                                />
                                                <span class="text-sm"
                                                    >{t.devices.configure.empty}</span
                                                >
                                            </label>
                                        </div>

                                        <div>
                                            <button
                                                type="button"
                                                on:click={() => removeExistingPump(index)}
                                                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                                            >
                                                {t.devices.configure.remove}
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Hidden inputs for existing pumps -->
                                    <input
                                        type="hidden"
                                        name={`existingPumps[${index}].id`}
                                        value={pump.id}
                                    />
                                    <input
                                        type="hidden"
                                        name={`existingPumps[${index}].ingredientId`}
                                        value={pump.ingredientId}
                                    />
                                    <input
                                        type="hidden"
                                        name={`existingPumps[${index}].gpio`}
                                        value={pump.gpio === '' ? '' : pump.gpio}
                                    />
                                    <input
                                        type="hidden"
                                        name={`existingPumps[${index}].isEmpty`}
                                        value={pump.isEmpty ? 'on' : ''}
                                    />
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- New Pumps Section -->
                <div class="mb-6 border-t border-gray-700 pt-6">
                    <h2 class="text-2xl font-bold mb-4">{t.devices.configure.addPumps}</h2>

                    {#if pendingPumps.length > 0}
                        <div class="mb-6 space-y-4">
                            {#each pendingPumps as pump, index}
                                <div
                                    class="p-4 bg-gray-700 rounded-lg flex items-center justify-between"
                                >
                                    <div>
                                        <span class="font-medium">{pump.ingredientName}</span>
                                        {#if pump.gpio !== null}
                                            <span class="ml-2 text-gray-400">GPIO {pump.gpio}</span>
                                        {/if}
                                        {#if pump.isEmpty}
                                            <span class="ml-2 text-yellow-400"
                                                >({t.devices.configure.empty})</span
                                            >
                                        {/if}
                                    </div>
                                    <button
                                        type="button"
                                        on:click={() => removeLocalPump(index)}
                                        class="text-red-500 hover:text-red-400 p-1"
                                    >
                                        {t.devices.configure.remove}
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Add Pump Button -->
                    <button
                        type="button"
                        on:click={() => (showAddPump = !showAddPump)}
                        class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-6"
                    >
                        {showAddPump ? t.devices.configure.cancel : t.devices.configure.addPump}
                    </button>

                    <!-- Add Pump Form -->
                    {#if showAddPump}
                        <div class="mt-4 p-4 bg-gray-700 rounded-lg mb-6">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label
                                        for="new-ingredient"
                                        class="block text-sm font-medium mb-2"
                                    >
                                        {t.devices.configure.ingredient}
                                    </label>
                                    <select
                                        id="new-ingredient"
                                        bind:value={selectedIngredientId}
                                        class="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value=""
                                            >{t.devices.configure.chooseIngredient}</option
                                        >
                                        {#each data.ingredients as ingredient}
                                            <option value={ingredient.id}>{ingredient.name}</option>
                                        {/each}
                                    </select>
                                </div>

                                <div>
                                    <label for="new-gpio" class="block text-sm font-medium mb-2">
                                        {t.devices.configure.gpioPin}
                                    </label>
                                    <input
                                        id="new-gpio"
                                        type="number"
                                        bind:value={gpioNumber}
                                        min="0"
                                        max="39"
                                        class="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={t.devices.configure.gpioNumber}
                                        on:input={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                gpioNumber = null;
                                            } else {
                                                const parsed = parseInt(value);
                                                gpioNumber = isNaN(parsed) ? null : parsed;
                                            }
                                        }}
                                    />
                                </div>

                                <div class="flex items-end">
                                    <label class="flex items-center">
                                        <input
                                            type="checkbox"
                                            bind:checked={isEmpty}
                                            class="mr-2"
                                        />
                                        <span class="text-sm">{t.devices.configure.empty}</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="button"
                                on:click={addLocalPump}
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                disabled={!selectedIngredientId && !gpioNumber}
                            >
                                {t.devices.configure.addPump}
                            </button>
                        </div>
                    {/if}
                </div>

                <!-- Hidden inputs for new pumps -->
                {#each pendingPumps as pump, index}
                    <input
                        type="hidden"
                        name={`newPumps[${index}].ingredientId`}
                        value={pump.ingredientId}
                    />
                    <input type="hidden" name={`newPumps[${index}].gpio`} value={pump.gpio || ''} />
                    <input
                        type="hidden"
                        name={`newPumps[${index}].isEmpty`}
                        value={pump.isEmpty ? 'on' : ''}
                    />
                {/each}

                <!-- Hidden inputs for deleted pumps -->
                {#each deletedPumpIds as pumpId, index}
                    <input type="hidden" name={`deletedPumps[${index}]`} value={pumpId} />
                {/each}

                <button
                    type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!!gpioError || isSubmitting}
                >
                    {isSubmitting
                        ? t.devices.configure.saving || 'Saving...'
                        : t.devices.configure.savePumpConfiguration}
                </button>
            </form>
        </div>
    </div>
</div>
