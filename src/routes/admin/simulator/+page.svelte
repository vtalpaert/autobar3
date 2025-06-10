<script lang="ts">
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    import Header from '$lib/components/Header.svelte';
    import type { PageData } from './$types';

    export let data: PageData;
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

    // Format date based on language
    function formatDate(dateString: string): string {
        return $currentLanguage === 'fr' 
            ? new Date(dateString).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'})
            : new Date(dateString).toLocaleDateString();
    }

    // Selected device and order
    let selectedDevice = data.devices && data.devices.length > 0 ? data.devices[0] : null;
    $: filteredOrders = data.activeOrders ? data.activeOrders.filter(order => order.deviceId === selectedDevice?.id) : [];
    $: selectedOrder = filteredOrders.length > 0 ? filteredOrders[0] : null;
    
    // Current action state
    let currentAction = null;
    let currentOrderId = null;
    let currentDoseId = null;
    let currentIngredientId = null;
    let currentQuantity = 0;
    
    // Reset action state when device changes
    $: if (selectedDevice) {
        currentAction = null;
        currentOrderId = null;
        currentDoseId = null;
        currentIngredientId = null;
        currentQuantity = 0;
    }
    
    // Device simulation functions
    async function verifyDevice() {
        if (!selectedDevice?.apiToken) {
            showNotification('No device selected', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/devices/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: selectedDevice.apiToken,
                    firmwareVersion: '1.0.0-simulator'
                })
            });
            
            const result = await response.json();
            if (result.tokenValid) {
                showNotification('Device verification successful', 'success');
            } else {
                showNotification(`Verification failed: ${result.message}`, 'error');
            }
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    async function checkForAction() {
        if (!selectedDevice?.apiToken) {
            showNotification('No device selected', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/devices/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: selectedDevice.apiToken
                })
            });
            
            const result = await response.json();
            currentAction = result.action;
            
            if (result.action === 'pour') {
                currentOrderId = result.orderId;
                currentDoseId = result.doseId;
                currentIngredientId = result.ingredientId;
                currentQuantity = result.quantityLeft;
                
                // Find the order in our list
                selectedOrder = data.activeOrders.find(order => order.id === result.orderId);
                
                showNotification(`Ready to pour: ${result.quantityLeft}ml for order ${result.orderId}`, 'info');
            } else {
                currentOrderId = null;
                currentDoseId = null;
                currentIngredientId = null;
                currentQuantity = 0;
                showNotification(`Device status: ${result.action}`, 'info');
            }
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    async function simulatePourProgress(progressPercentage) {
        if (!selectedDevice?.apiToken || !currentOrderId || !currentDoseId) {
            showNotification("No active pour in progress. Check for action first.", 'warning');
            return;
        }
        
        const progressAmount = currentQuantity * (progressPercentage / 100);
        
        try {
            const response = await fetch('/api/devices/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: selectedDevice.apiToken,
                    orderId: currentOrderId,
                    doseId: currentDoseId,
                    progress: progressAmount
                })
            });
            
            const result = await response.json();
            if (result.continue) {
                showNotification(`Progress reported: ${progressAmount.toFixed(1)}ml (${progressPercentage}%)`, 'success');
                
                // If we completed the dose, clear the current action
                if (progressPercentage >= 100) {
                    showNotification('Dose completed', 'success');
                    currentAction = null;
                    currentOrderId = null;
                    currentDoseId = null;
                    currentIngredientId = null;
                    currentQuantity = 0;
                }
            } else {
                showNotification('Order was cancelled or completed', 'warning');
                currentAction = null;
                currentOrderId = null;
                currentDoseId = null;
                currentIngredientId = null;
                currentQuantity = 0;
            }
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    async function simulateError(errorMessage) {
        if (!selectedDevice?.apiToken || !currentOrderId) {
            showNotification("No active order. Check for action first.", 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/devices/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: selectedDevice.apiToken,
                    orderId: currentOrderId,
                    message: errorMessage
                })
            });
            
            const result = await response.json();
            showNotification(`Error reported: ${result.message}`, 'error');
            
            // Clear current action after error
            currentAction = null;
            currentOrderId = null;
            currentDoseId = null;
            currentIngredientId = null;
            currentQuantity = 0;
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        }
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
            bind:value={selectedDevice}
        >
            {#each data.devices as device}
                <option value={device}>{device.name || `Device ${device.id.slice(0, 8)}`} ({device.ownerUsername})</option>
            {/each}
        </select>
        
        {#if selectedDevice}
            <div class="mt-4 flex space-x-4">
                <button 
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    on:click={verifyDevice}
                >
                    Verify Device
                </button>
                <button 
                    class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    on:click={checkForAction}
                >
                    Check for Action
                </button>
            </div>
        {/if}
    </div>
    
    <!-- Current Action Status -->
    {#if currentAction}
        <div class="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
            <h2 class="text-2xl font-semibold mb-2">Current Action: {currentAction}</h2>
            
            {#if currentAction === 'pour'}
                <div class="mb-4">
                    <p><strong>Order ID:</strong> {currentOrderId}</p>
                    <p><strong>Dose ID:</strong> {currentDoseId}</p>
                    <p><strong>Ingredient ID:</strong> {currentIngredientId}</p>
                    <p><strong>Quantity:</strong> {currentQuantity}ml</p>
                </div>
                
                <div class="flex flex-wrap gap-2">
                    <button 
                        class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        on:click={() => simulatePourProgress(25)}
                    >
                        Pour 25%
                    </button>
                    <button 
                        class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        on:click={() => simulatePourProgress(50)}
                    >
                        Pour 50%
                    </button>
                    <button 
                        class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        on:click={() => simulatePourProgress(75)}
                    >
                        Pour 75%
                    </button>
                    <button 
                        class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                        on:click={() => simulatePourProgress(100)}
                    >
                        Complete Pour
                    </button>
                </div>
                
                <div class="mt-4">
                    <h3 class="font-semibold mb-2">Simulate Errors:</h3>
                    <div class="flex flex-wrap gap-2">
                        <button 
                            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                            on:click={() => simulateError("Empty ingredient")}
                        >
                            Empty Ingredient
                        </button>
                        <button 
                            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                            on:click={() => simulateError("Pump failure")}
                        >
                            Pump Failure
                        </button>
                        <button 
                            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                            on:click={() => simulateError("Glass not detected")}
                        >
                            No Glass
                        </button>
                        <button 
                            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                            on:click={() => simulateError("Connection timeout")}
                        >
                            Timeout
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
    
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
