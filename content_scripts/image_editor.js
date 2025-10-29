(() => {
  const STORAGE_KEY = 'watermarkedImages';
  const STICKER_KEY = 'userStickers';
  const OVERLAY_ID = 'snipe-editor-overlay';
  const CANVAS_ID = 'editor-canvas';
  const GALLERY_ID = 'sticker-gallery';
  
  let canvas, ctx, baseImg, currentIndex;
  let dragging = false, resizing = false, activeSticker = null, dragOffset = { x: 0, y: 0 };
  let isInitialized = false;
  const stickers = [];
  const MAX_STICKERS = 20;

  // ─────────────────────────────────────────────
  // 🧩 Popup injection
  // ─────────────────────────────────────────────
  async function ensureEditorPopup() {
    if (document.getElementById(OVERLAY_ID)) return;
    
    try {
      const htmlUrl = chrome.runtime.getURL('ui/editor-popup.html');
      const cssUrl = chrome.runtime.getURL('ui/editor-popup.css');
      
      const [htmlRes, cssRes] = await Promise.all([
        fetch(htmlUrl),
        fetch(cssUrl)
      ]);
      
      const [html, css] = await Promise.all([
        htmlRes.text(),
        cssRes.text()
      ]);
      
      // Create overlay
      const overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.className = 'snipe-editor-overlay';
      overlay.innerHTML = html;
      
      // Add CSS
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      
      // Add to page
      document.body.appendChild(overlay);
      
      console.log('✅ Image editor popup loaded');
    } catch (error) {
      console.error('❌ Failed to load image editor popup:', error);
    }
  }

  // ─────────────────────────────────────────────
  // 🖼️ Open Editor
  // ─────────────────────────────────────────────
  async function openImageEditor(src, index) {
    try {
      console.log('🎨 Opening image editor for image', index);
      
      await ensureEditorPopup();
      const overlay = document.getElementById(OVERLAY_ID);
      if (!overlay) {
        console.error('❌ Editor overlay not found');
        return;
      }
      
      overlay.classList.add('show');
      currentIndex = index;
      
      // Initialize canvas
      canvas = document.getElementById(CANVAS_ID);
      if (!canvas) {
        console.error('❌ Canvas not found');
        return;
      }
      
      ctx = canvas.getContext('2d');
      baseImg = await loadImage(src);
      
      // Set canvas size based on image
      const maxSize = 800;
      const aspectRatio = baseImg.width / baseImg.height;
      let canvasWidth, canvasHeight;
      
      if (aspectRatio > 1) {
        canvasWidth = Math.min(maxSize, baseImg.width);
        canvasHeight = canvasWidth / aspectRatio;
      } else {
        canvasHeight = Math.min(maxSize, baseImg.height);
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = canvasWidth + 'px';
      canvas.style.height = canvasHeight + 'px';
      
      // Clear stickers for new image
      stickers.length = 0;
      activeSticker = null;
      
      drawCanvas();
      setupEventListeners();
      await loadStickers();
      
      console.log('✅ Image editor opened successfully');
    } catch (error) {
      console.error('❌ Failed to open image editor:', error);
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('✅ Image loaded:', img.width + 'x' + img.height);
        resolve(img);
      };
      img.onerror = (error) => {
        console.error('❌ Failed to load image:', error);
        reject(error);
      };
      img.src = src;
    });
  }

  // ─────────────────────────────────────────────
  // 🎨 Draw everything
  // ─────────────────────────────────────────────
  function drawCanvas() {
    if (!canvas || !ctx || !baseImg) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw base image
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
    
    // Draw stickers
    stickers.forEach((sticker, index) => {
      if (!sticker.img) return;
      
      // Draw sticker
      ctx.drawImage(sticker.img, sticker.x, sticker.y, sticker.w, sticker.h);
      
      // Draw selection border if selected
      if (sticker.selected) {
        ctx.strokeStyle = '#0073c4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(sticker.x - 2, sticker.y - 2, sticker.w + 4, sticker.h + 4);
        ctx.setLineDash([]);
        
        // Draw resize handles
        const handleSize = 8;
        ctx.fillStyle = '#0073c4';
        ctx.fillRect(sticker.x + sticker.w - handleSize/2, sticker.y + sticker.h - handleSize/2, handleSize, handleSize);
        
        // Draw delete button
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(sticker.x - handleSize/2, sticker.y - handleSize/2, handleSize, handleSize);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('×', sticker.x + handleSize/2, sticker.y + handleSize/2 + 3);
      }
    });
  }

  // ─────────────────────────────────────────────
  // 🧱 Sticker management
  // ─────────────────────────────────────────────
  async function loadStickers() {
    const gallery = document.getElementById(GALLERY_ID);
    if (!gallery) return;
    
    gallery.innerHTML = '<div class="loading">Loading stickers...</div>';
    
    try {
      // Built-in stickers
      const builtinStickers = [
        { name: 'Sale', file: 'sale.png' },
        { name: 'New', file: 'new.png' },
        { name: 'Hot', file: 'hot.png' },
        { name: 'Gift', file: 'gift.png' },
        { name: 'Best', file: 'best.png' },
        { name: 'Limited', file: 'limited.png' },
        { name: 'Free Shipping', file: 'freeshipping.png' }
      ];
      
      gallery.innerHTML = '';
      
      // Add built-in stickers
      builtinStickers.forEach(sticker => {
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL('assets/stickers/' + sticker.file);
        img.title = sticker.name;
        img.className = 'sticker-item';
        img.onclick = () => addSticker(img.src, sticker.name);
        gallery.appendChild(img);
      });
      
      // Add user stickers
      const { [STICKER_KEY]: saved = [] } = await chrome.storage.local.get(STICKER_KEY);
      saved.forEach((data, index) => {
        const img = document.createElement('img');
        img.src = data;
        img.title = `User sticker ${index + 1}`;
        img.className = 'sticker-item user-sticker';
        img.onclick = () => addSticker(data, `User ${index + 1}`);
        gallery.appendChild(img);
      });
      
      console.log('✅ Loaded', builtinStickers.length + saved.length, 'stickers');
    } catch (error) {
      console.error('❌ Failed to load stickers:', error);
      gallery.innerHTML = '<div class="error">Failed to load stickers</div>';
    }
  }

  function handleStickerUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File too large. Please select an image smaller than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result;
        const { [STICKER_KEY]: arr = [] } = await chrome.storage.local.get(STICKER_KEY);
        arr.unshift(dataUrl);
        
        // Keep only last 50 user stickers
        const trimmed = arr.slice(0, 50);
        await chrome.storage.local.set({ [STICKER_KEY]: trimmed });
        
        await loadStickers();
        addSticker(dataUrl, 'New Upload');
        
        // Reset file input
        e.target.value = '';
        
        console.log('✅ Sticker uploaded successfully');
      } catch (error) {
        console.error('❌ Failed to save sticker:', error);
        alert('Failed to save sticker');
      }
    };
    reader.readAsDataURL(file);
  }

  async function addSticker(src, name = 'Sticker') {
    if (stickers.length >= MAX_STICKERS) {
      alert(`Maximum ${MAX_STICKERS} stickers allowed`);
      return;
    }
    
    try {
      const img = await loadImage(src);
      
      // Calculate sticker size (max 20% of canvas)
      const maxSize = Math.min(canvas.width, canvas.height) * 0.2;
      const aspectRatio = img.width / img.height;
      let w, h;
      
      if (aspectRatio > 1) {
        w = Math.min(maxSize, img.width);
        h = w / aspectRatio;
      } else {
        h = Math.min(maxSize, img.height);
        w = h * aspectRatio;
      }
      
      // Position in center with some randomness
      const x = (canvas.width - w) / 2 + (Math.random() - 0.5) * 100;
      const y = (canvas.height - h) / 2 + (Math.random() - 0.5) * 100;
      
      const sticker = {
        img, x, y, w, h, selected: true, name
      };
      
      // Deselect all other stickers
      stickers.forEach(s => s.selected = false);
      
      stickers.push(sticker);
      activeSticker = sticker;
      
      drawCanvas();
      console.log('✅ Added sticker:', name);
    } catch (error) {
      console.error('❌ Failed to add sticker:', error);
      alert('Failed to add sticker');
    }
  }

  // ─────────────────────────────────────────────
  // 🖱️ Mouse interactions
  // ─────────────────────────────────────────────
  function handleMouseDown(e) {
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Check for delete button first
    if (activeSticker) {
      const deleteX = activeSticker.x - 4;
      const deleteY = activeSticker.y - 4;
      if (x > deleteX && x < deleteX + 8 && y > deleteY && y < deleteY + 8) {
        deleteSticker(activeSticker);
        return;
      }
    }
    
    // Check resize handle
    if (activeSticker) {
      const handleX = activeSticker.x + activeSticker.w - 4;
      const handleY = activeSticker.y + activeSticker.h - 4;
      if (x > handleX && y > handleY) {
        resizing = true;
        return;
      }
    }
    
    // Find clicked sticker
    const hitSticker = stickers.findLast(s =>
      x > s.x && y > s.y && x < s.x + s.w && y < s.y + s.h
    );
    
    // Deselect all stickers
    stickers.forEach(s => s.selected = false);
    
    if (hitSticker) {
      activeSticker = hitSticker;
      hitSticker.selected = true;
      dragging = true;
      dragOffset.x = x - hitSticker.x;
      dragOffset.y = y - hitSticker.y;
    } else {
      activeSticker = null;
    }
    
    drawCanvas();
  }

  function handleMouseMove(e) {
    if (!activeSticker || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (dragging) {
      activeSticker.x = Math.max(0, Math.min(canvas.width - activeSticker.w, x - dragOffset.x));
      activeSticker.y = Math.max(0, Math.min(canvas.height - activeSticker.h, y - dragOffset.y));
      drawCanvas();
    } else if (resizing) {
      const newW = Math.max(20, x - activeSticker.x);
      const newH = Math.max(20, y - activeSticker.y);
      activeSticker.w = Math.min(canvas.width - activeSticker.x, newW);
      activeSticker.h = Math.min(canvas.height - activeSticker.y, newH);
      drawCanvas();
    }
  }

  function handleMouseUp() {
    dragging = false;
    resizing = false;
  }

  function deleteSticker(sticker) {
    const index = stickers.indexOf(sticker);
    if (index > -1) {
      stickers.splice(index, 1);
      if (activeSticker === sticker) {
        activeSticker = null;
      }
      drawCanvas();
      console.log('✅ Sticker deleted');
    }
  }

  // ─────────────────────────────────────────────
  // 🎛️ Event Listeners
  // ─────────────────────────────────────────────
  function setupEventListeners() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    
    // Overlay click to close
    overlay.addEventListener('click', e => {
      if (e.target.id === OVERLAY_ID) closeEditor(false);
    });
    
    // Canvas events
    if (canvas) {
      canvas.onmousedown = handleMouseDown;
      canvas.onmousemove = handleMouseMove;
      canvas.onmouseup = handleMouseUp;
      canvas.onmouseleave = handleMouseUp;
    }
    
    // Button events
    const saveBtn = document.getElementById('btn-save-edit');
    const cancelBtn = document.getElementById('btn-cancel-edit');
    const uploadBtn = document.getElementById('sticker-upload');
    
    if (saveBtn) saveBtn.onclick = saveEditedImage;
    if (cancelBtn) cancelBtn.onclick = () => closeEditor(false);
    if (uploadBtn) uploadBtn.onchange = handleStickerUpload;
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
    
    console.log('✅ Event listeners setup complete');
  }

  function handleKeyDown(e) {
    if (!document.getElementById(OVERLAY_ID)?.classList.contains('show')) return;
    
    switch (e.key) {
      case 'Escape':
        closeEditor(false);
        break;
      case 'Delete':
      case 'Backspace':
        if (activeSticker) {
          deleteSticker(activeSticker);
        }
        break;
      case 's':
      case 'S':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          saveEditedImage();
        }
        break;
    }
  }

  // ─────────────────────────────────────────────
  // 💾 Save & Close
  // ─────────────────────────────────────────────
  async function saveEditedImage() {
    try {
      console.log('💾 Saving edited image...');
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Update the image in the UI
      const container = document.querySelector(`.product-image-container[data-image-index="${currentIndex}"]`);
      const img = container?.querySelector('img.product-image-1600');
      if (img) {
        img.src = dataUrl;
        console.log('✅ Image updated in UI');
      }
      
      // Save to storage
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const arr = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
      arr[currentIndex] = dataUrl;
      await chrome.storage.local.set({ [STORAGE_KEY]: arr });
      
      console.log('✅ Image saved to storage');
      closeEditor(true);
    } catch (error) {
      console.error('❌ Failed to save image:', error);
      alert('Failed to save image. Please try again.');
    }
  }

  function closeEditor(saved) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.classList.remove('show');
    }
    
    // Cleanup
    stickers.length = 0;
    dragging = resizing = false;
    activeSticker = null;
    document.removeEventListener('keydown', handleKeyDown);
    
    console.log(saved ? '✅ Editor closed and saved' : '❌ Editor closed without saving');
  }

  // ─────────────────────────────────────────────
  // 🚀 Initialization
  // ─────────────────────────────────────────────
  function initialize() {
    if (isInitialized) return;
    isInitialized = true;
    console.log('🎨 Image editor initialized');
  }

  // Initialize on load
  initialize();

  // Expose for external use
  window.__SNIPE_OPEN_IMAGE_EDITOR__ = openImageEditor;
  
  // Add some utility functions for debugging
  window.__SNIPE_EDITOR_DEBUG__ = {
    getStickers: () => stickers,
    getActiveSticker: () => activeSticker,
    clearStickers: () => {
      stickers.length = 0;
      activeSticker = null;
      drawCanvas();
    }
  };
})();