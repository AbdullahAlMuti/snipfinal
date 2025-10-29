console.log("eBay Lister script loaded: Awaiting data...");

// Manual trigger function for testing (can be called from console)
window.testEbayFilling = async function() {
  console.log("🧪 Manual test triggered");
  
  const data = await chrome.storage.local.get([
    "productTitle",
    "ebayPrice", 
    "imageUrls",
    "pricingConfig",
    "amazonPrice",
    "ebayTitle",
    "watermarkedImages"
  ]);
  
  console.log("📦 Test data:", data);
  
  const images = data.watermarkedImages && data.watermarkedImages.length > 0 
    ? data.watermarkedImages 
    : data.imageUrls;
    
  const title = data.ebayTitle || data.productTitle;
  const finalPrice = data.ebayPrice;
  
  if (title && images && images.length > 0) {
    await fillFormFields(title, finalPrice, images[0]);
  } else {
    console.error("❌ Missing data for test");
  }
};

// Message listener for RUN_EBAY_LISTER
chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === "RUN_EBAY_LISTER") {
    console.log("🎯 RUN_EBAY_LISTER received, starting automation...");
    console.log("🔗 Current URL:", window.location.href);
    console.log("📄 Page title:", document.title);
    
    // Wait a bit for page to fully load
    await wait(3000);
    
    const data = await chrome.storage.local.get([
      "productTitle",
      "ebayPrice", 
      "imageUrls",
      "pricingConfig",
      "amazonPrice",
      "ebayTitle",
      "watermarkedImages"
    ]);

    console.log("📦 Retrieved data from storage:", data);

    // Fallback price calculation (only if ebayPrice is missing)
    let finalPrice = data.ebayPrice;
    if (!finalPrice && data.pricingConfig && data.amazonPrice) {
      const { tax, trackingCost, ebayFee, promo, profit } = data.pricingConfig;
      finalPrice = (data.amazonPrice + trackingCost) * (1 + tax + ebayFee + profit - promo);
      finalPrice = finalPrice.toFixed(2);
    }

    // Use watermarkedImages if available, otherwise fallback to imageUrls
    const images = data.watermarkedImages && data.watermarkedImages.length > 0 
      ? data.watermarkedImages 
      : data.imageUrls;

    // Stop execution if data or images are missing
    if (!data.productTitle && !data.ebayTitle) {
      console.error("❌ No stored product title. Need to run List-It first.");
      return;
    }

    if (!images || images.length === 0) {
      console.error("❌ No stored images. Need to run List-It first.");
      return;
    }

    const title = data.ebayTitle || data.productTitle;
    
    // Debug: Log all available form elements
    console.log("🔍 All form elements on page:");
    console.log("Inputs:", Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type,
      id: i.id,
      name: i.name,
      placeholder: i.placeholder,
      'aria-label': i.getAttribute('aria-label'),
      'data-testid': i.getAttribute('data-testid'),
      className: i.className
    })));
    
    console.log("File inputs:", Array.from(document.querySelectorAll('input[type="file"]')).map(i => ({
      id: i.id,
      name: i.name,
      accept: i.accept,
      multiple: i.multiple,
      'aria-label': i.getAttribute('aria-label'),
      'data-testid': i.getAttribute('data-testid')
    })));
    
    // Try to fill form fields with retry logic
    await fillFormFields(title, finalPrice, images[0]);

    console.log("✅ eBay automation completed");
  }
});

