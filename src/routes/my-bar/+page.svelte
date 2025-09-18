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
	
	// State management
	let allOrders = data.initialActiveOrders; // All orders from SSE (active + recently completed)
	let orderHistory = data.orderHistory;
	let cocktailCache = new Map(); // Cache for cocktail details
	let previousActiveOrderIds = new Set(allOrders.filter(o => ['pending', 'in_progress'].includes(o.status)).map(o => o.id));
	
	// Separate orders into active and recently completed
	$: activeOrders = allOrders.filter(o => ['pending', 'in_progress'].includes(o.status));
	$: recentlyCompletedOrders = allOrders.filter(o => ['completed', 'failed', 'cancelled'].includes(o.status));
	
	// Animation state tracking
	let animatingOrders = new Map<string, { type: 'completed' | 'failed' | 'cancelled', startTime: number }>();
	let showConfetti = new Map<string, boolean>();

	// Initialize cocktail cache with initial data
	onMount(() => {
		allOrders.forEach(order => {
			if (order.cocktail) {
				cocktailCache.set(order.cocktailId, order.cocktail);
			}
		});
		
		if (browser) {
			connectSSE();
		}
	});

	onDestroy(() => {
		disconnectSSE();
	});

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

	// Get cocktail details from cache
	function getCocktailDetails(cocktailId: string) {
		return cocktailCache.get(cocktailId);
	}

	// Get current dose number for timeline
	function getCurrentDoseNumber(order) {
		return order.currentDose ? order.currentDose.number : 0;
	}

	// Check if description needs truncation (more than 5 lines)
	function needsTruncation(text: string): boolean {
		if (!text) return false;
		const lines = text.split('\n');
		return lines.length > 5;
	}

	// Get truncated description (first 5 lines)
	function getTruncatedDescription(text: string): string {
		if (!text) return '';
		const lines = text.split('\n');
		return lines.slice(0, 5).join('\n');
	}

	function connectSSE() {
		if (eventSource) return;

		eventSource = new EventSource('/api/sse/my-bar');
		
		eventSource.onopen = () => {
			isConnected = true;
		};

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				
				// Update cocktail cache with new cocktail data
				if (data.newCocktails) {
					Object.entries(data.newCocktails).forEach(([id, cocktail]) => {
						cocktailCache.set(id, cocktail);
					});
					cocktailCache = cocktailCache; // Trigger reactivity
				}
				
				// Handle order completion detection and animations
				if (data.activeOrders) {
					const currentActiveIds = new Set(data.activeOrders.filter(o => ['pending', 'in_progress'].includes(o.status)).map(o => o.id));
					const newlyCompletedOrderIds = [...previousActiveOrderIds].filter(id => !currentActiveIds.has(id));
					
					// Handle newly completed orders with animations
					if (newlyCompletedOrderIds.length > 0) {
						newlyCompletedOrderIds.forEach(orderId => {
							const completedOrder = data.activeOrders.find(o => o.id === orderId);
							if (completedOrder) {
								// Determine animation type based on actual status
								const animationType = completedOrder.status === 'completed' ? 'completed' :
													 completedOrder.status === 'failed' ? 'failed' : 'cancelled';
								
								// Start animation
								animatingOrders.set(orderId, { 
									type: animationType, 
									startTime: Date.now() 
								});
								
								if (animationType === 'completed') {
									showConfetti.set(orderId, true);
								}
								
								// Clean up animation state after 3 seconds
								setTimeout(() => {
									animatingOrders.delete(orderId);
									showConfetti.delete(orderId);
									animatingOrders = animatingOrders;
									showConfetti = showConfetti;
								}, 3000);
							}
						});
						animatingOrders = animatingOrders;
						showConfetti = showConfetti;
					}
					
					// Update all orders (active + recently completed)
					allOrders = data.activeOrders;
					previousActiveOrderIds = currentActiveIds;
				}
			} catch (error) {
				console.error('Failed to parse SSE data:', error);
			}
		};
		
		eventSource.onerror = (error) => {
			isConnected = false;
			
			if (eventSource?.readyState === EventSource.CLOSED) {
				eventSource = null;
				setTimeout(() => {
					if (!eventSource) {
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
				<h2 class="text-2xl font-semibold">{t.myBar.orders.active}</h2>
				{#if activeOrders.length > 0 || recentlyCompletedOrders.length > 0}
					<div class="flex items-center space-x-2">
						<div class={`w-2 h-2 rounded-full transition-colors duration-300 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
						<span class="text-sm text-gray-400">
							{isConnected ? t.myBar.orders.liveUpdates : t.myBar.orders.reconnecting}
						</span>
					</div>
				{/if}
			</div>

			{#if activeOrders.length === 0 && recentlyCompletedOrders.length === 0}
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
				<!-- Active Orders -->
				{#each activeOrders as order}
					{@const cocktail = getCocktailDetails(order.cocktailId)}
					<div 
						id="order-{order.id}"
						class="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6 transition-all duration-300 relative"
					>
						{#if showConfetti.has(order.id) && showConfetti.get(order.id)}
							<div class="absolute inset-0 flex justify-center items-center pointer-events-none z-10">
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

						<!-- Rich Order Header with Image -->
						<div class="flex flex-col md:flex-row">
							{#if cocktail?.imageUri}
								<div class="md:w-48 h-48 md:h-auto flex-shrink-0">
									<img 
										src="/api/cocktails/{cocktail.id}/image"
										alt="{cocktail.name} image"
										class="w-full h-full object-cover"
										on:error={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
								</div>
							{/if}
							
							<div class="flex-1 p-6">
								<!-- Header with title and cancel button -->
								<div class="flex justify-between items-start mb-4">
									<div class="flex-1">
										<h3 class="text-2xl font-bold text-white mb-1">
											<a 
												href="/cocktails/{cocktail?.id}" 
												class="hover:text-blue-400 transition-colors"
											>
												{cocktail?.name || t.myBar.orders.loading}
											</a>
										</h3>
										{#if cocktail?.creator}
											<p class="text-sm text-gray-400 mb-2">
												{t.myBar.orders.by} {#if cocktail.creator?.artistName}
													{cocktail.creator.artistName} ({cocktail.creator.username})
												{:else}
													{cocktail.creator?.username || 'Unknown'}
												{/if}
											</p>
										{/if}
										<span
											class={`inline-block px-3 py-1 rounded-full text-sm font-medium
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
											class="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded transition-colors"
											disabled={order.status === 'completed' || order.status === 'failed' || order.status === 'cancelled'}
										>
											{t.myBar.orders.cancel}
										</button>
									</form>
								</div>

								<!-- Description -->
								{#if cocktail?.description}
									<div class="text-gray-300 mb-4 leading-relaxed">
										<p class="whitespace-pre-wrap">
											{needsTruncation(cocktail.description) 
												? getTruncatedDescription(cocktail.description)
												: cocktail.description}
										</p>
										{#if needsTruncation(cocktail.description)}
											<a 
												href="/cocktails/{cocktail.id}" 
												class="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block transition-colors"
											>
												{t.myBar.orders.readMore}
											</a>
										{/if}
									</div>
								{/if}

								<!-- Current Progress for In-Progress Orders -->
								{#if order.status === 'in_progress' && order.currentDose}
									<div class="bg-gray-700 rounded-lg p-4 mb-4">
										<div class="flex items-center justify-between mb-2">
											<span class="text-sm font-medium text-white">
												{t.myBar.orders.nowPouring} {order.currentDose.ingredient.name}
											</span>
											<span class="text-xs text-gray-400">
												{t.myBar.orders.stepOf.replace('{current}', order.currentDose.number).replace('{total}', cocktail?.doses?.length || '?')}
											</span>
										</div>
										<div class="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
											<div
												class="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
												style="width: {calculateProgress(order)}%"
											></div>
										</div>
										<p class="text-xs text-gray-400 mt-1">
											{order.doseProgress.toFixed(1)} / {order.currentDose.quantity} ml
										</p>
									</div>
								{/if}

								<!-- Ingredient Timeline -->
								{#if cocktail?.doses && cocktail.doses.length > 0}
									<div class="mb-4">
										<h4 class="text-sm font-medium text-gray-300 mb-3">{t.myBar.orders.recipeTimeline}</h4>
										<div class="space-y-2">
											{#each cocktail.doses as dose}
												{@const isCompleted = order.currentDose && dose.number < order.currentDose.number}
												{@const isCurrent = order.currentDose && dose.number === order.currentDose.number}
												<div class="flex items-center space-x-3">
													<div class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
														${isCompleted ? 'bg-green-500 text-white' : ''}
														${isCurrent ? 'bg-blue-500 text-white animate-pulse' : ''}
														${!isCompleted && !isCurrent ? 'bg-gray-600 text-gray-400' : ''}
													`}>
														{dose.number}
													</div>
													<div class="flex-1">
														<span class={`text-sm ${isCurrent ? 'text-white font-medium' : 'text-gray-400'}`}>
															{dose.ingredient.name}
														</span>
														<span class="text-xs text-gray-500 ml-2">
															{dose.quantity}ml
														</span>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Instructions -->
								{#if cocktail?.instructions}
									<div class="mb-4">
										<h4 class="text-sm font-medium text-gray-300 mb-2">{t.myBar.orders.preparationInstructions}</h4>
										<div class="p-3 bg-gray-700 rounded text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
											{cocktail.instructions}
										</div>
									</div>
								{/if}

								<!-- Order Details -->
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
									<div>
										<p>{t.myBar.orders.orderCreated} {formatDate(order.createdAt)}</p>
										<p>{t.myBar.orders.orderUpdated} {formatDate(order.updatedAt)}</p>
									</div>
									<div>
										<p>{t.myBar.orders.device}: {order.device ? (order.device.name || order.device.id.substring(0, 8)) : t.myBar.orders.deletedDevice}</p>
									</div>
								</div>

								<!-- Error Message -->
								{#if order.errorMessage}
									<div class="mt-4 bg-red-900/20 border border-red-800/30 text-red-400 px-4 py-3 rounded">
										<p class="text-sm">{order.errorMessage}</p>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
				
				<!-- Recently Completed Orders -->
				{#if recentlyCompletedOrders.length > 0}
					<div class="mt-8 mb-4">
						<h3 class="text-xl font-semibold text-gray-300 mb-4">Recently Completed</h3>
					</div>
					
					{#each recentlyCompletedOrders as order}
						{@const cocktail = getCocktailDetails(order.cocktailId)}
						<div 
							id="order-{order.id}"
							class="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6 transition-all duration-300 {animatingOrders.has(order.id) ? `order-${animatingOrders.get(order.id)?.type}` : ''} relative opacity-90"
						>
							{#if showConfetti.has(order.id) && showConfetti.get(order.id)}
								<div class="absolute inset-0 flex justify-center items-center pointer-events-none z-10">
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

							<!-- Rich Order Header with Image -->
							<div class="flex flex-col md:flex-row">
								{#if cocktail?.imageUri}
									<div class="md:w-48 h-48 md:h-auto flex-shrink-0">
										<img 
											src="/api/cocktails/{cocktail.id}/image"
											alt="{cocktail.name} image"
											class="w-full h-full object-cover"
											on:error={(e) => {
												e.currentTarget.style.display = 'none';
											}}
										/>
									</div>
								{/if}
								
								<div class="flex-1 p-6">
									<!-- Header with title (no cancel button for completed orders) -->
									<div class="flex justify-between items-start mb-4">
										<div class="flex-1">
											<h3 class="text-2xl font-bold text-white mb-1">
												<a 
													href="/cocktails/{cocktail?.id}" 
													class="hover:text-blue-400 transition-colors"
												>
													{cocktail?.name || t.myBar.orders.loading}
												</a>
											</h3>
											{#if cocktail?.creator}
												<p class="text-sm text-gray-400 mb-2">
													{t.myBar.orders.by} {#if cocktail.creator?.artistName}
														{cocktail.creator.artistName} ({cocktail.creator.username})
													{:else}
														{cocktail.creator?.username || 'Unknown'}
													{/if}
												</p>
											{/if}
											<span
												class={`inline-block px-3 py-1 rounded-full text-sm font-medium
												${order.status === 'completed' ? 'bg-green-600 text-white' : ''}
												${order.status === 'failed' ? 'bg-red-600 text-white' : ''}
												${order.status === 'cancelled' ? 'bg-gray-600 text-white' : ''}
												`}
											>
												{t.myBar.orders.status[order.status]}
											</span>
										</div>
									</div>

									<!-- Description -->
									{#if cocktail?.description}
										<div class="text-gray-300 mb-4 leading-relaxed">
											<p class="whitespace-pre-wrap">
												{needsTruncation(cocktail.description) 
													? getTruncatedDescription(cocktail.description)
													: cocktail.description}
											</p>
											{#if needsTruncation(cocktail.description)}
												<a 
													href="/cocktails/{cocktail.id}" 
													class="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block transition-colors"
												>
													{t.myBar.orders.readMore}
												</a>
											{/if}
										</div>
									{/if}

									<!-- Ingredient Timeline (completed state) -->
									{#if cocktail?.doses && cocktail.doses.length > 0}
										<div class="mb-4">
											<h4 class="text-sm font-medium text-gray-300 mb-3">{t.myBar.orders.recipeTimeline}</h4>
											<div class="space-y-2">
												{#each cocktail.doses as dose}
													<div class="flex items-center space-x-3">
														<div class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
															${order.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-400'}
														`}>
															{dose.number}
														</div>
														<div class="flex-1">
															<span class="text-sm text-gray-400">
																{dose.ingredient.name}
															</span>
															<span class="text-xs text-gray-500 ml-2">
																{dose.quantity}ml
															</span>
														</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Instructions -->
									{#if cocktail?.instructions}
										<div class="mb-4">
											<h4 class="text-sm font-medium text-gray-300 mb-2">{t.myBar.orders.preparationInstructions}</h4>
											<div class="p-3 bg-gray-700 rounded text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
												{cocktail.instructions}
											</div>
										</div>
									{/if}

									<!-- Order Details -->
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
										<div>
											<p>{t.myBar.orders.orderCreated} {formatDate(order.createdAt)}</p>
											<p>{t.myBar.orders.orderUpdated} {formatDate(order.updatedAt)}</p>
										</div>
										<div>
											<p>{t.myBar.orders.device}: {order.device ? (order.device.name || order.device.id.substring(0, 8)) : t.myBar.orders.deletedDevice}</p>
										</div>
									</div>

									<!-- Error Message -->
									{#if order.errorMessage}
										<div class="mt-4 bg-red-900/20 border border-red-800/30 text-red-400 px-4 py-3 rounded">
											<p class="text-sm">{order.errorMessage}</p>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{/if}
			{/if}
		</section>

		<!-- Order History Section -->
		<section>
			<h2 class="text-2xl font-semibold mb-4">{t.myBar.orders.history}</h2>

			{#if orderHistory.length === 0}
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
							{#each orderHistory as order}
								<tr>
									<td class="px-6 py-4 whitespace-nowrap">
										<a
											href="/cocktails/{order.cocktail.id}"
											class="text-white font-bold hover:text-gray-300 transition-colors"
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
										{order.device ? (order.device.name || order.device.id.substring(0, 8)) : t.myBar.orders.deletedDevice}
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
