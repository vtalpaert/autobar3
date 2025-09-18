<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
    export let form: ActionData;

    // Format date helper
    function formatDateTime(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Get relative time
    function getRelativeTime(dateString: string): string {
        const now = Date.now();
        const date = new Date(dateString).getTime();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDateTime(dateString);
    }

    let deletingPumpId: string | null = null;
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-6xl mx-auto">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <a href="/admin" class="text-blue-400 hover:text-blue-300 mb-4 inline-block">
                        ← Back to Admin Dashboard
                    </a>
                    <h1 class="text-4xl font-bold">Pump Management</h1>
                    <p class="text-gray-400 mt-2">
                        Manage all device pumps in the system ({data.pumps.length} total)
                    </p>
                </div>
            </div>

            {#if form?.error}
                <div class="mb-6 p-4 bg-red-900 text-white rounded-lg">
                    {form.error}
                </div>
            {/if}

            {#if form?.success}
                <div class="mb-6 p-4 bg-green-900 text-white rounded-lg">
                    Pump deleted successfully!
                </div>
            {/if}

            {#if data.pumps.length === 0}
                <div class="bg-gray-800 rounded-lg p-8 text-center">
                    <p class="text-gray-400 text-lg">No pumps found in the system.</p>
                </div>
            {:else}
                <div class="bg-gray-800 rounded-lg overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-700">
                                <tr>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                    >
                                        Device
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                    >
                                        Owner
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                    >
                                        GPIO
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                    >
                                        Ingredient
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                    >
                                        Status
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                    >
                                        Updated
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-700">
                                {#each data.pumps as pump}
                                    <tr class="hover:bg-gray-700">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div class="text-sm font-medium text-white">
                                                    {pump.device?.name ||
                                                        `Device ${pump.device?.id?.slice(0, 8) || 'Unknown'}`}
                                                </div>
                                                <div class="text-sm text-gray-400">
                                                    ID: {pump.device?.id?.slice(0, 8) || 'Unknown'}
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-white">
                                                {pump.profile?.artistName ||
                                                    pump.profile?.username ||
                                                    'Unknown'}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-white">
                                                {pump.gpio !== null
                                                    ? `GPIO ${pump.gpio}`
                                                    : 'Not set'}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-white">
                                                {pump.ingredient?.name || 'No ingredient'}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            {#if pump.isEmpty}
                                                <span
                                                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-900 text-yellow-200"
                                                >
                                                    Empty
                                                </span>
                                            {:else}
                                                <span
                                                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-200"
                                                >
                                                    Ready
                                                </span>
                                            {/if}
                                        </td>
                                        <td
                                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-400"
                                        >
                                            {getRelativeTime(pump.updatedAt)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <form
                                                method="POST"
                                                action="?/delete"
                                                use:enhance={() => {
                                                    deletingPumpId = pump.id;
                                                    return async ({ update }) => {
                                                        await update();
                                                        deletingPumpId = null;
                                                    };
                                                }}
                                                class="inline"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="pumpId"
                                                    value={pump.id}
                                                />
                                                <button
                                                    type="submit"
                                                    class="text-red-400 hover:text-red-300 disabled:opacity-50"
                                                    disabled={deletingPumpId === pump.id}
                                                >
                                                    {deletingPumpId === pump.id
                                                        ? 'Deleting...'
                                                        : 'Delete'}
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
