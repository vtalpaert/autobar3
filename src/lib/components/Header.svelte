<script lang="ts">
  import { enhance } from '$app/forms';
  import { translations } from '$lib/i18n/translations';
  import { currentLanguage } from '$lib/i18n/store';
  
  export let user: { username: string, isAdmin?: boolean } | null = null;
  let isDropdownOpen = false;

  const toggleDropdown = () => {
    isDropdownOpen = !isDropdownOpen;
  };

  const closeDropdown = () => {
    isDropdownOpen = false;
  };

  $: t = translations[$currentLanguage] || translations.en;
</script>

<header class="bg-gray-800 fixed w-full top-0 z-50 shadow-lg">
  <div class="container mx-auto px-4">
    <div class="flex justify-between items-center h-16">
      <a href="/" class="text-white text-xl font-bold">RobotCocktail</a>
      
      <div class="flex items-center space-x-6">
        <a 
          href="/cocktails"
          class="text-white hover:text-gray-300"
        >
          {t.header.cocktails}
        </a>
        <a 
          href="/my-bar"
          class="text-white hover:text-gray-300"
        >
          {t.header.myBar}
        </a>
        <!-- Language Selector -->
        <select
          class="bg-gray-700 text-white px-3 py-1 rounded-lg border border-gray-600"
          bind:value={$currentLanguage}
        >
          <option value="en">{t.language.en}</option>
          <option value="fr">{t.language.fr}</option>
        </select>

        <div class="relative">
        {#if user}
          <button
            on:click={toggleDropdown}
            class="flex items-center space-x-2 text-white hover:text-gray-300 focus:outline-none"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            aria-controls="user-menu"
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
          
          {#if isDropdownOpen}
            <div
              id="user-menu"
              role="menu"
              tabindex="-1"
              class="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-xl py-2"
              on:mouseleave={closeDropdown}
            >
              <a
                href="/cocktails"
                class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                role="menuitem"
                on:click={closeDropdown}
              >
                {t.header.cocktails}
              </a>
              <a
                href="/my-bar"
                class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                role="menuitem"
                on:click={closeDropdown}
              >
                {t.header.myBar}
              </a>
              <a
                href="/devices"
                class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                role="menuitem"
                on:click={closeDropdown}
              >
                {t.header.devices}
              </a>
              <a
                href="/profile"
                class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                role="menuitem"
                on:click={closeDropdown}
              >
                {t.header.profile}
              </a>
              <a
                href="/collaborations"
                class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                role="menuitem"
                on:click={closeDropdown}
              >
                {t.header.collaborations}
              </a>
              {#if user.isAdmin}
                <a
                  href="/admin"
                  class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                  role="menuitem"
                  on:click={closeDropdown}
                >
                  Admin Dashboard
                </a>
              {/if}
              <div class="border-t border-gray-600 my-1"></div>
              <form
                method="POST"
                action="/auth?/logout"
                use:enhance
                on:submit={closeDropdown}
              >
                <button
                  type="submit"
                  class="block w-full text-left px-4 py-2 text-white hover:bg-gray-600"
                  role="menuitem"
                >
                  {t.header.logout}
                </button>
              </form>
            </div>
          {/if}
        {:else}
          <a
            href="/auth/login"
            class="text-white hover:text-gray-300"
          >
            {t.header.login}
          </a>
        {/if}
      </div>
    </div>
  </div>
</header>

<!-- Spacer to prevent content from hiding under fixed header -->
<div class="h-16"></div>
