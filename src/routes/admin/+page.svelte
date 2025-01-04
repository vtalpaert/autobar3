<script lang="ts">
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';
    import { enhance } from '$app/forms';

    export let data: PageData;

    let selectedUserId: string | null = null;
    let selectedCocktailId: string | null = null;
    let selectedDeviceId: string | null = null;

    $: unverifiedProfiles = data.profiles.filter(p => !p.isVerified);
    $: verifiedProfiles = data.profiles.filter(p => p.isVerified);
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <h1 class="text-4xl font-bold mb-8">Admin Dashboard</h1>

        <!-- Unverified Profiles Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Unverified Profiles</h2>
            {#if unverifiedProfiles.length === 0}
                <p class="text-gray-400">No unverified profiles</p>
            {:else}
                <div class="space-y-4">
                    {#each unverifiedProfiles as profile}
                        <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                            <div>
                                <p class="font-bold">{profile.username}</p>
                                <p class="text-sm text-gray-400">Created: {new Date(profile.createdAt).toLocaleDateString()}</p>
                            </div>
                            <form 
                                method="POST" 
                                action="?/verifyProfile" 
                                use:enhance
                                class="flex gap-2"
                            >
                                <input type="hidden" name="profileId" value={profile.id} />
                                <button 
                                    type="submit"
                                    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                >
                                    Verify
                                </button>
                            </form>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <!-- Users Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Users & Profiles</h2>
            <div class="space-y-4">
                {#each data.profiles as profile}
                    <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <div>
                            <p class="font-bold">{profile.username}</p>
                            <p class="text-sm text-gray-400">Artist Name: {profile.artistName || 'Not set'}</p>
                            <p class="text-sm text-gray-400">
                                Status: {profile.isVerified ? 'Verified' : 'Unverified'}
                            </p>
                        </div>
                        <form 
                            method="POST" 
                            action="?/deleteUser" 
                            use:enhance
                            class="flex gap-2"
                        >
                            <input type="hidden" name="userId" value={profile.userId} />
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
        </section>

        <!-- Cocktails Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Cocktails</h2>
            <div class="space-y-4">
                {#each data.cocktails as cocktail}
                    <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <div>
                            <p class="font-bold">{cocktail.name}</p>
                            <p class="text-sm text-gray-400">Created by: {cocktail.creatorName}</p>
                        </div>
                        <form 
                            method="POST" 
                            action="?/deleteCocktail" 
                            use:enhance
                            class="flex gap-2"
                        >
                            <input type="hidden" name="cocktailId" value={cocktail.id} />
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
        </section>

        <!-- Devices Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Devices</h2>
            <div class="space-y-4">
                {#each data.devices as device}
                    <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <div>
                            <p class="font-bold">Device {device.id.slice(0, 8)}</p>
                            <p class="text-sm text-gray-400">
                                Firmware: {device.firmwareVersion}
                            </p>
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
        </section>
    </div>
</div>
