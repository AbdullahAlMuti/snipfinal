(() => {
  const STORAGE_KEY = 'watermarkedImages';
  const STICKER_KEY = 'userStickers';
  const OVERLAY_ID = 'snipe-editor-overlay';
  const CANVAS_ID = 'editor-canvas';
  const GALLERY_ID = 'sticker-gallery';
  let canvas, ctx, baseImg, currentIndex;
  const stickers = [];

  // Inject popup once
  async function ensureEditorPopup() {
    if (document.getElementById(OVERLAY_ID)) return;
    const htmlUrl = chrome.runtime.getURL('ui/editor-popup.html');
    const cssUrl = chrome.runtime.getURL('ui/editor-popup.css');
    const res = await fetch(htmlUrl);
    const html = await res.text();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = cssUrl;
    document.head.appendChild(link);
  }

  async function openImageEditor(src, index) {
    await ensureEditorPopup();
    const overlay = document.getElementById(OVERLAY_ID);
    overlay.classList.add('show');
    currentIndex = index;

    canvas = document.getElementById(CANVAS_ID);
    ctx = canvas.getContext('2d');
    baseImg = await loadImage(src);
    drawCanvas();

    overlay.addEventListener('click', e => { if (e.target.id === OVERLAY_ID) closeEditor(false); });
    document.getElementById('btn-cancel-edit').onclick = () => closeEditor(false);
    document.getElementById('btn-save-edit').onclick = saveEditedImage;
    document.getElementById('sticker-upload').onchange = handleStickerUpload;

    await loadStickers();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawCanvas() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
    stickers.forEach(s => {
      ctx.drawImage(s.img, s.x, s.y, s.w, s.h);
      if (s.selected) {
        ctx.strokeStyle = '#0073c4'; ctx.lineWidth = 2;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      }
    });
  }

  async function loadStickers() {
    const gallery = document.getElementById(GALLERY_ID);
    gallery.innerHTML = '';

    // built-ins
    const builtin = ['sale.png','new.png','hot.png','gift.png','best.png'];
    builtin.forEach(name => {
      const img = document.createElement('img');
      img.src = chrome.runtime.getURL('assets/stickers/' + name);
      img.onclick = () => addSticker(img.src);
      gallery.appendChild(img);
    });

    // saved stickers
    const { [STICKER_KEY]: saved = [] } = await chrome.storage.local.get(STICKER_KEY);
    saved.forEach((data, i) => {
      const img = document.createElement('img');
      img.src = data;
      img.onclick = () => addSticker(data);
      gallery.appendChild(img);
    });
  }

  function handleStickerUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      const { [STICKER_KEY]: arr = [] } = await chrome.storage.local.get(STICKER_KEY);
      arr.unshift(dataUrl);
      await chrome.storage.local.set({ [STICKER_KEY]: arr.slice(0, 60) });
      await loadStickers();
      addSticker(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function addSticker(src) {
    const img = await loadImage(src);
    stickers.push({ img, x: 40, y: 40, w: 200, h: 200, selected: true });
    drawCanvas();
  }

  async function saveEditedImage() {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const container = document.querySelector(`.product-image-container[data-image-index="${currentIndex}"]`);
    const img = container?.querySelector('img.product-image-1600');
    if (img) img.src = dataUrl;

    const result = await chrome.storage.local.get(STORAGE_KEY);
    const arr = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
    arr[currentIndex] = dataUrl;
    await chrome.storage.local.set({ [STORAGE_KEY]: arr });

    closeEditor(true);
  }

  function closeEditor(saved) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.classList.remove('show');
    stickers.length = 0;
    console.log(saved ? '✅ Edited image saved' : '❎ Editor closed');
  }

  window.__SNIPE_OPEN_IMAGE_EDITOR__ = openImageEditor;
})();