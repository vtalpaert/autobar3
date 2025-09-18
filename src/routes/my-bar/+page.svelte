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
    import OrderCard from '$lib/components/OrderCard.svelte';

    export let data: PageData;
    $: t = translations[$currentLanguage];

    let eventSource: EventSource | null = null;
    let isConnected = false;

    // State management
    let allOrders = data.initialActiveOrders; // All orders from SSE (active + recently completed)
    let orderHistory = data.orderHistory;
    let cocktailCache = new Map(); // Cache for cocktail details
    let previousActiveOrderIds = new Set(
        allOrders.filter((o) => ['pending', 'in_progress'].includes(o.status)).map((o) => o.id)
    );

    // Separate orders into active and recently completed
    $: activeOrders = allOrders.filter((o) => ['pending', 'in_progress'].includes(o.status));
    $: recentlyCompletedOrders = allOrders.filter((o) =>
        ['completed', 'failed', 'cancelled'].includes(o.status)
    );

    // Animation state tracking
    let animatingOrders = new Map<
        string,
        { type: 'completed' | 'failed' | 'cancelled'; startTime: number }
    >();
    let showConfetti = new Map<string, boolean>();

    // Initialize cocktail cache with initial data
    onMount(() => {
        allOrders.forEach((order) => {
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
                    const currentActiveIds = new Set(
                        data.activeOrders
                            .filter((o) => ['pending', 'in_progress'].includes(o.status))
                            .map((o) => o.id)
                    );
                    const newlyCompletedOrderIds = [...previousActiveOrderIds].filter(
                        (id) => !currentActiveIds.has(id)
                    );

                    // Handle newly completed orders with animations
                    if (newlyCompletedOrderIds.length > 0) {
                        newlyCompletedOrderIds.forEach((orderId) => {
                            const completedOrder = data.activeOrders.find((o) => o.id === orderId);
                            if (completedOrder) {
                                // Determine animation type based on actual status
                                const animationType =
                                    completedOrder.status === 'completed'
                                        ? 'completed'
                                        : completedOrder.status === 'failed'
                                          ? 'failed'
                                          : 'cancelled';

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
                                            <span
                                                class="bg-blue-600 text-white text-xs px-2 py-1 rounded"
                                            >
                                                {t.devices.default}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                                <span
                                    class={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getDeviceStatus(device) === 'online' ? 'bg-green-500 text-white flex items-center gap-1' : 'bg-gray-600 text-white'}`}
                                >
                                    {#if getDeviceStatus(device) === 'online'}
                                        <div
                                            class="w-2 h-2 bg-white rounded-full animate-pulse"
                                        ></div>
                                    {/if}
                                    {getDeviceStatus(device) === 'online'
                                        ? t.myBar.devices.online
                                        : t.myBar.devices.offline}
                                </span>
                            </div>
                            <p class="text-sm text-gray-400">
                                {t.myBar.devices.lastSeen}:
                                {device.lastPingAt
                                    ? formatDate(device.lastPingAt)
                                    : t.myBar.devices.never}
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
                        <div
                            class={`w-2 h-2 rounded-full transition-colors duration-300 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        ></div>
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
                    <OrderCard
                        {order}
                        {cocktail}
                        {t}
                        {formatDate}
                        {calculateProgress}
                        {needsTruncation}
                        {getTruncatedDescription}
                        {animatingOrders}
                        {showConfetti}
                        isRecentlyCompleted={false}
                    />
                {/each}

                <!-- Recently Completed Orders -->
                {#if recentlyCompletedOrders.length > 0}
                    <div class="mt-8 mb-4">
                        <h3 class="text-xl font-semibold text-gray-300 mb-4">
                            {t.myBar.orders.recent}
                        </h3>
                    </div>

                    {#each recentlyCompletedOrders as order}
                        {@const cocktail = getCocktailDetails(order.cocktailId)}
                        <OrderCard
                            {order}
                            {cocktail}
                            {t}
                            {formatDate}
                            {calculateProgress}
                            {needsTruncation}
                            {getTruncatedDescription}
                            {animatingOrders}
                            {showConfetti}
                            isRecentlyCompleted={true}
                        />
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
                                        {order.device
                                            ? order.device.name || order.device.id.substring(0, 8)
                                            : t.myBar.orders.deletedDevice}
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
