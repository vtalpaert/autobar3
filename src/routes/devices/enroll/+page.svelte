<script lang="ts">
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    $: t = translations[$currentLanguage];
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="mb-8">
            <a 
                href="/devices" 
                class="text-blue-400 hover:text-blue-300 transition-colors"
            >
                ← {t.devices.back}
            </a>
            <h1 class="text-4xl font-bold mt-4">{t.devices.ap.title}</h1>
        </div>

        <div class="bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto">
            <div class="prose prose-invert mb-8">
                <ol class="list-decimal list-inside space-y-4">
                    <li>{t.devices.ap.step1}</li>
                    <li>{t.devices.ap.step2}</li>
                    <li>{t.devices.ap.step3}</li>
                    <li>{t.devices.ap.step4}</li>
                    <li>{t.devices.ap.step5}</li>
                    <li>{t.devices.ap.step6}</li>
                    <li>{t.devices.ap.step7}</li>
                </ol>

                <div class="mt-8 p-6 bg-gray-700 rounded-lg">
                    <h3 class="text-xl font-bold mb-4">{t.devices.ap.token.title}</h3>
                    <p class="mb-4">{t.devices.ap.token.description}</p>
                    
                    <div class="bg-gray-800 p-4 rounded-lg mb-6">
                        <code class="text-lg" id="deviceToken">{data.token}</code>
                    </div>

                    <form method="POST" action="?/enrollDevice" class="text-center">
                        <input type="hidden" name="token" value={data.token}>
                        <button 
                            type="submit"
                            class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            {t.devices.ap.token.enroll}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
