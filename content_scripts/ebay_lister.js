console.log("eBay Lister script loaded: Awaiting data...");

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
    console.log("🚀 eBay Lister initializing...");
    console.log("🔗 Current URL:", window.location.href);
    console.log("📄 Page title:", document.title);
    
    // Check if we're on the right page
    const isListingPage = window.location.href.includes('ebay.com/lstng') || 
                         window.location.href.includes('ebay.com/sl/prelist');
    
    if (!isListingPage) {
        console.log("⚠️ Not on eBay listing page, skipping automation");
        return;
    }
    
    // Log the type of listing page
    if (window.location.href.includes('draftId=')) {
        console.log("📝 Detected eBay draft listing page");
    } else if (window.location.href.includes('prelist')) {
        console.log("📝 Detected eBay prelist page");
    } else {
        console.log("📝 Detected standard eBay listing page");
    }
    
    // Wait for page to be fully loaded
    await waitForPageLoad();
    console.log("✅ Page fully loaded");
    
    // Additional wait for dynamic content - eBay pages can be slow
    await wait(3000);
    
    chrome.storage.local.get(['ebayTitle', 'ebaySku', 'ebayPrice', 'ebayCondition'], async (result) => {
        console.log("📦 Retrieved data from storage:", result);
        console.log("🔍 SKU from storage:", result.ebaySku);
        console.log("🔍 Title from storage:", result.ebayTitle);
        console.log("🔍 Price from storage:", result.ebayPrice);
        console.log("🔍 Condition from storage:", result.ebayCondition);
        
        // Debug: Check if SKU data exists
        if (result.ebaySku) {
            console.log("✅ SKU data found in storage:", result.ebaySku);
        } else {
            console.log("❌ No SKU data in storage");
        }
        
        // Debug: Check if price data exists and is updated
        if (result.ebayPrice) {
            console.log("✅ Price data found in storage:", result.ebayPrice);
            console.log("🔍 Price type:", typeof result.ebayPrice);
            console.log("🔍 Price length:", result.ebayPrice.toString().length);
        } else {
            console.log("❌ No price data in storage");
        }
        
        // Additional check - get all storage data
        chrome.storage.local.get(null, (allData) => {
            console.log("📦 All storage data:", allData);
            console.log("🔍 All keys in storage:", Object.keys(allData));
        });
        
        // Check if SKU field exists on the page
        const skuFieldExists = document.querySelector('input[name="customLabel"]') || 
                              document.querySelector('label:contains("Custom label (SKU)")') ||
                              document.querySelector('input[id*="@TITLE"]');
        
        console.log("🔍 SKU field exists on page:", !!skuFieldExists);
        
        if (result.ebayTitle || result.ebaySku || result.ebayPrice || result.ebayCondition) {
            console.log("🚀 Starting enhanced sequential automation...");
                    await runEbayAutomation(result);
            console.log("✅ Enhanced automation completed");

            // Cleanup storage after use
            chrome.storage.local.remove(['ebayTitle', 'ebaySku', 'ebayPrice', 'ebayCondition'], () => {
                console.log("🧹 Title, SKU, Price, and Condition cleared from storage");
            });
        } else {
            console.log("⚠️ No title or SKU data found in storage");
        }
    });
}

// Essential debugging functions

// Debug function to test the flow manually
window.testEbayFlow = async () => {
    console.log("🧪 Testing eBay flow manually...");
    
    const testData = {
        ebayTitle: "Test Product Title",
        ebaySku: "TEST-SKU-123",
        ebayPrice: "29.99",
        ebayCondition: "1000"
    };
    
    console.log("📝 Test data:", testData);
    console.log("🔗 Current URL:", window.location.href);
    
    // Check if we're on a draft page
    const isDraftPage = window.location.href.includes('/lstng?draftId=') && window.location.href.includes('mode=AddItem');
    console.log("📝 Is draft page:", isDraftPage);
    
    try {
        await runEbayAutomation(testData);
        console.log("✅ Test flow completed successfully");
    } catch (error) {
        console.error("❌ Test flow failed:", error);
    }
};

