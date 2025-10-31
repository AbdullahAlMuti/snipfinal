// ebay-snipping-extension/content_scripts/amazon_injector.js

let uiInjected = false;

// **IMPROVED** Function to inject the main UI panel
const injectUI = async () => {
    if (uiInjected) return;

    // Prevent duplicate injection
    if (document.getElementById('snipe-root-wrapper')) return;

    const response = await fetch(chrome.runtime.getURL('ui/panel.html'));
    const uiHtml = await response.text();

    const wrapper = document.createElement('div');
    wrapper.id = 'snipe-root-wrapper';
    wrapper.innerHTML = uiHtml;

    // Inject the panel as the very first element inside the body tag
    document.body.prepend(wrapper);
    uiInjected = true;
    
    // --- Post-injection logic ---
    scrapeAndDisplayInitialTitle();
    scrapeAndDisplayImages();
    addEventListenersToPanel();
    addCalculatorEventListeners();
    
    // Auto-click Snipe Title button
    setTimeout(() => {
        const snipeTitleBtn = document.getElementById('snipe-title-btn');
        if (snipeTitleBtn) {
            snipeTitleBtn.click();
        }
    }, 500); // Small delay to ensure everything is loaded
    
    // Auto-calculate price when panel loads
    setTimeout(() => {
        console.log('🔄 Auto-calculating price on panel load...');
        quickCalculate();
    }, 1500); // Wait for panel to be fully ready
};

// Enhanced product details scraping function
const scrapeProductDetails = () => {
    const details = {
        brand: '',
        model: '',
        color: '',
        dimensions: '',
        height: '',
        weight: '',
        description: ''
    };

    // --- Scrape Item Specifics from Amazon Product Details ---
    // Target the main product details section
    const detailBullets = document.querySelector('#detailBullets_feature_div ul, #detail-bullets_feature_div ul');
    if (detailBullets) {
        const listItems = detailBullets.querySelectorAll('li');
        listItems.forEach(item => {
            const labelElement = item.querySelector('.a-text-bold');
            const valueElement = item.querySelector('span:not(.a-text-bold)');
            
            if (labelElement && valueElement) {
                const label = labelElement.innerText.trim().toLowerCase();
                const value = valueElement.innerText.trim();

                // Map Amazon fields to our details
                if (label.includes('product dimensions')) {
                    details.dimensions = value;
                } else if (label.includes('item model number')) {
                    details.model = value;
                } else if (label.includes('manufacturer')) {
                    details.brand = value;
                } else if (label.includes('color')) {
                    details.color = value;
                } else if (label.includes('weight')) {
                    details.weight = value;
                } else if (label.includes('height')) {
                    details.height = value;
                }
            }
        });
    }

    // --- Also check technical specifications tables ---
    const techSpecTables = document.querySelectorAll('table[id*="productDetails"], #productDetails_techSpec_section_1, #productDetails_techSpec_section_2');
    techSpecTables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const labelElement = row.querySelector('th, .a-text-bold');
            const valueElement = row.querySelector('td, span:not(.a-text-bold)');
            
            if (labelElement && valueElement) {
                const label = labelElement.innerText.trim().toLowerCase();
                const value = valueElement.innerText.trim();

                if (label.includes('brand') || label.includes('manufacturer')) {
                    if (!details.brand) details.brand = value;
                } else if (label.includes('model')) {
                    if (!details.model) details.model = value;
                } else if (label.includes('color')) {
                    if (!details.color) details.color = value;
                } else if (label.includes('dimension')) {
                    if (!details.dimensions) details.dimensions = value;
                } else if (label.includes('weight')) {
                    if (!details.weight) details.weight = value;
                } else if (label.includes('height')) {
                    if (!details.height) details.height = value;
                }
            }
        });
    });

    // --- Additional scraping from product title and other sources ---
    const productTitle = document.querySelector('#productTitle');
    if (productTitle) {
        const titleText = productTitle.innerText.trim();
        // Extract brand from title (usually first word)
        if (!details.brand) {
            const brandMatch = titleText.match(/^([A-Za-z\s]+?)(?:\s|$)/);
            if (brandMatch) {
                details.brand = brandMatch[1].trim();
            }
        }
    }

    // --- Scrape from additional sections ---
    const additionalSections = document.querySelectorAll('[data-feature-name*="dimension"], [data-feature-name*="weight"], [data-feature-name*="color"]');
    additionalSections.forEach(section => {
        const label = section.getAttribute('data-feature-name')?.toLowerCase() || '';
        const value = section.innerText.trim();
        
        if (label.includes('dimension')) details.dimensions = value;
        else if (label.includes('weight')) details.weight = value;
        else if (label.includes('color')) details.color = value;
    });

    // --- Scrape Product Description ---
    const descriptionElement = document.querySelector('#productDescription');
    if (descriptionElement) {
        details.description = descriptionElement.innerText.trim();
    }
    
    return details;
};

// Product Details Popup Management
let productDetailsPopup = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

const createProductDetailsPopup = () => {
    if (productDetailsPopup) return;

    // Create popup container
    productDetailsPopup = document.createElement('div');
    productDetailsPopup.id = 'product-details-popup';
    productDetailsPopup.className = 'product-details-popup';
    
    // Load popup HTML
    fetch(chrome.runtime.getURL('ui/product-details-popup.html'))
        .then(response => response.text())
        .then(html => {
            productDetailsPopup.innerHTML = html;
            document.body.appendChild(productDetailsPopup);
            
            // Load CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('ui/product-details-popup.css');
            document.head.appendChild(link);
            
            // Add event listeners
            addProductDetailsEventListeners();
            
            // Initial data load
            updateProductDetails();
        });
};

const addProductDetailsEventListeners = () => {
    if (!productDetailsPopup) return;

    // Close button
    const closeBtn = productDetailsPopup.querySelector('#close-popup-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            productDetailsPopup.remove();
            productDetailsPopup = null;
        });
    }

    // Refresh button
    const refreshBtn = productDetailsPopup.querySelector('#refresh-details-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', updateProductDetails);
    }

    // Copy all button
    const copyAllBtn = productDetailsPopup.querySelector('#copy-all-btn');
    if (copyAllBtn) {
        copyAllBtn.addEventListener('click', copyAllDetails);
    }

    // Individual copy buttons
    const copyBtns = productDetailsPopup.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const field = e.target.getAttribute('data-field');
            copyDetail(field);
        });
    });

    // Dragging functionality
    const header = productDetailsPopup.querySelector('.popup-header');
    if (header) {
        header.addEventListener('mousedown', startDragging);
    }

    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', stopDragging);
};

const startDragging = (e) => {
    isDragging = true;
    productDetailsPopup.classList.add('dragging');
    
    const rect = productDetailsPopup.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    e.preventDefault();
};

const handleDragging = (e) => {
    if (!isDragging || !productDetailsPopup) return;
    
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    // Keep popup within viewport
    const maxX = window.innerWidth - productDetailsPopup.offsetWidth;
    const maxY = window.innerHeight - productDetailsPopup.offsetHeight;
    
    productDetailsPopup.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    productDetailsPopup.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    productDetailsPopup.style.right = 'auto';
};

const stopDragging = () => {
    if (isDragging) {
        isDragging = false;
        if (productDetailsPopup) {
            productDetailsPopup.classList.remove('dragging');
        }
    }
};

const updateProductDetails = () => {
    if (!productDetailsPopup) return;

    const details = scrapeProductDetails();
    
    // Update each field
    Object.keys(details).forEach(field => {
        const valueElement = productDetailsPopup.querySelector(`#${field}-value`);
        if (valueElement) {
            const oldValue = valueElement.textContent;
            const newValue = details[field] || 'Not found';
            
            valueElement.textContent = newValue;
            
            // Add highlight animation if value changed
            if (oldValue !== newValue && newValue !== 'Not found') {
                valueElement.classList.add('updated');
                setTimeout(() => {
                    valueElement.classList.remove('updated');
                }, 600);
            }
        }
    });
};

