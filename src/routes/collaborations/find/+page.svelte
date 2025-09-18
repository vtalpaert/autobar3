<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    export let form;

    $: t = translations[$currentLanguage];

    let searchTerm = '';
    $: filteredArtists = data.artists.filter(
        (artist) =>
            artist.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (artist.artistName &&
                artist.artistName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Track which artists we've already sent requests to
    let sentRequestIds = data.sentRequests.map((req) => req.receiverId);

    // Track which artists have sent us requests
    $: receivedRequestIds = data.pendingRequests.map((req) => req.senderId);

    // Track which artists we're already collaborating with
    $: collaboratingIds = data.activeCollaborations.map((collab) => collab.otherProfile.id);

    let message = '';
    let selectedArtistId = '';
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto">
            <a href="/collaborations" class="text-blue-400 hover:text-blue-300 mb-6 inline-block">
                ← {t.collaboration.title}
            </a>

            <h1 class="text-3xl font-bold mb-6">{t.collaboration.findArtists}</h1>

            <!-- Search Bar -->
            <div class="mb-8">
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder={t.collaboration.searchPlaceholder}
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {#if form?.success}
                <div class="mb-6 p-4 bg-green-800 text-white rounded-lg">
                    {t.collaboration.requestSent}
                </div>
            {/if}

            <!-- Artists List -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each filteredArtists as artist}
                    <div class="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                        <div>
                            <p class="font-medium">{artist.artistName || artist.username}</p>
                            {#if artist.artistName && artist.artistName !== artist.username}
                                <p class="text-gray-400 text-sm">@{artist.username}</p>
                            {/if}
                            <p class="text-gray-400 text-sm mt-1">
                                {artist.cocktailCount} cocktails
                            </p>
                        </div>

                        <div>
                            {#if collaboratingIds.includes(artist.id)}
                                <span class="text-green-400 text-sm">
                                    {t.collaboration.alreadyCollaborating}
                                </span>
                            {:else if sentRequestIds.includes(artist.id)}
                                <span class="text-blue-400 text-sm">
                                    {t.collaboration.requestSentStatus}
                                </span>
                            {:else if receivedRequestIds.includes(artist.id)}
                                <span class="text-yellow-400 text-sm">
                                    {t.collaboration.requestReceivedStatus}
                                </span>
                            {:else}
                                <button
                                    on:click={() => {
                                        selectedArtistId = artist.id;
                                        message = '';
                                    }}
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                >
                                    {t.collaboration.send}
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}

                {#if filteredArtists.length === 0}
                    <div class="col-span-2 text-center py-8 text-gray-400">
                        {t.collaboration.noArtistsFound}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<!-- Send Request Modal -->
{#if selectedArtistId}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full text-white">
            <h3 class="text-xl font-bold mb-4">{t.collaboration.sendRequestTitle}</h3>

            <form
                method="POST"
                action="?/sendRequest"
                use:enhance={({ form }) => {
                    return async ({ result, update }) => {
                        if (result.type === 'success' && result.data) {
                            // Add the receiverId to sentRequestIds
                            if (result.data.receiverId) {
                                sentRequestIds = [...sentRequestIds, result.data.receiverId];
                            }

                            // Close the modal
                            selectedArtistId = '';

                            // Update the form to show success message
                            update({ result });
                        }
                    };
                }}
            >
                <input type="hidden" name="receiverId" value={selectedArtistId} />

                <div class="mb-4">
                    <label for="message" class="block text-sm font-medium mb-2">
                        {t.collaboration.message}
                    </label>
                    <textarea
                        id="message"
                        name="message"
                        bind:value={message}
                        rows="4"
                        placeholder={t.collaboration.messagePlaceholder}
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                </div>

                <div class="flex justify-end space-x-4">
                    <button
                        type="button"
                        on:click={() => (selectedArtistId = '')}
                        class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        {t.collaboration.cancel}
                    </button>
                    <button
                        type="submit"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        {t.collaboration.send}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
