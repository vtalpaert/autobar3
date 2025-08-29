<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { fade, slide } from 'svelte/transition';
	import { Confetti } from 'svelte-confetti';
	import type { PageData } from './$types';
	import { translations } from '$lib/i18n/translations';
	import { currentLanguage } from '$lib/i18n/store';
	import Header from '$lib/components/Header.svelte';

	export let data: PageData;
	$: t = translations[$currentLanguage];

	let eventSource: EventSource | null = null;
	let isConnected = false;
	let shouldConnect = false;
	
	// Animation state tracking
	let animatingOrders = new Map<string, { type: 'completed' | 'failed' | 'cancelled', startTime: number }>();
	let showConfetti = new Map<string, boolean>();

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
		shouldConnect = data.activeOrders.length > 0;
		if (browser && shouldConnect) {
			connectSSE();
		}
	});

	onDestroy(() => {
		shouldConnect = false;
		disconnectSSE();
	});

	function connectSSE() {
		// Don't create multiple connections
		if (eventSource) {
			return;
		}

		eventSource = new EventSource('/api/sse/my-bar');
		
		eventSource.onopen = () => {
			isConnected = true;
		};

		eventSource.onmessage = (event) => {
			try {
				const updatedData = JSON.parse(event.data);
				
				// Handle completed orders with animations
				if (updatedData.completedOrders && updatedData.completedOrders.length > 0) {
					updatedData.completedOrders.forEach(completedOrder => {
						let animationType: 'completed' | 'failed' | 'cancelled' = 'completed';
						if (completedOrder.status === 'failed') animationType = 'failed';
						else if (completedOrder.status === 'cancelled') animationType = 'cancelled';
						
						// Start animation
						animatingOrders.set(completedOrder.id, { 
							type: animationType, 
							startTime: Date.now() 
						});
						animatingOrders = animatingOrders; // Trigger reactivity
						
						if (animationType === 'completed') {
							showConfetti.set(completedOrder.id, true);
							showConfetti = showConfetti; // Trigger reactivity
						}
						
						// After animation completes, update data and add to history
						setTimeout(() => {
							data.activeOrders = updatedData.activeOrders;
							
							// Add completed order to history using SSE data
							addCompletedOrderToHistory(completedOrder);
							
							// Clean up animation state
							animatingOrders.delete(completedOrder.id);
							animatingOrders = animatingOrders;
							showConfetti.delete(completedOrder.id);
							showConfetti = showConfetti;
						}, 3000);
					});
				} else if (updatedData.activeOrders) {
					// No completed orders, just update normally
					data.activeOrders = updatedData.activeOrders;
				}
			} catch (error) {
				console.error('Failed to parse SSE data:', error);
			}
		};
		
		eventSource.onerror = (error) => {
			isConnected = false;
			
			// Only reconnect if we should still be connected
			if (shouldConnect && eventSource?.readyState === EventSource.CLOSED) {
				eventSource = null;
				setTimeout(() => {
					if (shouldConnect && !eventSource) {
						connectSSE();
					}
				}, 5000);
			}
		};

		eventSource.onclose = () => {
			isConnected = false;
			eventSource = null;
		};
	}

	function disconnectSSE() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
			isConnected = false;
		}
	}

	
	// Add completed order to history using data from SSE
	function addCompletedOrderToHistory(completedOrder: any) {
		// Add to the beginning of past orders and limit to 10
		data.pastOrders = [completedOrder, ...data.pastOrders].slice(0, 10);
	}

	// Reactive statement to manage SSE connection based on active orders
	$: if (browser) {
		const hasActiveOrders = data.activeOrders.length > 0;
		
		if (hasActiveOrders && !shouldConnect) {
			shouldConnect = true;
			connectSSE();
		} else if (!hasActiveOrders && shouldConnect) {
			shouldConnect = false;
			disconnectSSE();
		}
	}
</script>

<svelte:head>
	<title>{t.myBar.title}</title>
</svelte:head>

<style>
	@keyframes green-pulse {
		0%, 100% { 
			box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
			border-color: rgb(16, 185, 129);
		}
		50% { 
			box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
			border-color: rgb(16, 185, 129);
		}
	}
	
	@keyframes shake-red {
		0%, 100% { 
			transform: translateX(0);
			box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
			border-color: rgb(239, 68, 68);
		}
		10%, 30%, 50%, 70%, 90% { 
			transform: translateX(-5px);
			box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.3);
		}
		20%, 40%, 60%, 80% { 
			transform: translateX(5px);
			box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.3);
		}
	}
	
	@keyframes stripe-slide {
		0% {
			background-position: 0% 0%;
		}
		100% {
			background-position: 100% 0%;
		}
	}
	
	@keyframes fadeOut {
		0% { opacity: 0.7; transform: scale(1); }
		70% { opacity: 0.7; transform: scale(1); }
		100% { opacity: 0; transform: scale(0.95); }
	}
	
	.order-completed {
		animation: green-pulse 2s ease-in-out 3;
		border: 2px solid rgb(16, 185, 129);
		position: relative;
	}
	
	.order-failed {
		animation: shake-red 1s ease-in-out 2;
		border: 2px solid rgb(239, 68, 68);
	}
	
	.order-cancelled {
		background: repeating-linear-gradient(
			45deg,
			rgba(107, 114, 128, 0.1),
			rgba(107, 114, 128, 0.1) 10px,
			rgba(107, 114, 128, 0.3) 10px,
			rgba(107, 114, 128, 0.3) 20px
		);
		background-size: 40px 40px;
		animation: stripe-slide 2s linear infinite, fadeOut 3s ease-in-out forwards;
		position: relative;
		opacity: 0.7;
	}
	
</style>

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
								<div class="flex flex-col">
									<div class="flex items-center gap-2">
										<h3 class="text-xl font-medium text-white">
											{device.name || device.id.substring(0, 8)}
										</h3>
										{#if device.isDefault}
											<span class="bg-blue-600 text-white text-xs px-2 py-1 rounded">
												{t.devices.default}
											</span>
										{/if}
									</div>
								</div>
								<span
									class={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getDeviceStatus(device) === 'online' ? 'bg-green-500 text-white flex items-center gap-1' : 'bg-gray-600 text-white'}`}
								>
									{#if getDeviceStatus(device) === 'online'}
										<div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
									{/if}
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
				<h2 class="text-2xl font-semibold">Active Orders</h2>
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
					<div 
						id="order-{order.id}"
						class="bg-gray-800 rounded-lg shadow-lg p-6 mb-4 transition-all duration-300 {animatingOrders.has(order.id) ? `order-${animatingOrders.get(order.id)?.type}` : ''} relative"
					>
						{#if showConfetti.has(order.id) && showConfetti.get(order.id)}
							<div class="absolute inset-0 flex justify-center items-center pointer-events-none">
								<Confetti 
									x={[-2.5, 2.5]} 
									y={[-0.5, 0.5]} 
									duration={2000}
									amount={50}
									colorArray={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']}
									fallDistance="200px"
									size={15}
								/>
							</div>
						{/if}
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
									{order.device ? (order.device.name || order.device.id.substring(0, 8)) : 'Deleted Device'}
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
										{order.device ? (order.device.name || order.device.id.substring(0, 8)) : 'Deleted Device'}
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
