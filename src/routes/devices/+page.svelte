<script lang="ts">
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';
    import { enhance } from '$app/forms';

    export let data: PageData;
    $: t = translations[$currentLanguage];

    // Format date based on language
    function formatDate(dateString: string): string {
        return $currentLanguage === 'fr' 
            ? new Date(dateString).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'})
            : new Date(dateString).toLocaleDateString();
    }

    // Format datetime with time
    function formatDateTime(dateString: string): string {
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return $currentLanguage === 'fr' 
            ? new Date(dateString).toLocaleDateString('fr-FR', options)
            : new Date(dateString).toLocaleDateString('en-US', options);
    }

    // Check if device is online (pinged within last 5 minutes)
    function isDeviceOnline(lastPingAt: string | null): boolean {
        if (!lastPingAt) return false;
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        return new Date(lastPingAt).getTime() > fiveMinutesAgo;
    }

    // Get relative time string
    function getRelativeTime(dateString: string): string {
        const now = Date.now();
        const date = new Date(dateString).getTime();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return $currentLanguage === 'fr' ? 'À l\'instant' : 'Just now';
        if (diffMins < 60) return $currentLanguage === 'fr' ? `Il y a ${diffMins}min` : `${diffMins}min ago`;
        if (diffHours < 24) return $currentLanguage === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`;
        if (diffDays < 7) return $currentLanguage === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`;
        return formatDateTime(dateString);
    }

    // Track which device is being edited
    let editingDeviceId: string | null = null;
    let deviceNameInput: string = '';

    // Track which device is being deleted
    let deletingDeviceId: string | null = null;

    function startEditing(device: any) {
        editingDeviceId = device.id;
        deviceNameInput = device.name || '';
    }

    function cancelEditing() {
        editingDeviceId = null;
        deviceNameInput = '';
    }
    
    function confirmDelete(deviceId: string) {
        deletingDeviceId = deviceId;
    }
    
    function cancelDelete() {
        deletingDeviceId = null;
    }

    // Handle form submission with enhance
    function handleEnhance() {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                // Close the editing form after successful submission
                editingDeviceId = null;
                deviceNameInput = '';
                
                // Update the page data to reflect the new device name
                await update();
            }
        };
    }
    
    // Handle delete form submission
    function handleDeleteEnhance() {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                deletingDeviceId = null;
                await update();
            }
        };
    }
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold">{t.devices.title}</h1>
            <div class="space-x-4">
                <a 
                    href="/devices/register" 
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    {t.devices.registerNew}
                </a>
                <a 
                    href="/devices/enroll" 
                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    {t.devices.enroll}
                </a>
            </div>
        </div>
        
        <div class="space-y-6">
            {#if data.devices.length === 0}
                <p class="text-gray-400 text-center py-8">
                    {t.devices.noDevices}
                </p>
            {/if}
            
            {#each data.devices as device}
                <div class="bg-gray-800 rounded-lg shadow-lg p-6">
                    {#if editingDeviceId === device.id}
                        <form method="POST" action="?/renameDevice" use:enhance={handleEnhance}>
                            <input type="hidden" name="deviceId" value={device.id} />
                            <div class="flex flex-col space-y-2 mb-4">
                                <label for="deviceName" class="text-sm text-gray-400">{t.devices.deviceName}</label>
                                <input 
                                    type="text" 
                                    id="deviceName" 
                                    name="deviceName" 
                                    bind:value={deviceNameInput}
                                    class="bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder={t.devices.friendlyName}
                                    required
                                />
                                <div class="flex space-x-2 mt-2">
                                    <button 
                                        type="submit" 
                                        class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                    >
                                        {t.devices.save}
                                    </button>
                                    <button 
                                        type="button" 
                                        class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                                        on:click={cancelEditing}
                                    >
                                        {t.devices.cancel}
                                    </button>
                                </div>
                            </div>
                        </form>
                    {:else}
                        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <h2 class="text-2xl font-bold break-words">
                                        {device.name ? device.name : `Device ${device.id.slice(0, 8)}`}
                                    </h2>
                                    {#if device.isDefault}
                                        <span class="bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                            {t.devices.default}
                                        </span>
                                    {/if}
                                    {#if device.lastPingAt && isDeviceOnline(device.lastPingAt)}
                                        <span class="bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap flex items-center gap-1">
                                            <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            {t.devices.online}
                                        </span>
                                    {:else if device.lastPingAt}
                                        <span class="bg-gray-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                            {t.devices.offline}
                                        </span>
                                    {:else}
                                        <span class="bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                            {t.devices.neverConnected}
                                        </span>
                                    {/if}
                                    {#if device.needCalibration}
                                        <span class="bg-yellow-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                            {t.devices.needsCalibration}
                                        </span>
                                    {/if}
                                </div>
                                <div class="space-y-1 text-sm">
                                    <p class="text-gray-400">{t.devices.deviceId}: {device.id.slice(0, 8)}</p>
                                    <p class="text-gray-300">{t.devices.firmware}: {device.firmwareVersion}</p>
                                    <p class="text-gray-400">
                                        {t.devices.added}: {formatDate(device.addedAt)}
                                    </p>
                                    {#if device.lastUsedAt}
                                        <p class="text-gray-400">
                                            {t.devices.lastUsed}: {getRelativeTime(device.lastUsedAt)}
                                        </p>
                                    {:else}
                                        <p class="text-gray-500">
                                            {t.devices.neverUsed}
                                        </p>
                                    {/if}
                                    {#if device.lastPingAt}
                                        <p class="text-gray-400">
                                            {t.devices.lastSeen}: {getRelativeTime(device.lastPingAt)}
                                        </p>
                                    {:else}
                                        <p class="text-gray-500">
                                            {t.devices.neverSeen}
                                        </p>
                                    {/if}
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2 lg:flex-shrink-0">
                                {#if !device.isDefault}
                                    <form method="POST" action="?/setDefaultDevice" use:enhance>
                                        <input type="hidden" name="deviceId" value={device.id} />
                                        <button 
                                            type="submit"
                                            class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors whitespace-nowrap"
                                        >
                                            {t.devices.setDefault}
                                        </button>
                                    </form>
                                {/if}
                                <button 
                                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors whitespace-nowrap"
                                    on:click={() => startEditing(device)}
                                >
                                    {t.devices.rename}
                                </button>
                                <a
                                    href="/devices/{device.id}/configure"
                                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors whitespace-nowrap"
                                >
                                    Configure
                                </a>
                                <a
                                    href="/devices/{device.id}/calibrate"
                                    class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors whitespace-nowrap"
                                >
                                    Calibrate
                                </a>
                                <button 
                                    class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors whitespace-nowrap"
                                    on:click={() => confirmDelete(device.id)}
                                >
                                    {t.devices.delete}
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<!-- Confirmation dialog for device deletion -->
{#if deletingDeviceId}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 class="text-xl font-bold mb-4">{t.devices.confirmDelete}</h3>
            <p class="text-gray-300 mb-6">{t.devices.deleteWarning}</p>
            <div class="flex space-x-4">
                <form method="POST" action="?/deleteDevice" use:enhance={handleDeleteEnhance}>
                    <input type="hidden" name="deviceId" value={deletingDeviceId} />
                    <button 
                        type="submit" 
                        class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    >
                        {t.devices.confirmDeleteButton}
                    </button>
                </form>
                <button 
                    type="button" 
                    class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                    on:click={cancelDelete}
                >
                    {t.devices.cancel}
                </button>
            </div>
        </div>
    </div>
{/if}