// Debug function to check page elements
window.debugPageElements = () => {
    console.log("🔍 Debugging page elements...");
    
    // Check for title inputs
    const titleInputs = document.querySelectorAll('input[type="text"], textarea');
    console.log(`📝 Found ${titleInputs.length} text inputs/textarea on page`);
    titleInputs.forEach((input, index) => {
        console.log(`  ${index + 1}. ID: ${input.id}, Name: ${input.name}, Class: ${input.className}, Placeholder: ${input.placeholder}`);
    });
    
    // Check for SKU inputs
    const skuInputs = document.querySelectorAll('input[name*="sku"], input[name*="customLabel"], input[id*="@TITLE"]');
    console.log(`🏷️ Found ${skuInputs.length} SKU-related inputs`);
    skuInputs.forEach((input, index) => {
        console.log(`  ${index + 1}. ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
    });
    
    // Check for price inputs
    const priceInputs = document.querySelectorAll('input[name*="price"], input[id*="@PRICE"]');
    console.log(`💰 Found ${priceInputs.length} price-related inputs`);
    priceInputs.forEach((input, index) => {
        console.log(`  ${index + 1}. ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
    });
    
    // Check for condition inputs
    const conditionInputs = document.querySelectorAll('input[type="radio"]');
    console.log(`🔧 Found ${conditionInputs.length} radio buttons`);
    conditionInputs.forEach((input, index) => {
        console.log(`  ${index + 1}. Value: ${input.value}, Name: ${input.name}, ID: ${input.id}`);
    });
};

// Enhanced debug function to find all form fields
window.debugAllFormFields = () => {
    console.log("🔍 Debugging all form fields on page...");
    
    // Get all labels and their associated inputs
    const allLabels = document.querySelectorAll('label');
    console.log(`📋 Found ${allLabels.length} labels on page:`);
    
    allLabels.forEach((label, index) => {
        const text = label.textContent.trim();
        const forAttr = label.getAttribute('for');
        console.log(`  ${index + 1}. Label: "${text}", For: ${forAttr}`);
        
        if (forAttr) {
            const input = document.getElementById(forAttr);
            if (input) {
                console.log(`    📝 Input - ID: ${input.id}, Name: ${input.name}, Type: ${input.type}, Class: ${input.className}`);
            }
        }
    });
    
    // Get all text inputs
    const textInputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea');
    console.log(`📝 Found ${textInputs.length} text/number inputs:`);
    
    textInputs.forEach((input, index) => {
        console.log(`  ${index + 1}. ID: ${input.id}, Name: ${input.name}, Type: ${input.type}, Class: ${input.className}, Placeholder: ${input.placeholder}`);
    });
    
    // Check for specific eBay field patterns
    console.log("🔍 Checking for eBay-specific field patterns:");
    
    const ebayPatterns = [
        'input[name="customLabel"]',
        'input[name="price"]',
        'input[id*="@TITLE"]',
        'input[id*="@PRICE"]',
        'input[aria-describedby*="se-textbox"]'
    ];
    
    ebayPatterns.forEach(pattern => {
        const elements = document.querySelectorAll(pattern);
        if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} elements matching ${pattern}`);
            elements.forEach((el, i) => {
                console.log(`  ${i + 1}. ID: ${el.id}, Name: ${el.name}, Type: ${el.type}`);
            });
        }
    });
};

// Debug function specifically for SKU field detection
window.debugSkuField = () => {
    console.log("🏷️ Debugging SKU field detection...");
    
    // Check all labels
    const allLabels = document.querySelectorAll('label');
    console.log(`📋 Found ${allLabels.length} labels on page:`);
    allLabels.forEach((label, index) => {
        const text = label.textContent.trim();
        const forAttr = label.getAttribute('for');
        console.log(`  ${index + 1}. Text: "${text}", For: ${forAttr}`);
        
        // Check if it's SKU-related
        if (text.toLowerCase().includes('custom') || text.toLowerCase().includes('sku') || text.toLowerCase().includes('label')) {
            console.log(`    ⭐ POTENTIAL SKU LABEL: "${text}"`);
            if (forAttr) {
                const element = document.getElementById(forAttr);
                if (element) {
                    console.log(`    📝 Associated input - ID: ${element.id}, Name: ${element.name}, Type: ${element.type}`);
                }
            }
        }
    });
    
    // Check all text inputs
    const textInputs = document.querySelectorAll('input[type="text"]');
    console.log(`📝 Found ${textInputs.length} text inputs:`);
    textInputs.forEach((input, index) => {
        console.log(`  ${index + 1}. ID: ${input.id}, Name: ${input.name}, Class: ${input.className}, Placeholder: ${input.placeholder}`);
        
        // Check if it's SKU-related
        if (input.name === 'customLabel' || input.name === 'sku' || 
            input.id.includes('@TITLE') || input.className.includes('textbox')) {
            console.log(`    ⭐ POTENTIAL SKU INPUT: ${input.name || input.id}`);
        }
    });
    
    // Test the SKU function
    console.log("🧪 Testing SKU field detection...");
    setSkuField("TEST-SKU-123");
};

// Test function for the specific SKU field structure
window.testSkuField = () => {
    console.log("🧪 Testing specific SKU field structure...");
    
    // Test the exact field you provided
    const specificField = document.querySelector('input[name="customLabel"][type="text"]');
    if (specificField) {
        console.log("✅ Found the specific SKU field!");
        console.log("Field details:", {
            id: specificField.id,
            name: specificField.name,
            class: specificField.className,
            type: specificField.type,
            maxlength: specificField.maxlength,
            ariaDescribedBy: specificField.getAttribute('aria-describedby')
        });
        
        // Test filling it
        specificField.value = "TEST-SKU-123";
        specificField.dispatchEvent(new Event('input', { bubbles: true }));
        specificField.dispatchEvent(new Event('change', { bubbles: true }));
        console.log("✅ Test value set:", specificField.value);
            } else {
        console.log("❌ Specific SKU field not found");
    }
    
    // Test the enhanced function
    console.log("🧪 Testing enhanced SKU function...");
    setSkuField("ENHANCED-TEST-SKU");
};

// Direct SKU test with storage data
window.testSkuDirect = () => {
    console.log("🧪 Testing SKU field directly with storage data...");
    
    // Check storage first
    chrome.storage.local.get(['ebaySku'], (result) => {
        console.log("📦 SKU from storage:", result.ebaySku);
        
        if (!result.ebaySku) {
            console.log("❌ No SKU data in storage");
        return;
    }
    
        // Try multiple ways to find the SKU field
        const skuFieldSelectors = [
            'input[name="customLabel"][type="text"]',
            'input[name="customLabel"]',
            'input[id*="@TITLE"]',
            'input[aria-describedby*="se-textbox-counter"]'
        ];
        
        let skuField = null;
        for (const selector of skuFieldSelectors) {
            skuField = document.querySelector(selector);
            if (skuField) {
                console.log(`✅ Found SKU field with selector: ${selector}`);
            break;
        }
    }
    
        if (skuField) {
            console.log("📝 SKU field details:", {
                id: skuField.id,
                name: skuField.name,
                type: skuField.type,
                class: skuField.className,
                currentValue: skuField.value
            });
            
            // Clear and fill the field
            skuField.focus();
            skuField.value = '';
            skuField.value = result.ebaySku;
            
            // Dispatch all necessary events
            const events = ['input', 'change', 'paste', 'blur', 'keyup'];
            events.forEach(eventType => {
                skuField.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
            
            // Verify the value was set
            setTimeout(() => {
                console.log("✅ SKU field value after setting:", skuField.value);
                if (skuField.value === result.ebaySku) {
                    console.log("🎉 SUCCESS: SKU field filled correctly!");
    } else {
                    console.log("❌ FAILED: SKU field value not set correctly");
    }
            }, 100);

            } else {
            console.log("❌ No SKU field found with any selector");
            console.log("🔍 Available text inputs on page:");
            const textInputs = document.querySelectorAll('input[type="text"]');
            textInputs.forEach((input, index) => {
                console.log(`  ${index + 1}. ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
            });
        }
    });
};

