<script lang="ts">
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';

    export let data: PageData;
    export let form: ActionData;
    $: t = translations[$currentLanguage];
    
    // Notification system
    type NotificationType = 'success' | 'error' | 'info' | 'warning';
    type Notification = {
        id: number;
        type: NotificationType;
        message: string;
        timeout: number;
    };
    
    let notifications: Notification[] = [];
    let notificationCounter = 0;
    
    function showNotification(message: string, type: NotificationType = 'info', timeout: number = 5000) {
        const id = notificationCounter++;
        const notification = { id, type, message, timeout };
        notifications = [...notifications, notification];
        
        if (timeout > 0) {
            setTimeout(() => {
                dismissNotification(id);
            }, timeout);
        }
    }
    
    function dismissNotification(id: number) {
        notifications = notifications.filter(n => n.id !== id);
    }

    // Handle form responses
    $: if (form) {
        if (form.success) {
            showNotification(form.message, 'success');
            
            // Update current action state if checkAction was successful
            if (form.action) {
                currentAction = form.action;
                currentOrderId = form.orderId || null;
                currentDoseId = form.doseId || null;
                currentIngredientId = form.ingredientId || null;
                currentQuantity = form.quantityLeft || 0;
            }
            
            // Clear current action if pour was completed or cancelled
            if (form.completed || form.cancelled || form.errorReported) {
                if (!useManualIds) {
                    currentAction = null;
                    currentOrderId = null;
                    currentDoseId = null;
                    currentIngredientId = null;
                    currentQuantity = 0;
                }
            }
        } else {
            showNotification(form.message, 'error');
        }
    }

    // Format date based on language
    function formatDate(dateString: string): string {
        return $currentLanguage === 'fr' 
            ? new Date(dateString).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'})
            : new Date(dateString).toLocaleDateString();
    }

    // Selected device and order
    let selectedDeviceId = data.devices && data.devices.length > 0 ? data.devices[0].id : '';
    $: selectedDevice = data.devices.find(d => d.id === selectedDeviceId) || null;
    $: filteredOrders = data.activeOrders ? data.activeOrders.filter(order => order.deviceId === selectedDeviceId) : [];
    $: selectedOrder = filteredOrders.length > 0 ? filteredOrders[0] : null;
    
    // Current action state
    let currentAction = null;
    let currentOrderId = null;
    let currentDoseId = null;
    let currentIngredientId = null;
    let currentQuantity = 0;
    
    // Manual override variables for testing error scenarios
    let manualOrderId = '';
    let manualDoseId = '';
    let useManualIds = false;
    let simulateAsDevice = null;
    
    // Reset action state when device changes
    $: if (selectedDeviceId) {
        currentAction = null;
        currentOrderId = null;
        currentDoseId = null;
        currentIngredientId = null;
        currentQuantity = 0;
        // Reset manual overrides
        manualOrderId = '';
        manualDoseId = '';
        useManualIds = false;
        simulateAsDevice = null;
    }
    
    // Helper functions for quick error scenario setup
    function setupWrongOrderProgress() {
        const wrongOrder = data.activeOrders.find(order => order.id !== currentOrderId);
        if (wrongOrder) {
            manualOrderId = wrongOrder.id;
            manualDoseId = currentDoseId || 'dose-123';
            useManualIds = true;
            showNotification('Set up for wrong order progress test', 'info');
        } else {
            showNotification("No other orders available to simulate wrong order", 'warning');
        }
    }
    
    function setupWrongDoseProgress() {
        if (!currentOrderId) {
            showNotification("No current order. Check for action first.", 'warning');
            return;
        }
        manualOrderId = currentOrderId;
        manualDoseId = 'wrong-dose-id-' + Date.now();
        useManualIds = true;
        showNotification('Set up for wrong dose progress test', 'info');
    }
    
</script>