const copyDetail = (field) => {
    if (!productDetailsPopup) return;
    
    const valueElement = productDetailsPopup.querySelector(`#${field}-value`);
    if (!valueElement) return;
    
    const value = valueElement.textContent;
    if (value === 'Not found') return;
    
    // Copy to clipboard
    navigator.clipboard.writeText(value).then(() => {
        // Show feedback
        const copyBtn = productDetailsPopup.querySelector(`[data-field="${field}"]`);
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
};

const copyAllDetails = () => {
    if (!productDetailsPopup) return;
    
    const details = {};
    const fields = ['brand', 'model', 'color', 'dimensions', 'height', 'weight'];
    
    fields.forEach(field => {
        const valueElement = productDetailsPopup.querySelector(`#${field}-value`);
        if (valueElement) {
            const value = valueElement.textContent;
            if (value !== 'Not found') {
                details[field] = value;
            }
        }
    });
    
    const text = Object.entries(details)
        .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
        .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
        const copyAllBtn = productDetailsPopup.querySelector('#copy-all-btn');
        if (copyAllBtn) {
            const originalText = copyAllBtn.textContent;
            copyAllBtn.textContent = '✓ Copied!';
            copyAllBtn.classList.add('copied');
            
            setTimeout(() => {
                copyAllBtn.textContent = originalText;
                copyAllBtn.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy all details:', err);
    });
};

// Comprehensive Amazon image extractor with advanced anti-bot measures
class AmazonImageExtractor {
    constructor() {
        this.images = new Set();
        this.highQualityImages = [];
        this.attempts = 0;
        this.maxAttempts = 3;
    }

    // Main extraction algorithm with multiple approaches
    async extractAllImages() {
        
        // Reset collections
        this.images.clear();
        this.highQualityImages = [];
        
        // Wait for page to fully load
        await this.waitForPageLoad();
        
        // Try multiple extraction approaches
        const approaches = [
            { name: 'Standard DOM', method: () => this.extractFromDOM() },
            { name: 'JSON Data', method: () => this.extractFromJSONData() },
            { name: 'Comprehensive', method: () => this.extractComprehensive() },
            { name: 'Fallback', method: () => this.extractFallback() }
        ];

        for (let i = 0; i < approaches.length; i++) {
            const approach = approaches[i];
            
            try {
                await approach.method();
                // If we found images, break early
                if (this.images.size > 0) {
                    break;
                }
            } catch (error) {
                console.warn(`❌ ${approach.name} failed:`, error);
            }
        }
        
        // Transform to high resolution
        this.transformToHighRes();
        
        // Validate and filter
        await this.validateImageQuality();
        
        return this.highQualityImages;
    }

    // Wait for page to fully load
    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    // Extract images from DOM elements (standard approach)
    async extractFromDOM() {
        console.log('🔍 Extracting from DOM elements...');
        
        const selectors = [
            '#landingImage',
            '#imgTagWrapperId img',
            '#main-image-container img',
            '.a-dynamic-image',
            '#imgBlkFront',
            '#imageBlock img',
            '.product-image img',
            '#dp-container img',
            '#altImages img',
            '#altImages li img',
            '.a-button-text img',
            '.a-carousel-item img',
            '.a-button-thumbnail img',
            '.image-thumbnail img',
            '.a-button-input img'
        ];

        selectors.forEach(selector => {
            const images = document.querySelectorAll(selector);
            console.log(`Checking selector "${selector}": found ${images.length} images`);
            
            images.forEach(img => {
                const sources = [
                    img.src,
                    img.dataset.oldHires,
                    img.dataset.aDynamicImage,
                    img.dataset.src,
                    img.getAttribute('data-src')
                ];
                
                sources.forEach(url => {
                    if (url && this.isValidImageUrl(url)) {
                        this.images.add(url);
                        console.log(`Found DOM image: ${url}`);
                    }
                });
            });
        });
    }

    // Extract images from JSON data in page
    async extractFromJSONData() {
        console.log('🔍 Extracting from JSON data...');
        
        // Look for JSON data in script tags
        const scriptTags = document.querySelectorAll('script[type="application/json"], script:not([src])');
        
        scriptTags.forEach(script => {
            try {
                const content = script.textContent || script.innerHTML;
                if (content && content.includes('amazon') && content.includes('images')) {
                    // Extract image URLs using regex patterns
                    const patterns = [
                        /"hiRes":"([^"]+)"/g,
                        /"large":"([^"]+)"/g,
                        /"mainImage":"([^"]+)"/g,
                        /"displayImage":"([^"]+)"/g,
                        /"mainUrl":"([^"]+)"/g,
                        /"thumb":"([^"]+)"/g,
                        /"thumbnail":"([^"]+)"/g,
                        /"gallery":"([^"]+)"/g,
                        /"data-a-dynamic-image":"([^"]+)"/g
                    ];

                    patterns.forEach(pattern => {
                        let match;
                        while ((match = pattern.exec(content)) !== null) {
                            let imageUrl = match[1];
                            
                            // Handle escaped URLs
                            imageUrl = imageUrl.replace(/\\u002F/g, '/').replace(/\\/g, '').replace(/&amp;/g, '&');
                            
                            if (this.isValidImageUrl(imageUrl)) {
                                this.images.add(imageUrl);
                                console.log(`Found JSON image: ${imageUrl}`);
                            }
                        }
                    });
                }
            } catch (error) {
                console.warn('Error parsing script content:', error);
            }
        });
    }

    // Comprehensive extraction using multiple methods
    async extractComprehensive() {
        console.log('🔍 Comprehensive extraction...');
        
        // Extract from data attributes with JSON parsing
        const additionalImages = document.querySelectorAll('img[data-old-hires], img[data-a-dynamic-image]');
        additionalImages.forEach(img => {
            if (img.dataset.oldHires) {
                this.images.add(img.dataset.oldHires);
                console.log(`Found data-old-hires: ${img.dataset.oldHires}`);
            }
            if (img.dataset.aDynamicImage) {
                try {
                    const imageData = JSON.parse(img.dataset.aDynamicImage);
                    for (const [url, dimensions] of Object.entries(imageData)) {
                        if (url && this.isValidImageUrl(url)) {
                            this.images.add(url);
                            console.log(`Found dynamic image: ${url}`);
                        }
                    }
                } catch (e) {
                    console.warn('Error parsing data-a-dynamic-image JSON:', e);
                }
            }
        });

        // Extract from review images
        const reviewSelectors = [
            '#reviewsMedley img',
            '.a-section img',
            '.cr-lightbox-image-thumbnail img'
        ];

        reviewSelectors.forEach(selector => {
            const images = document.querySelectorAll(selector);
            images.forEach(img => {
                if (img.src && this.isValidImageUrl(img.src) && img.src.includes('amazon')) {
                    this.images.add(img.src);
                    console.log(`Found review image: ${img.src}`);
                }
            });
        });
    }

    // Fallback extraction method
    async extractFallback() {
        console.log('🔍 Fallback extraction...');
        
        // Get all images on the page and filter for Amazon product images
        const allImages = document.querySelectorAll('img');
        console.log(`Found ${allImages.length} total images on page`);
        
        allImages.forEach((img, index) => {
            try {
                // Check if this looks like a product image
                const isProductImage = img.closest('#altImages') || 
                                     img.closest('#imageBlock') || 
                                     img.closest('.product-image') ||
                                     img.closest('.image-gallery') ||
                                     img.closest('#dp-container') ||
                                     img.src.includes('amazon') ||
                                     img.alt.toLowerCase().includes('product') ||
                                     img.alt.toLowerCase().includes('image');
                
                if (isProductImage) {
                    const sources = [
                        img.src,
                        img.dataset.oldHires,
                        img.dataset.aDynamicImage,
                        img.dataset.src,
                        img.getAttribute('data-src')
                    ];
                    
                    sources.forEach(url => {
                        if (url && this.isValidImageUrl(url)) {
                            this.images.add(url);
                            console.log(`Fallback found image: ${url}`);
                        }
                    });
                }
            } catch (e) {
                console.warn(`Error processing fallback image ${index}:`, e);
            }
        });
    }


    // Transform URLs to high resolution using comprehensive algorithm
    transformToHighRes() {
        const originalUrls = Array.from(this.images);
        this.images.clear(); // Clear and rebuild with high-res URLs
        
        originalUrls.forEach(url => {
            const highResUrl = this.getHighResUrl(url);
            this.images.add(highResUrl);
            console.log(`Transformed: ${url} -> ${highResUrl}`);
        });
    }

    // Get high-resolution URL using comprehensive algorithm
    getHighResUrl(originalUrl) {
        if (!originalUrl) return originalUrl;
        
        let highResUrl = originalUrl;
        
        // Try to get highest resolution version using comprehensive patterns
        if (highResUrl.includes('._')) {
            // Extract base URL and extension
            const baseUrl = highResUrl.split('._')[0];
            const extension = highResUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.jpg';
            highResUrl = `${baseUrl}${extension}`;
        }
        
        // Amazon image URL transformations for high resolution
        const transformations = [
            // Replace size indicators with high resolution
            { pattern: /\._[A-Z0-9]+_\./g, replacement: '_AC_SL1500_.' },
            { pattern: /_AC_SX90_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SX300_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SX500_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SX1000_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SY90_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SY300_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SY500_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_SY1000_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_US\d+_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_U\d+_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_UL\d+_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_UX\d+_/g, replacement: '_AC_SL1500_' },
            { pattern: /_AC_UY\d+_/g, replacement: '_AC_SL1500_' }
        ];

        transformations.forEach(transform => {
            highResUrl = highResUrl.replace(transform.pattern, transform.replacement);
        });

        return highResUrl;
    }

    // Validate image quality using comprehensive algorithm
    async validateImageQuality() {
        const imageUrls = Array.from(this.images);
        console.log(`Validating ${imageUrls.length} images for quality...`);
        
        // Remove duplicates and limit results (like the server algorithm)
        const uniqueUrls = [...new Set(imageUrls)].slice(0, 20);
        console.log(`Processing ${uniqueUrls.length} unique images (limited to 20)`);
        
        for (const url of uniqueUrls) {
            try {
                let isHighQuality = false;
                let contentType = 'image/jpeg'; // Default for Amazon images
                let contentLength = 'Unknown';
                
                // First, check URL patterns for high-res indicators
                if (this.isHighResUrl(url)) {
                    isHighQuality = true;
                    console.log(`✅ URL pattern indicates high-res: ${url}`);
                } else {
                    // Try HEAD request as fallback
                    try {
                        const response = await fetch(url, { method: 'HEAD' });
                        contentLength = response.headers.get('content-length');
                        contentType = response.headers.get('content-type');
                        
                        // Check if image is high quality (larger than 50KB)
                        isHighQuality = contentLength && parseInt(contentLength) > 50000;
                        
                        if (isHighQuality) {
                            console.log(`✅ HEAD request confirms high-res: ${url} (${contentLength} bytes)`);
                        }
                    } catch (headError) {
                        console.log(`HEAD request failed for ${url}, using URL pattern validation`);
                        // Use URL pattern as fallback
                        isHighQuality = this.isHighResUrl(url);
                    }
                }
                
                const isImage = contentType && contentType.startsWith('image/');
                
                if (isHighQuality && isImage) {
                    this.highQualityImages.push({
                        url: url,
                        size: contentLength,
                        type: contentType,
                        alt: this.getImageAlt(url)
                    });
                    console.log(`✅ Added high-quality image: ${url}`);
                } else {
                    console.log(`❌ Rejected image: ${url} (quality: ${isHighQuality}, isImage: ${isImage})`);
                }
            } catch (error) {
                console.log(`Failed to validate image: ${url}`, error);
            }
        }
        
        console.log(`Validation complete. Found ${this.highQualityImages.length} high-quality images`);
    }

    // Get image alt text
    getImageAlt(url) {
        const img = document.querySelector(`img[src="${url}"]`);
        return img ? img.alt || 'Product Image' : 'Product Image';
    }

    // Check if URL is valid image using comprehensive validation
    isValidImageUrl(url) {
        if (!url) return false;
        
        // Must be Amazon image URL
        if (!url.includes('amazon') || !url.includes('images')) {
            return false;
        }
        
        // Must be valid image format
        const validFormats = ['.jpg', '.jpeg', '.png', '.webp'];
        const hasValidFormat = validFormats.some(format => url.toLowerCase().includes(format));
        
        // Must not be excluded content
        const excludedContent = ['sprite', 'icon', 'logo', 'banner', 'data:image'];
        const hasExcludedContent = excludedContent.some(excluded => url.toLowerCase().includes(excluded));
        
        return hasValidFormat && !hasExcludedContent && url.startsWith('http');
    }

    // Check if URL appears to be high resolution based on comprehensive patterns
    isHighResUrl(url) {
        if (!url) return false;
        
        // Check for high-resolution indicators in Amazon URLs
        const highResPatterns = [
            /_AC_SL\d+_/,  // Amazon's high-res pattern
            /_AC_SX\d+_/,  // Amazon's high-res pattern
            /_AC_SY\d+_/,  // Amazon's high-res pattern
            /_AC_U\d+_/,   // Amazon's high-res pattern
            /_AC_UL\d+_/,  // Amazon's high-res pattern
            /_AC_UX\d+_/,  // Amazon's high-res pattern
            /_AC_UY\d+_/,  // Amazon's high-res pattern
            /\._[A-Z0-9]+_\./,  // Generic high-res pattern
            /_AC_SL1500_/, // Specific high-res pattern
            /_AC_SL2000_/, // Specific high-res pattern
            /_AC_SL3000_/, // Specific high-res pattern
        ];
        
        return highResPatterns.some(pattern => pattern.test(url));
    }

}