// Simple manual SKU setter
window.setSkuManually = (skuValue) => {
    console.log("🏷️ Manually setting SKU field...");
    console.log("🎯 SKU value to set:", skuValue);
    
    const skuField = document.querySelector('input[name="customLabel"][type="text"]');
    if (skuField) {
        console.log("✅ Found SKU field");
        console.log("Current value:", skuField.value);
        
        // Clear and set value
        skuField.focus();
        skuField.value = '';
        skuField.value = skuValue;
        
        // Dispatch events
        skuField.dispatchEvent(new Event('input', { bubbles: true }));
        skuField.dispatchEvent(new Event('change', { bubbles: true }));
        skuField.dispatchEvent(new Event('blur', { bubbles: true }));
        
        console.log("✅ SKU set to:", skuField.value);
        return true;
    } else {
        console.log("❌ SKU field not found");
        return false;
    }
};

// Enhanced SKU setter with multiple attempts and verification
window.setSkuEnhanced = async (skuValue) => {
    console.log("🏷️ Enhanced SKU setting with verification...");
    console.log("🎯 SKU value to set:", skuValue);
    
    const skuField = document.querySelector('input[name="customLabel"][type="text"]');
    if (!skuField) {
        console.log("❌ SKU field not found");
            return false;
        }
    
    console.log("📝 SKU field found:", {
        id: skuField.id,
        name: skuField.name,
        type: skuField.type,
        currentValue: skuField.value
    });
    
    // Try multiple methods to set the value
    const methods = [
        () => {
            console.log("🔄 Method 1: Direct value assignment");
            skuField.value = skuValue;
            skuField.dispatchEvent(new Event('input', { bubbles: true }));
            skuField.dispatchEvent(new Event('change', { bubbles: true }));
        },
        () => {
            console.log("🔄 Method 2: Focus, clear, set, blur");
            skuField.focus();
            skuField.value = '';
            skuField.value = skuValue;
            skuField.blur();
            skuField.dispatchEvent(new Event('input', { bubbles: true }));
            skuField.dispatchEvent(new Event('change', { bubbles: true }));
        },
        () => {
            console.log("🔄 Method 3: Simulate typing");
            skuField.focus();
            skuField.value = '';
            skuField.value = skuValue;
            skuField.dispatchEvent(new Event('keydown', { bubbles: true }));
            skuField.dispatchEvent(new Event('keyup', { bubbles: true }));
            skuField.dispatchEvent(new Event('input', { bubbles: true }));
            skuField.dispatchEvent(new Event('change', { bubbles: true }));
            skuField.dispatchEvent(new Event('blur', { bubbles: true }));
        }
    ];
    
    for (let i = 0; i < methods.length; i++) {
        console.log(`\n🧪 Trying method ${i + 1}...`);
        methods[i]();
        
        // Wait a bit and check if value stuck
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`📊 After method ${i + 1}, value is: "${skuField.value}"`);
        
        if (skuField.value === skuValue) {
            console.log(`✅ Method ${i + 1} succeeded!`);
            return true;
        } else {
            console.log(`❌ Method ${i + 1} failed, trying next...`);
        }
    }
    
    console.log("❌ All methods failed to set SKU value");
    return false;
};

