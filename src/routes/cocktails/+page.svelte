<script lang="ts">
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    $: t = translations[$currentLanguage];
    
    let filterOption = 'mine';
    $: filteredCocktails = filterOption === 'mine' 
        ? data.cocktails.filter(c => c.creatorId === data.profile.id)
        : data.cocktails;
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
            <div class="flex items-center gap-4">
                <h1 class="text-4xl font-bold">{t.cocktails.title}</h1>
                <select 
                    bind:value={filterOption}
                    class="bg-gray-700 text-white px-3 py-1 rounded-lg border border-gray-600"
                >
                    <option value="mine">{t.cocktails.filterMine}</option>
                    <option value="all">{t.cocktails.filterCollaborations}</option>
                </select>
            </div>
            <a 
                href="/cocktails/new" 
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
                {t.cocktails.createNew}
            </a>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredCocktails as cocktail}
                <div class="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 class="text-2xl font-bold mb-2">{cocktail.name}</h2>
                    {#if cocktail.description}
                        <p class="text-gray-300 mb-4">{cocktail.description}</p>
                    {/if}
                    <p class="text-sm text-gray-400">{t.cocktails.createdBy} {cocktail.creatorName}</p>
                    <a 
                        href="/cocktails/{cocktail.id}" 
                        class="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        {t.cocktails.viewDetails}
                    </a>
                </div>
            {/each}
        </div>
    </div>
</div>
