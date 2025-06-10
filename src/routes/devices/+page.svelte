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

    // Track which device is being edited
    let editingDeviceId: string | null = null;
    let deviceNameInput: string = '';

    function startEditing(device: any) {
        editingDeviceId = device.id;
        deviceNameInput = device.name || '';
    }

    function cancelEditing() {
        editingDeviceId = null;
        deviceNameInput = '';
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
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#if data.devices.length === 0}
                <p class="text-gray-400 col-span-full text-center py-8">
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
                        <div class="flex justify-between items-start">
                            <h2 class="text-2xl font-bold mb-2">
                                {device.name ? device.name : `Device ${device.id.slice(0, 8)}`}
                            </h2>
                            <button 
                                class="text-blue-400 hover:text-blue-300 text-sm"
                                on:click={() => startEditing(device)}
                            >
                                {t.devices.rename}
                            </button>
                        </div>
                        <p class="text-sm text-gray-400 mb-2">{t.devices.deviceId}: {device.id.slice(0, 8)}</p>
                        <p class="text-gray-300 mb-2">{t.devices.firmware}: {device.firmwareVersion}</p>
                        <p class="text-sm text-gray-400">
                            {t.devices.added}: {formatDate(device.addedAt)}
                        </p>
                        {#if device.lastUsedAt}
                            <p class="text-sm text-gray-400">
                                {t.devices.lastUsed}: {formatDate(device.lastUsedAt)}
                            </p>
                        {/if}
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
