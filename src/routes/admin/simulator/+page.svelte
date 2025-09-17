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
                currentPumpGpio = form.pumpGpio || null;
                currentDoseWeight = form.doseWeight || 0;
                currentWeightProgress = form.doseWeightProgress || 0;
            }
            
            // Clear current action if pour was completed or cancelled
            if (form.completed || form.cancelled || form.errorReported) {
                if (!useManualIds) {
                    currentAction = null;
                    currentOrderId = null;
                    currentDoseId = null;
                    currentPumpGpio = null;
                    currentDoseWeight = 0;
                    currentWeightProgress = 0;
                }
            }
            
            // Refresh page data if needed (but delay to allow user to see the result)
            if (form.refreshOrders) {
                // Delay the reload to allow user to see the notification
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
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
    let currentPumpGpio = null;
    let currentDoseWeight = 0;
    let currentWeightProgress = 0;
    
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
        currentPumpGpio = null;
        currentDoseWeight = 0;
        currentWeightProgress = 0;
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
                {#if currentAction === 'pump'}
                    <p><strong>Order ID:</strong> {currentOrderId}</p>
                    <p><strong>Dose ID:</strong> {currentDoseId}</p>
                    <p><strong>Pump GPIO:</strong> {currentPumpGpio}</p>
                    <p><strong>Total Dose Weight:</strong> {currentDoseWeight}g</p>
                    <p><strong>Current Progress:</strong> {currentWeightProgress}g</p>
                    <p><strong>Remaining to Pump:</strong> {currentDoseWeight - currentWeightProgress}g</p>
                {:else if currentAction === 'standby'}
                    <p>Device is on standby</p>
                {:else if currentAction === 'completed'}
                    <p><strong>Order ID:</strong> {currentOrderId}</p>
                    <p>Order completed - drink ready for pickup</p>
                {/if}
            </div>
        {/if}
        
        <!-- Manual Override Controls -->
        <div class="mb-4 p-4 bg-gray-700 rounded">
            <h3 class="font-semibold mb-2">Manual Override (for testing errors)</h3>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label for="manualOrderId" class="block text-sm font-medium mb-1">Order ID:</label>
                    <input 
                        id="manualOrderId"
                        type="text" 
                        bind:value={manualOrderId}
                        placeholder="Enter any order ID"
                        class="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                    />
                </div>
                <div>
                    <label for="manualDoseId" class="block text-sm font-medium mb-1">Dose ID:</label>
                    <input 
                        id="manualDoseId"
                        type="text" 
                        bind:value={manualDoseId}
                        placeholder="Enter any dose ID"
                        class="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                    />
                </div>
            </div>
            <div class="flex items-center mt-2">
                <input 
                    type="checkbox" 
                    id="useManualIds"
                    bind:checked={useManualIds} 
                    class="mr-2" 
                />
                <label for="useManualIds">Use manual IDs instead of current action</label>
            </div>
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
        {#if (currentAction === 'pump' || useManualIds) && selectedDevice}
            <div class="mb-4">
                <h3 class="font-semibold mb-2">Set Progress Weight (absolute weight in grams):</h3>
                {#if currentAction === 'pump' && !useManualIds}
                    <p class="text-sm text-gray-300 mb-2">
                        Total dose: {currentDoseWeight}g | 
                        Current progress: {currentWeightProgress}g | 
                        Remaining: {currentDoseWeight - currentWeightProgress}g
                    </p>
                {/if}
                <div class="flex flex-wrap gap-2 mb-2">
                    {#each [5, 10, 20, 30, 50] as weightG}
                        <form method="POST" action="?/progress" use:enhance class="inline">
                            <input type="hidden" name="deviceId" value={selectedDevice.id} />
                            <input type="hidden" name="orderId" value={useManualIds ? manualOrderId : currentOrderId} />
                            <input type="hidden" name="doseId" value={useManualIds ? manualDoseId : currentDoseId} />
                            <input type="hidden" name="progressAmount" value={weightG} />
                            <input type="hidden" name="isManual" value={useManualIds} />
                            {#if simulateAsDevice}
                                <input type="hidden" name="overrideDeviceId" value={simulateAsDevice.id} />
                            {/if}
                            <button 
                                type="submit"
                                class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                Set {weightG}g
                            </button>
                        </form>
                    {/each}
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-sm">Set to weight:</span>
                    <input 
                        type="number" 
                        step="1" 
                        min="0" 
                        max="200" 
                        placeholder="grams"
                        class="w-20 p-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        id="customWeight"
                    />
                    <form method="POST" action="?/progress" use:enhance class="inline">
                        <input type="hidden" name="deviceId" value={selectedDevice.id} />
                        <input type="hidden" name="orderId" value={useManualIds ? manualOrderId : currentOrderId} />
                        <input type="hidden" name="doseId" value={useManualIds ? manualDoseId : currentDoseId} />
                        <input type="hidden" name="progressAmount" value="" id="customWeightHidden" />
                        <input type="hidden" name="isManual" value={useManualIds} />
                        {#if simulateAsDevice}
                            <input type="hidden" name="overrideDeviceId" value={simulateAsDevice.id} />
                        {/if}
                        <button 
                            type="submit"
                            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                            on:click={(e) => {
                                const customInput = document.getElementById('customWeight') as HTMLInputElement;
                                const hiddenInput = document.getElementById('customWeightHidden') as HTMLInputElement;
                                const value = parseFloat(customInput.value);
                                if (isNaN(value) || value <= 0) {
                                    e.preventDefault();
                                    alert('Please enter a valid weight in grams');
                                    return;
                                }
                                hiddenInput.value = value.toString();
                            }}
                        >
                            Set Weight
                        </button>
                    </form>
                </div>
            </div>
        {/if}
        
        <!-- Error Controls -->
        {#if (currentAction === 'pump' || useManualIds) && selectedDevice}
            <div class="mt-4">
                <h3 class="font-semibold mb-2">Simulate Hardware Errors:</h3>
                <div class="flex flex-wrap gap-2">
                    {#each [
                        {msg: 'General error', code: '1'},
                        {msg: 'Weight scale error', code: '2'},
                        {msg: 'No weight change (pump/reservoir issue)', code: '3'},
                        {msg: 'Negative weight change', code: '4'},
                        {msg: 'Unable to report progress', code: '5'}
                    ] as error}
                        <form method="POST" action="?/error" use:enhance class="inline">
                            <input type="hidden" name="deviceId" value={selectedDevice.id} />
                            <input type="hidden" name="orderId" value={useManualIds ? manualOrderId : currentOrderId} />
                            <input type="hidden" name="errorMessage" value={error.msg} />
                            <input type="hidden" name="errorCode" value={error.code} />
                            {#if simulateAsDevice}
                                <input type="hidden" name="overrideDeviceId" value={simulateAsDevice.id} />
                            {/if}
                            <button 
                                type="submit"
                                class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                            >
                                {error.msg}
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
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-lg">{order.cocktailName}</h3>
                            <span 
                                class="px-2 py-1 rounded text-xs font-medium"
                                class:bg-yellow-600={order.status === 'pending'}
                                class:bg-blue-600={order.status === 'in_progress'}
                                class:bg-green-600={order.status === 'completed'}
                                class:bg-red-600={order.status === 'failed'}
                                class:bg-gray-600={order.status === 'cancelled'}
                            >
                                {order.status.toUpperCase()}
                            </span>
                        </div>
                        
                        <div class="text-sm text-gray-300 space-y-1">
                            <p><strong>Customer:</strong> {order.customerArtistName || order.customerUsername}</p>
                            <p><strong>Order ID:</strong> <span class="font-mono text-xs bg-gray-800 px-1 rounded">{order.id}</span></p>
                            <p><strong>Created:</strong> {formatDate(order.createdAt)}</p>
                            {#if order.updatedAt && order.updatedAt !== order.createdAt}
                                <p><strong>Updated:</strong> {formatDate(order.updatedAt)}</p>
                            {/if}
                            
                            {#if order.currentDoseId}
                                <div class="mt-2 p-2 bg-gray-600 rounded">
                                    <p class="font-medium">Current Dose #{order.currentDoseNumber}:</p>
                                    <p><strong>Dose ID:</strong> <span class="font-mono text-xs bg-gray-800 px-1 rounded">{order.currentDoseId}</span></p>
                                    <p><strong>Ingredient:</strong> {order.currentIngredientName || 'Unknown'}</p>
                                    <p><strong>Weight:</strong> {order.currentDoseQuantity}g</p>
                                    <p><strong>Progress:</strong> {order.doseProgress || 0}g</p>
                                    <p><strong>Remaining:</strong> {(order.currentDoseQuantity - (order.doseProgress || 0))}g</p>
                                </div>
                            {:else}
                                <p class="text-yellow-400 mt-2">No current dose assigned</p>
                            {/if}
                        </div>
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
