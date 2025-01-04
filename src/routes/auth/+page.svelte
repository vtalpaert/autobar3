<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
  <div class="container mx-auto px-4 py-16">
    <div class="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
      <a 
        href="/" 
        class="text-blue-400 hover:text-blue-300 mb-6 inline-block"
      >
        ← Back to Home
      </a>
      <h1 class="text-3xl font-bold mb-6">Welcome, {data.user.username}!</h1>
      
      <form method="POST" action="?/logout" use:enhance>
        <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">
          Logout
        </button>
      </form>
    </div>
  </div>
</div>
