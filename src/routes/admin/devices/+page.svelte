<script lang="ts">
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';
    import { enhance } from '$app/forms';

    export let data: PageData;
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold">Device Management</h1>
            <a href="/admin" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
                Back to Dashboard
            </a>
        </div>

        <!-- Devices Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">All Devices</h2>
            {#if data.devices.length === 0}
                <p class="text-gray-400">No devices registered</p>
            {:else}
                <div class="space-y-4">
                    {#each data.devices as device}
                        <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                            <div>
                                <p class="font-bold">Device {device.id.slice(0, 8)}</p>
                                <p class="text-sm text-gray-400">
                                    Firmware: {device.firmwareVersion}
                                </p>
                                <p class="text-sm text-gray-400">
                                    Owner: {device.ownerUsername}
                                </p>
                                <p class="text-sm text-gray-400">
                                    Added: {new Date(device.addedAt).toLocaleDateString()}
                                </p>
                                {#if device.lastUsedAt}
                                    <p class="text-sm text-gray-400">
                                        Last used: {new Date(device.lastUsedAt).toLocaleDateString()}
                                    </p>
                                {/if}
                            </div>
                            <form 
                                method="POST" 
                                action="?/deleteDevice" 
                                use:enhance
                                class="flex gap-2"
                            >
                                <input type="hidden" name="deviceId" value={device.id} />
                                <button 
                                    type="submit"
                                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                >
                                    Delete
                                </button>
                            </form>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    </div>
</div>
