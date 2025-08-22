<script lang="ts">
	import type { PageData } from './$types';
	import { translations } from '$lib/i18n/translations';
	import { currentLanguage } from '$lib/i18n/store';
	import Header from '$lib/components/Header.svelte';

	export let data: PageData;
	$: t = translations[$currentLanguage];

	let filterOption = 'mine';
	$: filteredCocktails =
		filterOption === 'mine'
			? data.cocktails.filter((c) => c.creatorId === data.profile.id)
			: data.cocktails;
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
	<div class="container mx-auto px-4 py-16">
		<div class="flex justify-between items-center mb-8">
			<div class="flex items-center gap-4">
				<h1 class="text-4xl font-bold">{t.cocktails.title}</h1>
				<select
					bind:value={filterOption}
					class="bg-gray-700 text-white px-3 py-1 rounded-lg border border-gray-600"
				>
					<option value="mine">{t.cocktails.filterMine}</option>
					<option value="all">{t.cocktails.filterCollaborations}</option>
				</select>
			</div>
			<a
				href="/cocktails/new"
				class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
			>
				{t.cocktails.createNew}
			</a>
		</div>

		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredCocktails as cocktail}
				<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
					{#if cocktail.imageUri}
						<img
							src="/api/cocktails/{cocktail.id}/image"
							alt="{cocktail.name} image"
							class="w-full h-48 object-cover"
							on:error={(e) => {
								// Hide image if it fails to load
								e.currentTarget.style.display = 'none';
							}}
						/>
					{:else}
						<div class="w-full h-48 bg-gray-700 flex items-center justify-center">
							<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
							</svg>
						</div>
					{/if}
					<div class="p-6">
						<h2 class="text-2xl font-bold mb-2">{cocktail.name}</h2>
						{#if cocktail.description}
							<p class="text-gray-300 mb-4">{cocktail.description}</p>
						{/if}
						<p class="text-sm text-gray-400">{t.cocktails.createdBy} {cocktail.creatorName}</p>
						<a
							href="/cocktails/{cocktail.id}"
							class="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
						>
							{t.cocktails.viewDetails}
						</a>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
