<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';

    export let form: ActionData;

    let isLogin = true;
    const toggleMode = () => (isLogin = !isLogin);

    $: t = translations[$currentLanguage];
</script>

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
            <a href="/" class="text-blue-400 hover:text-blue-300 mb-6 inline-block">
                {t.auth.backToHome}
            </a>
            <h1 class="text-3xl font-bold mb-6 text-center">
                {isLogin ? t.auth.login : t.auth.register}
            </h1>

            {#if form?.message}
                <div class="bg-red-500 text-white p-3 rounded-lg mb-4">
                    {form.message}
                </div>
            {/if}

            <form method="POST" action="?/{isLogin ? 'login' : 'register'}" use:enhance>
                <div class="mb-4">
                    <label for="username" class="block text-sm font-medium mb-2"
                        >{t.auth.username}</label
                    >
                    <input
                        type="text"
                        id="username"
                        name="username"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div class="mb-6">
                    <label for="password" class="block text-sm font-medium mb-2"
                        >{t.auth.password}</label
                    >
                    <input
                        type="password"
                        id="password"
                        name="password"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mb-4"
                >
                    {isLogin ? t.auth.login : t.auth.register}
                </button>
            </form>

            <p class="text-center text-gray-400">
                {isLogin ? t.auth.dontHaveAccount : t.auth.alreadyHaveAccount}
                <button class="text-blue-400 hover:text-blue-300 ml-1" on:click={toggleMode}>
                    {isLogin ? t.auth.register : t.auth.login}
                </button>
            </p>
        </div>
    </div>
</div>
