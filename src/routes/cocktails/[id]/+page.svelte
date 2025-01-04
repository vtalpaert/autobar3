<script lang="ts">
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    $: t = translations[$currentLanguage];

    $: formattedDate = new Date(data.cocktail.createdAt).toLocaleDateString();
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-lg p-8">
            <a 
                href="/cocktails" 
                class="text-blue-400 hover:text-blue-300 mb-6 inline-block"
            >
                ← Back to Cocktails
            </a>
            
            <h1 class="text-4xl font-bold mb-4">{data.cocktail.name}</h1>
            
            {#if data.cocktail.description}
                <p class="text-gray-300 text-lg mb-6">{data.cocktail.description}</p>
            {/if}
            
            {#if data.cocktail.instructions}
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-3">Instructions</h2>
                    <p class="text-gray-300">{data.cocktail.instructions}</p>
                </div>
            {/if}
            
            <div class="text-sm text-gray-400">
                <p>Created by {data.cocktail.creatorName}</p>
                <p>Added on {formattedDate}</p>
            </div>
        </div>
    </div>
</div>