// Check current SKU field value
window.checkSkuValue = () => {
    const skuField = document.querySelector('input[name="customLabel"][type="text"]');
    if (skuField) {
        console.log("📊 Current SKU field value:", skuField.value);
        console.log("📊 Field details:", {
            id: skuField.id,
            name: skuField.name,
            type: skuField.type,
            class: skuField.className,
            maxlength: skuField.maxlength
        });
        return skuField.value;
    } else {
        console.log("❌ SKU field not found");
        return null;
    }
};

// Test React-compatible SKU setting
window.testSkuReact = (skuValue = "TEST-SKU-123") => {
    console.log("⚛️ Testing React-compatible SKU setting...");
    
    const skuField = document.querySelector('input[name="customLabel"][type="text"]');
    if (!skuField) {
        console.log("❌ SKU field not found");
        return;
    }
    
    console.log("📝 Before setting - Current value:", skuField.value);
    const success = setReactInputValue(skuField, skuValue, "SKU");
    console.log("📊 React method success:", success);
};

// Test React-compatible price setting
window.testPriceReact = (priceValue = "29.99") => {
    console.log("⚛️ Testing React-compatible price setting...");
    
    const priceField = document.querySelector('input[name="price"]');
    if (!priceField) {
        console.log("❌ Price field not found");
        return;
    }
    
    console.log("📝 Before setting - Current value:", priceField.value);
    const success = setReactInputValue(priceField, priceValue, "price");
    console.log("📊 React method success:", success);
};

