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
                </ol>

                <div class="mt-4 mb-4 p-4 bg-gray-600 rounded-lg">
                    <p class="text-sm text-gray-300">
                        For the server URL field, use either:
                        <br/>- Development server: <code class="bg-gray-700 px-2 py-1 rounded">https://192.168.1.x:5173</code> (your local IP)
                        <br/>- Production server: <code class="bg-gray-700 px-2 py-1 rounded">https://robotcocktail.ovh</code>
                    </p>
                </div>

                <div class="p-4 bg-gray-700 rounded-lg">
                    <p class="font-bold mb-2">{t.devices.ap.networkName}</p>
                    <p class="mb-4">{t.devices.ap.networkValue}</p>
                    <p class="font-bold mb-2">{t.devices.ap.password}</p>
                    <p>{t.devices.ap.passwordValue}</p>
                </div>
            </div>
        </div>
    </div>
</div>
