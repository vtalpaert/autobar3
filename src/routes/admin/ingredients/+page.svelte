<script lang="ts">
  import { enhance } from '$app/forms';
  
  export let data;
  
  let fileInput: HTMLInputElement;
  let uploadError = '';
  
  function handleFileSelect() {
    uploadError = '';
  }
  
  async function uploadJson() {
    if (!fileInput.files || fileInput.files.length === 0) {
      uploadError = 'Please select a file';
      return;
    }
    
    const file = fileInput.files[0];
    if (file.type !== 'application/json') {
      uploadError = 'Please select a JSON file';
      return;
    }
    
    const formData = new FormData();
    formData.append('ingredientsFile', file);
    
    try {
      const response = await fetch('/admin/ingredients?/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.text();
        uploadError = error || 'Upload failed';
      }
    } catch (error) {
      uploadError = 'Upload failed: ' + error;
    }
  }
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">Ingredient Management</h1>
  
  <div class="mb-8 p-4 bg-gray-100 rounded-lg">
    <h2 class="text-lg font-semibold mb-2">Upload Ingredients</h2>
    <div class="flex items-end gap-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          JSON File
        </label>
        <input
          type="file"
          accept=".json,application/json"
          bind:this={fileInput}
          on:change={handleFileSelect}
          class="block w-full text-sm text-gray-500
                 file:mr-4 file:py-2 file:px-4
                 file:rounded-md file:border-0
                 file:text-sm file:font-semibold
                 file:bg-blue-50 file:text-blue-700
                 hover:file:bg-blue-100"
        />
      </div>
      <button
        type="button"
        on:click={uploadJson}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Upload
      </button>
    </div>
    {#if uploadError}
      <p class="mt-2 text-red-600 text-sm">{uploadError}</p>
    {/if}
  </div>
  
  <div class="overflow-x-auto">
    <table class="min-w-full bg-white border border-gray-200">
      <thead>
        <tr>
          <th class="px-4 py-2 border-b text-left">Name</th>
          <th class="px-4 py-2 border-b text-left">Alcohol %</th>
          <th class="px-4 py-2 border-b text-left">Density (g/L)</th>
          <th class="px-4 py-2 border-b text-left">Added Separately</th>
          <th class="px-4 py-2 border-b text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.ingredients as ingredient}
          <tr>
            <td class="px-4 py-2 border-b">{ingredient.name}</td>
            <td class="px-4 py-2 border-b">{ingredient.alcoholPercentage}%</td>
            <td class="px-4 py-2 border-b">{ingredient.density}</td>
            <td class="px-4 py-2 border-b">{ingredient.addedSeparately ? 'Yes' : 'No'}</td>
            <td class="px-4 py-2 border-b">
              <form method="POST" action="?/delete" use:enhance>
                <input type="hidden" name="id" value={ingredient.id} />
                <button 
                  type="submit" 
                  class="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </form>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
