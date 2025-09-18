<script lang="ts">
    import { enhance } from '$app/forms';
    import Header from '$lib/components/Header.svelte';
    import { translations } from '$lib/i18n/translations/index';
    import { currentLanguage } from '$lib/i18n/store';

    export let data;
    export let form;

    let newPassword = '';
    let confirmPassword = '';
    let passwordMismatch = false;

    $: t = translations[$currentLanguage];

    function validatePasswords() {
        passwordMismatch = newPassword !== confirmPassword;
        return !passwordMismatch;
    }
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto">
            <a href="/profile" class="text-blue-400 hover:text-blue-300 mb-6 inline-block">
                ← {t.profile.backToProfile}
            </a>

            <h1 class="text-3xl font-bold mb-8">{t.profile.editProfile}</h1>

            <!-- Artist Name Update Form -->
            <form
                method="POST"
                action="?/updateProfile"
                use:enhance
                class="bg-gray-800 p-6 rounded-lg mb-8"
            >
                <div class="mb-6">
                    <label for="artistName" class="block text-sm font-medium text-gray-300 mb-2">
                        {t.profile.artistName}
                    </label>
                    <input
                        type="text"
                        id="artistName"
                        name="artistName"
                        value={data.profile.artistName || ''}
                        placeholder={t.profile.artistNamePlaceholder}
                        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    {t.profile.updateProfile}
                </button>
            </form>

            <!-- Password Change Form -->
            <form
                method="POST"
                action="?/changePassword"
                use:enhance
                class="bg-gray-800 p-6 rounded-lg"
                on:submit={(e) => {
                    if (!validatePasswords()) {
                        e.preventDefault();
                    }
                }}
            >
                <h2 class="text-xl font-bold mb-4">{t.profile.changePassword}</h2>

                <div class="mb-6">
                    <label
                        for="currentPassword"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {t.profile.currentPassword}
                    </label>
                    <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        required
                        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div class="mb-6">
                    <label for="newPassword" class="block text-sm font-medium text-gray-300 mb-2">
                        {t.profile.newPassword}
                    </label>
                    <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        bind:value={newPassword}
                        required
                        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div class="mb-6">
                    <label
                        for="confirmPassword"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {t.profile.confirmPassword}
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        bind:value={confirmPassword}
                        required
                        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    {#if passwordMismatch}
                        <p class="text-red-500 mt-2">{t.profile.passwordMismatch}</p>
                    {/if}
                </div>

                <button
                    type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    {t.profile.changePassword}
                </button>
            </form>

            {#if form?.success}
                <div class="mt-4 p-4 bg-green-600 text-white rounded-lg">
                    {form.message}
                </div>
            {/if}

            {#if form?.error}
                <div class="mt-4 p-4 bg-red-600 text-white rounded-lg">
                    {form.error}
                </div>
            {/if}
        </div>
    </div>
</div>
