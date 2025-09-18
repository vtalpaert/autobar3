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
            <h1 class="text-4xl font-bold">Cocktail Management</h1>
            <a href="/admin" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
                Back to Dashboard
            </a>
        </div>

        <!-- Cocktails Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">All Cocktails</h2>
            {#if data.cocktails.length === 0}
                <p class="text-gray-400">No cocktails found</p>
            {:else}
                <div class="space-y-4">
                    {#each data.cocktails as cocktail}
                        <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                            <div>
                                <p class="font-bold">{cocktail.name}</p>
                                <p class="text-sm text-gray-400">
                                    Created by: {cocktail.creatorName}
                                </p>
                                <p class="text-sm text-gray-400">
                                    Created: {new Date(cocktail.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div class="flex gap-2">
                                <a
                                    href={`/cocktails/${cocktail.id}`}
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                >
                                    View
                                </a>
                                <form method="POST" action="?/deleteCocktail" use:enhance>
                                    <input type="hidden" name="cocktailId" value={cocktail.id} />
                                    <button
                                        type="submit"
                                        class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                    >
                                        Delete
                                    </button>
                                </form>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    </div>
</div>
