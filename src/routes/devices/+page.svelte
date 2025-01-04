<script lang="ts">
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    $: t = translations[$currentLanguage];
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold">{t.devices.title}</h1>
            <a 
                href="/devices/register" 
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
                {t.devices.registerNew}
            </a>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#if data.devices.length === 0}
                <p class="text-gray-400 col-span-full text-center py-8">
                    {t.devices.noDevices}
                </p>
            {/if}
            
            {#each data.devices as device}
                <div class="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 class="text-2xl font-bold mb-2">Device {device.id.slice(0, 8)}</h2>
                    <p class="text-gray-300 mb-2">Firmware: {device.firmwareVersion}</p>
                    <p class="text-sm text-gray-400">
                        Added: {new Date(device.addedAt).toLocaleDateString()}
                    </p>
                    {#if device.lastUsedAt}
                        <p class="text-sm text-gray-400">
                            Last used: {new Date(device.lastUsedAt).toLocaleDateString()}
                        </p>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