<Header user={data.user} />

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
    <div class="container mx-auto px-4 py-16">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold">Device Simulator</h1>
            <a href="/admin" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
                Back to Dashboard
            </a>
        </div>
    
    <!-- Device Selection -->
    <div class="mb-8 p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 class="text-2xl font-semibold mb-4">Select Device to Simulate</h2>
        <select 
            class="w-full p-2 border rounded bg-gray-700 text-white border-gray-600"
            bind:value={selectedDeviceId}
        >
            {#each data.devices as device}
                <option value={device.id}>{device.name || `Device ${device.id.slice(0, 8)}`} - Owner: {device.ownerUsername}</option>
            {/each}
        </select>
        
        {#if selectedDevice}
            <div class="mt-4">
                <p class="mb-2 text-gray-300">
                    Selected: <strong>{selectedDevice.name || `Device ${selectedDevice.id.slice(0, 8)}`}</strong> 
                    (Owner: {selectedDevice.ownerUsername})
                </p>
                <div class="flex space-x-4">
                    <form method="POST" action="?/verify" use:enhance>
                        <input type="hidden" name="deviceId" value={selectedDevice.id} />
                        <button 
                            type="submit"
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Verify Device
                        </button>
                    </form>
                    <form method="POST" action="?/checkAction" use:enhance>
                        <input type="hidden" name="deviceId" value={selectedDevice.id} />
                        <button 
                            type="submit"
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                        >
                            Check for Action
                        </button>
                    </form>
                </div>
            </div>
        {/if}
    </div>
    
    <!-- Testing Controls - Always visible for admin testing -->
    <div class="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
        <h2 class="text-2xl font-semibold mb-4">Testing Controls</h2>
        
        <!-- Current Action Status -->
        {#if currentAction}
            <div class="mb-4 p-4 bg-gray-700 rounded">
                <h3 class="font-semibold mb-2">Current Action: {currentAction}</h3>
                {#if currentAction === 'pour'}
                    <p><strong>Order ID:</strong> {currentOrderId}</p>
                    <p><strong>Dose ID:</strong> {currentDoseId}</p>
                    <p><strong>Ingredient ID:</strong> {currentIngredientId}</p>
                    <p><strong>Total Quantity to Pour:</strong> {(currentQuantity / 10).toFixed(1)}cL ({currentQuantity}ml)</p>
                {/if}
            </div>
        {/if}
        
        <!-- Manual Override Controls -->
        <div class="mb-4 p-4 bg-gray-700 rounded">
            <h3 class="font-semibold mb-2">Manual Override (for testing errors)</h3>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Order ID:</label>
                    <input 
                        type="text" 
                        bind:value={manualOrderId}
                        placeholder="Enter any order ID"
                        class="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Dose ID:</label>
                    <input 
                        type="text" 
                        bind:value={manualDoseId}
                        placeholder="Enter any dose ID"
                        class="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                    />
                </div>
            </div>
            <label class="flex items-center mt-2">
                <input type="checkbox" bind:checked={useManualIds} class="mr-2" />
                Use manual IDs instead of current action
            </label>
        </div>
        
        <!-- Wrong Device Simulation -->
        <div class="mb-4 p-4 bg-gray-700 rounded">
            <h3 class="font-semibold mb-2">Wrong Device Simulation</h3>
            <select 
                bind:value={simulateAsDevice}
                class="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
            >
                <option value={null}>Use selected device (correct behavior)</option>
                {#each data.devices as device}
                    {#if device.id !== selectedDevice?.id}
                        <option value={device}>{device.name || `Device ${device.id.slice(0, 8)}`} - Owner: {device.ownerUsername}</option>
                    {/if}
                {/each}
            </select>
        </div>
        
        <!-- Quick Setup Buttons -->
        <div class="mb-4">
            <h3 class="font-semibold mb-2">Quick Error Setup:</h3>
            <div class="flex flex-wrap gap-2">
                <button 
                    class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition text-sm"
                    on:click={setupWrongOrderProgress}
                >
                    Setup Wrong Order Test
                </button>
                <button 
                    class="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition text-sm"
                    on:click={setupWrongDoseProgress}
                >
                    Setup Wrong Dose Test
                </button>
            </div>
        </div>
        
        <!-- Progress Controls -->
        {#if (currentAction === 'pour' || useManualIds) && selectedDevice}
            <div class="mb-4">
                <h3 class="font-semibold mb-2">Pour Progress (in cL):</h3>
                {#if currentAction === 'pour' && !useManualIds}
                    <p class="text-sm text-gray-300 mb-2">
                        Total to pour: {(currentQuantity / 10).toFixed(1)}cL
                    </p>
                {/if}
                <div class="flex flex-wrap gap-2 mb-2">
                    {#each [0.5, 1.0, 2.0, 3.0, 5.0] as quantityCl}
                        <form method="POST" action="?/progress" use:enhance class="inline">
                            <input type="hidden" name="deviceId" value={selectedDevice.id} />
                            <input type="hidden" name="orderId" value={useManualIds ? manualOrderId : currentOrderId} />
                            <input type="hidden" name="doseId" value={useManualIds ? manualDoseId : currentDoseId} />
                            <input type="hidden" name="progressAmount" value={quantityCl * 10} />
                            <input type="hidden" name="isManual" value={useManualIds} />
                            {#if simulateAsDevice}
                                <input type="hidden" name="overrideDeviceId" value={simulateAsDevice.id} />
                            {/if}
                            <button 
                                type="submit"
                                class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                Pour {quantityCl}cL
                            </button>
                        </form>
                    {/each}
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-sm">Custom amount:</span>
                    <input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="10" 
                        placeholder="cL"
                        class="w-20 p-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        id="customAmount"
                    />
                    <form method="POST" action="?/progress" use:enhance class="inline">
                        <input type="hidden" name="deviceId" value={selectedDevice.id} />
                        <input type="hidden" name="orderId" value={useManualIds ? manualOrderId : currentOrderId} />
                        <input type="hidden" name="doseId" value={useManualIds ? manualDoseId : currentDoseId} />
                        <input type="hidden" name="progressAmount" value="" id="customAmountHidden" />
                        <input type="hidden" name="isManual" value={useManualIds} />
                        {#if simulateAsDevice}
                            <input type="hidden" name="overrideDeviceId" value={simulateAsDevice.id} />
                        {/if}
                        <button 
                            type="submit"
                            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                            on:click={(e) => {
                                const customInput = document.getElementById('customAmount') as HTMLInputElement;
                                const hiddenInput = document.getElementById('customAmountHidden') as HTMLInputElement;
                                const value = parseFloat(customInput.value);
                                if (isNaN(value) || value <= 0) {
                                    e.preventDefault();
                                    alert('Please enter a valid amount in cL');
                                    return;
                                }
                                hiddenInput.value = (value * 10).toString(); // Convert cL to ml
                            }}
                        >
                            Pour Custom
                        </button>
                    </form>
                </div>
            </div>
        {/if}
        
        <!-- Error Controls -->
        {#if (currentAction === 'pour' || useManualIds) && selectedDevice}
            <div class="mt-4">
                <h3 class="font-semibold mb-2">Simulate Hardware Errors:</h3>
                <div class="flex flex-wrap gap-2">
                    {#each ['Empty ingredient', 'Pump failure', 'Glass not detected', 'Connection timeout'] as errorMsg}
                        <form method="POST" action="?/error" use:enhance class="inline">
                            <input type="hidden" name="deviceId" value={selectedDevice.id} />
                            <input type="hidden" name="orderId" value={useManualIds ? manualOrderId : currentOrderId} />
                            <input type="hidden" name="errorMessage" value={errorMsg} />
                            {#if simulateAsDevice}
                                <input type="hidden" name="overrideDeviceId" value={simulateAsDevice.id} />
                            {/if}
                            <button 
                                type="submit"
                                class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                            >
                                {errorMsg}
                            </button>
                        </form>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
    
    <!-- Orders for Selected Device -->
    <div class="mb-8 p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 class="text-2xl font-semibold mb-4">Orders for Selected Device</h2>
        
        {#if filteredOrders.length === 0}
            <p class="italic text-gray-500">No active orders for this device</p>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each filteredOrders as order}
                    <div 
                        class="p-4 border border-gray-700 rounded cursor-pointer hover:bg-gray-700 transition"
                        class:bg-gray-700={selectedOrder?.id === order.id}
                        on:click={() => selectedOrder = order}
                        on:keydown={(e) => e.key === 'Enter' && (selectedOrder = order)}
                        tabindex="0"
                        role="button"
                        aria-pressed={selectedOrder?.id === order.id}
                    >
                        <h3 class="font-bold">{order.cocktailName}</h3>
                        <p>Status: {order.status}</p>
                        <p>Created: {formatDate(order.createdAt)}</p>
                        <p>Order ID: {order.id}</p>
                        {#if order.currentDoseId}
                            <p>Current Dose: {order.currentDoseId}</p>
                            <p>Progress: {order.doseProgress}ml</p>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
    </div>
</div>

<!-- Notifications -->
<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
    {#each notifications as notification (notification.id)}
        <div 
            class="p-4 rounded-lg shadow-lg flex justify-between items-start transition-all duration-300 animate-in slide-in-from-right"
            class:bg-green-600={notification.type === 'success'}
            class:bg-red-600={notification.type === 'error'}
            class:bg-blue-600={notification.type === 'info'}
            class:bg-yellow-600={notification.type === 'warning'}
        >
            <div>
                <div class="font-semibold">
                    {#if notification.type === 'success'}
                        Success
                    {:else if notification.type === 'error'}
                        Error
                    {:else if notification.type === 'warning'}
                        Warning
                    {:else}
                        Info
                    {/if}
                </div>
                <div>{notification.message}</div>
            </div>
            <button 
                class="ml-4 text-white hover:text-gray-200"
                on:click={() => dismissNotification(notification.id)}
            >
                ✕
            </button>
        </div>
    {/each}
</div>
