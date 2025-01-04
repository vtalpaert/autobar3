<script lang="ts">
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';

    export let data: PageData;
    $: t = translations[$currentLanguage];
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
            <a 
                href="/" 
                class="text-blue-400 hover:text-blue-300 mb-6 inline-block"
            >
                {t.auth.backToHome}
            </a>
            
            <h1 class="text-3xl font-bold mb-6">{t.profile.unverified.title}</h1>
            
            <p class="text-gray-300 mb-4">
                {t.profile.unverified.message}
            </p>
            
            <p class="text-gray-300">
                {t.profile.unverified.checkBack}
            </p>
        </div>
    </div>
</div>
