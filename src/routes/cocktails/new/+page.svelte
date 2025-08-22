<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';
    import ImageUpload from '$lib/components/ImageUpload.svelte';

    export let data;
    export let form;
    
    $: t = translations[$currentLanguage];
    
    // For ingredient form
    let selectedIngredientId = '';
    let quantity = 50; // Default quantity in ml
    let pendingDoses = [];
    let showAddDose = false;
    
    // For image upload
    let selectedImageFile: File | null = null;
    let hiddenImageInput: HTMLInputElement;
    
    function handleImageSelected(event: CustomEvent<{ file: File; inputElement: HTMLInputElement }>) {
        selectedImageFile = event.detail.file;
        
        // Set the file on the hidden input using DataTransfer
        if (hiddenImageInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(event.detail.file);
            hiddenImageInput.files = dataTransfer.files;
        }
    }
    
    function handleImageRemoved() {
        selectedImageFile = null;
        if (hiddenImageInput) {
            hiddenImageInput.value = '';
        }
    }
    
    function addLocalDose() {
        if (!selectedIngredientId) return;
        
        const ingredient = data.ingredients.find(i => i.id === selectedIngredientId);
        if (!ingredient) return;
        
        // Automatically assign the next number
        const nextNumber = pendingDoses.length + 1;
        
        pendingDoses = [
            ...pendingDoses, 
            { 
                ingredientId: selectedIngredientId, 
                ingredientName: ingredient.name,
                quantity,
                number: nextNumber
            }
        ];
        
        // Reset form
        selectedIngredientId = '';
        quantity = 50;
        showAddDose = false;
    }
    
    function removeLocalDose(index) {
        // Get the number of the dose being removed
        const removedNumber = pendingDoses[index].number;
        
        // Remove the dose at the specified index
        const filteredDoses = pendingDoses.filter((_, i) => i !== index);
        
        // Renumber all doses with higher numbers
        const updatedDoses = filteredDoses.map(dose => {
            if (dose.number > removedNumber) {
                return { ...dose, number: dose.number - 1 };
            }
            return dose;
        });
        
        pendingDoses = updatedDoses;
    }
    
    function moveDoseUp(index) {
        if (index <= 0) return;
        
        // Swap with the previous item
        const newDoses = [...pendingDoses];
        
        // Swap the number property
        const tempNumber = newDoses[index].number;
        newDoses[index].number = newDoses[index - 1].number;
        newDoses[index - 1].number = tempNumber;
        
        // Swap the array positions
        [newDoses[index - 1], newDoses[index]] = [newDoses[index], newDoses[index - 1]];
        
        pendingDoses = newDoses;
    }
    
    function moveDoseDown(index) {
        if (index >= pendingDoses.length - 1) return;
        
        // Swap with the next item
        const newDoses = [...pendingDoses];
        
        // Swap the number property
        const tempNumber = newDoses[index].number;
        newDoses[index].number = newDoses[index + 1].number;
        newDoses[index + 1].number = tempNumber;
        
        // Swap the array positions
        [newDoses[index], newDoses[index + 1]] = [newDoses[index + 1], newDoses[index]];
        
        pendingDoses = newDoses;
    }
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
            
            <h1 class="text-3xl font-bold mb-6">{t.createCocktail.title}</h1>

            {#if form?.error}
                <div class="mb-4 p-3 bg-red-900 text-white rounded">
                    {form.error}
                </div>
            {/if}

            <form method="POST" enctype="multipart/form-data" use:enhance>
                <!-- Image Upload -->
                <ImageUpload
                    label="Cocktail Image"
                    on:fileSelected={handleImageSelected}
                    on:fileRemoved={handleImageRemoved}
                />
                
                <!-- Hidden input for image file -->
                <input bind:this={hiddenImageInput} type="file" name="image" class="hidden" />

                <div class="mb-4">
                    <label for="name" class="block text-sm font-medium mb-2">
                        {t.createCocktail.name}
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t.createCocktail.namePlaceholder}
                        required
                    />
                </div>

                <div class="mb-4">
                    <label for="description" class="block text-sm font-medium mb-2">
                        {t.createCocktail.description}
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        rows="3"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t.createCocktail.descriptionPlaceholder}
                    ></textarea>
                </div>

                <div class="mb-6">
                    <label for="instructions" class="block text-sm font-medium mb-2">
                        {t.createCocktail.instructions}
                    </label>
                    <textarea
                        id="instructions"
                        name="instructions"
                        rows="5"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t.createCocktail.instructionsPlaceholder}
                    ></textarea>
                </div>
                
                <!-- Ingredients Section -->
                <div class="mb-6 border-t border-gray-700 pt-6">
                    <h2 class="text-2xl font-bold mb-4">{t.cocktails.ingredients}</h2>
                    
                    {#if pendingDoses.length > 0}
                        <div class="mb-6">
                            <ul class="divide-y divide-gray-700">
                                {#each pendingDoses as dose, index}
                                    <li class="py-3 flex items-center">
                                        <span class="inline-flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full mr-3 text-sm font-bold">
                                            {dose.number}
                                        </span>
                                        <div class="flex-grow">
                                            <span class="font-medium">{dose.ingredientName}</span>
                                            <span class="ml-2 text-gray-400">{dose.quantity}ml</span>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            {#if index > 0}
                                                <button 
                                                    type="button"
                                                    on:click={() => moveDoseUp(index)}
                                                    class="text-blue-400 hover:text-blue-300 p-1"
                                                    title={t.cocktails.moveUp}
                                                >
                                                    ↑
                                                </button>
                                            {/if}
                                            {#if index < pendingDoses.length - 1}
                                                <button 
                                                    type="button"
                                                    on:click={() => moveDoseDown(index)}
                                                    class="text-blue-400 hover:text-blue-300 p-1"
                                                    title={t.cocktails.moveDown}
                                                >
                                                    ↓
                                                </button>
                                            {/if}
                                            <button 
                                                type="button"
                                                on:click={() => removeLocalDose(index)}
                                                class="text-red-500 hover:text-red-400 p-1"
                                                title={t.cocktails.remove}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                    
                    <!-- Add Ingredient Button -->
                    <button 
                        type="button"
                        on:click={() => showAddDose = !showAddDose}
                        class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-6"
                    >
                        {showAddDose ? t.cocktails.cancel : t.cocktails.addIngredient}
                    </button>
                    
                    <!-- Add Ingredient Form -->
                    {#if showAddDose}
                        <div class="mt-4 p-4 bg-gray-700 rounded-lg mb-6">
                            <div class="mb-4">
                                <label for="ingredientSelect" class="block text-sm font-medium mb-2">
                                    {t.cocktails.selectIngredient}
                                </label>
                                <select
                                    id="ingredientSelect"
                                    bind:value={selectedIngredientId}
                                    class="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{t.cocktails.chooseIngredient}</option>
                                    {#each data.ingredients as ingredient}
                                        <option value={ingredient.id}>{ingredient.name}</option>
                                    {/each}
                                </select>
                            </div>
                            
                            <div class="mb-4">
                                <label for="quantityInput" class="block text-sm font-medium mb-2">
                                    {t.cocktails.quantity} (ml)
                                </label>
                                <input
                                    type="number"
                                    id="quantityInput"
                                    bind:value={quantity}
                                    min="1"
                                    max="500"
                                    class="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <button
                                type="button"
                                on:click={addLocalDose}
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                disabled={!selectedIngredientId}
                            >
                                {t.cocktails.addIngredient}
                            </button>
                        </div>
                    {/if}
                </div>
                
                <!-- Hidden inputs to send doses data -->
                {#each pendingDoses as dose, index}
                    <input type="hidden" name={`doses[${index}].ingredientId`} value={dose.ingredientId} />
                    <input type="hidden" name={`doses[${index}].quantity`} value={dose.quantity} />
                {/each}

                <button
                    type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    {t.createCocktail.create}
                </button>
            </form>
        </div>
    </div>
</div>
