<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import { translations } from '$lib/i18n/translations';
	import { currentLanguage } from '$lib/i18n/store';
	import Header from '$lib/components/Header.svelte';

	export let data: PageData;
	$: t = translations[$currentLanguage];

	let eventSource: EventSource;
	let isConnected = false;

	// Format date based on language
	function formatDate(date: Date) {
		return $currentLanguage === 'fr'
			? new Date(date).toLocaleDateString('fr-FR', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: new Date(date).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric'
				});
	}

	// Calculate time since last ping
	function getDeviceStatus(device) {
		if (!device.lastPingAt) return 'offline';

		const lastPing = new Date(device.lastPingAt).getTime();
		const now = Date.now();
		const minutesSinceLastPing = (now - lastPing) / (1000 * 60);

		return minutesSinceLastPing < 5 ? 'online' : 'offline';
	}

	// Calculate order progress percentage
	function calculateProgress(order) {
		if (!order.currentDose) return 0;
		return Math.min(100, Math.round((order.doseProgress / order.currentDose.quantity) * 100));
	}

	// Setup Server-Sent Events for real-time updates
	onMount(() => {
		if (browser && data.activeOrders.length > 0) {
			connectSSE();
		}
	});

	onDestroy(() => {
		if (eventSource) {
			eventSource.close();
		}
	});

	function connectSSE() {
		if (eventSource) {
			eventSource.close();
		}

		eventSource = new EventSource('/api/my-bar/orders/stream');
		
		eventSource.onopen = () => {
			isConnected = true;
		};

		eventSource.onmessage = (event) => {
			try {
				const updatedData = JSON.parse(event.data);
				if (updatedData.activeOrders) {
					data.activeOrders = updatedData.activeOrders;
				}
			} catch (error) {
				console.error('Failed to parse SSE data:', error);
			}
		};
		
		eventSource.onerror = (error) => {
			console.error('SSE error:', error);
			isConnected = false;
			// Attempt to reconnect after 5 seconds
			setTimeout(() => {
				if (data.activeOrders.length > 0) {
					connectSSE();
				}
			}, 5000);
		};

		eventSource.onclose = () => {
			isConnected = false;
		};
	}

	// Reactive statement to manage SSE connection based on active orders
	$: if (browser) {
		if (data.activeOrders.length > 0 && !eventSource) {
			connectSSE();
		} else if (data.activeOrders.length === 0 && eventSource) {
			eventSource.close();
			eventSource = null;
			isConnected = false;
		}
	}
</script>

<svelte:head>
	<title>{t.myBar.title}</title>
