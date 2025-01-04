<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data;
    export let form: ActionData;
    
    $: t = translations[$currentLanguage];
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 class="text-3xl font-bold mb-6">{t.createCocktail.title}</h1>

            <form method="POST" use:enhance>
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