// Initialize extractor when page loads
const extractor = new AmazonImageExtractor();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractImages') {
        extractor.extractAllImages().then(images => {
            sendResponse({ success: true, images: images });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
    }
});

// Scrapes the main product title and displays it in the panel.
const scrapeAndDisplayInitialTitle = () => {
    const titleElement = document.getElementById('productTitle');
    if (!titleElement) return;
    const originalTitle = titleElement.innerText.trim();
    const titleListContainer = document.getElementById('snipe-title-list');
    const titleData = { rank: 1, type: 'Filtered', title: originalTitle, charCount: originalTitle.length };
    titleListContainer.innerHTML = createTitleRow(titleData, true);
};

// Applies a watermark to an image using the Canvas API.
const applyWatermark = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const watermark = new Image();
    const sourceImage = new Image();
    sourceImage.crossOrigin = "Anonymous";
    watermark.src = chrome.runtime.getURL('assets/watermark.png');
    sourceImage.src = imageUrl;

    Promise.all([new Promise(r => watermark.onload=r), new Promise(r => sourceImage.onload=r)]).then(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = sourceImage.naturalWidth;
        canvas.height = sourceImage.naturalHeight;
        ctx.drawImage(sourceImage, 0, 0);
        ctx.globalAlpha = 1.0; 
        const padding = 20;
        const watermarkWidth = canvas.width / 4;
        const watermarkHeight = (watermark.naturalHeight / watermark.naturalWidth) * watermarkWidth;
        const x = canvas.width - watermarkWidth - padding;
        const y = canvas.height - watermarkHeight - padding;
        ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);
        ctx.globalAlpha = 1.0;
        resolve(canvas.toDataURL('image/jpeg'));
    }).catch(reject);
  });
};

