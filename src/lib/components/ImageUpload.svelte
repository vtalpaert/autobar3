<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { env } from '$env/dynamic/public';
    import { translations } from '$lib/i18n/translations';
    import { currentLanguage } from '$lib/i18n/store';
    
    export let currentImageUri: string | null = null;
    export let label: string = 'Image';
    export let accept: string = 'image/jpeg,image/png,image/webp';
    export let maxSizeMB: number = 10;
    export let disabled: boolean = false;
    export let uploadHint: string = '(Click, drag & drop, or paste Ctrl+V)';
    export let uploadText: string = 'Click to upload, drag & drop, or paste image';
    
    $: t = translations[$currentLanguage];
    
    const dispatch = createEventDispatcher<{
        fileSelected: { file: File; inputElement: HTMLInputElement };
        fileRemoved: {};
        imageChanged: { hasImage: boolean };
    }>();
    
    // Image processing constants from environment variables
    const TARGET_SIZE = parseInt(env.PUBLIC_IMAGE_WIDTH || '600');
    const WEBP_QUALITY = parseInt(env.PUBLIC_WEBP_QUALITY || '85') / 100;
    
    let fileInput: HTMLInputElement;
    let previewUrl: string | null = currentImageUri;
    let dragOver = false;
    let error: string | null = null;
    let processing = false;
    let imageRemoved = false;
    
    // Update preview when currentImageUri changes (for edit mode)
    $: {
        if (!imageRemoved) {
            previewUrl = currentImageUri;
        }
    }
    
    // Handle clipboard paste
    function handlePaste(event: ClipboardEvent) {
        if (disabled || processing) return;
        
        const items = event.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    handleFileSelect(file);
                    event.preventDefault();
                }
                break;
            }
        }
    }
    
    function validateFile(file: File): string | null {
        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
            return `File size too large. Maximum allowed: ${maxSizeMB}MB`;
        }
        
        // Check file type
        const allowedTypes = accept.split(',').map(type => type.trim());
        if (!allowedTypes.includes(file.type)) {
            return `Unsupported file type. Allowed: ${allowedTypes.join(', ')}`;
        }
        
        return null;
    }
    
    async function processImage(file: File): Promise<File> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            
            img.onload = () => {
                // Calculate crop dimensions for center square crop
                const size = Math.min(img.width, img.height);
                const startX = (img.width - size) / 2;
                const startY = (img.height - size) / 2;
                
                // Set canvas to target size
                canvas.width = TARGET_SIZE;
                canvas.height = TARGET_SIZE;
                
                // Draw cropped and resized image
                ctx.drawImage(
                    img,
                    startX, startY, size, size, // Source rectangle (square crop from center)
                    0, 0, TARGET_SIZE, TARGET_SIZE // Destination rectangle
                );
                
                // Convert to WebP blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const processedFile = new File([blob], 
                                file.name.replace(/\.[^/.]+$/, '.webp'), 
                                { type: 'image/webp' }
                            );
                            resolve(processedFile);
                        } else {
                            reject(new Error('Failed to process image'));
                        }
                    },
                    'image/webp',
                    WEBP_QUALITY
                );
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }
    
    async function handleFileSelect(file: File) {
        error = validateFile(file);
        if (error) return;
        
        processing = true;
        
        try {
            // Process the image (crop to square and convert to WebP)
            const processedFile = await processImage(file);
            
            // Create preview URL
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            previewUrl = URL.createObjectURL(processedFile);
            
            // Create a new DataTransfer to properly set the file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(processedFile);
            
            dispatch('fileSelected', { 
                file: processedFile, 
                inputElement: fileInput 
            });
            dispatch('imageChanged', { hasImage: true });
            imageRemoved = false;
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to process image';
        } finally {
            processing = false;
        }
    }
    
    function handleInputChange(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }
    
    function handleDrop(event: DragEvent) {
        event.preventDefault();
        dragOver = false;
        
        if (disabled || processing) return;
        
        const file = event.dataTransfer?.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }
    
    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        if (!disabled && !processing) {
            dragOver = true;
        }
    }
    
    function handleDragLeave() {
        dragOver = false;
    }
    
    function removeImage() {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        previewUrl = null;
        imageRemoved = true;
        if (fileInput) {
            fileInput.value = '';
        }
        dispatch('fileRemoved');
        dispatch('imageChanged', { hasImage: false });
    }
    
    function openFileDialog() {
        if (!disabled && !processing) {
            fileInput?.click();
        }
    }
</script>

<!-- Global paste listener -->
<svelte:window on:paste={handlePaste} />

<div class="mb-4">
    <label for="image-upload-input" class="block text-sm font-medium mb-2">
        {label}
        {#if !disabled}
            <span class="text-sm text-gray-400 font-normal">
                {uploadHint === '(Click, drag & drop, or paste Ctrl+V)' ? t.createCocktail.imageUploadHint : uploadHint}
            </span>
        {/if}
    </label>
    
    <!-- Hidden file input -->
    <input
        bind:this={fileInput}
        id="image-upload-input"
        type="file"
        {accept}
        on:change={handleInputChange}
        class="hidden"
        disabled={disabled || processing}
    />
    
    <!-- Preview or Upload Area -->
    {#if previewUrl}
        <div class="relative">
            <img
                src={previewUrl}
                alt="Preview"
                class="w-full aspect-square object-cover rounded-lg border-2 border-gray-600"
            />
            <div class="absolute top-2 right-2 flex gap-2">
                <button
                    type="button"
                    on:click={openFileDialog}
                    class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors disabled:opacity-50"
                    aria-label="Change image"
                    disabled={disabled || processing}
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
                <button
                    type="button"
                    on:click={removeImage}
                    class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors disabled:opacity-50"
                    aria-label="Remove image"
                    disabled={disabled || processing}
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            {#if processing}
                <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div class="text-white text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p class="text-sm">Processing image...</p>
                    </div>
                </div>
            {/if}
        </div>
    {:else}
        <!-- Upload Area -->
        <div
            class="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                   {dragOver ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-gray-500'}
                   {disabled || processing ? 'opacity-50 cursor-not-allowed' : ''}"
            on:drop={handleDrop}
            on:dragover={handleDragOver}
            on:dragleave={handleDragLeave}
            on:click={openFileDialog}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && openFileDialog()}
        >
            {#if processing}
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
                <p class="text-gray-300 mb-2">Processing image...</p>
            {:else}
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                </svg>
                <p class="text-gray-300 mb-2">
                    {#if disabled}
                        Image upload disabled
                    {:else}
                        {uploadText === 'Click to upload, drag & drop, or paste image' ? t.createCocktail.imageUploadText : uploadText}
                    {/if}
                </p>
                <p class="text-sm text-gray-400">
                    PNG, JPG, WebP up to {maxSizeMB}MB
                </p>
                <p class="text-xs text-gray-500 mt-1">
                    Images will be automatically cropped to 600×600 square
                </p>
            {/if}
        </div>
    {/if}
    
    {#if error}
        <p class="mt-2 text-sm text-red-400">{error}</p>
    {/if}
</div>
