<script lang="ts">
    import type { PageData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    $: t = translations[$currentLanguage];
</script>

<svelte:head>
    <script 
        type="module"
        src="https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module"
    ></script>
</svelte:head>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="mb-8">
            <a 
                href="/devices" 
                class="text-blue-400 hover:text-blue-300 transition-colors"
            >
                ← Back to Devices
            </a>
            <h1 class="text-4xl font-bold mt-4">Register New Device</h1>
        </div>

        <div class="bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto">
            <div class="prose prose-invert mb-8">
                <h2>Instructions</h2>
                <ol class="list-decimal list-inside">
                    <li>Connect your ESP32 device to your computer via USB</li>
                    <li>Click the Install button below</li>
                    <li>Select the correct USB port when prompted</li>
                    <li>Wait for the installation to complete</li>
                </ol>
            </div>

            <div class="text-center">
                <esp-web-install-button
                    manifest="/firmware/manifest.json"
                    class="inline-block"
                >
                    <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                        Install Firmware
                    </button>
                </esp-web-install-button>
            </div>
        </div>
    </div>
</div>
