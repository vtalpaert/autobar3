<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import { translations } from '$lib/i18n/translations/index';
  import { currentLanguage } from '$lib/i18n/store';

  export let data;

  $: t = translations[$currentLanguage];
  $: isOwnProfile = data.isOwnProfile;
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">{t.profile.title}</h1>

    <div class="max-w-2xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold">{data.profile.artistName || data.viewedUser.username}</h2>
          <p class="text-gray-400">@{data.viewedUser.username}</p>
          
          {#if !isOwnProfile && data.hasActiveCollaboration}
            <p class="text-green-400 mt-1">{t.profile.collaboratorProfile}</p>
          {/if}
        </div>
        
        {#if isOwnProfile}
          <a 
            href="/profile/edit" 
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {t.profile.edit}
          </a>
        {/if}
      </div>
      
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-2">{t.profile.artistName}</h3>
        <p class="bg-gray-700 p-3 rounded">{data.profile.artistName || t.profile.noArtistName}</p>
      </div>
      
      {#if data.cocktailCount > 0}
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">{t.profile.cocktailsCreated}</h3>
          <p class="bg-gray-700 p-3 rounded">{data.cocktailCount}</p>
        </div>
      {/if}
      
      {#if data.collaborationCount > 0}
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">{t.profile.collaborations}</h3>
          <p class="bg-gray-700 p-3 rounded">{data.collaborationCount}</p>
        </div>
      {/if}
      
      {#if !isOwnProfile && data.user}
        <div class="mt-8 border-t border-gray-700 pt-6">
          <h3 class="text-lg font-semibold mb-4">{t.profile.collaboration}</h3>
          
          {#if data.collaborationStatus === 'none'}
            <a 
              href={`/collaborations/find?user=${data.viewedUser.id}`}
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors inline-block"
            >
              {t.collaboration.send}
            </a>
          {:else if data.collaborationStatus === 'pending_sent'}
            <p class="text-yellow-400">{t.profile.pendingRequest}</p>
          {:else if data.collaborationStatus === 'pending_received'}
            <div class="flex space-x-2">
              <form method="POST" action="/collaborations?/acceptRequest">
                <input type="hidden" name="requestId" value={data.collaborationRequestId} />
                <button 
                  type="submit" 
                  class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  {t.collaboration.accept}
                </button>
              </form>
              <form method="POST" action="/collaborations?/rejectRequest">
                <input type="hidden" name="requestId" value={data.collaborationRequestId} />
                <button 
                  type="submit" 
                  class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  {t.collaboration.reject}
                </button>
              </form>
            </div>
          {:else if data.collaborationStatus === 'active'}
            <p class="text-green-400">{t.profile.activeCollaboration}</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
