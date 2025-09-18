<script lang="ts">
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';
    import { enhance } from '$app/forms';

    export let data: PageData;

    // Function to get status badge color
    function getStatusColor(status: string) {
        switch (status) {
            case 'pending':
                return 'bg-yellow-600';
            case 'in_progress':
                return 'bg-blue-600';
            case 'completed':
                return 'bg-green-600';
            case 'failed':
                return 'bg-red-600';
            case 'cancelled':
                return 'bg-gray-600';
            default:
                return 'bg-gray-600';
        }
    }
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold">Order Management</h1>
            <a href="/admin" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
                Back to Dashboard
            </a>
        </div>

        <!-- Orders Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">All Orders</h2>
            {#if data.orders.length === 0}
                <p class="text-gray-400">No orders found</p>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="py-3 px-4">ID</th>
                                <th class="py-3 px-4">Created</th>
                                <th class="py-3 px-4">Customer</th>
                                <th class="py-3 px-4">Device</th>
                                <th class="py-3 px-4">Cocktail</th>
                                <th class="py-3 px-4">Status</th>
                                <th class="py-3 px-4">Progress</th>
                                <th class="py-3 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.orders as order}
                                <tr class="border-b border-gray-700">
                                    <td class="py-3 px-4">{order.id.slice(0, 8)}</td>
                                    <td class="py-3 px-4"
                                        >{new Date(order.createdAt).toLocaleString()}</td
                                    >
                                    <td class="py-3 px-4">
                                        {order.customer.artistName || order.customer.username}
                                    </td>
                                    <td class="py-3 px-4">
                                        {order.device.name || order.device.id.slice(0, 8)}
                                    </td>
                                    <td class="py-3 px-4">{order.cocktail.name}</td>
                                    <td class="py-3 px-4">
                                        <span
                                            class={`${getStatusColor(order.status)} px-2 py-1 rounded-full text-xs`}
                                        >
                                            {order.status}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">
                                        {order.doseProgress
                                            ? `${order.doseProgress.toFixed(1)} ml`
                                            : '-'}
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="flex gap-2">
                                            {#if order.status === 'pending' || order.status === 'in_progress'}
                                                <form
                                                    method="POST"
                                                    action="?/cancelOrder"
                                                    use:enhance
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="orderId"
                                                        value={order.id}
                                                    />
                                                    <button
                                                        type="submit"
                                                        class="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </form>
                                            {/if}
                                            <form method="POST" action="?/deleteOrder" use:enhance>
                                                <input
                                                    type="hidden"
                                                    name="orderId"
                                                    value={order.id}
                                                />
                                                <button
                                                    type="submit"
                                                    class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                                {#if order.errorMessage}
                                    <tr class="bg-red-900/20">
                                        <td colspan="8" class="py-2 px-4 text-red-300">
                                            Error: {order.errorMessage}
                                        </td>
                                    </tr>
                                {/if}
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </section>
    </div>
</div>
