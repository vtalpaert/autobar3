<script lang="ts">
  import { translations } from '$lib/i18n/translations';
  import { currentLanguage } from '$lib/i18n/store';
  import Header from '$lib/components/Header.svelte';

  export let data;
  $: t = translations[$currentLanguage];
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
  <!-- Hero Section -->
  <div class="container mx-auto px-4 py-16">
    <div class="text-center">
      <h1 class="text-5xl font-bold mb-6">{t.hero.title}</h1>
      <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
        {t.hero.description}
      </p>
      <div class="flex justify-center gap-4">
        <a href="/auth/login" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
          {t.hero.getStarted}
        </a>
        <a 
          href="https://github.com/vtalpaert/autobar" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          {t.hero.viewGithub}
        </a>
      </div>
    </div>
  </div>

  <!-- Features Section -->
  <div class="container mx-auto px-4 py-16">
    <div class="grid md:grid-cols-3 gap-8">
      <div class="bg-gray-800 p-6 rounded-lg">
        <div class="text-blue-500 text-4xl mb-4">
          🍹
        </div>
        <h3 class="text-xl font-bold mb-2">{t.features.perfectDrinks.title}</h3>
        <p class="text-gray-400">
          {t.features.perfectDrinks.description}
        </p>
      </div>
      
      <div class="bg-gray-800 p-6 rounded-lg">
        <div class="text-blue-500 text-4xl mb-4">
          🔧
        </div>
        <h3 class="text-xl font-bold mb-2">{t.features.smartHardware.title}</h3>
        <p class="text-gray-400">
          {t.features.smartHardware.description}
        </p>
      </div>
      
      <div class="bg-gray-800 p-6 rounded-lg">
        <div class="text-blue-500 text-4xl mb-4">
          🚀
        </div>
        <h3 class="text-xl font-bold mb-2">{t.features.modernStack.title}</h3>
        <p class="text-gray-400">
          {t.features.modernStack.description}
        </p>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="container mx-auto px-4 py-8 text-center text-gray-400">
    <p>{t.footer.text}</p>
  </footer>
</div>
