<script lang="ts">
	import { enhance } from '$app/forms';
	import Header from '$lib/components/Header.svelte';

	export let data;

	let fileInput: HTMLInputElement;
	let uploadError = '';
	let uploadSuccess = '';
	let debugInfo = '';

	function handleFileSelect() {
		uploadError = '';

		if (fileInput?.files?.length) {
			const file = fileInput.files[0];
			debugInfo = `Selected file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`;

			// Read and display first few bytes of the file
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result as string;
				debugInfo += `\nContent preview: ${content.substring(0, 100)}...`;
			};
			reader.readAsText(file);
		}
	}

	let uploadForm: HTMLFormElement;

	function handleUpload() {
		if (!fileInput.files || fileInput.files.length === 0) {
			uploadError = 'Please select a file';
			return false;
		}

		const file = fileInput.files[0];
		if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
			uploadError = 'Please select a JSON file';
			return false;
		}

		return true;
	}
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
	<div class="container mx-auto px-4 py-16">
		<div class="flex justify-between items-center mb-8">
			<h1 class="text-4xl font-bold">Ingredient Management</h1>
			<a href="/admin" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
				Back to Dashboard
			</a>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			<!-- Upload Ingredients -->
			<div class="p-4 bg-gray-800 rounded-lg">
				<h2 class="text-lg font-semibold text-white mb-2">Upload Ingredients</h2>
				<form
					method="POST"
					action="?/upload"
					enctype="multipart/form-data"
					use:enhance={({ formData, cancel }) => {
						if (!handleUpload()) {
							return cancel();
						}

						// Clear form after submission
						return ({ update, result }) => {
							console.log('Upload result:', result);
							update({ reset: false }); // Don't reset the form, we'll do it manually
							if (result.type === 'success' && result.data?.message) {
								uploadSuccess = result.data.message;
								setTimeout(() => {
									uploadSuccess = '';
									debugInfo = ''; // Also clear the JSON preview
								}, 5000); // Clear success message after 5 seconds
							}
							if (fileInput) fileInput.value = '';
						};
					}}
					bind:this={uploadForm}
				>
					<div class="flex items-end gap-4">
						<div class="flex-1">
							<label for="ingredient-file" class="block text-sm font-medium text-white mb-1">
								JSON File
							</label>
							<input
								id="ingredient-file"
								name="ingredientsFile"
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
							type="submit"
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							Upload
						</button>
					</div>
					{#if uploadError}
						<p class="mt-2 text-red-600 text-sm">{uploadError}</p>
					{/if}
					{#if uploadSuccess}
						<p class="mt-2 text-green-500 text-sm">{uploadSuccess}</p>
					{/if}
					{#if debugInfo}
						<div
							class="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-300 font-mono whitespace-pre-wrap"
						>
							{debugInfo}
						</div>
					{/if}
				</form>
			</div>

			<!-- Add New Ingredient -->
			<div class="p-4 bg-gray-800 rounded-lg">
				<h2 class="text-lg font-semibold text-white mb-2">Add New Ingredient</h2>
				<form
					method="POST"
					action="?/addIngredient"
					use:enhance={({ formData }) => {
						const name = formData.get('name');
						console.log('Adding ingredient:', name);

						return ({ update, result }) => {
							console.log('Add result:', result);
							update();

							if (result.type === 'success') {
								// Show success message
								uploadSuccess = `Successfully added ingredient: ${name}`;
								setTimeout(() => {
									uploadSuccess = '';
									debugInfo = ''; // Also clear any debug info
								}, 5000);
							}
						};
					}}
				>
					<div class="grid grid-cols-1 gap-4">
						<div>
							<label for="name" class="block text-sm font-medium text-white mb-1">Name</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
								placeholder="e.g. Whiskey"
							/>
						</div>

						<div>
							<label for="alcoholPercentage" class="block text-sm font-medium text-white mb-1">
								Alcohol Percentage (%)
							</label>
							<input
								id="alcoholPercentage"
								name="alcoholPercentage"
								type="number"
								min="0"
								max="100"
								step="0.1"
								required
								class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
								placeholder="e.g. 40.0"
							/>
						</div>

						<div>
							<label for="density" class="block text-sm font-medium text-white mb-1">
								Density (g/L)
							</label>
							<input
								id="density"
								name="density"
								type="number"
								min="800"
								max="2000"
								step="1"
								class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
								placeholder="e.g. 1000"
							/>
						</div>

						<div class="flex items-center">
							<input
								id="addedSeparately"
								name="addedSeparately"
								type="checkbox"
								class="h-4 w-4 bg-gray-700 border-gray-600 rounded"
							/>
							<label for="addedSeparately" class="ml-2 block text-sm text-white">
								Added separately (not through pumps)
							</label>
						</div>

						<div>
							<button
								type="submit"
								class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
							>
								Add Ingredient
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full bg-gray-700 border border-gray-600 rounded-lg">
				<thead>
					<tr>
						<th class="px-4 py-2 border-b border-gray-600 text-left text-white">Name</th>
						<th class="px-4 py-2 border-b border-gray-600 text-left text-white">Alcohol %</th>
						<th class="px-4 py-2 border-b border-gray-600 text-left text-white">Density (g/L)</th>
						<th class="px-4 py-2 border-b border-gray-600 text-left text-white">Added Separately</th
						>
						<th class="px-4 py-2 border-b border-gray-600 text-left text-white">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.ingredients as ingredient}
						<tr>
							<td class="px-4 py-2 border-b border-gray-600 text-white">{ingredient.name}</td>
							<td class="px-4 py-2 border-b border-gray-600 text-white"
								>{ingredient.alcoholPercentage}%</td
							>
							<td class="px-4 py-2 border-b border-gray-600 text-white">{ingredient.density}</td>
							<td class="px-4 py-2 border-b border-gray-600 text-white"
								>{ingredient.addedSeparately ? 'Yes' : 'No'}</td
							>
							<td class="px-4 py-2 border-b border-gray-600 text-white">
								<form
									method="POST"
									action="?/delete"
									use:enhance={({ formData }) => {
										const id = formData.get('id');
										console.log('Deleting ingredient:', id);

										return ({ update }) => {
											console.log('Delete completed, updating page');
											update({ reset: false });
										};
									}}
								>
									<input type="hidden" name="id" value={ingredient.id} />
									<button
										type="submit"
										class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
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
</div>
