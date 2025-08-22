<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';
    import ImageUpload from '$lib/components/ImageUpload.svelte';

    export let data: PageData;
    export let form;
    
    $: t = translations[$currentLanguage];
    
    // For ingredient form
    let selectedIngredientId = '';
    let quantity = 50; // Default quantity in ml
    let showAddDose = false;
    let errorMessage = form?.error || '';
    
    // For delete confirmation
    let showDeleteConfirmation = false;
    
    // For image upload
    let selectedImageFile: File | null = null;
    let imageChanged = false;
    let hiddenImageInput: HTMLInputElement;
    
    // Get current image URI (will be null until we implement the serving endpoint)
    $: currentImageUri = data.cocktail.imageUri || null;
    
    function handleImageSelected(event: CustomEvent<{ file: File; inputElement: HTMLInputElement }>) {
        selectedImageFile = event.detail.file;
        imageChanged = true;
        
        // Set the file on the hidden input using DataTransfer
        if (hiddenImageInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(event.detail.file);
            hiddenImageInput.files = dataTransfer.files;
        }
    }
    
    function handleImageRemoved() {
        selectedImageFile = null;
        imageChanged = true;
        if (hiddenImageInput) {
            hiddenImageInput.value = '';
        }
    }
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-lg p-8">
            <a 
                href="/cocktails/{data.cocktail.id}" 
                class="text-blue-400 hover:text-blue-300 mb-6 inline-block"
            >
                {t.cocktails.backToCocktail}
            </a>
            
            <h1 class="text-3xl font-bold mb-6">{t.cocktails.editCocktail}</h1>

            {#if errorMessage}
                <div class="mb-4 p-3 bg-red-900 text-white rounded">
                    {errorMessage}
                </div>
            {/if}

            <form method="POST" action="?/updateCocktail" enctype="multipart/form-data" use:enhance={({ formData }) => {
                return async ({ result }) => {
                    if (result.type === 'failure') {
                        errorMessage = result.data?.error || 'An error occurred';
                    }
                };
            }}>
                <!-- Image Upload -->
                <ImageUpload
                    label="Cocktail Image"
                    currentImageUri={currentImageUri}
                    on:fileSelected={handleImageSelected}
                    on:fileRemoved={handleImageRemoved}
                />
                
                <!-- Hidden inputs for image handling -->
                <input bind:this={hiddenImageInput} type="file" name="image" class="hidden" />
                {#if imageChanged}
                    <input type="hidden" name="imageChanged" value="true" />
                {/if}

                <div class="mb-4">
                    <label for="name" class="block text-sm font-medium mb-2">
                        {t.createCocktail.name}
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={data.cocktail.name}
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    >{data.cocktail.description || ''}</textarea>
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
                    >{data.cocktail.instructions || ''}</textarea>
                </div>

                <button
                    type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-4"
                >
                    {t.cocktails.saveChanges}
                </button>
            </form>
            
            <!-- Delete Cocktail Button -->
            <button
                on:click={() => showDeleteConfirmation = true}
                class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-8"
            >
                {t.cocktails.delete}
            </button>
            
            <!-- Delete Confirmation Modal -->
            {#if showDeleteConfirmation}
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h3 class="text-xl font-bold mb-4">{t.cocktails.deleteConfirmTitle}</h3>
                        <p class="mb-6">{t.cocktails.deleteConfirmMessage}</p>
                        <div class="flex justify-end space-x-4">
                            <button
                                on:click={() => showDeleteConfirmation = false}
                                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                {t.cocktails.cancel}
                            </button>
                            <form method="POST" action="?/deleteCocktail" use:enhance>
                                <button
                                    type="submit"
                                    class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                >
                                    {t.cocktails.confirmDelete}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            {/if}
            
            <!-- Ingredients Section -->
            <div class="mt-8 border-t border-gray-700 pt-6">
                <h2 class="text-2xl font-bold mb-4">{t.cocktails.ingredients}</h2>
                
                {#if data.cocktail.doses && data.cocktail.doses.length > 0}
                    <div class="mb-6">
                        <ul class="divide-y divide-gray-700">
                            {#each data.cocktail.doses as dose}
                                <li class="py-3 flex items-center">
                                    <span class="inline-flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full mr-3 text-sm font-bold">
                                        {dose.number}
                                    </span>
                                    <div class="flex-grow">
                                        <span class="font-medium">{dose.ingredient.name}</span>
                                        <span class="ml-2 text-gray-400">{dose.quantity}ml</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        {#if dose.number > 1}
                                            <form method="POST" action="?/moveDoseUp" use:enhance>
                                                <input type="hidden" name="doseId" value={dose.id} />
                                                <button 
                                                    type="submit" 
                                                    class="text-blue-400 hover:text-blue-300 p-1"
                                                    title={t.cocktails.moveUp}
                                                >
                                                    ↑
                                                </button>
                                            </form>
                                        {/if}
                                        {#if dose.number < data.cocktail.doses.length}
                                            <form method="POST" action="?/moveDoseDown" use:enhance>
                                                <input type="hidden" name="doseId" value={dose.id} />
                                                <button 
                                                    type="submit" 
                                                    class="text-blue-400 hover:text-blue-300 p-1"
                                                    title={t.cocktails.moveDown}
                                                >
                                                    ↓
                                                </button>
                                            </form>
                                        {/if}
                                        <form method="POST" action="?/removeDose" use:enhance>
                                            <input type="hidden" name="doseId" value={dose.id} />
                                            <button 
                                                type="submit" 
                                                class="text-red-500 hover:text-red-400 p-1"
                                                title={t.cocktails.remove}
                                            >
                                                ×
                                            </button>
                                        </form>
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}
                
                <!-- Add Ingredient Button -->
                <button 
                    on:click={() => showAddDose = !showAddDose}
                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    {showAddDose ? t.cocktails.cancel : t.cocktails.addIngredient}
                </button>
                
                <!-- Add Ingredient Form -->
                {#if showAddDose}
                    <form method="POST" action="?/addDose" class="mt-4 p-4 bg-gray-700 rounded-lg" use:enhance>
                        <div class="mb-4">
                            <label for="ingredientId" class="block text-sm font-medium mb-2">
                                {t.cocktails.selectIngredient}
                            </label>
                            <select
                                id="ingredientId"
                                name="ingredientId"
                                bind:value={selectedIngredientId}
                                class="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">{t.cocktails.chooseIngredient}</option>
                                {#each data.ingredients as ingredient}
                                    <option value={ingredient.id}>{ingredient.name}</option>
                                {/each}
                            </select>
                        </div>
                        
                        <div class="mb-4">
                            <label for="quantity" class="block text-sm font-medium mb-2">
                                {t.cocktails.quantity} (ml)
                            </label>
                            <input
                                type="number"
                                id="quantity"
                                name="quantity"
                                bind:value={quantity}
                                min="1"
                                max="500"
                                class="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        
                        <button
                            type="submit"
                            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            {t.cocktails.addIngredient}
                        </button>
                    </form>
                {/if}
            </div>
        </div>
    </div>
</div>
