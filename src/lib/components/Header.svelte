<script lang="ts">
    import { enhance } from '$app/forms';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';

    export let user: { username: string; isAdmin?: boolean } | null = null;
    let isDesktopDropdownOpen = false;
    let isMobileMenuOpen = false;

    const toggleDesktopDropdown = () => {
        isDesktopDropdownOpen = !isDesktopDropdownOpen;
    };

    const closeDesktopDropdown = () => {
        isDesktopDropdownOpen = false;
    };

    const toggleMobileMenu = () => {
        isMobileMenuOpen = !isMobileMenuOpen;
    };

    const closeMobileMenu = () => {
        isMobileMenuOpen = false;
    };

    const closeAllMenus = () => {
        closeDesktopDropdown();
        closeMobileMenu();
    };

    $: t = translations[$currentLanguage] || translations.en;

    // Shared dropdown menu items - includes ALL important links
    const getDropdownMenuItems = () => [
        ...(user
            ? [
                  { href: '/cocktails', label: t.header.cocktails },
                  { href: '/my-bar', label: t.header.myBar },
                  { href: '/devices', label: t.header.devices },
                  { href: '/profile', label: t.header.profile },
                  { href: '/collaborations', label: t.header.collaborations },
                  ...(user.isAdmin ? [{ href: '/admin', label: 'Admin Dashboard' }] : [])
              ]
            : [])
    ];
</script>

<header class="bg-gray-800 fixed w-full top-0 z-50 shadow-lg">
    <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-16">
            <!-- Brand - shorter on mobile -->
            <a href="/" class="text-white font-bold">
                <span class="hidden sm:inline text-xl">RobotCocktail</span>
                <span class="sm:hidden text-lg">RC</span>
            </a>

            <!-- Desktop Navigation -->
            <div class="hidden md:flex items-center space-x-6">
                <!-- Main navigation shortcuts -->
                {#if user}
                    <a href="/cocktails" class="text-white hover:text-gray-300">
                        {t.header.cocktails}
                    </a>
                    <a href="/my-bar" class="text-white hover:text-gray-300">
                        {t.header.myBar}
                    </a>
                {/if}

                <!-- Language Selector -->
                <select
                    class="bg-gray-700 text-white px-3 py-1 rounded-lg border border-gray-600"
                    bind:value={$currentLanguage}
                >
                    <option value="en">{t.language.en}</option>
                    <option value="fr">{t.language.fr}</option>
                </select>

                <!-- Desktop User Menu -->
                <div class="relative">
                    {#if user}
                        <button
                            on:click={toggleDesktopDropdown}
                            class="flex items-center space-x-2 text-white hover:text-gray-300 focus:outline-none"
                            aria-expanded={isDesktopDropdownOpen}
                        >
                            <span class="font-medium">{t.header.welcome}, {user.username}</span>
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>

                        {#if isDesktopDropdownOpen}
                            <div
                                class="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-xl py-2"
                                role="menu"
                                tabindex="-1"
                                on:mouseleave={closeDesktopDropdown}
                            >
                                {#each getDropdownMenuItems() as item}
                                    <a
                                        href={item.href}
                                        class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                                        on:click={closeDesktopDropdown}
                                    >
                                        {item.label}
                                    </a>
                                {/each}
                                <div class="border-t border-gray-600 my-1"></div>
                                <form
                                    method="POST"
                                    action="/auth?/logout"
                                    use:enhance
                                    on:submit={closeDesktopDropdown}
                                >
                                    <button
                                        type="submit"
                                        class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                                    >
                                        {t.header.logout}
                                    </button>
                                </form>
                            </div>
                        {/if}
                    {:else}
                        <a href="/auth/login" class="text-white hover:text-gray-300">
                            {t.header.login}
                        </a>
                    {/if}
                </div>
            </div>

            <!-- Mobile Navigation -->
            <div class="md:hidden flex items-center space-x-3">
                <!-- Main navigation shortcuts for mobile -->
                {#if user}
                    <a href="/cocktails" class="text-white hover:text-gray-300 text-sm">
                        {t.header.cocktails}
                    </a>
                    <a href="/my-bar" class="text-white hover:text-gray-300 text-sm">
                        {t.header.myBar}
                    </a>
                {/if}

                <!-- Compact Language Selector -->
                <select
                    class="bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600"
                    bind:value={$currentLanguage}
                >
                    <option value="en">EN</option>
                    <option value="fr">FR</option>
                </select>

                <!-- Mobile Menu Button -->
                <button
                    on:click={toggleMobileMenu}
                    class="text-white hover:text-gray-300 focus:outline-none"
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="mobile-menu"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {#if isMobileMenuOpen}
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        {:else}
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        {/if}
                    </svg>
                </button>
            </div>
        </div>

        <!-- Mobile Menu -->
        {#if isMobileMenuOpen}
            <div class="md:hidden bg-gray-700 rounded-lg mt-2 py-2">
                <!-- All menu items for mobile -->
                {#each getDropdownMenuItems() as item}
                    <a
                        href={item.href}
                        class="block px-4 py-2 text-white hover:bg-gray-600"
                        on:click={closeMobileMenu}
                    >
                        {item.label}
                    </a>
                {/each}

                {#if user}
                    <div class="border-t border-gray-600 my-2"></div>
                    <div class="px-4 py-2 text-gray-300 text-sm font-medium">
                        {user.username}
                    </div>
                    <form
                        method="POST"
                        action="/auth?/logout"
                        use:enhance
                        on:submit={closeMobileMenu}
                    >
                        <button
                            type="submit"
                            class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                        >
                            {t.header.logout}
                        </button>
                    </form>
                {:else}
                    <div class="border-t border-gray-600 my-2"></div>
                    <a
                        href="/auth/login"
                        class="block px-4 py-2 text-white hover:bg-gray-600"
                        on:click={closeMobileMenu}
                    >
                        {t.header.login}
                    </a>
                {/if}
            </div>
        {/if}
    </div>
</header>

<!-- Spacer to prevent content from hiding under fixed header -->
<div class="h-16"></div>
