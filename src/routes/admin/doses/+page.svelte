<script lang="ts">
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';
    import { enhance } from '$app/forms';

    export let data: PageData;
    
    let selectedCocktail = '';
    let selectedIngredient = '';
    
    $: filteredDoses = data.doses.filter(dose => {
        if (selectedCocktail && dose.cocktailId !== selectedCocktail) return false;
        if (selectedIngredient && dose.ingredientId !== selectedIngredient) return false;
        return true;
    });
    
    // Group cocktails by ID for the dropdown
    $: cocktailOptions = data.cocktails.reduce((acc, cocktail) => {
        acc[cocktail.id] = cocktail.name;
        return acc;
    }, {});
    
    // Group ingredients by ID for the dropdown
    $: ingredientOptions = data.ingredients.reduce((acc, ingredient) => {
        acc[ingredient.id] = ingredient.name;
        return acc;
    }, {});
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold">Dose Management</h1>
            <a href="/admin" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
                Back to Dashboard
            </a>
        </div>

        <!-- Filters -->
        <div class="mb-8 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Filters</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="cocktail-filter" class="block text-sm font-medium text-white mb-1">
                        Filter by Cocktail
                    </label>
                    <select
                        id="cocktail-filter"
                        bind:value={selectedCocktail}
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    >
                        <option value="">All Cocktails</option>
                        {#each data.cocktails as cocktail}
                            <option value={cocktail.id}>{cocktail.name}</option>
                        {/each}
                    </select>
                </div>
                
                <div>
                    <label for="ingredient-filter" class="block text-sm font-medium text-white mb-1">
                        Filter by Ingredient
                    </label>
                    <select
                        id="ingredient-filter"
                        bind:value={selectedIngredient}
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    >
                        <option value="">All Ingredients</option>
                        {#each data.ingredients as ingredient}
                            <option value={ingredient.id}>{ingredient.name}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>

        <!-- Add New Dose -->
        <div class="mb-8 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Add New Dose</h2>
            <form 
                method="POST" 
                action="?/addDose" 
                use:enhance={() => {
                    return ({ update }) => {
                        update();
                    };
                }}
            >
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label for="cocktail" class="block text-sm font-medium text-white mb-1">
                            Cocktail
                        </label>
                        <select
                            id="cocktail"
                            name="cocktailId"
                            required
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        >
                            <option value="" disabled selected>Select a cocktail</option>
                            {#each data.cocktails as cocktail}
                                <option value={cocktail.id}>{cocktail.name}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <div>
                        <label for="ingredient" class="block text-sm font-medium text-white mb-1">
                            Ingredient
                        </label>
                        <select
                            id="ingredient"
                            name="ingredientId"
                            required
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        >
                            <option value="" disabled selected>Select an ingredient</option>
                            {#each data.ingredients as ingredient}
                                <option value={ingredient.id}>{ingredient.name}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <div>
                        <label for="quantity" class="block text-sm font-medium text-white mb-1">
                            Quantity (ml)
                        </label>
                        <input
                            id="quantity"
                            name="quantity"
                            type="number"
                            min="0"
                            step="0.1"
                            required
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                            placeholder="e.g. 30"
                        />
                    </div>
                    
                    <div>
                        <label for="number" class="block text-sm font-medium text-white mb-1">
                            Order Number
                        </label>
                        <input
                            id="number"
                            name="number"
                            type="number"
                            min="1"
                            step="1"
                            required
                            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                            placeholder="e.g. 1"
                        />
                    </div>
                    
                    <div class="md:col-span-2 lg:col-span-4">
                        <button
                            type="submit"
                            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Add Dose
                        </button>
                    </div>
                </div>
            </form>
        </div>

        <!-- Doses List -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">All Doses</h2>
            {#if filteredDoses.length === 0}
                <p class="text-gray-400">No doses found</p>
            {:else}
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-gray-700 border border-gray-600 rounded-lg">
                        <thead>
                            <tr>
                                <th class="px-4 py-2 border-b border-gray-600 text-left text-white">Cocktail</th>
                                <th class="px-4 py-2 border-b border-gray-600 text-left text-white">Ingredient</th>
                                <th class="px-4 py-2 border-b border-gray-600 text-left text-white">Quantity (ml)</th>
                                <th class="px-4 py-2 border-b border-gray-600 text-left text-white">Order</th>
                                <th class="px-4 py-2 border-b border-gray-600 text-left text-white">Weight (g)</th>
                                <th class="px-4 py-2 border-b border-gray-600 text-left text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each filteredDoses as dose}
                                <tr>
                                    <td class="px-4 py-2 border-b border-gray-600 text-white">
                                        {cocktailOptions[dose.cocktailId] || 'Unknown'}
                                    </td>
                                    <td class="px-4 py-2 border-b border-gray-600 text-white">
                                        {ingredientOptions[dose.ingredientId] || 'Unknown'}
                                    </td>
                                    <td class="px-4 py-2 border-b border-gray-600 text-white">
                                        {dose.quantity}
                                    </td>
                                    <td class="px-4 py-2 border-b border-gray-600 text-white">
                                        {dose.number}
                                    </td>
                                    <td class="px-4 py-2 border-b border-gray-600 text-white">
                                        {dose.weight.toFixed(1)}
                                    </td>
                                    <td class="px-4 py-2 border-b border-gray-600 text-white">
                                        <form 
                                            method="POST" 
                                            action="?/deleteDose" 
                                            use:enhance={({ formData }) => {
                                                const id = formData.get('id');
                                                console.log('Deleting dose:', id);
                                                
                                                return ({ update }) => {
                                                    console.log('Delete completed, updating page');
                                                    update({ reset: false });
                                                };
                                            }}
                                        >
                                            <input type="hidden" name="id" value={dose.id} />
                                            <button 
                                                type="submit" 
                                                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                            >
                                                Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </section>
    </div>
</div>
