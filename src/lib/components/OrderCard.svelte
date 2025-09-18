<script lang="ts">
	import { Confetti } from 'svelte-confetti';
	import { enhance } from '$app/forms';

	export let order: any;
	export let cocktail: any;
	export let t: any;
	export let formatDate: (date: Date) => string;
	export let calculateProgress: (order: any) => number;
	export let needsTruncation: (text: string) => boolean;
	export let getTruncatedDescription: (text: string) => string;
	export let animatingOrders: Map<string, { type: 'completed' | 'failed' | 'cancelled', startTime: number }>;
	export let showConfetti: Map<string, boolean>;
	export let isRecentlyCompleted = false;
</script>

<div 
	id="order-{order.id}"
	class="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6 transition-all duration-300 {animatingOrders.has(order.id) ? `order-${animatingOrders.get(order.id)?.type}` : ''} relative {isRecentlyCompleted ? 'opacity-90' : ''}"
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
			<!-- Header with title and optional cancel button -->
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

				{#if !isRecentlyCompleted}
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
				{/if}
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
							{@const isAllCompleted = isRecentlyCompleted && order.status === 'completed'}
							<div class="flex items-center space-x-3">
								<div class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
									${isAllCompleted ? 'bg-green-500 text-white' : ''}
									${isCompleted ? 'bg-green-500 text-white' : ''}
									${isCurrent ? 'bg-blue-500 text-white animate-pulse' : ''}
									${!isCompleted && !isCurrent && !isAllCompleted ? 'bg-gray-600 text-gray-400' : ''}
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
	
	:global(.order-completed) {
		animation: green-pulse 2s ease-in-out 3;
		border: 2px solid rgb(16, 185, 129);
		position: relative;
	}
	
	:global(.order-failed) {
		animation: shake-red 1s ease-in-out 2;
		border: 2px solid rgb(239, 68, 68);
	}
	
	:global(.order-cancelled) {
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
