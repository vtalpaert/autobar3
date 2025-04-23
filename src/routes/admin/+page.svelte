<script lang="ts">
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';

    export let data: PageData;
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <h1 class="text-4xl font-bold mb-8">Admin Dashboard</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Users & Profiles Card -->
            <a href="/admin/users" class="block bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition">
                <h2 class="text-2xl font-bold mb-2">Users & Profiles</h2>
                <p class="text-gray-400 mb-4">Manage user accounts and verify profiles</p>
                <div class="flex justify-between items-center">
                    <span class="text-3xl font-bold">{data.counts.users}</span>
                    <span class="text-sm bg-blue-600 px-3 py-1 rounded-full">
                        {data.counts.unverifiedProfiles} unverified
                    </span>
                </div>
            </a>
            
            <!-- Cocktails Card -->
            <a href="/admin/cocktails" class="block bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition">
                <h2 class="text-2xl font-bold mb-2">Cocktails</h2>
                <p class="text-gray-400 mb-4">Manage cocktail recipes</p>
                <div class="flex justify-between items-center">
                    <span class="text-3xl font-bold">{data.counts.cocktails}</span>
                </div>
            </a>
            
            <!-- Devices Card -->
            <a href="/admin/devices" class="block bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition">
                <h2 class="text-2xl font-bold mb-2">Devices</h2>
                <p class="text-gray-400 mb-4">Manage connected devices</p>
                <div class="flex justify-between items-center">
                    <span class="text-3xl font-bold">{data.counts.devices}</span>
                </div>
            </a>
            
            <!-- Ingredients Card -->
            <a href="/admin/ingredients" class="block bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition">
                <h2 class="text-2xl font-bold mb-2">Ingredients</h2>
                <p class="text-gray-400 mb-4">Manage cocktail ingredients</p>
                <div class="flex justify-between items-center">
                    <span class="text-3xl font-bold">{data.counts.ingredients}</span>
                </div>
            </a>
            
            <!-- Doses Card -->
            <a href="/admin/doses" class="block bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition">
                <h2 class="text-2xl font-bold mb-2">Doses</h2>
                <p class="text-gray-400 mb-4">Manage cocktail ingredient doses</p>
                <div class="flex justify-between items-center">
                    <span class="text-3xl font-bold">{data.counts.doses || 0}</span>
                </div>
            </a>
            
            <!-- Orders Card -->
            <a href="/admin/orders" class="block bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition">
                <h2 class="text-2xl font-bold mb-2">Orders</h2>
                <p class="text-gray-400 mb-4">Manage cocktail orders</p>
                <div class="flex justify-between items-center">
                    <span class="text-3xl font-bold">{data.counts.orders || 0}</span>
                </div>
            </a>
        </div>
    </div>
</div>