</svelte:head>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
	<div class="container mx-auto px-4 py-16">
		<h1 class="text-3xl font-bold mb-8">{t.myBar.title}</h1>

		<!-- Devices Section -->
		<section class="mb-12">
			<div class="mb-4">
				<h2 class="text-2xl font-semibold">{t.myBar.devices.title}</h2>
			</div>

			{#if data.devices.length === 0}
				<div class="bg-gray-800 rounded-lg shadow-lg p-6 text-center">
					<p class="text-gray-400">{t.myBar.devices.noDevices}</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each data.devices as device}
						<div class="bg-gray-800 rounded-lg shadow-lg p-6">
							<div class="flex justify-between items-start mb-4">
								<h3 class="text-xl font-medium text-white">
									{device.name || device.id.substring(0, 8)}
								</h3>
								<span
									class={`px-2 py-1 rounded-full text-xs font-medium ${getDeviceStatus(device) === 'online' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}
								>
									{getDeviceStatus(device) === 'online'
										? t.myBar.devices.online
										: t.myBar.devices.offline}
								</span>
							</div>
							<p class="text-sm text-gray-400">
								{t.myBar.devices.lastSeen}:
								{device.lastPingAt ? formatDate(device.lastPingAt) : t.myBar.devices.never}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Active Orders Section -->
		<section class="mb-12">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-2xl font-semibold">{t.myBar.orders.current}</h2>
				{#if data.activeOrders.length > 0}
					<div class="flex items-center space-x-2">
						<div class={`w-2 h-2 rounded-full transition-colors duration-300 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
						<span class="text-sm text-gray-400">
							{isConnected ? 'Live updates' : 'Reconnecting...'}
						</span>
					</div>
				{/if}
			</div>

			{#if data.activeOrders.length === 0}
				<div class="bg-gray-800 rounded-lg shadow-lg p-6 text-center">
					<p class="text-gray-400">{t.myBar.orders.noOrders}</p>
					<a
						href="/cocktails"
						class="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
					>
						{t.myBar.orders.orderCocktail}
					</a>
				</div>
			{:else}
				{#each data.activeOrders as order}
					<div class="bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
						<div class="flex justify-between items-start mb-4">
							<div>
								<h3 class="text-xl font-medium text-white">
									<a
										href="/cocktails/{order.cocktail.id}"
										class="text-blue-600 hover:text-blue-800"
									>
										{order.cocktail.name}
									</a>
								</h3>
								<span
									class={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium
                                ${order.status === 'pending' ? 'bg-yellow-600 text-white' : ''}
                                ${order.status === 'in_progress' ? 'bg-blue-600 text-white' : ''}
                                ${order.status === 'completed' ? 'bg-green-600 text-white' : ''}
                                ${order.status === 'failed' ? 'bg-red-600 text-white' : ''}
                                ${order.status === 'cancelled' ? 'bg-gray-600 text-white' : ''}
                            `}
								>
									{t.myBar.orders.status[order.status]}
								</span>
							</div>

							<form method="POST" action="?/cancelOrder" use:enhance>
								<input type="hidden" name="orderId" value={order.id} />
								<button
									type="submit"
									class="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded transition-colors"
								>
									{t.myBar.orders.cancel}
								</button>
							</form>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<p class="text-sm text-gray-400">
									{t.myBar.orders.createdAt}
									{formatDate(order.createdAt)}
								</p>
								<p class="text-sm text-gray-400">
									{t.myBar.orders.updatedAt}
									{formatDate(order.updatedAt)}
								</p>
								<p class="text-sm text-gray-400">
									{t.myBar.orders.device}
									{order.device.name || order.device.id.substring(0, 8)}
								</p>
							</div>

							{#if order.status === 'in_progress' && order.currentDose}
								<div>
									<p class="text-sm font-medium mb-1">{t.myBar.orders.progress}</p>
									<div class="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
										<div
											class="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
											style="width: {calculateProgress(order)}%"
										></div>
									</div>
									<p class="text-xs text-gray-400 mt-1 transition-all duration-300">
										{order.currentDose.ingredient.name}: {order.doseProgress.toFixed(1)} / {order
											.currentDose.quantity} ml
									</p>
								</div>
							{/if}

							{#if order.errorMessage}
								<div
									class="col-span-2 bg-red-900/20 border border-red-800/30 text-red-400 px-4 py-3 rounded"
								>
									<p class="text-sm">{order.errorMessage}</p>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</section>

		<!-- Order History Section -->
		<section>
			<h2 class="text-2xl font-semibold mb-4">{t.myBar.orders.history}</h2>

			{#if data.pastOrders.length === 0}
				<div class="bg-gray-800 rounded-lg shadow-lg p-6 text-center">
					<p class="text-gray-400">{t.myBar.orders.noOrders}</p>
				</div>
			{:else}
				<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
					<table class="min-w-full divide-y divide-gray-700">
						<thead class="bg-gray-900">
							<tr>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
								>
									{t.cocktails.name}
								</th>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									{t.myBar.orders.status.title || 'Status'}
								</th>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									{t.myBar.orders.device}
								</th>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									{t.myBar.orders.createdAt}
								</th>
							</tr>
						</thead>
						<tbody class="bg-gray-800 divide-y divide-gray-700">
							{#each data.pastOrders as order}
								<tr>
									<td class="px-6 py-4 whitespace-nowrap">
										<a
											href="/cocktails/{order.cocktail.id}"
											class="text-blue-600 hover:text-blue-800"
										>
											{order.cocktail.name}
										</a>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class={`inline-block px-2 py-1 rounded-full text-xs font-medium
                                        ${order.status === 'completed' ? 'bg-green-600 text-white' : ''}
                                        ${order.status === 'failed' ? 'bg-red-600 text-white' : ''}
                                        ${order.status === 'cancelled' ? 'bg-gray-600 text-white' : ''}
                                    `}
										>
											{t.myBar.orders.status[order.status]}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										{order.device.name || order.device.id.substring(0, 8)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										{formatDate(order.createdAt)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	</div>
</div>