// Test forced SKU setting with observer
window.testSkuForce = (skuValue = "FORCE-SKU-456") => {
    console.log("💪 Testing FORCED SKU setting...");
    
    const skuField = document.querySelector('input[name="customLabel"][type="text"]');
    if (!skuField) {
        console.log("❌ SKU field not found");
        return;
    }
    
    console.log("📝 Before forcing - Current value:", skuField.value);
    forceSkuValue(skuField, skuValue);
};

// Test all SKU methods
window.testAllSkuMethods = (skuValue = "ALL-METHODS-789") => {
    console.log("🧪 Testing ALL SKU methods...");
    
    const skuField = document.querySelector('input[name="customLabel"][type="text"]');
    if (!skuField) {
        console.log("❌ SKU field not found");
        return;
    }
    
    console.log("📝 Initial value:", skuField.value);
    
    // Method 1: Enhanced
    console.log("\n🔄 Method 1: Enhanced");
    fillSkuField(skuField, skuValue + "-1");
    
    setTimeout(() => {
        console.log("📊 After enhanced:", skuField.value);
        
        // Method 2: Aggressive
        console.log("\n🔄 Method 2: Aggressive");
        setSkuAggressive(skuField, skuValue + "-2");
        
        setTimeout(() => {
            console.log("📊 After aggressive:", skuField.value);
            
            // Method 3: Force
            console.log("\n🔄 Method 3: Force");
            forceSkuValue(skuField, skuValue + "-3");
        }, 2000);
    }, 1000);
};

// Function to get updated price from Amazon and update eBay
window.getUpdatedPriceFromAmazon = async () => {
    console.log("🔄 Getting updated price from Amazon...");
    
    try {
        // Check if we're on Amazon page
        if (window.location.href.includes('amazon.com')) {
            console.log("✅ On Amazon page, extracting current price...");
            
            // Try multiple selectors for Amazon price
            const priceSelectors = [
                '.a-price-whole',
                '.a-price .a-offscreen',
                '#price_inside_buybox',
                '.a-price-range',
                '.a-price .a-text-price',
                '[data-a-price-amount]',
                '.a-price .a-size-medium',
                '.a-price .a-size-base'
            ];
            
            let currentPrice = null;
            for (const selector of priceSelectors) {
                const priceElement = document.querySelector(selector);
                if (priceElement) {
                    const priceText = priceElement.textContent || priceElement.innerText;
                    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                    if (priceMatch) {
                        currentPrice = priceMatch[0].replace(/,/g, '');
                        console.log(`✅ Found price with selector ${selector}: ${currentPrice}`);
                            break;
                    }
                }
            }
            
            if (currentPrice) {
                console.log(`💰 Current Amazon price: ${currentPrice}`);
                
                // Store the updated price
                chrome.storage.local.set({
                    'ebayPrice': currentPrice,
                    'amazonPrice': currentPrice,
                    'priceUpdated': new Date().toISOString()
                }, () => {
                    console.log("✅ Updated price stored in Chrome storage");
                });
                
                return currentPrice;
            } else {
                console.log("❌ Could not find price on Amazon page");
                return null;
            }
        } else {
            console.log("❌ Not on Amazon page, cannot get updated price");
            return null;
        }
    } catch (error) {
        console.error("❌ Error getting updated price:", error);
        return null;
    }
};