// Scrape all high-quality images using the comprehensive extractor
const scrapeAndDisplayImages = async () => {
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) return;
    
    console.log('Starting comprehensive image extraction...');
    
    // Disable buttons during image processing
    const optiListBtn = document.getElementById('opti-list-btn');
    const downloadBtn = document.getElementById('download-images-btn');
    const refreshBtn = document.getElementById('refresh-images-btn');
    
    if (optiListBtn) {
        optiListBtn.disabled = true;
        optiListBtn.textContent = 'Processing Images...';
    }
    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Processing Images...';
    }
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Processing Images...';
    }
    
    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = 'Extracting all high-quality product images...';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.style.textAlign = 'center';
    loadingIndicator.style.color = '#666';
    loadingIndicator.id = 'image-loading-indicator';
    galleryContainer.appendChild(loadingIndicator);
    
    try {
        // Use the comprehensive extractor
        const allImages = await extractor.extractAllImages();
    
    // Remove loading indicator
    const existingLoadingIndicator = document.getElementById('image-loading-indicator');
    if (existingLoadingIndicator) {
        existingLoadingIndicator.remove();
    }
    
        if (allImages.length === 0) {
        const placeholder = document.createElement('div');
            placeholder.textContent = 'No high-quality product images found. Please check if this is a valid Amazon product page.';
        placeholder.style.padding = '20px';
        placeholder.style.textAlign = 'center';
        placeholder.style.color = '#666';
        galleryContainer.appendChild(placeholder);
        return;
    }
    
        console.log(`Processing ${allImages.length} high-quality images`);
    
        // Process and display all images with 1600x1600px resize, watermark only on main image
        for (let i = 0; i < allImages.length; i++) {
            const imageInfo = allImages[i];
        try {
                console.log(`Processing image ${i + 1}/${allImages.length}: ${imageInfo.url}`);
            // Apply watermark only to the main image (first image, index 0)
            const processedImageUrl = i === 0 ? await processImageTo1600x1600(imageInfo.url) : await processImageTo1600x1600NoWatermark(imageInfo.url);
            
            const imgContainer = document.createElement('div');
            imgContainer.className = 'product-image-container';
            imgContainer.style.position = 'relative';
            imgContainer.style.display = 'inline-block';
            imgContainer.style.margin = '5px';
            imgContainer.style.verticalAlign = 'top';
                imgContainer.setAttribute('data-image-index', i);
            
            const img = document.createElement('img');
            img.src = processedImageUrl;
            img.className = 'product-image-1600';
                img.alt = imageInfo.alt || `Product image ${i + 1}`;
                img.title = `Product Image ${i + 1} - 1600x1600px`;
                
                // Add delete button (cross)
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '×';
                deleteButton.className = 'image-delete-btn';
                deleteButton.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    width: 24px;
                    height: 24px;
                    background: rgba(255, 0, 0, 0.8);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    transition: all 0.3s ease;
                    opacity: 0;
                `;
                
                // Show delete button on hover
                imgContainer.addEventListener('mouseenter', () => {
                    deleteButton.style.opacity = '1';
                });
                
                imgContainer.addEventListener('mouseleave', () => {
                    deleteButton.style.opacity = '0';
                });
                
                // Delete button hover effects
                deleteButton.addEventListener('mouseenter', () => {
                    deleteButton.style.background = 'rgba(255, 0, 0, 1)';
                    deleteButton.style.transform = 'scale(1.1)';
                });
                
                deleteButton.addEventListener('mouseleave', () => {
                    deleteButton.style.background = 'rgba(255, 0, 0, 0.8)';
                    deleteButton.style.transform = 'scale(1)';
                });
                
                // Delete functionality
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteImageFromStorage(i, imgContainer, processedImageUrl);
                });
            
            // Add image metadata overlay
            const metadataOverlay = document.createElement('div');
            metadataOverlay.className = 'product-image-metadata';
            metadataOverlay.style.position = 'absolute';
            metadataOverlay.style.bottom = '0';
            metadataOverlay.style.left = '0';
            metadataOverlay.style.right = '0';
            metadataOverlay.style.background = 'rgba(0,0,0,0.7)';
            metadataOverlay.style.color = 'white';
            metadataOverlay.style.padding = '4px';
            metadataOverlay.style.fontSize = '10px';
            metadataOverlay.style.textAlign = 'center';
                metadataOverlay.textContent = `Image ${i + 1} | 1600x1600 | ${imageInfo.size ? Math.round(parseInt(imageInfo.size) / 1024) + 'KB' : 'Unknown size'}`;
            
            // Add edit button overlay
            const editBtn = document.createElement('button');
            editBtn.textContent = '✎';
            editBtn.className = 'image-edit-btn';
            editBtn.style.cssText = `
              position:absolute;top:5px;left:5px;width:24px;height:24px;
              background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:4px;
              cursor:pointer;opacity:0;transition:opacity .2s;z-index:10;`;
            imgContainer.appendChild(editBtn);
            imgContainer.addEventListener('mouseenter',()=>editBtn.style.opacity='1');
            imgContainer.addEventListener('mouseleave',()=>editBtn.style.opacity='0');
            editBtn.addEventListener('click',e=>{
              e.stopPropagation();
              const index = parseInt(imgContainer.dataset.imageIndex);
              window.__SNIPE_OPEN_IMAGE_EDITOR__?.(img.src, index);
            });
            
            imgContainer.appendChild(img);
                imgContainer.appendChild(deleteButton);
            imgContainer.appendChild(metadataOverlay);
            galleryContainer.appendChild(imgContainer);
            
                console.log(`Successfully processed image ${i + 1} at 1600x1600px`);
        } catch (error) { 
                console.error(`Failed to process image ${i + 1}:`, error);
            }
        }
        
        console.log(`Successfully processed ${allImages.length} high-quality images`);
        
        // Re-enable buttons after successful processing
        if (optiListBtn) {
            optiListBtn.disabled = false;
            optiListBtn.textContent = 'Opti-List';
        }
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download All Images';
        }
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Images';
        }
        
    } catch (error) {
        console.error('Error in comprehensive image extraction:', error);
        
        // Remove loading indicator on error
        const existingLoadingIndicator = document.getElementById('image-loading-indicator');
        if (existingLoadingIndicator) {
            existingLoadingIndicator.remove();
        }
        
        // Re-enable buttons on error
        if (optiListBtn) {
            optiListBtn.disabled = false;
            optiListBtn.textContent = 'Opti-List';
        }
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download All Images';
        }
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Images';
        }
        
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error extracting images. Please try refreshing the page.';
        errorMessage.style.padding = '20px';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.color = '#ff0000';
        galleryContainer.appendChild(errorMessage);
    }
};


// Process image to 1600x1600 with proper aspect ratio but no watermark
const processImageTo1600x1600NoWatermark = (imageUrl) => {
    return new Promise((resolve, reject) => {
        const sourceImage = new Image();
        sourceImage.crossOrigin = "Anonymous";
        sourceImage.src = imageUrl;

        new Promise(r => sourceImage.onload = r).then(() => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas to fixed 1600x1600 dimensions
            canvas.width = 1600;
            canvas.height = 1600;
            
            // Fill canvas with white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1600, 1600);
            
            // Calculate aspect ratio to fit image within 1600x1600 without distortion
            const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
            const targetAspect = 1600 / 1600; // 1:1 square
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (sourceAspect > targetAspect) {
                // Source is wider - fit to width
                drawWidth = 1600;
                drawHeight = 1600 / sourceAspect;
                drawX = 0;
                drawY = (1600 - drawHeight) / 2;
            } else {
                // Source is taller - fit to height
                drawHeight = 1600;
                drawWidth = 1600 * sourceAspect;
                drawX = (1600 - drawWidth) / 2;
                drawY = 0;
            }
            
            // Draw the resized image centered on white background
            ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
            
            // Export as high-quality JPEG (no watermark)
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        }).catch(reject);
    });
};

// Process image to 1600x1600 with proper aspect ratio and watermark
const processImageTo1600x1600 = (imageUrl) => {
    return new Promise((resolve, reject) => {
        console.log(`🔍 processImageTo1600x1600: Processing image with watermark - ${imageUrl.substring(0, 100)}...`);
        
        const watermark = new Image();
        const sourceImage = new Image();
        
        sourceImage.crossOrigin = "Anonymous";
        watermark.src = chrome.runtime.getURL('assets/watermark.png');
        sourceImage.src = imageUrl;

        Promise.all([
            new Promise(r => watermark.onload = r), 
            new Promise(r => sourceImage.onload = r)
        ]).then(() => {
            console.log(`✅ processImageTo1600x1600: Both images loaded successfully`);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas to fixed 1600x1600 dimensions
            canvas.width = 1600;
            canvas.height = 1600;
            
            // Fill canvas with white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1600, 1600);
            
            // Calculate aspect ratio to fit image within 1600x1600 without distortion
            const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
            const targetAspect = 1600 / 1600; // 1:1 square
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (sourceAspect > targetAspect) {
                // Source is wider - fit to width
                drawWidth = 1600;
                drawHeight = 1600 / sourceAspect;
                drawX = 0;
                drawY = (1600 - drawHeight) / 2;
            } else {
                // Source is taller - fit to height
                drawHeight = 1600;
                drawWidth = 1600 * sourceAspect;
                drawX = (1600 - drawWidth) / 2;
                drawY = 0;
            }
            
            // Draw the resized image centered on white background
            ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
            
            // Apply watermark
            ctx.globalAlpha = 1.0;
            const padding = 20;
            const watermarkWidth = 1600 / 4;
            const watermarkHeight = (watermark.naturalHeight / watermark.naturalWidth) * watermarkWidth;
            const watermarkX = 1600 - watermarkWidth - padding;
            const watermarkY = 1600 - watermarkHeight - padding;
            ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
            ctx.globalAlpha = 1.0;
            
            // Export as high-quality JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            console.log(`✅ processImageTo1600x1600: Generated Data URL (${dataUrl.substring(0, 50)}...)`);
            resolve(dataUrl);
        }).catch(reject);
    });
};


// Store watermarked images in chrome.storage.local
const storeWatermarkedImages = async () => {
    console.log('🔍 storeWatermarkedImages: Starting image storage process...');
    
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) {
        console.error('❌ storeWatermarkedImages: Gallery container not found');
        return;
    }
    
    console.log('✅ storeWatermarkedImages: Gallery container found');
    
    const images = galleryContainer.querySelectorAll('.product-image-1600');
    console.log(`🔍 storeWatermarkedImages: Found ${images.length} images in gallery`);
    
    const watermarkedDataUrls = [];
    
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        console.log(`🔍 storeWatermarkedImages: Processing image ${i + 1}/${images.length}`);
        console.log(`🔍 storeWatermarkedImages: Image src type: ${img.src ? (img.src.startsWith('data:image') ? 'Data URL' : 'URL') : 'No src'}`);
        
        if (img.src && img.src.startsWith('data:image')) {
            // CRITICAL: Only store images that are watermarked and processed (large size indicates processing)
            if (img.src.length > 100000) { // Large size indicates watermarked/processed image
                watermarkedDataUrls.push(img.src);
                console.log(`✅ storeWatermarkedImages: Added scraped watermarked image ${i + 1} to storage array`);
            } else {
                console.log(`⚠️ storeWatermarkedImages: Image ${i + 1} is too small - may not be properly watermarked, skipping`);
            }
        } else {
            console.log(`⚠️ storeWatermarkedImages: Image ${i + 1} is not a Data URL, skipping`);
        }
    }
    
    console.log(`🔍 storeWatermarkedImages: Total Data URLs collected: ${watermarkedDataUrls.length}`);
    
    if (watermarkedDataUrls.length > 0) {
        try {
            await chrome.storage.local.set({ watermarkedImages: watermarkedDataUrls });
            console.log(`✅ storeWatermarkedImages: Successfully stored ${watermarkedDataUrls.length} watermarked 1600x1600 images in Chrome storage`);
            
            // Verify storage
            const verification = await chrome.storage.local.get(['watermarkedImages']);
            console.log(`🔍 storeWatermarkedImages: Storage verification - ${verification.watermarkedImages?.length || 0} images in storage`);
            
            // Additional verification - check if images are valid Data URLs
            if (verification.watermarkedImages && verification.watermarkedImages.length > 0) {
                console.log("🔍 storeWatermarkedImages: Verifying stored images...");
                verification.watermarkedImages.forEach((imageData, index) => {
                    if (imageData && imageData.startsWith('data:image')) {
                        console.log(`✅ storeWatermarkedImages: Image ${index + 1} is valid Data URL (${imageData.substring(0, 50)}...)`);
                    } else {
                        console.error(`❌ storeWatermarkedImages: Image ${index + 1} is not a valid Data URL`);
                    }
                });
            }
        } catch (error) {
            console.error('❌ storeWatermarkedImages: Failed to store images:', error);
        }
    } else {
        console.warn('⚠️ storeWatermarkedImages: No Data URLs found to store');
    }
};

// Delete specific image from storage and UI
const deleteImageFromStorage = async (imageIndex, imgContainer, imageUrl) => {
    try {
        console.log(`Deleting image ${imageIndex + 1} from storage...`);
        
        // Get current stored images
        const result = await chrome.storage.local.get(['watermarkedImages']);
        const storedImages = result.watermarkedImages || [];
        
        // Remove the specific image from storage
        if (storedImages.length > imageIndex) {
            storedImages.splice(imageIndex, 1);
            
            // Update storage with remaining images
            await chrome.storage.local.set({ watermarkedImages: storedImages });
            console.log(`Image ${imageIndex + 1} deleted from storage. ${storedImages.length} images remaining.`);
        }
        
        // Remove from UI with animation
        imgContainer.style.transition = 'all 0.3s ease';
        imgContainer.style.transform = 'scale(0)';
        imgContainer.style.opacity = '0';
        
        setTimeout(() => {
            imgContainer.remove();
            
            // Update image numbers for remaining images
            updateImageNumbers();
            
            console.log(`Image ${imageIndex + 1} removed from UI`);
        }, 300);
        
    } catch (error) {
        console.error('Error deleting image from storage:', error);
        alert('Failed to delete image. Please try again.');
    }
};

// Update image numbers after deletion
const updateImageNumbers = () => {
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) return;
    
    const imageContainers = galleryContainer.querySelectorAll('.product-image-container');
    imageContainers.forEach((container, index) => {
        const metadataOverlay = container.querySelector('.product-image-metadata');
        if (metadataOverlay) {
            const currentText = metadataOverlay.textContent;
            const newText = currentText.replace(/Image \d+/, `Image ${index + 1}`);
            metadataOverlay.textContent = newText;
        }
        
        // Update data attribute
        container.setAttribute('data-image-index', index);
    });
    
    console.log(`Updated image numbers. ${imageContainers.length} images remaining.`);
};


// Generates simple, rule-based title variations with typewriter animation.
const generateTitleVariations = (originalTitle) => {
    // Helper function to limit title length
    const limitTitleLength = (title, maxLength = 80) => {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength - 3) + '...';
    };
    
    // Helper function to create title with word limit
    const limitTitleWords = (title, maxWords = 8) => {
        const words = title.split(' ');
        if (words.length <= maxWords) return title;
        return words.slice(0, maxWords).join(' ');
    };
    
    const titles = [
        { rank: 2, type: 'Perfect Title', title: limitTitleLength(limitTitleWords(originalTitle) + ' For Sale'), charCount: limitTitleLength(limitTitleWords(originalTitle) + ' For Sale').length },
        { rank: 3, type: 'Custom', title: '', charCount: 0, isBlankRow: true }
    ];
    
    const titleListContainer = document.getElementById('snipe-title-list');
    const firstRow = titleListContainer.firstChild;
    titleListContainer.innerHTML = '';
    titleListContainer.appendChild(firstRow);
    
    // Add typewriter animation to each title
    titles.forEach((t, index) => {
        const titleRow = createTitleRowWithAnimation(t, index);
        titleListContainer.appendChild(titleRow);
    });
};

// Adds event listeners to the buttons inside our injected panel.
const addEventListenersToPanel = () => {
    
    // Snipe Title button
    const snipeTitleBtn = document.getElementById('snipe-title-btn');
    if (snipeTitleBtn) {
        snipeTitleBtn.addEventListener('click', () => {
            const originalTitle = document.querySelector('#snipe-title-list .title-row').dataset.title;
            generateTitleVariations(originalTitle);
        });
        console.log('✅ Snipe Title button listener added');
    }

    // Opti-List button
    const optiListBtn = document.getElementById('opti-list-btn');
    if (optiListBtn) {
        optiListBtn.addEventListener('click', async () => {
            const selectedRow = document.querySelector('#snipe-title-list .title-row.selected');
            if (selectedRow) {
                const btn = document.getElementById('opti-list-btn');
                btn.disabled = true;
                btn.textContent = 'Processing...';

                try {
                    const selectedTitle = selectedRow.dataset.title;
                    const sku = document.getElementById('sku-input').value;
                    
                    // Get the price from the "Sell it for" field
                    const priceInput = document.getElementById('sell-it-for-input') || 
                                      document.querySelector('.price-field input[type="text"]') ||
                                      document.querySelector('input[aria-label*="Sell it for" i]');
                    const price = priceInput ? priceInput.value.trim() : ''; // Empty default - should be calculated
                    
                    if (!price || price === '') {
                        console.warn('⚠️ No price in "Sell it for" field. Please calculate price first.');
                        alert("Please calculate the price first using the calculator (💰 Calculator or 💲 Quick Calculate button).");
                        btn.disabled = false;
                        btn.textContent = 'Opti-List';
                        return;
                    }

                    // Validation check for the SKU
                    if (!sku) {
                        alert("Please generate a SKU first before clicking Opti-List.");
                        btn.disabled = false;
                        btn.textContent = 'Opti-List';
                        return;
                    }

                    const productDetails = scrapeProductDetails();
                    await storeWatermarkedImages();

                    const listingData = {
                        productTitle: selectedTitle,
                        ebayTitle: selectedTitle,
                        ebaySku: sku,
                        ebayPrice: price,
                        ...productDetails
                    };

                    // Save to Chrome storage with explicit keys
                    await chrome.storage.local.set(listingData);
                    console.log('✅ All listing data saved:', listingData);
                    console.log('🏷️ SKU saved to storage:', sku);
                    console.log('💰 Price saved to storage:', price);
                    
                    // Additional explicit saves to ensure they're stored
                    await chrome.storage.local.set({ ebaySku: sku, ebayPrice: price });
                    console.log('🔒 SKU and Price explicitly saved to storage');
                    
                    // Verify SKU and Price were saved correctly - multiple verification methods
                    chrome.storage.local.get(['ebaySku', 'ebayPrice'], (result) => {
                        if (result.ebaySku === sku) {
                            console.log('✅ SKU verification successful:', result.ebaySku);
                        } else {
                            console.error('❌ SKU verification failed. Expected:', sku, 'Got:', result.ebaySku);
                        }
                        
                        if (result.ebayPrice === price) {
                            console.log('✅ Price verification successful:', result.ebayPrice);
                        } else {
                            console.error('❌ Price verification failed. Expected:', price, 'Got:', result.ebayPrice);
                        }
                    });
                    
                    // Additional verification - check all storage
                    chrome.storage.local.get(null, (allData) => {
                        console.log('📦 All Chrome storage data:', allData);
                        if (allData.ebaySku) {
                            console.log('✅ SKU found in storage:', allData.ebaySku);
                        } else {
                            console.error('❌ SKU not found in storage!');
                        }
                        if (allData.ebayPrice) {
                            console.log('✅ Price found in storage:', allData.ebayPrice);
                        } else {
                            console.error('❌ Price not found in storage!');
                        }
                    });
                    
                    // Send to Google Sheets
                    const exportData = await getProductDataForExport();
                    const sheetsSuccess = await sendToGoogleSheets(exportData);
                    
                    if (sheetsSuccess) {
                        btn.textContent = '✅ Sent to Sheets!';
                    } else {
                        btn.textContent = '⚠️ Saved (Sheets failed)';
                    }

                    chrome.runtime.sendMessage({ action: "START_OPTILIST", title: selectedTitle });
                } catch (error) {
                    console.error('Error in Opti-List process:', error);
                    btn.disabled = false;
                    btn.textContent = 'Opti-List';
                }
            } else {
                alert("Please select a title first.");
            }
        });
        console.log('✅ Opti-List button listener added');
    }

    // Copy button
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                console.log('📋 Copy button clicked - starting data collection...');
                const productData = await getProductDataForExport();
                console.log('📊 Product data collected:', productData);
                
                const tabSeparatedData = formatDataForCopy(productData);
                console.log('📋 Tab-separated data:', tabSeparatedData);
                
                // Copy to clipboard
                await navigator.clipboard.writeText(tabSeparatedData);
                
                // Visual feedback
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ Copied!';
                copyBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 2000);
                
                console.log('✅ Data copied to clipboard:', tabSeparatedData);
            } catch (error) {
                console.error('❌ Error copying data:', error);
                alert('Failed to copy data to clipboard. Please try again.');
            }
        });
        console.log('✅ Copy button listener added');
    }

    // Title selection
    const titleList = document.getElementById('snipe-title-list');
    if (titleList) {
        titleList.addEventListener('click', (e) => {
            const row = e.target.closest('.title-row');
            if (row) {
                document.querySelectorAll('#snipe-title-list .title-row').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
            }
        });
        console.log('✅ Title selection listener added');
    }

    // Download images button
    const downloadBtn = document.getElementById('download-images-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            downloadAllImages();
            console.log('✅ Download images button clicked');
        });
        console.log('✅ Download images button listener added');
    }

    // Refresh images button
    const refreshBtn = document.getElementById('refresh-images-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const galleryContainer = document.getElementById('snipe-image-gallery');
            if (galleryContainer) {
                galleryContainer.innerHTML = '';
            }
            scrapeAndDisplayImages();
            console.log('✅ Refresh images button clicked');
        });
        console.log('✅ Refresh images button listener added');
    }

    // Description button
    const descriptionBtn = document.getElementById('new-description-btn');
    if (descriptionBtn) {
        descriptionBtn.addEventListener('click', () => {
            const productURL = window.location.href;
            const targetWebsiteURL = 'https://gemini.google.com/gem/6dced44c5365?usp=sharing'; 

            chrome.runtime.sendMessage({
                action: 'openNewTabForDescription',
                targetURL: targetWebsiteURL,
                amazonURL: productURL
            });
            console.log('✅ Description button clicked');
        });
        console.log('✅ Description button listener added');
    }

    // Product Details button
    const productDetailsBtn = document.getElementById('product-details-btn');
    if (productDetailsBtn) {
        productDetailsBtn.addEventListener('click', () => {
            // Scrape the product title instead of URL
            const productTitle = document.querySelector('#productTitle')?.innerText?.trim() || 'Product Title Not Found';
            const targetWebsiteURL = 'https://gemini.google.com/gem/6dced44c5365?usp=sharing'; 

            chrome.runtime.sendMessage({
                action: 'openNewTabForProductDetails',
                targetURL: targetWebsiteURL,
                amazonTitle: productTitle
            });
            console.log('✅ Product Details button clicked - Title scraped:', productTitle);
        });
        console.log('✅ Product Details button listener added');
    }

    // SKU Generator button
    const generateSkuBtn = document.getElementById('generate-sku-btn');
    if (generateSkuBtn) {
        generateSkuBtn.addEventListener('click', async () => {
            await generateSKU();
        });
        console.log('✅ SKU Generator button listener added');
    }
    
    // Load SKU settings on page load
    loadSKUSettings();
    
    // Listen for SKU settings updates
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && (changes.selectedSKU || changes.autoSkuEnabled)) {
            console.log('🔄 SKU settings changed, reloading...');
            loadSKUSettings();
        }
    });
    
    // Listen for runtime messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "SKU_SETTINGS_UPDATED") {
            console.log('📨 SKU settings update received:', message.data);
            loadSKUSettings();
        }
    });

    // Calculator button
    const calculatorBtn = document.getElementById('calculator-btn');
    if (calculatorBtn) {
        calculatorBtn.addEventListener('click', () => {
            openCalculator();
            console.log('✅ Calculator button clicked');
        });
        console.log('✅ Calculator button listener added');
    }

    // Quick Calculate button
    const quickCalcBtn = document.getElementById('quick-calc-btn');
    if (quickCalcBtn) {
        quickCalcBtn.addEventListener('click', () => {
            quickCalculate();
            console.log('✅ Quick Calculate button clicked');
        });
        console.log('✅ Quick Calculate button listener added');
    }

    // Input validation for price and SKU
    const priceInput = document.querySelector('.price-field input');
    const skuInput = document.getElementById('sku-input');
    
    if (priceInput) {
        priceInput.addEventListener('input', validatePriceInput);
        priceInput.addEventListener('blur', validatePriceInput);
    }
    
    if (skuInput) {
        skuInput.addEventListener('focus', () => {
            if (!skuInput.value) {
                skuInput.style.backgroundColor = '#fff3cd';
                skuInput.style.borderColor = '#ffc107';
            }
        });
    }

    // Add a function to check stored SKU (for debugging)
    window.checkStoredSku = () => {
        chrome.storage.local.get(['ebaySku'], (result) => {
            console.log('🔍 Checking stored SKU:', result);
            if (result.ebaySku) {
                console.log('✅ SKU found in storage:', result.ebaySku);
                alert(`SKU in storage: ${result.ebaySku}`);
            } else {
                console.log('❌ No SKU found in storage');
                alert('No SKU found in storage');
            }
        });
    };
    
    // Add a function to clear stored SKU (for testing)
    window.clearStoredSku = () => {
        chrome.storage.local.remove(['ebaySku'], () => {
            console.log('🧹 SKU cleared from storage');
            alert('SKU cleared from storage');
        });
    };
};

// Creates a title row with typewriter animation
const createTitleRowWithAnimation = (data, index) => {
    const row = document.createElement('div');
    row.className = 'title-row';
    row.setAttribute('data-title', data.title);
    
    // Handle blank row specially
    if (data.isBlankRow) {
        row.innerHTML = `
            <div class="rank">${data.rank}</div>
            <div class="type">${data.type}</div>
            <div class="title-text" contenteditable="true" data-placeholder="Write your custom title here..."></div>
            <div class="char-count">0</div>
            <button class="action-btn">Use</button>
        `;
        
        // Add event listener for real-time character counting
        const titleText = row.querySelector('.title-text');
        const charCount = row.querySelector('.char-count');
        
        // Set up placeholder functionality
        const updatePlaceholder = () => {
            if (titleText.textContent.trim() === '') {
                titleText.classList.add('empty');
            } else {
                titleText.classList.remove('empty');
            }
        };
        
        // Auto-resize function for responsive height
        const autoResize = () => {
            // Reset height to auto to get natural height
            titleText.style.height = 'auto';
            
            // Get the scroll height (natural content height)
            const scrollHeight = titleText.scrollHeight;
            const maxHeight = 60; // Max height from CSS
            const minHeight = 24; // Min height from CSS
            
            // Calculate the appropriate height
            const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
            titleText.style.height = newHeight + 'px';
            
            // If content exceeds max height, show scrollbar
            if (scrollHeight > maxHeight) {
                titleText.style.overflowY = 'auto';
            } else {
                titleText.style.overflowY = 'hidden';
            }
        };
        
        // Multiple event listeners for better responsiveness
        titleText.addEventListener('input', () => {
            const text = titleText.textContent.trim();
            charCount.textContent = text.length;
            row.setAttribute('data-title', text);
            updatePlaceholder();
            autoResize();
        });
        
        titleText.addEventListener('keyup', () => {
            const text = titleText.textContent.trim();
            charCount.textContent = text.length;
            row.setAttribute('data-title', text);
            updatePlaceholder();
            autoResize();
        });
        
        titleText.addEventListener('paste', (e) => {
            // Handle paste events
            setTimeout(() => {
                const text = titleText.textContent.trim();
                charCount.textContent = text.length;
                row.setAttribute('data-title', text);
                updatePlaceholder();
                autoResize();
            }, 10);
        });
        
        // Add focus styling
        titleText.addEventListener('focus', () => {
            row.classList.add('custom-title-focus');
            updatePlaceholder();
            autoResize();
        });
        
        titleText.addEventListener('blur', () => {
            row.classList.remove('custom-title-focus');
            updatePlaceholder();
            autoResize();
        });
        
        // Auto-focus when row is clicked
        row.addEventListener('click', (e) => {
            if (e.target !== titleText && e.target !== titleText.parentNode) {
                titleText.focus();
            }
        });
        
        // Initialize placeholder and resize
        updatePlaceholder();
        autoResize();
        
        return row;
    }
    
    row.innerHTML = `
        <div class="rank">${data.rank}</div>
        <div class="type">${data.type}</div>
        <div class="title-text" contenteditable="true"></div>
        <div class="char-count">0</div>
        <button class="action-btn">Change</button>
    `;
    
    // Start typewriter animation with delay
    setTimeout(() => {
        typewriterAnimation(row.querySelector('.title-text'), data.title, row.querySelector('.char-count'), data.charCount);
    }, index * 50); // Stagger animations by 50ms (very fast)
    
    return row;
};

// Typewriter animation function
const typewriterAnimation = (element, text, charCountElement, finalCount) => {
    let i = 0;
    const speed = 5; // Typing speed in milliseconds (very fast)
    
    // Add typing class for cursor effect
    element.classList.add('typing');
    
    const typeInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            charCountElement.textContent = i + 1;
            i++;
        } else {
            clearInterval(typeInterval);
            
            // Remove typing class and add completion class
            element.classList.remove('typing');
            element.classList.add('typing-complete');
            
            // Remove completion class after animation
            setTimeout(() => {
                element.classList.remove('typing-complete');
            }, 1000);
        }
    }, speed);
};

// Helper function to create the HTML for a single title row.
const createTitleRow = (data, isSelected = false) => `<div class="title-row ${isSelected ? 'selected' : ''}" data-title="${data.title}"><div class="rank">${data.rank}</div><div class="type">${data.type}</div><div class="title-text" contenteditable="true">${data.title}</div><div class="char-count">${data.charCount}</div><button class="action-btn">Change</button></div>`;


// Download all scraped images
const downloadAllImages = () => {
    console.log('Starting download of all images...');
    
    const galleryContainer = document.getElementById('snipe-image-gallery');
    if (!galleryContainer) {
        console.error('Image gallery not found');
        return;
    }
    
    const images = galleryContainer.querySelectorAll('.product-image-1600');
    if (images.length === 0) {
        alert('No images found to download. Please scrape images first.');
        return;
    }
    
    console.log(`Found ${images.length} images to download`);
    
    // Create a zip file with all images
    if (typeof JSZip !== 'undefined') {
        downloadImagesAsZip(images);
    } else {
        downloadImagesIndividually(images);
    }
};

// Download images as individual files
const downloadImagesIndividually = (images) => {
    images.forEach((img, index) => {
        try {
            const link = document.createElement('a');
            link.download = `product-image-${index + 1}-1600x1600.jpg`;
            link.href = img.src;
            link.click();
            console.log(`Downloaded image ${index + 1}`);
        } catch (error) {
            console.error(`Failed to download image ${index + 1}:`, error);
        }
    });
    
    // Add a small delay between downloads
    setTimeout(() => {
        console.log('All images download initiated');
    }, 100);
};

// Download images as a ZIP file (if JSZip is available)
const downloadImagesAsZip = (images) => {
    const zip = new JSZip();
    const folder = zip.folder("product-images");
    
    images.forEach((img, index) => {
        try {
            // Convert data URL to blob
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const tempImg = new Image();
            
            tempImg.onload = () => {
                canvas.width = tempImg.width;
                canvas.height = tempImg.height;
                ctx.drawImage(tempImg, 0, 0);
                
                canvas.toBlob((blob) => {
                    folder.file(`product-image-${index + 1}-1600x1600.jpg`, blob);
                    
                    if (index === images.length - 1) {
                        // Generate and download ZIP
                        zip.generateAsync({type: "blob"}).then((content) => {
                            const link = document.createElement('a');
                            link.download = 'product-images-1600x1600.zip';
                            link.href = URL.createObjectURL(content);
                            link.click();
                            console.log('ZIP file downloaded');
                        });
                    }
                }, 'image/jpeg', 0.9);
            };
            
            tempImg.src = img.src;
        } catch (error) {
            console.error(`Failed to add image ${index + 1} to ZIP:`, error);
        }
    });
};



// This function contains the original core logic of the extension.
const initializeApp = () => {
    console.log('🚀 Initializing app...');
    console.log('🌐 Current URL:', window.location.href);
    console.log('🏷️ Page title:', document.title);
    
    // Check if we're on an Amazon page
    const isAmazonDomain = window.location.hostname.includes('amazon');
    console.log('🛒 Is Amazon domain:', isAmazonDomain);
    
    if (!isAmazonDomain) {
        console.log('❌ Not on Amazon domain, skipping initialization');
        return;
    }
    
    let attempts = 0;
    const maxAttempts = 50; // 50 attempts = 25 seconds (500ms interval)
    
    const interval = setInterval(() => {
        attempts++;
        console.log(`🔍 Attempt ${attempts}/${maxAttempts} - Checking for Amazon product page...`);
        
        const productTitle = document.getElementById('productTitle');
        const existingButton = document.getElementById('initial-list-button');
        
        console.log('🔍 Checking for productTitle:', !!productTitle);
        console.log('🔍 Checking for existing button:', !!existingButton);
        
        // Check for various Amazon product page indicators
        const amazonIndicators = {
            productTitle: !!document.getElementById('productTitle'),
            dpContainer: !!document.querySelector('#dp-container'),
            dataAsin: !!document.querySelector('[data-asin]'),
            priceWhole: !!document.querySelector('.a-price-whole'),
            priceDeal: !!document.querySelector('#priceblock_dealprice'),
            priceOur: !!document.querySelector('#priceblock_ourprice'),
            buyBox: !!document.querySelector('#buybox'),
            addToCart: !!document.querySelector('#add-to-cart-button'),
            productDetails: !!document.querySelector('#productDetails')
        };
        
        console.log('🔍 Amazon indicators found:', amazonIndicators);
        
        const isAmazonProductPage = Object.values(amazonIndicators).some(Boolean);
        
        if (isAmazonProductPage && !existingButton) {
            console.log('✅ Amazon product page detected, creating List it button...');
            clearInterval(interval);
            
            // Create simple floating button on left side
            const listButton = document.createElement('button');
            listButton.textContent = 'List it';
            listButton.className = 'snipe-btn snipe-btn-import';
            listButton.id = 'initial-list-button';
            listButton.style.cssText = `
                position: fixed;
                top: 50%;
                left: 20px;
                transform: translateY(-50%);
                background: #0073c4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 16px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                transition: all 0.3s ease;
                z-index: 9998;
                min-width: 80px;
            `;
            
            // Add hover effects
            listButton.addEventListener('mouseenter', () => {
                listButton.style.background = '#005a9e';
                listButton.style.transform = 'translateY(-50%) scale(1.05)';
                listButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            });
            
            listButton.addEventListener('mouseleave', () => {
                listButton.style.background = '#0073c4';
                listButton.style.transform = 'translateY(-50%) scale(1)';
                listButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            });
            
            document.body.appendChild(listButton);
            
            listButton.addEventListener('click', () => {
                injectUI();
                listButton.style.display = 'none';
            });
        } else if (attempts >= maxAttempts) {
            console.log('⏰ Timeout reached - stopping attempts to find Amazon product page');
            clearInterval(interval);
        }
    }, 500);
};

// Calculator Functions
function openCalculator() {
    console.log('🔍 Opening calculator...');
    const popup = document.getElementById('calculator-popup');
    if (popup) {
        popup.style.display = 'flex';
        console.log('✅ Calculator popup displayed');
        
        // Try to auto-fill Amazon price if available
        const amazonPriceInput = document.getElementById('amazon-price');
        if (amazonPriceInput) {
            const scrapedPrice = scrapeAmazonPrice();
            if (scrapedPrice !== 'No price found') {
                amazonPriceInput.value = scrapedPrice;
                console.log('💰 Auto-filled Amazon price:', scrapedPrice);
            }
        }
        
        // Load saved values from localStorage
        loadCalculatorValues();
        console.log('✅ Calculator opened successfully');
    } else {
        console.error('❌ Calculator popup not found');
    }
}

function closeCalculator() {
    console.log('🔍 Closing calculator...');
    const popup = document.getElementById('calculator-popup');
    if (popup) {
        popup.style.display = 'none';
        console.log('✅ Calculator closed');
    } else {
        console.error('❌ Calculator popup not found for closing');
    }
}

function loadCalculatorValues() {
    const savedValues = JSON.parse(localStorage.getItem('calculatorValues') || '{}');
    
    const fields = [
        'amazon-price',
        'tax-percent',
        'tracking-fee',
        'ebay-fee-percent',
        'promo-fee-percent',
        'desired-profit'
    ];
    
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input && savedValues[fieldId]) {
            input.value = savedValues[fieldId];
        }
    });
}

function saveCalculatorValues() {
    const values = {};
    const fields = [
        'amazon-price',
        'tax-percent',
        'tracking-fee',
        'ebay-fee-percent',
        'promo-fee-percent',
        'desired-profit'
    ];
    
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input && input.value) {
            values[fieldId] = input.value;
        }
    });
    
    localStorage.setItem('calculatorValues', JSON.stringify(values));
}

// Quick Calculate function - instant calculation without popup
function quickCalculate() {
    console.log('⚡ Quick calculating...');
    
    // Get saved values from localStorage or use defaults
    const savedValues = JSON.parse(localStorage.getItem('calculatorValues') || '{}');
    
    let amazonPrice = parseFloat(savedValues['amazon-price']) || 0;
    
    // If no saved Amazon price, try to scrape it from the page
    if (amazonPrice <= 0) {
        const scrapedPrice = scrapeAmazonPrice();
        if (scrapedPrice !== 'No price found') {
            amazonPrice = parseFloat(scrapedPrice);
            console.log('💰 Using scraped Amazon price for quick calc:', amazonPrice);
        }
    }
    const taxPercent = parseFloat(savedValues['tax-percent']) || 9;
    const trackingFee = parseFloat(savedValues['tracking-fee']) || 0.20;
    const ebayFeePercent = parseFloat(savedValues['ebay-fee-percent']) || 20;
    const promoFeePercent = parseFloat(savedValues['promo-fee-percent']) || 10;
    const desiredProfit = parseFloat(savedValues['desired-profit']) || 0;
    
    console.log('📊 Quick calc values:', {
        amazonPrice, taxPercent, trackingFee, 
        ebayFeePercent, promoFeePercent, desiredProfit
    });
    
    if (amazonPrice <= 0) {
        console.log('⚠️ No Amazon price available for quick calculation');
        alert('Please set up calculator values first or enter an Amazon price');
        return;
    }
    
    // Calculate using same logic as main calculator
    const taxAmount = amazonPrice * (taxPercent / 100);
    const baseCost = amazonPrice + taxAmount + trackingFee;
    const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;
    const finalPrice = baseCost / (1 - totalPercentage);
    
    // Auto-fill "Sell it for" field
    const sellItForInput = document.getElementById('sell-it-for-input') || 
                           document.querySelector('input[aria-label*="Sell it for" i]') ||
                           document.querySelector('.price-field input[type="text"]') ||
                           document.querySelector('input[placeholder*="Sell it for" i]');
    if (sellItForInput) {
        sellItForInput.value = finalPrice.toFixed(2);
        sellItForInput.style.backgroundColor = '#e8f5e8';
        sellItForInput.style.borderColor = '#4caf50';
        
        // Reset styling after 3 seconds
        setTimeout(() => {
            sellItForInput.style.backgroundColor = '';
            sellItForInput.style.borderColor = '';
        }, 3000);
        
        console.log('💰 Quick calculated price:', finalPrice.toFixed(2));
    } else {
        console.error('❌ Sell it for input not found');
    }
}

function calculatePrice() {
    console.log('🧮 Starting price calculation...');
    
    const amazonPrice = parseFloat(document.getElementById('amazon-price').value) || 0;
    const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
    const trackingFee = parseFloat(document.getElementById('tracking-fee').value) || 0;
    const ebayFeePercent = parseFloat(document.getElementById('ebay-fee-percent').value) || 0;
    const promoFeePercent = parseFloat(document.getElementById('promo-fee-percent').value) || 0;
    const desiredProfit = parseFloat(document.getElementById('desired-profit').value) || 0;
    
    console.log('📊 Input values:', {
        amazonPrice, taxPercent, trackingFee, 
        ebayFeePercent, promoFeePercent, desiredProfit
    });
    
    if (amazonPrice <= 0) {
        // Hide result if no valid Amazon price
        const resultDiv = document.getElementById('calculator-result');
        if (resultDiv) {
            resultDiv.style.display = 'none';
        }
        console.log('⚠️ No valid Amazon price entered yet');
        return;
    }
    
    // Calculate base cost: amazonPrice + tax + trackingFee
    const taxAmount = amazonPrice * (taxPercent / 100);
    const baseCost = amazonPrice + taxAmount + trackingFee;
    
    // Calculate total percentage of fees: ebayFee + promoFee + profit
    const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;
    
    // Calculate final eBay selling price using reverse formula
    const finalPrice = baseCost / (1 - totalPercentage);
    
    // Display result in popup
    const resultDiv = document.getElementById('calculator-result');
    const priceDiv = document.getElementById('final-price');
    
    if (resultDiv && priceDiv) {
        priceDiv.textContent = `$${finalPrice.toFixed(2)}`;
        resultDiv.style.display = 'block';
    }
    
    // Auto-fill "Sell it for" field outside the popup
    const sellItForInput = document.getElementById('sell-it-for-input') || 
                           document.querySelector('input[aria-label*="Sell it for" i]') ||
                           document.querySelector('.price-field input[type="text"]') ||
                           document.querySelector('input[placeholder*="Sell it for" i]');
    if (sellItForInput) {
        sellItForInput.value = finalPrice.toFixed(2);
        sellItForInput.style.backgroundColor = '#e8f5e8';
        sellItForInput.style.borderColor = '#4caf50';
        
        // Reset styling after 3 seconds
        setTimeout(() => {
            sellItForInput.style.backgroundColor = '';
            sellItForInput.style.borderColor = '';
        }, 3000);
    }
    
    // Save values
    saveCalculatorValues();
    
    console.log('💰 Price calculated:', finalPrice.toFixed(2));
    console.log('📊 Base cost:', baseCost.toFixed(2));
    console.log('📈 Total fees percentage:', (totalPercentage * 100).toFixed(1) + '%');
}

// Add calculator event listeners
function addCalculatorEventListeners() {
    // Calculator close button
    const closeBtn = document.getElementById('calculator-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCalculator);
        console.log('✅ Calculator close button listener added');
    }
    
    // Calculator overlay click to close
    const overlay = document.querySelector('.calculator-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeCalculator);
        console.log('✅ Calculator overlay listener added');
    }
    
    // Calculate button
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculatePrice);
        console.log('✅ Calculator calculate button listener added');
    }
    
    // Auto-save and auto-calculate on input change with debouncing
    let calculateTimeout;
    const calculatorInputs = document.querySelectorAll('#calculator-popup input');
    calculatorInputs.forEach(input => {
        input.addEventListener('input', () => {
            saveCalculatorValues();
            
            // Debounce calculation to avoid too many calculations while typing
            clearTimeout(calculateTimeout);
            calculateTimeout = setTimeout(() => {
                calculatePrice();
            }, 300); // 300ms delay
        });
    });
    console.log('✅ Calculator input listeners added');
}

// Input validation function
function validatePriceInput(event) {
    const input = event.target;
    const value = parseFloat(input.value);
    
    if (isNaN(value) || value < 0) {
        input.style.backgroundColor = '#f8d7da';
        input.style.borderColor = '#dc3545';
        input.style.color = '#721c24';
    } else {
        input.style.backgroundColor = '#d4edda';
        input.style.borderColor = '#28a745';
        input.style.color = '#155724';
    }
}

// Test function to verify calculator is working
window.testCalculator = function() {
    console.log('🧪 Testing calculator...');
    const popup = document.getElementById('calculator-popup');
    const button = document.getElementById('calculator-btn');
    console.log('Calculator popup exists:', !!popup);
    console.log('Calculator button exists:', !!button);
    
    if (button) {
        console.log('🔍 Calculator button found, testing click...');
        button.click();
    } else {
        console.error('❌ Calculator button not found');
    }
};

// Helper function to get product data for export
async function getProductDataForExport() {
    const selectedRow = document.querySelector('#snipe-title-list .title-row.selected');
    const title = selectedRow ? selectedRow.dataset.title : 'No title selected';
    
    const sku = document.getElementById('sku-input').value || 'No SKU';
    const priceInput = document.querySelector('.price-field input');
    const sellPrice = priceInput ? priceInput.value : 'No price';
    
    // Scrape Amazon price from the page
    const amazonPrice = scrapeAmazonPrice();
    const amazonLink = window.location.href;
    
    return {
        timestamp: new Date().toLocaleString(),
        title: title,
        sku: sku,
        sellPrice: sellPrice,
        amazonPrice: amazonPrice,
        amazonLink: amazonLink
    };
}

// Helper function to scrape Amazon price from the page
function scrapeAmazonPrice() {
    console.log('🔍 Starting Amazon price scraping...');
    
    // Try multiple selectors for Amazon price
    const priceSelectors = [
        '.a-price-whole',
        '.a-price .a-offscreen',
        '.a-price-range .a-offscreen',
        '#priceblock_dealprice',
        '#priceblock_ourprice',
        '.a-price-range .a-price-whole',
        '.a-price .a-price-whole',
        '[data-asin-price]',
        '.apexPriceToPay .a-offscreen',
        '.a-price .a-price-whole',
        '.a-price-range .a-price-whole',
        // Additional selectors for newer Amazon layouts
        '.a-price .a-price-whole',
        '.a-price-range .a-price-whole',
        '.a-price .a-offscreen',
        '.a-price-range .a-offscreen',
        '.apexPriceToPay .a-offscreen',
        '.apexPriceToPay .a-price-whole',
        '.apexPriceToPay .a-price-range',
        '.a-price .a-price-range',
        '.a-price-range .a-price-range',
        // Try to find any element with price in class or id
        '[class*="price"][class*="whole"]',
        '[class*="price"][class*="range"]',
        '[id*="price"][class*="whole"]',
        '[id*="price"][class*="range"]'
    ];
    
    console.log('🎯 Trying', priceSelectors.length, 'price selectors...');
    
    // First, try to find Amazon's split price format (whole number + decimal in separate elements)
    console.log('🔍 Checking for Amazon split price format...');
    const wholePriceElement = document.querySelector('.a-price-whole');
    const decimalPriceElement = document.querySelector('.a-price-fraction');
    
    if (wholePriceElement && decimalPriceElement) {
        const wholePart = wholePriceElement.textContent?.replace(/[^\d]/g, '') || '';
        const decimalPart = decimalPriceElement.textContent?.replace(/[^\d]/g, '') || '';
        
        if (wholePart && decimalPart) {
            const fullPrice = parseFloat(`${wholePart}.${decimalPart}`);
            if (!isNaN(fullPrice) && fullPrice > 0) {
                console.log('✅ Split price format found:', fullPrice);
                return fullPrice.toFixed(2);
            }
        }
    }
    
    for (let i = 0; i < priceSelectors.length; i++) {
        const selector = priceSelectors[i];
        const priceElement = document.querySelector(selector);
        
        console.log(`🔍 Selector ${i + 1}/${priceSelectors.length}: "${selector}"`);
        console.log('   Element found:', !!priceElement);
        
        if (priceElement) {
            let priceText = priceElement.textContent || priceElement.innerText;
            console.log('   Raw text:', priceText);
            
            // Clean up the price text
            priceText = priceText.replace(/[^\d.,]/g, ''); // Remove everything except digits, dots, and commas
            priceText = priceText.replace(/,/g, ''); // Remove commas
            console.log('   Cleaned text:', priceText);
            
            // Try to extract the price with better decimal handling
            const priceMatch = priceText.match(/(\d+\.?\d*)/);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);
                console.log('   Extracted price:', price);
                if (!isNaN(price) && price > 0) {
                    console.log('✅ Amazon price scraped successfully:', price);
                    return price.toFixed(2);
                }
            }
        }
        
        // Try to find the parent container and get the full price
        const parentContainer = priceElement?.closest('.a-price, .a-price-range, .apexPriceToPay, [class*="price"]');
        if (parentContainer) {
            console.log('   Trying parent container...');
            const fullPriceText = parentContainer.textContent || parentContainer.innerText;
            console.log('   Parent text:', fullPriceText);
            
            // Look for price patterns like $35.99, 35.99, etc.
            const pricePatterns = [
                /\$(\d+\.\d{2})/,  // $35.99
                /(\d+\.\d{2})/,    // 35.99
                /\$(\d+\.\d{1})/,  // $35.9
                /(\d+\.\d{1})/,    // 35.9
                /\$(\d+)/,         // $35
                /(\d+)/            // 35
            ];
            
            for (const pattern of pricePatterns) {
                const match = fullPriceText.match(pattern);
                if (match) {
                    const price = parseFloat(match[1]);
                    if (!isNaN(price) && price > 0) {
                        console.log('✅ Parent container price found:', price);
                        return price.toFixed(2);
                    }
                }
            }
        }
    }
    
    console.log('⚠️ Could not scrape Amazon price from any selector');
    console.log('🔍 Available price elements on page:');
    const allPriceElements = document.querySelectorAll('[class*="price"], [id*="price"], [class*="cost"], [id*="cost"]');
    allPriceElements.forEach((el, index) => {
        if (index < 5) { // Limit to first 5 for debugging
            console.log(`   Element ${index + 1}:`, el.className, el.id, el.textContent?.substring(0, 50));
        }
    });
    
    // Fallback: Try to find any text that looks like a price
    console.log('🔄 Trying fallback price detection...');
    const allText = document.body.innerText;
    
    // Try multiple price patterns with better decimal handling
    const pricePatterns = [
        /\$(\d+\.\d{2})/g,  // $35.99
        /(\d+\.\d{2})/g,    // 35.99
        /\$(\d+\.\d{1})/g,  // $35.9
        /(\d+\.\d{1})/g,    // 35.9
        /\$(\d+)/g,         // $35
        /(\d+)/g            // 35
    ];
    
    for (const pattern of pricePatterns) {
        const matches = [...allText.matchAll(pattern)];
        console.log(`   Pattern ${pattern} found ${matches.length} matches`);
        
        if (matches.length > 0) {
            // Get the first reasonable price (not too high, not too low)
            for (const match of matches) {
                const price = parseFloat(match[1]);
                if (price > 0.01 && price < 10000) { // Reasonable price range
                    console.log('✅ Fallback price found:', price);
                    return price.toFixed(2);
                }
            }
        }
    }
    
    return 'No price found';
}

// Helper function to format data for copy (tab-separated)
function formatDataForCopy(data) {
    return `${data.timestamp}\t${data.title}\t${data.sku}\t${data.sellPrice}\t${data.amazonPrice}\t${data.amazonLink}`;
}

// Helper function to send data to Google Sheets
async function sendToGoogleSheets(data) {
    // Google Apps Script URL - you'll need to replace this with your actual URL
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        console.log('✅ Data sent to Google Sheets:', data);
        return true;
    } catch (error) {
        console.error('❌ Error sending to Google Sheets:', error);
        return false;
    }
}

// SKU Settings Functions
async function loadSKUSettings() {
    try {
        console.log('📥 Loading SKU settings...');
        
        const result = await chrome.storage.sync.get(['selectedSKU', 'autoSkuEnabled']);
        
        const selectedSKU = result.selectedSKU || 'AB';
        const autoSkuEnabled = result.autoSkuEnabled !== undefined ? result.autoSkuEnabled : true;
        
        console.log('📊 SKU settings loaded:', { selectedSKU, autoSkuEnabled });
        
        // Update SKU prefix dropdown
        const skuPrefixSelect = document.getElementById('sku-prefix');
        if (skuPrefixSelect) {
            skuPrefixSelect.value = selectedSKU;
            console.log('✅ SKU prefix updated to:', selectedSKU);
        }
        
        // Auto-generate SKU if enabled
        if (autoSkuEnabled) {
            console.log('🔄 Auto-generating SKU...');
            await generateSKU();
        } else {
            console.log('📝 Auto SKU disabled, showing manual input');
            // Clear the SKU input to show it's manual
            const skuInput = document.getElementById('sku-input');
            if (skuInput) {
                skuInput.value = selectedSKU; // Prefill with prefix
                skuInput.readOnly = false; // Allow manual editing
                skuInput.placeholder = `Enter SKU (prefix: ${selectedSKU})`;
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading SKU settings:', error);
    }
}

async function generateSKU() {
    try {
        console.log('🏷️ Generating SKU...');
        
        // Get current settings
        const result = await chrome.storage.sync.get(['selectedSKU', 'autoSkuEnabled']);
        const prefix = result.selectedSKU || 'AB';
        const autoSkuEnabled = result.autoSkuEnabled !== undefined ? result.autoSkuEnabled : true;
        
        console.log('📊 Using prefix:', prefix, 'Auto enabled:', autoSkuEnabled);
        
        // Generate SKU using timestamp method
        const timestamp = Date.now().toString().slice(-6); // e.g., 239010
        const generatedSku = `${prefix}${timestamp}`;
        
        console.log('✅ Generated SKU:', generatedSku);
        
        // Update SKU input
        const skuInput = document.getElementById('sku-input');
        if (skuInput) {
            skuInput.value = generatedSku;
            skuInput.readOnly = autoSkuEnabled; // Read-only if auto-enabled
        }
        
        // Update prefix dropdown
        const skuPrefixSelect = document.getElementById('sku-prefix');
        if (skuPrefixSelect) {
            skuPrefixSelect.value = prefix;
        }
        
        // Save to storage
        await chrome.storage.local.set({ ebaySku: generatedSku });
        console.log('🔒 SKU saved to storage:', generatedSku);
        
    } catch (error) {
        console.error('❌ Error generating SKU:', error);
    }
}

// Manual trigger function for debugging
window.forceLoadExtension = function() {
    console.log('🔧 Manually triggering extension load...');
    
    // Remove existing button if any
    const existingButton = document.getElementById('initial-list-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    // Create the List it button manually
    const listButton = document.createElement('button');
    listButton.textContent = 'List it';
    listButton.className = 'snipe-btn snipe-btn-import';
    listButton.id = 'initial-list-button';
    listButton.style.cssText = `
        position: fixed;
        top: 50%;
        left: 20px;
        transform: translateY(-50%);
        background: #0073c4;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        z-index: 9998;
        min-width: 80px;
    `;
    
    // Add hover effects
    listButton.addEventListener('mouseenter', () => {
        listButton.style.background = '#005a9e';
        listButton.style.transform = 'translateY(-50%) scale(1.05)';
        listButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });
    
    listButton.addEventListener('mouseleave', () => {
        listButton.style.background = '#0073c4';
        listButton.style.transform = 'translateY(-50%) scale(1)';
        listButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    });
    
    document.body.appendChild(listButton);
    
    listButton.addEventListener('click', () => {
        console.log('🔧 Manual trigger: Loading extension UI...');
        injectUI();
        listButton.style.display = 'none';
    });
    
    console.log('✅ Manual List it button created!');
};

// Debug function to check page elements
window.debugAmazonPage = function() {
    console.log('🔍 Debugging Amazon page elements...');
    console.log('🌐 URL:', window.location.href);
    console.log('🏷️ Title:', document.title);
    console.log('🛒 Domain:', window.location.hostname);
    
    const elements = {
        productTitle: document.getElementById('productTitle'),
        dpContainer: document.querySelector('#dp-container'),
        dataAsin: document.querySelector('[data-asin]'),
        priceWhole: document.querySelector('.a-price-whole'),
        priceDeal: document.querySelector('#priceblock_dealprice'),
        priceOur: document.querySelector('#priceblock_ourprice'),
        buyBox: document.querySelector('#buybox'),
        addToCart: document.querySelector('#add-to-cart-button'),
        productDetails: document.querySelector('#productDetails')
    };
    
    Object.entries(elements).forEach(([name, element]) => {
        console.log(`${name}:`, !!element, element ? element.textContent?.substring(0, 50) : '');
    });
    
    return elements;
};

// Start the extension directly.
initializeApp();