<script lang="ts">
	import type { PageData } from './$types';
	import { translations } from '$lib/i18n/translations';
	import { currentLanguage } from '$lib/i18n/store';
	import Header from '$lib/components/Header.svelte';
	import { enhance } from '$app/forms';

	export let data: PageData;
	$: t = translations[$currentLanguage];

	let creatorFilter = 'all'; // 'mine' | 'collaborations' | 'all'
	let availabilityFilter = 'all'; // 'available' | 'unavailable' | 'all'
	let searchTerm = '';

	$: filteredCocktails = data.cocktails
		.filter((c) => {
			// Creator filter
			if (creatorFilter === 'mine') return c.creatorId === data.profile.id;
			if (creatorFilter === 'collaborations') return c.creatorId !== data.profile.id;
			return true; // 'all'
		})
		.filter((c) => {
			// Availability filter
			if (availabilityFilter === 'available') return c.availability === 'available';
			if (availabilityFilter === 'unavailable') return c.availability !== 'available';
			return true; // 'all'
		})
		.filter((c) => {
			// Search filter
			return searchTerm === '' || c.name.toLowerCase().includes(searchTerm.toLowerCase());
		});

	function getAvailabilityBadge(cocktail: any) {
		switch (cocktail.availability) {
			case 'available':
				return { text: 'Available', class: 'bg-green-600' };
			case 'partial':
				return { text: `Missing ${cocktail.missingIngredients.length} ingredients`, class: 'bg-yellow-600' };
			case 'unavailable':
				return { text: 'Unavailable', class: 'bg-red-600' };
			case 'no-device':
				return { text: 'Device required', class: 'bg-gray-600' };
			default:
				return { text: 'Unknown', class: 'bg-gray-600' };
		}
	}

	function getActionButton(cocktail: any) {
		if (cocktail.availability === 'available') {
			return { text: 'Make Now', class: 'bg-green-600 hover:bg-green-700', action: 'order' };
		} else if (cocktail.availability === 'no-device') {
			return { text: 'Setup Device', class: 'bg-blue-600 hover:bg-blue-700', action: 'setup' };
		} else {
			return { text: 'View Recipe', class: 'bg-blue-600 hover:bg-blue-700', action: 'view' };
		}
	}
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
	<div class="container mx-auto px-4 py-16">
		<!-- Device Status Banner -->
		{#if data.defaultDevice}
			{#if data.deviceCapabilities?.needsCalibration}
				<div class="bg-yellow-600 text-white p-4 rounded-lg mb-8">
					<h2 class="text-xl font-bold mb-2">🟡 Device Needs Calibration</h2>
					<p>Device "{data.defaultDevice.name || 'Unnamed'}" needs calibration before making cocktails.</p>
				</div>
			{:else}
				<div class="bg-green-600 text-white p-4 rounded-lg mb-8">
					<h2 class="text-xl font-bold mb-2">🟢 Device Ready</h2>
					<p>Device "{data.defaultDevice.name || 'Unnamed'}" - {data.deviceCapabilities?.availableIngredients?.length || 0} ingredients available</p>
				</div>
			{/if}
		{:else}
			<div class="bg-red-600 text-white p-4 rounded-lg mb-8">
				<h2 class="text-xl font-bold mb-2">🔴 No Default Device</h2>
				<p>Set up a default device to make cocktails. <a href="/devices" class="underline">Configure device</a></p>
			</div>
		{/if}

		<!-- Header with Filters -->
		<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
				<h1 class="text-4xl font-bold">{t.cocktails.title}</h1>
				
				<!-- Search -->
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search cocktails..."
					class="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 w-full sm:w-auto"
				/>
			</div>

			<!-- Filter Controls -->
			<div class="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
				<!-- Creator Filter -->
				<select
					bind:value={creatorFilter}
					class="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
				>
					<option value="all">All Cocktails</option>
					<option value="mine">{t.cocktails.filterMine}</option>
					<option value="collaborations">{t.cocktails.filterCollaborations}</option>
				</select>

				<!-- Availability Filter -->
				<select
					bind:value={availabilityFilter}
					class="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
				>
					<option value="all">All Availability</option>
					<option value="available">Available Only</option>
					<option value="unavailable">Unavailable Only</option>
				</select>

				<a
					href="/cocktails/new"
					class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors text-center"
				>
					{t.cocktails.createNew}
				</a>
			</div>
		</div>

		<!-- Cocktails Grid -->
		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredCocktails as cocktail}
				{@const badge = getAvailabilityBadge(cocktail)}
				{@const actionBtn = getActionButton(cocktail)}
				
				<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 {
					cocktail.availability === 'available' ? 'border-green-500' :
					cocktail.availability === 'partial' ? 'border-yellow-500' :
					cocktail.availability === 'unavailable' ? 'border-red-500' :
					'border-gray-600'
				}">
					<!-- Image with Badge -->
					<div class="relative">
						{#if cocktail.imageUri}
							<img
								src="/api/cocktails/{cocktail.id}/image"
								alt="{cocktail.name} image"
								class="w-full h-48 object-cover"
								on:error={(e) => {
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
						
						<!-- Availability Badge -->
						<div class="absolute top-2 right-2">
							<span class="px-2 py-1 text-xs font-bold text-white rounded {badge.class}">
								{badge.text}
							</span>
						</div>
					</div>

					<div class="p-6">
						<h2 class="text-2xl font-bold mb-2">{cocktail.name}</h2>
						
						{#if cocktail.description}
							<p class="text-gray-300 mb-4">{cocktail.description}</p>
						{/if}
						
						<p class="text-sm text-gray-400 mb-4">{t.cocktails.createdBy} {cocktail.creatorName}</p>

						<!-- Ingredient Status -->
						{#if cocktail.availability !== 'no-device'}
							<div class="mb-4 text-sm">
								{#if cocktail.availableIngredients.length > 0}
									<p class="text-green-400">✓ Available: {cocktail.availableIngredients.join(', ')}</p>
								{/if}
								{#if cocktail.missingIngredients.length > 0}
									<p class="text-red-400">⚠ Missing: {cocktail.missingIngredients.join(', ')}</p>
								{/if}
								{#if cocktail.manualIngredients.length > 0}
									<p class="text-blue-400">ℹ Manual: {cocktail.manualIngredients.join(', ')}</p>
								{/if}
							</div>
						{/if}

						<!-- Action Buttons -->
						<div class="flex gap-2">
							<a
								href="/cocktails/{cocktail.id}"
								class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors text-center"
							>
								View Details
							</a>
							
							{#if actionBtn.action === 'order' && cocktail.availability === 'available'}
								<form method="POST" action="/cocktails/{cocktail.id}?/createOrder" use:enhance class="flex-1">
									<button 
										type="submit"
										class="w-full {actionBtn.class} text-white font-bold py-2 px-4 rounded transition-colors"
									>
										{actionBtn.text}
									</button>
								</form>
							{:else if actionBtn.action === 'setup'}
								<a
									href="/devices"
									class="flex-1 {actionBtn.class} text-white font-bold py-2 px-4 rounded transition-colors text-center"
								>
									{actionBtn.text}
								</a>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredCocktails.length === 0}
			<div class="text-center text-gray-400 mt-16">
				<p>No cocktails found matching your filters.</p>
			</div>
		{/if}
	</div>
</div>
