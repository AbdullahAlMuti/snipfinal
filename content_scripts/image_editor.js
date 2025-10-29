// Image Editor for eBay Snipping Extension
(() => {
    'use strict';

    // Global state
    let editorState = {
        isOpen: false,
        baseImage: null,
        stickers: [],
        selectedStickerIndex: -1,
        canvas: null,
        ctx: null,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        overlay: null,
        popup: null
    };

    // Built-in stickers
    const STICKERS = [
        'bestseller.png',
        'hotdeal.png',
        'limited.png',
        'sale.png',
        'freeshipping.png',
        'new.png'
    ];

    // Public API
    window.openImageEditor = async (options) => {
        console.log('🎨 Opening image editor with options:', options);
        
        if (editorState.isOpen) {
            console.log('⚠️ Editor already open, closing first');
            closeEditor();
        }

        try {
            await initializeEditor(options);
        } catch (error) {
            console.error('❌ Failed to initialize editor:', error);
        }
    };

    // Initialize editor
    async function initializeEditor(options) {
        editorState.isOpen = true;
        editorState.baseImage = null;
        editorState.stickers = [];
        editorState.selectedStickerIndex = -1;

        // Load popup HTML and CSS
        await loadEditorPopup();

        // Setup canvas
        setupCanvas();

        // Load base image
        await loadBaseImage(options.src);

        // Setup event listeners
        setupEventListeners();

        // Load built-in stickers
        await loadBuiltInStickers();

        // Show popup
        editorState.overlay.style.display = 'flex';
    }

    // Load editor popup HTML and CSS
    async function loadEditorPopup() {
        if (editorState.overlay) {
            return; // Already loaded
        }

        console.log('📄 Loading editor popup...');

        // Load HTML
        const htmlResponse = await fetch(chrome.runtime.getURL('ui/editor-popup.html'));
        const htmlContent = await htmlResponse.text();

        // Load CSS
        const cssResponse = await fetch(chrome.runtime.getURL('ui/editor-popup.css'));
        const cssContent = await cssResponse.text();

        // Create style element
        const style = document.createElement('style');
        style.textContent = cssContent;
        document.head.appendChild(style);

        // Create overlay
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        editorState.overlay = tempDiv.firstElementChild;
        document.body.appendChild(editorState.overlay);

        // Get popup reference
        editorState.popup = editorState.overlay.querySelector('.snipe-editor-popup');

        console.log('✅ Editor popup loaded');
    }

    // Setup canvas
    function setupCanvas() {
        editorState.canvas = document.getElementById('snipe-editor-canvas');
        editorState.ctx = editorState.canvas.getContext('2d');
        
        // Set canvas size for display (scaled down)
        const container = editorState.canvas.parentElement;
        const maxSize = Math.min(container.clientWidth - 40, container.clientHeight - 40, 600);
        editorState.canvas.style.width = maxSize + 'px';
        editorState.canvas.style.height = maxSize + 'px';
    }

    // Load base image
    async function loadBaseImage(src) {
        console.log('🖼️ Loading base image:', src);
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                editorState.baseImage = img;
                drawCanvas();
                resolve();
            };
            
            img.onerror = () => {
                console.error('❌ Failed to load base image');
                reject(new Error('Failed to load base image'));
            };
            
            img.src = src;
        });
    }

    // Draw canvas content
    function drawCanvas() {
        if (!editorState.ctx || !editorState.baseImage) return;

        const canvas = editorState.canvas;
        const ctx = editorState.ctx;
        
        // Clear canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 1600, 1600);

        // Calculate image dimensions to fit in 1600x1600 while maintaining aspect ratio
        const img = editorState.baseImage;
        const maxSize = 1600;
        const aspectRatio = img.width / img.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (aspectRatio > 1) {
            // Landscape
            drawWidth = maxSize;
            drawHeight = maxSize / aspectRatio;
            drawX = 0;
            drawY = (maxSize - drawHeight) / 2;
        } else {
            // Portrait or square
            drawHeight = maxSize;
            drawWidth = maxSize * aspectRatio;
            drawX = (maxSize - drawWidth) / 2;
            drawY = 0;
        }

        // Draw base image
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // Draw stickers
        editorState.stickers.forEach((sticker, index) => {
            drawSticker(sticker, index === editorState.selectedStickerIndex);
        });

        console.log('✅ Canvas redrawn');
    }

    // Draw a sticker
    function drawSticker(sticker, isSelected = false) {
        if (!sticker.img || !editorState.ctx) return;

        const ctx = editorState.ctx;
        const img = sticker.img;
        
        ctx.save();
        
        // Move to sticker center
        ctx.translate(sticker.x, sticker.y);
        
        // Rotate
        ctx.rotate(sticker.rotation);
        
        // Scale
        ctx.scale(sticker.scale, sticker.scale);
        
        // Draw selection border if selected
        if (isSelected) {
            ctx.strokeStyle = '#0b5cab';
            ctx.lineWidth = 4;
            ctx.strokeRect(-img.width/2 - 2, -img.height/2 - 2, img.width + 4, img.height + 4);
        }
        
        // Draw sticker image
        ctx.drawImage(img, -img.width/2, -img.height/2);
        
        ctx.restore();
    }

    // Load built-in stickers
    async function loadBuiltInStickers() {
        console.log('🎭 Loading built-in stickers...');
        
        const grid = document.getElementById('snipe-editor-sticker-grid');
        grid.innerHTML = '';

        for (const stickerName of STICKERS) {
            const stickerItem = document.createElement('div');
            stickerItem.className = 'snipe-editor-sticker-item';
            stickerItem.dataset.sticker = stickerName;
            
            const img = document.createElement('img');
            img.src = chrome.runtime.getURL(`assets/stickers/${stickerName}`);
            img.alt = stickerName;
            img.onerror = () => {
                console.warn(`⚠️ Failed to load sticker: ${stickerName}`);
                stickerItem.style.display = 'none';
            };
            
            stickerItem.appendChild(img);
            grid.appendChild(stickerItem);
        }

        console.log('✅ Built-in stickers loaded');
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close button
        document.getElementById('snipe-editor-close').onclick = closeEditor;
        document.getElementById('snipe-editor-cancel').onclick = closeEditor;

        // Save button
        document.getElementById('snipe-editor-save').onclick = saveImage;

        // Upload input
        document.getElementById('snipe-editor-upload').onchange = handleStickerUpload;

        // Sticker grid clicks
        document.getElementById('snipe-editor-sticker-grid').onclick = handleStickerGridClick;

        // Canvas interactions
        editorState.canvas.onmousedown = handleCanvasMouseDown;
        editorState.canvas.onmousemove = handleCanvasMouseMove;
        editorState.canvas.onmouseup = handleCanvasMouseUp;
        editorState.canvas.onwheel = handleCanvasWheel;

        // Control buttons
        document.getElementById('snipe-editor-rotate-left').onclick = () => rotateSticker(-Math.PI/4);
        document.getElementById('snipe-editor-rotate-right').onclick = () => rotateSticker(Math.PI/4);
        document.getElementById('snipe-editor-bring-front').onclick = bringStickerToFront;
        document.getElementById('snipe-editor-send-back').onclick = sendStickerToBack;
        document.getElementById('snipe-editor-delete').onclick = deleteSelectedSticker;

        // Scale slider
        const scaleSlider = document.getElementById('snipe-editor-scale');
        scaleSlider.oninput = (e) => {
            const scale = parseFloat(e.target.value);
            updateStickerScale(scale);
            document.getElementById('snipe-editor-scale-value').textContent = scale.toFixed(1) + 'x';
        };

        // Overlay click to close
        editorState.overlay.onclick = (e) => {
            if (e.target === editorState.overlay) {
                closeEditor();
            }
        };
    }

    // Handle sticker grid clicks
    function handleStickerGridClick(e) {
        const stickerItem = e.target.closest('.snipe-editor-sticker-item');
        if (!stickerItem) return;

        const stickerName = stickerItem.dataset.sticker;
        console.log('🎭 Adding sticker:', stickerName);

        // Load sticker image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const sticker = {
                img: img,
                x: 800, // Center of canvas
                y: 800,
                scale: 1,
                rotation: 0
            };
            
            editorState.stickers.push(sticker);
            editorState.selectedStickerIndex = editorState.stickers.length - 1;
            
            drawCanvas();
            updateControlsVisibility();
        };
        
        img.src = chrome.runtime.getURL(`assets/stickers/${stickerName}`);
    }

    // Handle sticker upload
    function handleStickerUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        console.log('📤 Uploading sticker:', file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const sticker = {
                    img: img,
                    x: 800,
                    y: 800,
                    scale: 1,
                    rotation: 0
                };
                
                editorState.stickers.push(sticker);
                editorState.selectedStickerIndex = editorState.stickers.length - 1;
                
                drawCanvas();
                updateControlsVisibility();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Handle canvas mouse down
    function handleCanvasMouseDown(e) {
        if (editorState.selectedStickerIndex === -1) return;

        const rect = editorState.canvas.getBoundingClientRect();
        const scaleX = 1600 / rect.width;
        const scaleY = 1600 / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        editorState.isDragging = true;
        editorState.dragStart = { x, y };

        // Check if clicking on selected sticker
        const sticker = editorState.stickers[editorState.selectedStickerIndex];
        if (isPointInSticker(x, y, sticker)) {
            editorState.canvas.style.cursor = 'grabbing';
        }
    }

    // Handle canvas mouse move
    function handleCanvasMouseMove(e) {
        if (!editorState.isDragging || editorState.selectedStickerIndex === -1) return;

        const rect = editorState.canvas.getBoundingClientRect();
        const scaleX = 1600 / rect.width;
        const scaleY = 1600 / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const sticker = editorState.stickers[editorState.selectedStickerIndex];
        sticker.x += x - editorState.dragStart.x;
        sticker.y += y - editorState.dragStart.y;

        editorState.dragStart = { x, y };
        drawCanvas();
    }

    // Handle canvas mouse up
    function handleCanvasMouseUp(e) {
        editorState.isDragging = false;
        editorState.canvas.style.cursor = 'move';
    }

    // Handle canvas wheel
    function handleCanvasWheel(e) {
        if (editorState.selectedStickerIndex === -1) return;

        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        
        if (e.ctrlKey) {
            // Resize sticker
            const sticker = editorState.stickers[editorState.selectedStickerIndex];
            sticker.scale = Math.max(0.1, Math.min(3, sticker.scale + delta));
            updateScaleSlider();
        } else if (e.altKey) {
            // Rotate sticker
            const sticker = editorState.stickers[editorState.selectedStickerIndex];
            sticker.rotation += delta;
        }

        drawCanvas();
    }

    // Check if point is in sticker
    function isPointInSticker(x, y, sticker) {
        if (!sticker.img) return false;

        const img = sticker.img;
        const halfWidth = (img.width * sticker.scale) / 2;
        const halfHeight = (img.height * sticker.scale) / 2;

        // Simple bounding box check (could be improved with rotation)
        return x >= sticker.x - halfWidth && x <= sticker.x + halfWidth &&
               y >= sticker.y - halfHeight && y <= sticker.y + halfHeight;
    }

    // Rotate sticker
    function rotateSticker(angle) {
        if (editorState.selectedStickerIndex === -1) return;

        const sticker = editorState.stickers[editorState.selectedStickerIndex];
        sticker.rotation += angle;
        drawCanvas();
    }

    // Bring sticker to front
    function bringStickerToFront() {
        if (editorState.selectedStickerIndex === -1) return;

        const sticker = editorState.stickers.splice(editorState.selectedStickerIndex, 1)[0];
        editorState.stickers.push(sticker);
        editorState.selectedStickerIndex = editorState.stickers.length - 1;
        drawCanvas();
    }

    // Send sticker to back
    function sendStickerToBack() {
        if (editorState.selectedStickerIndex === -1) return;

        const sticker = editorState.stickers.splice(editorState.selectedStickerIndex, 1)[0];
        editorState.stickers.unshift(sticker);
        editorState.selectedStickerIndex = 0;
        drawCanvas();
    }

    // Delete selected sticker
    function deleteSelectedSticker() {
        if (editorState.selectedStickerIndex === -1) return;

        editorState.stickers.splice(editorState.selectedStickerIndex, 1);
        editorState.selectedStickerIndex = -1;
        
        drawCanvas();
        updateControlsVisibility();
    }

    // Update sticker scale
    function updateStickerScale(scale) {
        if (editorState.selectedStickerIndex === -1) return;

        const sticker = editorState.stickers[editorState.selectedStickerIndex];
        sticker.scale = scale;
        drawCanvas();
    }

    // Update scale slider
    function updateScaleSlider() {
        if (editorState.selectedStickerIndex === -1) return;

        const sticker = editorState.stickers[editorState.selectedStickerIndex];
        const slider = document.getElementById('snipe-editor-scale');
        const value = document.getElementById('snipe-editor-scale-value');
        
        slider.value = sticker.scale;
        value.textContent = sticker.scale.toFixed(1) + 'x';
    }

    // Update controls visibility
    function updateControlsVisibility() {
        const controls = document.getElementById('snipe-editor-controls');
        controls.style.display = editorState.selectedStickerIndex !== -1 ? 'block' : 'none';
    }

    // Save image
    async function saveImage() {
        console.log('💾 Saving edited image...');

        try {
            // Export canvas as high-quality JPEG
            const dataURL = editorState.canvas.toDataURL('image/jpeg', 0.95);
            
            // Update the original image source
            if (window.currentEditorOptions && window.currentEditorOptions.onSave) {
                window.currentEditorOptions.onSave(dataURL);
            }

            // Update storage if index is provided
            if (window.currentEditorOptions && window.currentEditorOptions.index !== undefined) {
                chrome.storage.local.get(['watermarkedImages'], (result) => {
                    const watermarkedImages = result.watermarkedImages || [];
                    watermarkedImages[window.currentEditorOptions.index] = dataURL;
                    chrome.storage.local.set({ watermarkedImages });
                    console.log('✅ Updated watermarkedImages in storage');
                });
            }

            closeEditor();
            console.log('✅ Image saved successfully');
        } catch (error) {
            console.error('❌ Failed to save image:', error);
        }
    }

    // Close editor
    function closeEditor() {
        console.log('🚪 Closing image editor');
        
        if (editorState.overlay) {
            editorState.overlay.style.display = 'none';
        }
        
        editorState.isOpen = false;
        editorState.baseImage = null;
        editorState.stickers = [];
        editorState.selectedStickerIndex = -1;
        window.currentEditorOptions = null;
    }

    console.log('🎨 Image editor script loaded');
})();