// Enhanced form filling function with retry logic
async function fillFormFields(title, finalPrice, firstImage) {
  console.log("🔧 Starting form filling process...");
  
  // Try multiple times with different strategies
  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`🔄 Attempt ${attempt}/5`);
    
    // Wait for elements to load
    await wait(1000);
    
    // Fill Title - try multiple selectors for different eBay page types
    let titleInput = document.querySelector("#editpane_title") || 
                    document.querySelector('input[name="title"]') ||
                    document.querySelector('input[placeholder*="title" i]') ||
                    document.querySelector('input[data-testid*="title" i]') ||
                    document.querySelector('input[aria-label*="title" i]') ||
                    document.querySelector('input[type="text"]:not([readonly])') ||
                    document.querySelector('textarea[placeholder*="title" i]') ||
                    document.querySelector('textarea[name*="title" i]');
    
    if (titleInput) {
      console.log("📝 Found title input:", titleInput);
      titleInput.focus();
      await wait(200);
      titleInput.value = '';
      await wait(200);
      titleInput.value = title;
      
      // Try multiple event types
      ['input', 'change', 'blur', 'keyup'].forEach(eventType => {
        titleInput.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      // Also try setting value directly
      titleInput.setAttribute('value', title);
      
      console.log("✅ Title filled:", title);
    } else {
      console.warn("⚠️ Title input not found on attempt", attempt);
    }

    // Fill Price - try multiple selectors
    let priceInput = document.querySelector("#binPrice") ||
                    document.querySelector('input[name*="price" i]') ||
                    document.querySelector('input[placeholder*="price" i]') ||
                    document.querySelector('input[data-testid*="price" i]') ||
                    document.querySelector('input[aria-label*="price" i]') ||
                    document.querySelector('input[type="number"]') ||
                    document.querySelector('input[type="text"][name*="price" i]');
    
    if (priceInput && finalPrice) {
      console.log("💰 Found price input:", priceInput);
      priceInput.focus();
      await wait(200);
      priceInput.value = '';
      await wait(200);
      priceInput.value = finalPrice;
      
      // Try multiple event types
      ['input', 'change', 'blur', 'keyup'].forEach(eventType => {
        priceInput.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      // Also try setting value directly
      priceInput.setAttribute('value', finalPrice);
      
      console.log("✅ Price filled:", finalPrice);
    } else {
      console.warn("⚠️ Price input not found on attempt", attempt);
    }

    // Upload first image - try multiple selectors and methods
    let uploader = document.querySelector('input[type="file"][multiple]') ||
                  document.querySelector('input[type="file"]') ||
                  document.querySelector('input[accept*="image"]') ||
                  document.querySelector('input[data-testid*="upload" i]') ||
                  document.querySelector('input[aria-label*="upload" i]') ||
                  document.querySelector('input[accept*="*"]');
    
    if (uploader && firstImage) {
      try {
        console.log("🖼️ Found uploader:", uploader);
        console.log("🖼️ Attempting to upload image:", firstImage);
        
        // Method 1: DataTransfer
        const blob = await fetch(firstImage).then(r => r.blob());
        const file = new File([blob], "main.jpg", { type: blob.type });
        const dt = new DataTransfer();
        dt.items.add(file);
        uploader.files = dt.files;
        
        // Method 2: Direct file assignment (if supported)
        try {
          uploader.files = [file];
        } catch (e) {
          console.log("Direct file assignment not supported, using DataTransfer");
        }
        
        // Dispatch events
        ['change', 'input', 'drop'].forEach(eventType => {
          uploader.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        console.log("✅ First image uploaded:", firstImage);
      } catch (error) {
        console.error("❌ Failed to upload image:", error);
        
        // Try alternative upload method
        try {
          console.log("🔄 Trying alternative upload method...");
          const response = await fetch(firstImage);
          const blob = await response.blob();
          const file = new File([blob], "image.jpg", { type: "image/jpeg" });
          
          // Create a new file input and trigger it
          const newUploader = document.createElement('input');
          newUploader.type = 'file';
          newUploader.multiple = true;
          newUploader.style.display = 'none';
          document.body.appendChild(newUploader);
          
          const dt = new DataTransfer();
          dt.items.add(file);
          newUploader.files = dt.files;
          newUploader.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Copy the files to the original uploader
          uploader.files = newUploader.files;
          uploader.dispatchEvent(new Event('change', { bubbles: true }));
          
          document.body.removeChild(newUploader);
          console.log("✅ Alternative upload method succeeded");
        } catch (altError) {
          console.error("❌ Alternative upload method also failed:", altError);
        }
      }
    } else {
      console.warn("⚠️ Image uploader not found on attempt", attempt);
    }
    
    // If we found and filled at least the title, break
    if (titleInput) {
      console.log("✅ Found title input, breaking retry loop");
      break;
    }
    
    // Wait before next attempt
    if (attempt < 5) {
      console.log("⏳ Waiting before retry...");
      await wait(2000);
    }
  }
}

// Helper function to avoid conflicts with other scripts
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to wait for an element to appear
async function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const element = document.querySelector(selector);
        if (element) return element;
        await wait(250);
    }
    throw new Error(`Element with selector "${selector}" not found.`);
}

// Enhanced automation function with sequential step-by-step logic
async function runEbayAutomation(data) {
    console.log("🚀 Starting enhanced eBay automation with data:", data);
    console.log("🔗 Current URL:", window.location.href);
    
    try {
        // Check if we're on a draft listing page
        const isDraftPage = window.location.href.includes('/lstng?draftId=') && window.location.href.includes('mode=AddItem');
        
        if (isDraftPage) {
            console.log("📝 Detected eBay draft listing page - using draft-specific flow");
            await runDraftListingFlow(data);
        } else {
            console.log("📝 Using standard listing flow");
            await runStandardListingFlow(data);
        }
        
        console.log("✅ Enhanced automation completed successfully");
        
        } catch (error) {
        console.error("❌ Enhanced automation failed:", error);
    }
}

// Draft listing page specific flow
async function runDraftListingFlow(data) {
    console.log("📋 Running draft listing flow...");
    console.log("📝 Data received:", data);
    
    // STEP 1: Paste Title
    if (data.ebayTitle) {
        console.log("📝 STEP 1: Pasting title...");
        const titleResult = await pasteInitialTitle(data.ebayTitle);
        console.log("📝 Title result:", titleResult);
        await wait(1000);
    } else {
        console.log("⚠️ No title data provided");
    }
    
    // STEP 2: Upload Images
    if (data.images && data.images.length > 0) {
        console.log("🖼️ STEP 2: Uploading images...");
        const imageResult = await uploadImages(data.images);
        console.log("🖼️ Image result:", imageResult);
        await wait(2000); // Wait longer for images to process
    } else {
        console.log("⚠️ No images data provided");
    }
    
    // STEP 3: Paste SKU (Custom label) - AFTER image upload
    if (data.ebaySku) {
        console.log("🏷️ STEP 3: Pasting SKU (Custom label) after image upload...");
        const skuResult = await setSkuField(data.ebaySku);
        console.log("🏷️ SKU result:", skuResult);
        await wait(1000); // Wait longer after SKU
    } else {
        console.log("⚠️ No SKU data provided");
    }
    
    // STEP 4: Set Item Specific (Condition)
    if (data.ebayCondition) {
        console.log("🔧 STEP 4: Setting condition...");
        const conditionResult = await setConditionField(data.ebayCondition);
        console.log("🔧 Condition result:", conditionResult);
        await wait(500);
                            } else {
        console.log("⚠️ No condition data provided");
    }
    
    // STEP 5: Set Price
    if (data.ebayPrice) {
        console.log("💰 STEP 5: Setting price...");
        const priceResult = await setPriceField(data.ebayPrice);
        console.log("💰 Price result:", priceResult);
        await wait(500);
                        } else {
        console.log("⚠️ No price data provided");
    }
    
    console.log("✅ Draft listing flow completed");
}

// Standard listing page flow (for non-draft pages)
async function runStandardListingFlow(data) {
    console.log("📋 Running standard listing flow...");
    
    // STEP 1: Initial Title Paste
    if (data.ebayTitle) {
        await pasteInitialTitle(data.ebayTitle);
        await wait(1000);
    }
    
    // STEP 2: Conditional Handling
    await handleConditionalLogic();
    await wait(1000);
    
    // STEP 3: Wait for Listing Form
    await waitForListingForm();
    await wait(1000);
    
    // STEP 4: Final Title Paste (in case fields refreshed)
    if (data.ebayTitle) {
        await pasteInitialTitle(data.ebayTitle);
        await wait(500);
    }
    
    // STEP 5: Upload Images
    if (data.images && data.images.length > 0) {
        await uploadImages(data.images);
        await wait(1000);
    }
    
    // STEP 6: Set SKU and Other Fields
    if (data.ebaySku) {
        await setSkuField(data.ebaySku);
        await wait(500);
    }
    
    if (data.ebayPrice) {
        await setPriceField(data.ebayPrice);
        await wait(500);
    }
    
    if (data.ebayCondition) {
        await setConditionField(data.ebayCondition);
        await wait(500);
    }
    
    console.log("✅ Standard listing flow completed");
}

// Optimized title function
async function pasteInitialTitle(title) {
    const titleSelectors = [
        'input#title',
        'textarea[name="title"]',
        '[data-test-id="title"]',
        'input[id*="@keyword-@box-@input-textbox"]',
        'input[name="title"]'
    ];
    
    const titleInput = await findInputByLabel('title', titleSelectors, 'title');
    if (titleInput) {
        fillInputField(titleInput, title, 'title');
        return true;
    }
    return false;
}

// STEP 2: Conditional Handling
async function handleConditionalLogic() {
    console.log("🔧 STEP 2: Handling conditional logic...");
    
    // First, check for "Continue without match" button
    const continueWithoutMatchBtn = findButtonByText("Continue without match") || 
                                   document.querySelector('button[data-test-id*="continue"], button[class*="continue"]');
    if (continueWithoutMatchBtn && isElementVisible(continueWithoutMatchBtn)) {
        console.log("✅ Found 'Continue without match' button, clicking immediately");
        continueWithoutMatchBtn.click();
        await wait(2000); // Wait for navigation
        return;
    }
    
    console.log("ℹ️ 'Continue without match' button not found, waiting for lightbox...");
    
    // Wait for lightbox to appear (condition selection usually happens in a lightbox)
    console.log("🔍 Waiting for condition selection lightbox...");
    await wait(3000);
    
    // Check for lightbox dialog
    const lightboxSelectors = [
        '.lightbox-dialog__window',
        '[class*="lightbox-dialog"]',
        '[role="dialog"]',
        '.modal',
        '[class*="modal"]',
        '.dialog',
        '[class*="dialog"]'
    ];
    
    let lightboxFound = false;
    let lightbox = null;
    for (const selector of lightboxSelectors) {
        lightbox = document.querySelector(selector);
        if (lightbox && isElementVisible(lightbox)) {
            console.log(`✅ Found lightbox with selector: ${selector}`);
            lightboxFound = true;
                        break;
                    }
                }
    
    if (!lightboxFound) {
        console.log("⚠️ No lightbox found, checking for condition radio buttons on main page...");
    }
    
    // Wait additional time for radio buttons to render
    await wait(1000);
    
    // Look for condition radio button (New = value="1000") - either in lightbox or main page
    let conditionRadio = null;
    
    if (lightboxFound && lightbox) {
        // Search within the lightbox first
        console.log("🔍 Searching for condition radio buttons within lightbox...");
        const lightboxRadios = lightbox.querySelectorAll('input[type="radio"]');
        console.log(`🔍 Found ${lightboxRadios.length} radio buttons in lightbox`);
        
        for (const radio of lightboxRadios) {
            console.log(`📻 Radio - Value: ${radio.value}, Name: ${radio.name}, ID: ${radio.id}`);
            if (radio.value === "1000") {
                conditionRadio = radio;
                console.log("✅ Found condition radio button (New) in lightbox");
                                    break;
                                }
                            }
                        }
                        
    // If not found in lightbox, search on main page
    if (!conditionRadio) {
        console.log("🔍 Searching for condition radio buttons on main page...");
        const conditionSelectors = [
            'input[type="radio"][name="condition"][value="1000"]',
            'input[type="radio"][value="1000"]',
            'input[type="radio"][data-value="1000"]'
        ];
        
        for (const selector of conditionSelectors) {
            conditionRadio = document.querySelector(selector);
            if (conditionRadio) {
                console.log(`✅ Found condition radio button with selector: ${selector}`);
                                    break;
                                }
                            }
                        }
                        
    if (conditionRadio) {
        console.log("🎯 Attempting to select condition radio button (New)...");
        
        // Check if already selected
        if (conditionRadio.checked) {
            console.log("ℹ️ Condition radio button already selected");
        } else {
            // Click the radio button
            conditionRadio.click();
            conditionRadio.dispatchEvent(new Event('change', { bubbles: true }));
            conditionRadio.dispatchEvent(new Event('click', { bubbles: true }));
            console.log("✅ Condition radio button (New) clicked");
        }
        
        // Wait for selection to be processed
        await wait(1000);
        
        // Look for "Continue to listing" or similar button
        const continueButtons = [
            findButtonByText("Continue to listing"),
            findButtonByText("Continue"),
            findButtonByText("Next"),
            findButtonByText("Submit"),
            document.querySelector('button[data-test-id*="continue"]'),
            document.querySelector('button[class*="continue"]'),
            document.querySelector('button[type="submit"]')
        ].filter(btn => btn && isElementVisible(btn));
        
        if (continueButtons.length > 0) {
            const continueBtn = continueButtons[0];
            console.log("✅ Found continue button, clicking it");
            continueBtn.click();
            await wait(2000); // Wait for navigation
            return;
            } else {
            console.log("⚠️ No continue button found after condition selection");
        }
    } else {
        console.log("⚠️ No condition radio button found for value '1000' (New)");
    }
    
    console.log("ℹ️ Conditional logic handling completed");
}

// STEP 3: Wait for Listing Form
async function waitForListingForm() {
    console.log("⏳ STEP 3: Waiting for listing form...");
    
    const formSelectors = [
        'form#listingForm',
        '[data-test-id="listing-form"]',
        'form[action*="listing"]',
        'form[class*="listing"]'
    ];
    
    // Use MutationObserver for dynamic content
    return new Promise((resolve) => {
        let formFound = false;
        
        const checkForForm = () => {
            for (const selector of formSelectors) {
                const form = document.querySelector(selector);
                if (form && isElementVisible(form)) {
                    console.log(`✅ Listing form found with selector: ${selector}`);
                    formFound = true;
                    resolve(true);
                    return;
                }
            }
        };
        
        // Check immediately
        checkForForm();
        if (formFound) return;
        
        // Set up MutationObserver
        const observer = new MutationObserver(() => {
            checkForForm();
            if (formFound) {
                observer.disconnect();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
        
        // Fallback timeout
        setTimeout(() => {
            if (!formFound) {
                console.log("⚠️ Listing form not found, continuing anyway...");
                observer.disconnect();
                resolve(false);
            }
        }, 10000);
    });
}


// STEP 5: Upload Images
async function uploadImages(imagePaths) {
    console.log("🖼️ STEP 5: Uploading images...");
    
    const fileInput = document.querySelector('input[type="file"], [data-test-id="image-uploader"]');
    if (!fileInput) {
        console.error("❌ File input not found");
        return false;
    }
    
    try {
        // Create FileList from paths (this is a simplified approach)
        // In a real implementation, you'd need to handle file access differently
        console.log("📁 Image paths to upload:", imagePaths);
        
        // For now, just log the paths - actual file upload would require additional setup
        console.log("ℹ️ Image upload functionality needs to be implemented with proper file handling");
        return true;
        } catch (error) {
        console.error("❌ Image upload failed:", error);
        return false;
    }
}

/**
 * Finds and fills the SKU field (Custom Label) reliably
 */
async function setSkuField(sku) {
    console.log("🏷️ Setting SKU field (Custom label)...");
    console.log("🎯 Target SKU:", sku);

    // Common selectors for eBay's SKU input
    const selectors = [
        'input[name="customLabel"][type="text"]',
        'input[name="customLabel"]',
        'input[name="sku"]',
        'input[aria-label*="Custom label"]',
        'input[placeholder*="Custom label"]',
        'input[id*="@TITLE"]',
        'input[data-test-id="sku"]'
    ];

    let input = null;

    // Try to locate the field
    for (const selector of selectors) {
        input = queryDeep(selector);
        if (input) {
            console.log(`✅ Found SKU input using selector: ${selector}`);
                                break;
        }
    }

    if (!input) {
        console.log("⚠️ SKU field not found, scanning all text inputs...");
        const allInputs = document.querySelectorAll('input[type="text"]');
        for (const el of allInputs) {
            if (
                el.name.includes("customLabel") ||
                el.name.includes("sku") ||
                el.placeholder.toLowerCase().includes("label")
            ) {
                console.log(`✅ Found potential SKU field: ${el.name || el.id}`);
                input = el;
                break;
            }
        }
    }

    if (!input) {
        console.error("❌ Could not find any SKU input field");
        return false;
    }

    // Wait to ensure React hydrated the input
    await new Promise(r => setTimeout(r, 800));

    // Fill using React-safe method
    const success = setReactInputValue(input, sku, "SKU");
    if (!success) {
        console.warn("⚠️ Fallback: setting value directly");
        input.value = sku;
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return true;
}

// Shared helper functions
function isElementVisible(element) {
    return element && element.offsetParent !== null && element.offsetWidth > 0 && element.offsetHeight > 0;
}

function findButtonByText(text) {
    const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]');
    for (const button of buttons) {
        if (button.textContent.toLowerCase().includes(text.toLowerCase())) {
            return button;
        }
    }
    return null;
}

/**
 * Find input field by label text and multiple fallback methods
 * @param {string} labelText - Text to search for in labels
 * @param {Array} directSelectors - Array of direct CSS selectors to try
 * @param {string} fieldName - Name of the field for logging
 * @returns {HTMLElement|null} - Found input element or null
 */
async function findInputByLabel(labelText, directSelectors, fieldName) {
    console.log(`🔍 Looking for ${fieldName} field...`);
    
    // Method 1: Find by label text
    const allLabels = document.querySelectorAll('label.field__label, label');
    for (const label of allLabels) {
        if (label.textContent.includes(labelText)) {
            const forAttribute = label.getAttribute('for');
            if (forAttribute) {
                const element = document.getElementById(forAttribute);
                if (element && (element.type === 'text' || element.tagName === 'INPUT')) {
                    console.log(`✅ Found ${fieldName} via label: ${forAttribute}`);
                    return element;
                }
            }
        }
    }
    
    // Method 2: Direct selectors
    for (const selector of directSelectors) {
        try {
            const element = await waitForElement(selector, 2000);
            if (element && (element.type === 'text' || element.tagName === 'INPUT')) {
                console.log(`✅ Found ${fieldName} via selector: ${selector}`);
                return element;
            }
        } catch (e) {
            // Continue to next selector
        }
    }
    
    console.error(`❌ Could not find ${fieldName} field`);
    return null;
}

/**
 * Fill input field with value and dispatch events
 * @param {HTMLElement} input - Input element to fill
 * @param {string} value - Value to set
 * @param {string} fieldName - Name of field for logging
 */
function fillInputField(input, value, fieldName) {
    console.log(`✏️ Setting ${fieldName} to: "${value}"`);
    
    // Clear existing value
    input.value = '';
    input.focus();
    
    // Set new value
    input.value = value;
    
    // Dispatch events
    const events = ['input', 'change', 'paste', 'blur', 'keyup'];
    events.forEach(eventType => {
        input.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
    
    // Focus and blur for validation
    setTimeout(() => {
        input.blur();
        console.log(`✅ ${fieldName} set successfully: "${input.value}"`);
    }, 100);
}

/**
 * Deep query that searches inside shadow DOMs as well.
 * eBay sometimes wraps inputs in shadow roots.
 */
function queryDeep(selector, root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.matches && node.matches(selector)) return node;
        if (node.shadowRoot) {
            const found = queryDeep(selector, node.shadowRoot);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Force React-compatible input fill (for eBay React forms)
 * Works for SKU, title, price, etc.
 */
function setReactInputValue(input, value, fieldName = "field") {
    if (!input) {
        console.error(`❌ Cannot set ${fieldName}: input not found`);
        return false;
    }

    try {
        console.log(`✏️ Setting ${fieldName}: "${value}"`);

        // 1️⃣ Use the real native setter (React listens to this)
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, value);

        // 2️⃣ Dispatch React-supported events
        ["input", "change", "blur"].forEach(evt =>
            input.dispatchEvent(new Event(evt, { bubbles: true }))
        );

        // 3️⃣ Confirm visually and log
        setTimeout(() => {
            console.log(`✅ ${fieldName} value verified: "${input.value}"`);
        }, 200);

        return true;
    } catch (err) {
        console.error(`❌ Failed to set ${fieldName}:`, err);
        return false;
    }
}

// Aggressive SKU setter with multiple retries
function setSkuAggressive(input, value) {
    console.log(`🔥 AGGRESSIVE SKU setting: "${value}"`);
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const trySetValue = () => {
        attempts++;
        console.log(`🔄 Attempt ${attempts}/${maxAttempts}`);
        
        // Clear and set value
        input.focus();
        input.value = '';
        input.value = value;
        
        // Dispatch comprehensive events
        const events = [
            'focus', 'keydown', 'keypress', 'keyup', 
            'input', 'change', 'paste', 'blur'
        ];
        
                events.forEach(eventType => {
            input.dispatchEvent(new Event(eventType, { 
                bubbles: true, 
                cancelable: true 
            }));
                });
                
        // Check if value stuck after a short delay
                setTimeout(() => {
            console.log(`📊 After attempt ${attempts}, value is: "${input.value}"`);
            
            if (input.value === value) {
                console.log(`🎉 SUCCESS! SKU value set on attempt ${attempts}`);
                return;
            } else if (attempts < maxAttempts) {
                console.log(`❌ Attempt ${attempts} failed, retrying...`);
                setTimeout(trySetValue, 100);
            } else {
                console.log(`💥 All ${maxAttempts} attempts failed`);
            }
        }, 50);
    };
    
    trySetValue();
}

// Force SKU value with mutation observer
function forceSkuValue(input, value) {
    console.log(`💪 FORCING SKU value: "${value}"`);
    
    // Set up a mutation observer to watch for value changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                console.log(`🔄 Value attribute changed to: "${input.value}"`);
                if (input.value !== value) {
                    console.log(`⚠️ Value was changed, resetting to: "${value}"`);
                    input.value = value;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });
    });
    
    // Start observing
    observer.observe(input, { 
        attributes: true, 
        attributeFilter: ['value'] 
    });
    
    // Set the value
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Stop observing after 5 seconds
    setTimeout(() => {
        observer.disconnect();
        console.log(`🛑 Stopped observing SKU field`);
    }, 5000);
}

/**
 * React-compatible eBay price field setter.
 * Called from updateEbayPriceFromAmazon()
 */
async function setPriceField(price) {
    console.log("💰 Setting price field (React-compatible)...");
    console.log("🎯 Target price to paste:", price);

    const selectors = [
        'input[name="price"]',
        'input[data-test-id="price"]',
        'input[id*="@PRICE"]',
        'input[aria-label*="Price"]',
        'input[placeholder*="Price"]',
        'input[aria-describedby*="se-textbox-prefix"]'
    ];

    let input = null;

    // Try normal DOM and shadow DOM
    for (const selector of selectors) {
        input = queryDeep(selector);
        if (input) {
            console.log(`✅ Found price input using selector: ${selector}`);
            break;
        }
    }

    if (!input) {
        console.warn("⚠️ Price field not found, scanning all text inputs...");
        const allInputs = document.querySelectorAll('input[type="text"], input[type="number"]');
        for (const el of allInputs) {
            const placeholder = (el.placeholder || "").toLowerCase();
            if (
                el.name.includes("price") ||
                el.id.toLowerCase().includes("price") ||
                placeholder.includes("price") ||
                el.ariaLabel?.toLowerCase().includes("price")
            ) {
                console.log(`✅ Found potential price input: ${el.name || el.id}`);
                input = el;
                break;
            }
        }
    }

    if (!input) {
        console.error("❌ Could not find price input field");
        return false;
    }

    // Wait briefly to ensure field is hydrated by React
    await new Promise(r => setTimeout(r, 500));

    // Fill using React-safe setter
    const success = setReactInputValue(input, price, "price");
    if (!success) {
        console.warn("⚠️ Fallback: setting value directly");
        input.value = price;
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return true;
}

async function setConditionField(condition) {
    const conditionSelectors = [
        `input[type="radio"][name="condition"][value="${condition}"]`,
        `input[type="radio"][value="${condition}"]`,
        `input[type="radio"][data-value="${condition}"]`
    ];
    
    for (const selector of conditionSelectors) {
        try {
            const conditionRadio = await waitForElement(selector, 3000);
            if (conditionRadio) {
                console.log(`✅ Found condition radio: ${selector}`);
                conditionRadio.click();
                conditionRadio.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ Condition set: ${condition}`);
                return true;
            }
        } catch (error) {
            // Continue to next selector
        }
    }
    
    console.error("❌ Could not find condition field");
    return false;
}


// Wait for page to be fully loaded before running automation
function waitForPageLoad() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
}

// Entry Point
async function initializeEbayLister() {
    // Check if we're on the right page
    const isListingPage = window.location.href.includes('ebay.com/lstng') || 
                         window.location.href.includes('ebay.com/sl/prelist');
    
    if (!isListingPage) {
        return;
    }
    
    // Wait for page to be fully loaded
    await waitForPageLoad();
    
    // Additional wait for dynamic content - eBay pages can be slow
    await wait(3000);
    
    chrome.storage.local.get(['ebayTitle','ebaySku','ebayPrice','ebayCondition','amazonPrice','pricingConfig','images','itemSpecifics'], async (result) => {
        // Ensure valid price
        if ((!result.ebayPrice || !isFinite(result.ebayPrice)) && result.amazonPrice && result.pricingConfig) {
            const s = result.pricingConfig;
            const afterTax = (result.amazonPrice + s.trackingFee) * (1 + s.taxPercent/100);
            const margin = 1 + (s.ebayFeePercent + s.promoFeePercent + s.profitPercent)/100;
            result.ebayPrice = +(afterTax * margin).toFixed(2);
            await new Promise(r=>chrome.storage.local.set({ ebayPrice: result.ebayPrice }, r));
        }
        
        if (result.ebayTitle || result.ebaySku || result.ebayPrice || result.ebayCondition) {
            await runEbayAutomation(result);

            // Cleanup storage after use
            chrome.storage.local.remove(['ebayTitle', 'ebaySku', 'ebayPrice', 'ebayCondition'], () => {});
        }
    });
}

// Essential functions only

// Start the initialization with a small delay to ensure page is ready
setTimeout(() => {
    initializeEbayLister();
}, 1000);

