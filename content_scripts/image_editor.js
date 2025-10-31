(() => {
  const STORAGE_KEY = 'watermarkedImages';
  const STICKER_KEY = 'userStickers';
  const THEME_STORAGE_KEY = 'snipeEditorTheme';
  const OVERLAY_ID = 'snipe-editor-root';
  const CANVAS_ID = 'editor-canvas';
  const GALLERY_ID = 'sticker-gallery';
  
  let canvas, ctx, baseImg, currentIndex;
  let dragging = false, resizing = false, activeSticker = null, dragOffset = { x: 0, y: 0 };
  let isInitialized = false;
  const stickers = [];
  const MAX_STICKERS = 20;
  
  // Responsive & Zoom state
  let zoomLevel = 1;
  let baseCanvasWidth = 0;
  let baseCanvasHeight = 0;
  let isSidebarOpen = false;
  let resizeTimeout = null;
  
  // Touch/pinch zoom state
  let lastTouchDistance = 0;
  let initialPinchZoom = 1;

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
      
      // Create overlay from HTML
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const overlay = wrapper.firstElementChild;
      
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
      console.log('🖼️ Loading image from:', src);
      baseImg = await loadImage(src);
      console.log('✅ Image loaded successfully:', baseImg);
      
      // Reset zoom
      zoomLevel = 1;
      
      // Set canvas size based on viewport dimensions (dynamic scaling)
      const availableSpace = calculateAvailableSpace();
      const scale = Math.min(availableSpace.width / baseImg.width, availableSpace.height / baseImg.height);
      
      baseCanvasWidth = baseImg.width * scale;
      baseCanvasHeight = baseImg.height * scale;
      
      // Set canvas dimensions directly
      canvas.width = baseCanvasWidth;
      canvas.height = baseCanvasHeight;
      applyCanvasZoom();
      
      // Set high quality rendering
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'high';
      
      // Clear stickers for new image
      stickers.length = 0;
      activeSticker = null;
      
      drawCanvas();
      setupEventListeners();
      await loadStickers();
      updateCanvasSizeDisplay();
      await initTheme(); // Load saved theme
      
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
    if (!canvas || !ctx || !baseImg) {
      console.error('❌ Canvas drawing failed:', { canvas: !!canvas, ctx: !!ctx, baseImg: !!baseImg });
      return;
    }
    
    console.log('🎨 Drawing canvas:', { 
      canvasSize: `${canvas.width}x${canvas.height}`, 
      imageSize: `${baseImg.width}x${baseImg.height}`,
      stickers: stickers.length 
    });
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw base image
    try {
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
      console.log('✅ Base image drawn successfully');
    } catch (error) {
      console.error('❌ Failed to draw base image:', error);
    }
    
    // Draw stickers
    stickers.forEach((sticker, index) => {
      if (!sticker.img) return;
      
      ctx.save();
      
      // Apply opacity
      if (sticker.opacity !== undefined) {
        ctx.globalAlpha = sticker.opacity;
      }
      
      // Apply rotation
      if (sticker.rotation && sticker.rotation !== 0) {
        const centerX = sticker.x + sticker.w / 2;
        const centerY = sticker.y + sticker.h / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((sticker.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      
      // Draw sticker
      ctx.drawImage(sticker.img, sticker.x, sticker.y, sticker.w, sticker.h);
      
      ctx.restore();
      
      // Draw selection border if selected
      if (sticker.selected && !window.__SNIPE_SAVING__) {
        ctx.save();
        ctx.strokeStyle = '#00b3ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(sticker.x - 2, sticker.y - 2, sticker.w + 4, sticker.h + 4);
        ctx.setLineDash([]);

        // glow highlight
        ctx.shadowColor = 'rgba(0,179,255,0.4)';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Resize handle
        const handleSize = 8;
        ctx.fillStyle = '#00b3ff';
        ctx.fillRect(
          sticker.x + sticker.w - handleSize / 2,
          sticker.y + sticker.h - handleSize / 2,
          handleSize,
          handleSize
        );

        // Delete button
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(
          sticker.x - handleSize / 2,
          sticker.y - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('×', sticker.x + handleSize / 2, sticker.y + handleSize / 2 + 3);
        ctx.restore();
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
        img, x, y, w, h, selected: true, name,
        opacity: 1.0,
        rotation: 0
      };
      
      // Deselect all other stickers
      stickers.forEach(s => s.selected = false);
      
      stickers.push(sticker);
      activeSticker = sticker;
      
      drawCanvas();
      updateStickerCount();
      showPropertiesPanel();
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
    // Account for zoom level in coordinate calculation
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
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
      showPropertiesPanel();
    } else {
      activeSticker = null;
      hidePropertiesPanel();
    }
    
    drawCanvas();
  }

  function handleMouseMove(e) {
    if (!activeSticker || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Account for zoom level in coordinate calculation
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
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
      updateStickerCount();
      console.log('✅ Sticker deleted');
    }
  }

  function clearAllStickers() {
    if (stickers.length === 0) return;
    
    if (confirm(`Are you sure you want to remove all ${stickers.length} stickers?`)) {
      stickers.length = 0;
      activeSticker = null;
      drawCanvas();
      updateStickerCount();
      hidePropertiesPanel();
      console.log('✅ All stickers cleared');
    }
  }

  function duplicateSelectedSticker() {
    if (!activeSticker) {
      alert('Please select a sticker to duplicate');
      return;
    }
    
    if (stickers.length >= MAX_STICKERS) {
      alert(`Maximum ${MAX_STICKERS} stickers allowed`);
      return;
    }
    
    const duplicate = {
      img: activeSticker.img,
      x: activeSticker.x + 20,
      y: activeSticker.y + 20,
      w: activeSticker.w,
      h: activeSticker.h,
      selected: true,
      name: activeSticker.name + ' (Copy)',
      opacity: activeSticker.opacity || 1.0,
      rotation: activeSticker.rotation || 0
    };
    
    // Deselect all stickers
    stickers.forEach(s => s.selected = false);
    
    stickers.push(duplicate);
    activeSticker = duplicate;
    
    drawCanvas();
    updateStickerCount();
    console.log('✅ Sticker duplicated');
  }

  function handleSizeChange(e) {
    if (!activeSticker) return;
    
    const scale = e.target.value / 100;
    const originalSize = Math.min(baseImg.width, baseImg.height) * 0.2;
    const newSize = originalSize * scale;
    
    const aspectRatio = activeSticker.img.width / activeSticker.img.height;
    if (aspectRatio > 1) {
      activeSticker.w = newSize;
      activeSticker.h = newSize / aspectRatio;
    } else {
      activeSticker.h = newSize;
      activeSticker.w = newSize * aspectRatio;
    }
    
    drawCanvas();
    updateSizeValue(scale);
  }

  function handleOpacityChange(e) {
    if (!activeSticker) return;
    
    const opacity = e.target.value / 100;
    activeSticker.opacity = opacity;
    
    drawCanvas();
    updateOpacityValue(opacity);
  }

  function handleRotationChange(e) {
    if (!activeSticker) return;
    
    const rotation = e.target.value;
    activeSticker.rotation = rotation;
    
    drawCanvas();
    updateRotationValue(rotation);
  }

  function updateStickerCount() {
    const countElement = document.getElementById('sticker-count');
    if (countElement) {
      countElement.textContent = `${stickers.length} stickers`;
    }
  }

  function updateSizeValue(scale) {
    const sizeValue = document.getElementById('size-value');
    if (sizeValue) {
      sizeValue.textContent = Math.round(scale * 100) + '%';
    }
  }

  function updateOpacityValue(opacity) {
    const opacityValue = document.getElementById('opacity-value');
    if (opacityValue) {
      opacityValue.textContent = Math.round(opacity * 100) + '%';
    }
  }

  function updateRotationValue(rotation) {
    const rotationValue = document.getElementById('rotation-value');
    if (rotationValue) {
      rotationValue.textContent = rotation + '°';
    }
  }
  
  function updateCanvasSizeDisplay() {
    const canvasSizeElement = document.getElementById('canvas-size');
    if (canvasSizeElement && baseImg) {
      canvasSizeElement.textContent = `${Math.round(baseCanvasWidth)} × ${Math.round(baseCanvasHeight)}`;
    }
  }

  function showPropertiesPanel() {
    const propertiesPanel = document.getElementById('sticker-properties');
    if (propertiesPanel && activeSticker) {
      propertiesPanel.style.display = 'block';
      
      // Update sliders to match current sticker values
      const sizeSlider = document.getElementById('size-slider');
      const opacitySlider = document.getElementById('opacity-slider');
      const rotationSlider = document.getElementById('rotation-slider');
      
      if (sizeSlider) {
        const originalSize = Math.min(baseImg.width, baseImg.height) * 0.2;
        const currentSize = Math.max(activeSticker.w, activeSticker.h);
        const scale = Math.round((currentSize / originalSize) * 100);
        sizeSlider.value = Math.max(10, Math.min(200, scale));
        updateSizeValue(scale / 100);
      }
      
      if (opacitySlider) {
        opacitySlider.value = Math.round((activeSticker.opacity || 1) * 100);
        updateOpacityValue(activeSticker.opacity || 1);
      }
      
      if (rotationSlider) {
        rotationSlider.value = activeSticker.rotation || 0;
        updateRotationValue(activeSticker.rotation || 0);
      }
    }
  }

  function hidePropertiesPanel() {
    const propertiesPanel = document.getElementById('sticker-properties');
    if (propertiesPanel) {
      propertiesPanel.style.display = 'none';
    }
  }

  // ─────────────────────────────────────────────
  // 📐 Responsive & Viewport Calculations
  // ─────────────────────────────────────────────
  function calculateAvailableSpace() {
    const isMobile = window.innerWidth <= 1024;
    const sidebarWidth = isMobile ? 0 : 280; // Sidebar hidden on mobile or overlay
    const headerHeight = 56;
    const footerHeight = 56;
    const padding = 20;
    
    return {
      width: (window.innerWidth - sidebarWidth - padding * 2) * 0.9,
      height: (window.innerHeight - headerHeight - footerHeight - padding * 2) * 0.9
    };
  }
  
  function applyCanvasZoom() {
    if (!canvas) return;
    canvas.style.width = (baseCanvasWidth * zoomLevel) + 'px';
    canvas.style.height = (baseCanvasHeight * zoomLevel) + 'px';
    updateZoomDisplay();
  }
  
  function updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoom-level');
    const zoomOverlay = document.getElementById('zoom-level-overlay');
    const zoomText = Math.round(zoomLevel * 100) + '%';
    
    if (zoomDisplay) zoomDisplay.textContent = zoomText;
    if (zoomOverlay) zoomOverlay.textContent = zoomText;
  }
  
  // ─────────────────────────────────────────────
  // 🔍 Zoom Functions
  // ─────────────────────────────────────────────
  function zoomIn() {
    if (zoomLevel >= 4) return; // Max 400%
    zoomLevel = Math.min(4, zoomLevel + 0.25);
    applyCanvasZoom();
  }
  
  function zoomOut() {
    if (zoomLevel <= 0.25) return; // Min 25%
    zoomLevel = Math.max(0.25, zoomLevel - 0.25);
    applyCanvasZoom();
  }
  
  function resetZoom() {
    zoomLevel = 1;
    applyCanvasZoom();
    
    // Scroll canvas to center if needed
    const container = canvas?.parentElement;
    if (container) {
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
    }
  }
  
  // ─────────────────────────────────────────────
  // 📱 Sidebar Toggle (Responsive)
  // ─────────────────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('editor-side');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    if (!sidebar) return;
    
    isSidebarOpen = !isSidebarOpen;
    
    if (window.innerWidth <= 1024) {
      // Mobile: toggle sidebar overlay
      sidebar.classList.toggle('active', isSidebarOpen);
      if (overlay) {
        overlay.classList.toggle('active', isSidebarOpen);
        overlay.setAttribute('aria-hidden', !isSidebarOpen);
      }
    }
    
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', isSidebarOpen);
    }
  }
  
  function closeSidebar() {
    if (!isSidebarOpen) return;
    isSidebarOpen = false;
    
    const sidebar = document.getElementById('editor-side');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
  }
  
  // ─────────────────────────────────────────────
  // 🔄 Window Resize Handler
  // ─────────────────────────────────────────────
  function handleWindowResize() {
    // Debounce resize handler
    if (resizeTimeout) clearTimeout(resizeTimeout);
    
    resizeTimeout = setTimeout(() => {
      if (!baseImg || !canvas) return;
      
      // Close sidebar on mobile when window gets larger
      if (window.innerWidth > 1024 && isSidebarOpen) {
        closeSidebar();
      }
      
      // Recalculate canvas size
      const availableSpace = calculateAvailableSpace();
      const scale = Math.min(availableSpace.width / baseImg.width, availableSpace.height / baseImg.height);
      
      baseCanvasWidth = baseImg.width * scale;
      baseCanvasHeight = baseImg.height * scale;
      
      // Maintain zoom level, but adjust base size
      canvas.width = baseCanvasWidth;
      canvas.height = baseCanvasHeight;
      applyCanvasZoom();
      drawCanvas();
      updateCanvasSizeDisplay();
      
      console.log('🔄 Canvas resized:', { width: baseCanvasWidth, height: baseCanvasHeight, zoom: zoomLevel });
    }, 250);
  }
  
  // ─────────────────────────────────────────────
  // 👆 Touch/Pinch Zoom Support
  // ─────────────────────────────────────────────
  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouchDistance = getTouchDistance(e.touches);
      initialPinchZoom = zoomLevel;
    }
  }
  
  function handleTouchMove(e) {
    if (e.touches.length === 2 && lastTouchDistance > 0) {
      e.preventDefault();
      
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / lastTouchDistance;
      const newZoom = initialPinchZoom * scale;
      
      // Constrain zoom
      zoomLevel = Math.max(0.25, Math.min(4, newZoom));
      applyCanvasZoom();
    }
  }
  
  function handleTouchEnd(e) {
    if (e.touches.length < 2) {
      lastTouchDistance = 0;
      initialPinchZoom = zoomLevel;
    }
  }
  
  // ─────────────────────────────────────────────
  // 🎛️ Event Listeners
  // ─────────────────────────────────────────────
  function setupEventListeners() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    
    // Overlay click to close (but not if clicking inside editor shell)
    overlay.addEventListener('click', e => {
      if (e.target.id === OVERLAY_ID) {
        closeEditor(false);
      }
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (sidebarToggle) sidebarToggle.onclick = toggleSidebar;
    if (sidebarClose) sidebarClose.onclick = closeSidebar;
    if (sidebarOverlay) {
      sidebarOverlay.onclick = (e) => {
        if (e.target === sidebarOverlay) closeSidebar();
      };
    }
    
    // Canvas events (mouse)
    if (canvas) {
      canvas.onmousedown = handleMouseDown;
      canvas.onmousemove = handleMouseMove;
      canvas.onmouseup = handleMouseUp;
      canvas.onmouseleave = handleMouseUp;
      
      // Touch events for pinch zoom and touch interactions
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('btn-theme-toggle');
    if (themeToggle) themeToggle.onclick = toggleTheme;
    
    // AI Enhance buttons
    const autoEnhanceBtn = document.getElementById('btn-auto-enhance');
    const cleanBgBtn = document.getElementById('btn-clean-bg');
    
    if (autoEnhanceBtn) autoEnhanceBtn.onclick = applyAutoEnhance;
    if (cleanBgBtn) cleanBgBtn.onclick = cleanBackgroundAndAddShadow;
    
    // Zoom controls
    const zoomInBtn = document.getElementById('btn-zoom-in');
    const zoomOutBtn = document.getElementById('btn-zoom-out');
    const resetBtn = document.getElementById('btn-reset');
    
    if (zoomInBtn) zoomInBtn.onclick = zoomIn;
    if (zoomOutBtn) zoomOutBtn.onclick = zoomOut;
    if (resetBtn) resetBtn.onclick = resetZoom;
    
    // Button events
    const saveBtn = document.getElementById('btn-save-edit');
    const cancelBtn = document.getElementById('btn-cancel-edit');
    const uploadBtn = document.getElementById('sticker-upload');
    const clearAllBtn = document.getElementById('btn-clear-all');
    const duplicateBtn = document.getElementById('btn-duplicate');
    
    if (saveBtn) saveBtn.onclick = saveEditedImage;
    if (cancelBtn) cancelBtn.onclick = () => closeEditor(false);
    if (uploadBtn) uploadBtn.onchange = handleStickerUpload;
    if (clearAllBtn) clearAllBtn.onclick = clearAllStickers;
    if (duplicateBtn) duplicateBtn.onclick = duplicateSelectedSticker;
    
    // Property controls
    const sizeSlider = document.getElementById('size-slider');
    const opacitySlider = document.getElementById('opacity-slider');
    const rotationSlider = document.getElementById('rotation-slider');
    
    if (sizeSlider) sizeSlider.oninput = handleSizeChange;
    if (opacitySlider) opacitySlider.oninput = handleOpacityChange;
    if (rotationSlider) rotationSlider.oninput = handleRotationChange;
    
    // Window resize handler
    window.addEventListener('resize', handleWindowResize);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
    
    // Close sidebar on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isSidebarOpen && window.innerWidth <= 1024) {
        closeSidebar();
      }
    });
    
    console.log('✅ Event listeners setup complete');
  }

  function handleKeyDown(e) {
    if (!document.getElementById(OVERLAY_ID)?.classList.contains('show')) return;
    
    // Keyboard shortcuts with Ctrl/Cmd
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'e':
          e.preventDefault();
          applyAutoEnhance();
          break;
        case 'b':
          e.preventDefault();
          cleanBackgroundAndAddShadow();
          break;
        case 's':
          e.preventDefault();
          saveEditedImage();
          break;
      }
      return;
    }
    
    // Other keyboard shortcuts
    switch (e.key) {
      case 'Escape':
        if (isSidebarOpen && window.innerWidth <= 1024) {
          closeSidebar();
        } else {
          closeEditor(false);
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (activeSticker) {
          deleteSticker(activeSticker);
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
      window.__SNIPE_SAVING__ = true;
      drawCanvas();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      window.__SNIPE_SAVING__ = false;
      
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
    isSidebarOpen = false;
    zoomLevel = 1;
    
    // Remove event listeners
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleWindowResize);
    
    // Close sidebar if open
    closeSidebar();
    
    console.log(saved ? '✅ Editor closed and saved' : '❌ Editor closed without saving');
  }

  // ─────────────────────────────────────────────
  // 🌗 Theme System
  // ─────────────────────────────────────────────
  async function initTheme() {
    try {
      const result = await chrome.storage.local.get(THEME_STORAGE_KEY);
      const savedTheme = result[THEME_STORAGE_KEY] || 'light';
      applyTheme(savedTheme);
    } catch (error) {
      console.error('❌ Failed to load theme:', error);
      applyTheme('light'); // Default to light
    }
  }
  
  function applyTheme(theme) {
    const shell = document.querySelector('.editor-shell');
    const themeIcon = document.getElementById('theme-icon');
    
    if (!shell) return;
    
    if (theme === 'dark') {
      shell.classList.remove('light-theme');
      shell.classList.add('dark-theme');
      if (themeIcon) themeIcon.textContent = '☀️';
    } else {
      shell.classList.remove('dark-theme');
      shell.classList.add('light-theme');
      if (themeIcon) themeIcon.textContent = '🌙';
    }
  }
  
  async function toggleTheme() {
    const shell = document.querySelector('.editor-shell');
    if (!shell) return;
    
    const isDark = shell.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    
    applyTheme(newTheme);
    
    try {
      await chrome.storage.local.set({ [THEME_STORAGE_KEY]: newTheme });
      console.log('✅ Theme saved:', newTheme);
    } catch (error) {
      console.error('❌ Failed to save theme:', error);
    }
  }
  
  // ─────────────────────────────────────────────
  // ✨ Toast Notifications
  // ─────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
  
  // ─────────────────────────────────────────────
  // ✨ AI Auto Enhance
  // ─────────────────────────────────────────────
  function applyAutoEnhance() {
    if (!canvas || !ctx || !baseImg) {
      showToast('No image loaded', 'error');
      return;
    }
    
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('active');
      loadingOverlay.querySelector('.loading-text').textContent = 'Enhancing...';
    }
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        // Get image data
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Process pixels: increase brightness and contrast
        for (let i = 0; i < data.length; i += 4) {
          // Brightness boost (5% increase)
          data[i] = Math.min(255, data[i] * 1.05);     // R
          data[i + 1] = Math.min(255, data[i + 1] * 1.05); // G
          data[i + 2] = Math.min(255, data[i + 2] * 1.05); // B
          
          // Subtle contrast enhancement
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Apply contrast factor (1.02 = 2% increase)
          data[i] = Math.min(255, Math.max(0, (r - 128) * 1.02 + 128));
          data[i + 1] = Math.min(255, Math.max(0, (g - 128) * 1.02 + 128));
          data[i + 2] = Math.min(255, Math.max(0, (b - 128) * 1.02 + 128));
        }
        
        // Put processed image data back
        ctx.putImageData(imgData, 0, 0);
        
        // Redraw stickers on top
        drawCanvas();
        
        if (loadingOverlay) {
          loadingOverlay.classList.remove('active');
        }
        
        showToast('Image enhanced successfully!', 'success');
        console.log('✅ Auto enhance applied');
      } catch (error) {
        console.error('❌ Auto enhance failed:', error);
        if (loadingOverlay) {
          loadingOverlay.classList.remove('active');
        }
        showToast('Failed to enhance image', 'error');
      }
    }, 100);
  }
  
  // ─────────────────────────────────────────────
  // 🧹 Background Cleaner & Shadow
  // ─────────────────────────────────────────────
  async function cleanBackgroundAndAddShadow() {
    if (!canvas || !ctx || !baseImg) {
      showToast('No image loaded', 'error');
      return;
    }
    
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('active');
      loadingOverlay.querySelector('.loading-text').textContent = 'Cleaning background...';
    }
    
    setTimeout(async () => {
      try {
        // Get image data
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Clean near-white/gray backgrounds
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const avg = (r + g + b) / 3;
          
          // If pixel is near white/gray (brightness > 230), make it pure white
          if (avg > 230) {
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
          }
        }
        
        // Put cleaned image data back to canvas
        ctx.putImageData(imgData, 0, 0);
        
        // Update baseImg to reflect cleaned background for future operations
        // Create a temporary canvas to store the cleaned image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imgData, 0, 0);
        
        // Create new Image object from cleaned canvas
        const cleanedImg = new Image();
        cleanedImg.src = tempCanvas.toDataURL();
        await new Promise((resolve) => {
          cleanedImg.onload = resolve;
        });
        
        // Update baseImg reference
        baseImg = cleanedImg;
        
        // Redraw canvas with cleaned background and stickers
        drawCanvas();
        
        if (loadingOverlay) {
          loadingOverlay.classList.remove('active');
        }
        
        showToast('Background cleaned and shadow added!', 'success');
        console.log('✅ Background cleaned and shadow applied');
      } catch (error) {
        console.error('❌ Background cleaning failed:', error);
        if (loadingOverlay) {
          loadingOverlay.classList.remove('active');
        }
        showToast('Failed to clean background', 'error');
      }
    }, 100);
  }
  
  // ─────────────────────────────────────────────
  // 🚀 Initialization
  // ─────────────────────────────────────────────
  function initialize() {
    if (isInitialized) return;
    isInitialized = true;
    initTheme();
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