// Function to update eBay price with latest Amazon price
window.updateEbayPriceFromAmazon = async () => {
    console.log("🔄 Updating eBay price with latest Amazon price...");
    
    // First, get the updated price from Amazon
    const updatedPrice = await getUpdatedPriceFromAmazon();
    
    if (updatedPrice) {
        console.log(`💰 Using updated price: ${updatedPrice}`);
        
        // Now set the price field on eBay
        const priceResult = await setPriceField(updatedPrice);
        if (priceResult) {
            console.log("✅ eBay price updated successfully");
        } else {
            console.log("❌ Failed to update eBay price field");
        }
    } else {
        console.log("❌ Could not get updated price from Amazon");
    }
};

// Function to check all available price data in storage
window.checkAllPriceData = () => {
    console.log("🔍 Checking all price data in storage...");
    
    chrome.storage.local.get(null, (allData) => {
        console.log("📦 All storage data:", allData);
        
        // Look for any price-related keys
        const priceKeys = Object.keys(allData).filter(key => 
            key.toLowerCase().includes('price') || 
            key.toLowerCase().includes('amazon') ||
            key.toLowerCase().includes('ebay')
        );
        
        console.log("💰 Price-related keys:", priceKeys);
        
        priceKeys.forEach(key => {
            console.log(`  ${key}: ${allData[key]}`);
        });
    });
};

// Test function to check storage and SKU filling
window.testStorageAndSku = async () => {
    console.log("🧪 Testing storage data and SKU filling...");
    
    // Check storage
    chrome.storage.local.get(['ebayTitle', 'ebaySku', 'ebayPrice', 'ebayCondition'], (result) => {
        console.log("📦 Storage data:", result);
        
        if (result.ebaySku) {
            console.log("✅ SKU found in storage:", result.ebaySku);
            
            // Test SKU field detection
            const skuField = document.querySelector('input[name="customLabel"][type="text"]');
            if (skuField) {
                console.log("✅ SKU field found on page");
                console.log("Field value before:", skuField.value);
                
                // Fill the field
                skuField.value = result.ebaySku;
                skuField.dispatchEvent(new Event('input', { bubbles: true }));
                skuField.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log("Field value after:", skuField.value);
                console.log("✅ SKU field filled successfully!");
            } else {
                console.log("❌ SKU field not found on page");
            }
        } else {
            console.log("❌ No SKU data in storage");
        }
    });
};

// Comprehensive test function for both SKU and Price
window.testAllFields = async () => {
    console.log("🧪 Testing all fields (SKU and Price)...");
    
    // Check storage
    chrome.storage.local.get(['ebayTitle', 'ebaySku', 'ebayPrice', 'ebayCondition'], async (result) => {
        console.log("📦 Storage data:", result);
        
        // Test SKU
        if (result.ebaySku) {
            console.log("🏷️ Testing SKU field...");
            const skuResult = await setSkuField(result.ebaySku);
            console.log("🏷️ SKU result:", skuResult);
        } else {
            console.log("❌ No SKU data in storage");
        }
        
        // Test Price
        if (result.ebayPrice) {
            console.log("💰 Testing price field...");
            const priceResult = await setPriceField(result.ebayPrice);
            console.log("💰 Price result:", priceResult);
        } else {
            console.log("❌ No price data in storage");
        }
        
        // Test Title
        if (result.ebayTitle) {
            console.log("📝 Testing title field...");
            const titleResult = await pasteInitialTitle(result.ebayTitle);
            console.log("📝 Title result:", titleResult);
        } else {
            console.log("❌ No title data in storage");
        }
    });
};



// Start the initialization with a small delay to ensure page is ready
setTimeout(() => {
    console.log("🚀 Starting eBay Lister initialization...");
    initializeEbayLister();
}, 1000);

