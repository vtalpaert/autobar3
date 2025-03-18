<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    export let form;
    
    $: t = translations[$currentLanguage];
    
    // Redirect to unverified page if not verified
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    
    $: {
        if (browser && data.user && !data.user.profile?.verified) {
            goto('/profile/unverified');
        }
    }
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold mb-2">{t.collaboration.title}</h1>
            <p class="text-gray-400 mb-8">{t.collaboration.subtitle}</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Pending Requests -->
                <div class="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4">{t.collaboration.pendingRequests}</h2>
                    
                    {#if data.pendingRequests.length === 0}
                        <p class="text-gray-400">{t.collaboration.noRequests}</p>
                    {:else}
                        <ul class="divide-y divide-gray-700">
                            {#each data.pendingRequests as request}
                                <li class="py-4">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <p class="font-medium">
                                                {request.sender.artistName || request.sender.username}
                                            </p>
                                            {#if request.message}
                                                <p class="text-gray-400 text-sm mt-1">{request.message}</p>
                                            {/if}
                                        </div>
                                        <div class="flex space-x-2">
                                            <form method="POST" action="?/acceptRequest" use:enhance>
                                                <input type="hidden" name="requestId" value={request.id} />
                                                <button 
                                                    type="submit" 
                                                    class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                                >
                                                    {t.collaboration.accept}
                                                </button>
                                            </form>
                                            <form method="POST" action="?/rejectRequest" use:enhance>
                                                <input type="hidden" name="requestId" value={request.id} />
                                                <button 
                                                    type="submit" 
                                                    class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                                >
                                                    {t.collaboration.reject}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
                
                <!-- Sent Requests -->
                <div class="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4">{t.collaboration.sentRequests}</h2>
                    
                    {#if data.sentRequests.length === 0}
                        <p class="text-gray-400">{t.collaboration.noRequests}</p>
                    {:else}
                        <ul class="divide-y divide-gray-700">
                            {#each data.sentRequests as request}
                                <li class="py-4">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <p class="font-medium">
                                                {request.receiver.artistName || request.receiver.username}
                                            </p>
                                            {#if request.message}
                                                <p class="text-gray-400 text-sm mt-1">{request.message}</p>
                                            {/if}
                                        </div>
                                        <form method="POST" action="?/cancelRequest" use:enhance>
                                            <input type="hidden" name="requestId" value={request.id} />
                                            <button 
                                                type="submit" 
                                                class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                            >
                                                {t.collaboration.cancel}
                                            </button>
                                        </form>
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </div>
            
            <!-- Active Collaborations -->
            <div class="mt-8 bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-bold mb-4">{t.collaboration.acceptedRequests}</h2>
                
                {#if data.activeCollaborations.length === 0}
                    <p class="text-gray-400">{t.collaboration.noRequests}</p>
                {:else}
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {#each data.activeCollaborations as collab}
                            <div class="bg-gray-700 rounded-lg p-4">
                                <p class="font-medium">
                                    {collab.otherProfile.artistName || collab.otherProfile.username}
                                </p>
                                <p class="text-gray-400 text-sm mt-1">
                                    {t.collaboration.since} {new Date(collab.request.updatedAt).toLocaleDateString()}
                                </p>
                                <a 
                                    href={`/profile?id=${collab.otherProfile.userId}`}
                                    class="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm"
                                >
                                    {t.collaboration.viewProfile}
                                </a>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
            
            <!-- Find Artists Button -->
            <div class="mt-8 text-center">
                <a 
                    href="/collaborations/find"
                    class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    {t.collaboration.findArtists}
                </a>
            </div>
        </div>
    </div>
</div>
