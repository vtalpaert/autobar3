<script lang="ts">
    import type { PageData } from './$types';
    import Header from '$lib/components/Header.svelte';
    import { enhance } from '$app/forms';

    export let data: PageData;

    $: unverifiedProfiles = data.profiles.filter(p => !p.isVerified);
    $: verifiedProfiles = data.profiles.filter(p => p.isVerified);
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold">User Management</h1>
            <a href="/admin" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
                Back to Dashboard
            </a>
        </div>

        <!-- Unverified Profiles Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">Unverified Profiles</h2>
            {#if unverifiedProfiles.length === 0}
                <p class="text-gray-400">No unverified profiles</p>
            {:else}
                <div class="space-y-4">
                    {#each unverifiedProfiles as profile}
                        <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                            <div>
                                <p class="font-bold">
                                    <a href="/profile?id={profile.userId}" class="hover:underline">{profile.username}</a>
                                </p>
                                <p class="text-sm text-gray-400">Created: {new Date(profile.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div class="flex gap-2">
                                <form 
                                    method="POST" 
                                    action="?/verifyProfile" 
                                    use:enhance
                                >
                                    <input type="hidden" name="profileId" value={profile.id} />
                                    <button 
                                        type="submit"
                                        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                    >
                                        Verify
                                    </button>
                                </form>
                                {#if !profile.isAdmin}
                                    <form 
                                        method="POST" 
                                        action="?/promoteToAdmin" 
                                        use:enhance
                                    >
                                        <input type="hidden" name="profileId" value={profile.id} />
                                        <button 
                                            type="submit"
                                            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
                                        >
                                            Make Admin
                                        </button>
                                    </form>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <!-- Users Section -->
        <section class="mb-12 bg-gray-800 p-6 rounded-lg">
            <h2 class="text-2xl font-bold mb-4">All Users</h2>
            <div class="space-y-4">
                {#each data.profiles as profile}
                    <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <div>
                            <p class="font-bold">
                                <a href="/profile?id={profile.userId}" class="hover:underline">{profile.username}</a>
                            </p>
                            <p class="text-sm text-gray-400">Artist Name: {profile.artistName || 'Not set'}</p>
                            <p class="text-sm text-gray-400">
                                <span class="{profile.isVerified ? 'bg-green-600' : 'bg-yellow-600'} text-white text-xs px-2 py-1 rounded">
                                    {profile.isVerified ? 'Verified' : 'Unverified'}
                                </span>
                                {#if profile.isAdmin}
                                    <span class="ml-2 bg-purple-700 text-white text-xs px-2 py-1 rounded">Admin</span>
                                {/if}
                            </p>
                        </div>
                        <div class="flex gap-2">
                            {#if !profile.isAdmin}
                                <form 
                                    method="POST" 
                                    action="?/promoteToAdmin" 
                                    use:enhance
                                >
                                    <input type="hidden" name="profileId" value={profile.id} />
                                    <button 
                                        type="submit"
                                        class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
                                    >
                                        Make Admin
                                    </button>
                                </form>
                            {:else if profile.userId !== data.user.id}
                                <form 
                                    method="POST" 
                                    action="?/removeAdmin" 
                                    use:enhance
                                    on:submit|preventDefault={(e) => {
                                        if (confirm('Are you sure you want to remove admin status from this user?')) {
                                            e.target.submit();
                                        }
                                    }}
                                >
                                    <input type="hidden" name="profileId" value={profile.id} />
                                    <button 
                                        type="submit"
                                        class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded"
                                    >
                                        Remove Admin
                                    </button>
                                </form>
                            {/if}
                            <form 
                                method="POST" 
                                action="?/deleteUser" 
                                use:enhance
                                on:submit|preventDefault={(e) => {
                                    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                                        e.target.submit();
                                    }
                                }}
                            >
                                <input type="hidden" name="userId" value={profile.userId} />
                                <button 
                                    type="submit"
                                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                >
                                    Delete
                                </button>
                            </form>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    </div>
</div>
