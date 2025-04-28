<script lang="ts">
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    $: t = translations[$currentLanguage];

    $: formattedDate = $currentLanguage === 'fr' 
        ? new Date(data.cocktail.createdAt).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'})
        : new Date(data.cocktail.createdAt).toLocaleDateString();
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-lg p-8">
            <a 
                href="/cocktails" 
                class="text-blue-400 hover:text-blue-300 mb-6 inline-block"
            >
                {t.cocktails.backToCocktails}
            </a>
            
            <h1 class="text-4xl font-bold mb-4">{data.cocktail.name}</h1>
            
            {#if data.cocktail.description}
                <p class="text-gray-300 text-lg mb-6">{data.cocktail.description}</p>
            {/if}
            
            {#if data.cocktail.instructions}
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-3">{t.cocktails.instructions}</h2>
                    <p class="text-gray-300">{data.cocktail.instructions}</p>
                </div>
            {/if}
            
            <div class="flex justify-between items-center mt-8 mb-4">
                <div class="text-sm text-gray-400">
                    <p>{t.cocktails.createdBy} {data.cocktail.creatorName}</p>
                    <p>{t.cocktails.addedOn} {formattedDate}</p>
                </div>
                
                <div class="flex gap-2">
                    {#if data.user && (data.user.isAdmin || data.cocktail.creatorId === data.user.id)}
                        <a 
                            href="/cocktails/{data.cocktail.id}/edit" 
                            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            {t.cocktails.edit}
                        </a>
                    {/if}
                    
                    {#if data.user}
                        <form method="POST" action="?/createOrder">
                            <button 
                                type="submit"
                                class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                            >
                                {t.cocktails.order || 'Order'}
                            </button>
                        </form>
                    {/if}
                </div>
            </div>
            
            {#if data.cocktail.doses && data.cocktail.doses.length > 0}
                <div class="mt-6">
                    <h2 class="text-2xl font-bold mb-3">{t.cocktails.ingredients}</h2>
                    <ul class="divide-y divide-gray-700">
                        {#each data.cocktail.doses as dose}
                            <li class="py-2 flex items-center">
                                <span class="inline-flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full mr-3 text-sm font-bold">
                                    {dose.number}
                                </span>
                                <span class="font-medium">{dose.ingredient.name}</span>
                                <span class="ml-2 text-gray-400">{dose.quantity}ml</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </div>
</div>
