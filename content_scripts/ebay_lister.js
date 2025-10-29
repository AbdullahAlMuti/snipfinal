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

// Main automation function
async function runEbayAutomation(data) {
    console.log("🚀 Starting eBay automation with data:", data);
    
    // Paste Title
    if (data.ebayTitle) {
        try {
            console.log("📝 Looking for title input field...");
            const titleInput = await waitForElement('input[id*="@keyword-@box-@input-textbox"]');
            
            // Paste title (copy-paste behavior)
            titleInput.value = data.ebayTitle;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
            titleInput.dispatchEvent(new Event('paste', { bubbles: true }));
            
            // Try to click the keyword suggestion button if it exists
            const suggestionBtn = document.querySelector('button.keyword-suggestion__label-btn');
            if (suggestionBtn) {
                suggestionBtn.click();
                console.log("✅ Clicked keyword suggestion button");
            }
            
            console.log("✅ Title pasted:", data.ebayTitle);
        } catch (error) {
            console.error("❌ Could not paste title:", error);
        }
    }
    
    // Paste Price
    if (data.ebayPrice) {
        try {
            console.log("💰 Looking for Item price input field...");
            console.log("🎯 Target price to paste:", data.ebayPrice);
            
            // Method 1: Find by exact label text and for attribute
            let priceInput = null;
            const allLabels = document.querySelectorAll('label.field__label');
            console.log(`🔍 Found ${allLabels.length} field labels on page`);
            
            for (const label of allLabels) {
                console.log(`📋 Label text: "${label.textContent.trim()}"`);
                if (label.textContent.includes('Item price')) {
                    console.log("✅ Found price label with text:", label.textContent.trim());
                    const forAttribute = label.getAttribute('for');
                    console.log(`🔗 Label for attribute: ${forAttribute}`);
                    
                    if (forAttribute) {
                        const element = document.getElementById(forAttribute);
                        if (element) {
                            console.log(`📝 Element details - ID: ${element.id}, Name: ${element.name}, Class: ${element.className}, Type: ${element.type}`);
                            
                            // Check if this is actually a text input field
                            if (element.type === 'text' || element.tagName === 'INPUT' && element.className.includes('textbox')) {
                                priceInput = element;
                                console.log(`✅ Found correct price text input via label for attribute: ${forAttribute}`);
                                break;
                            } else {
                                console.log(`⚠️ Element is not a text input (type: ${element.type}, class: ${element.className}), continuing search...`);
                            }
                        } else {
                            console.log(`⚠️ Input with ID "${forAttribute}" not found`);
                        }
                    }
                }
            }
            
            // Method 2: Direct selectors if label method failed
            if (!priceInput) {
                console.log("⚠️ Price input not found via label, trying direct selectors...");
                const priceSelectors = [
                    'input[name="price"][type="text"]',
                    'input[name="price"].textbox__control',
                    'input[id*="@PRICE"][name="price"][type="text"]',
                    'input.textbox__control[name="price"]',
                    'input[aria-describedby*="se-textbox-prefix"][name="price"]',
                    'input[aria-describedby*="se-textbox-prefix"][type="text"]',
                    'input[name="price"]'
                ];
                
                for (const selector of priceSelectors) {
                    try {
                        console.log(`🔍 Trying selector: ${selector}`);
                        const foundElement = await waitForElement(selector, 2000);
                        if (foundElement) {
                            console.log(`📝 Found element - ID: ${foundElement.id}, Name: ${foundElement.name}, Class: ${foundElement.className}, Type: ${foundElement.type}`);
                            
                            // Verify this is actually a text input field
                            if (foundElement.type === 'text' || foundElement.tagName === 'INPUT') {
                                priceInput = foundElement;
                                console.log(`✅ Found correct price text input with selector: ${selector}`);
                                break;
                            } else {
                                console.log(`⚠️ Element is not a text input (type: ${foundElement.type}), trying next selector...`);
                            }
                        }
                    } catch (e) {
                        console.log(`⚠️ Selector ${selector} not found`);
                    }
                }
            }
            
            // Method 3: Search by aria-describedby attribute
            if (!priceInput) {
                console.log("🔍 Trying to find price by aria-describedby attribute...");
                const ariaInputs = document.querySelectorAll('input[aria-describedby*="se-textbox-prefix"]');
                console.log(`🔍 Found ${ariaInputs.length} inputs with aria-describedby`);
                
                for (const input of ariaInputs) {
                    console.log(`📝 Input - ID: ${input.id}, Name: ${input.name}, Type: ${input.type}, Aria: ${input.getAttribute('aria-describedby')}`);
                    
                    // Check if this is a text input with price name
                    if ((input.name === 'price' || input.id.includes('@PRICE')) && input.type === 'text') {
                        priceInput = input;
                        console.log("✅ Found price text input via aria-describedby search");
                        break;
                    }
                }
            }
            
            // Method 4: Search for text inputs near the price label
            if (!priceInput) {
                console.log("🔍 Trying to find text input near price label...");
                const priceLabels = document.querySelectorAll('label.field__label');
                
                for (const label of priceLabels) {
                    if (label.textContent.includes('Item price')) {
                        console.log("✅ Found price label, looking for nearby text input...");
                        
                        // Look for text input in the same fieldset or parent container
                        const fieldset = label.closest('fieldset') || label.closest('.field') || label.parentElement;
                        if (fieldset) {
                            const textInputs = fieldset.querySelectorAll('input[type="text"]');
                            console.log(`🔍 Found ${textInputs.length} text inputs in fieldset`);
                            
                            for (const input of textInputs) {
                                console.log(`📝 Text input - ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
                                if (input.name === 'price' || input.className.includes('textbox')) {
                                    priceInput = input;
                                    console.log("✅ Found price text input near label");
                                    break;
                                }
                            }
                        }
                        
                        if (priceInput) break;
                    }
                }
            }
            
            if (priceInput) {
                console.log("🎯 Attempting to paste price into field...");
                
                // Clear any existing value
                const oldValue = priceInput.value;
                if (oldValue) {
                    console.log(`🧹 Clearing existing price value: "${oldValue}"`);
                }
                priceInput.value = '';
                
                // Set the new price value
                priceInput.value = data.ebayPrice;
                console.log(`✏️ Set price value to: "${priceInput.value}"`);
                
                // Dispatch multiple events to ensure eBay recognizes the change (paste behavior)
                const events = ['input', 'change', 'paste', 'blur', 'keyup'];
                events.forEach(eventType => {
                    priceInput.dispatchEvent(new Event(eventType, { bubbles: true }));
                });
                console.log("📡 Dispatched events:", events);
                
                // Focus and blur to trigger any additional validation
                priceInput.focus();
                setTimeout(() => {
                    priceInput.blur();
                    console.log(`✅ Price "${data.ebayPrice}" pasted successfully into Item price field`);
                    console.log(`🔍 Final price field value: "${priceInput.value}"`);
                }, 100);
                
            } else {
                console.error("❌ Could not find Item price input field with any method");
                console.log("🔍 Debugging - Available price elements on page:");
                
                // List all inputs with price name
                const priceInputs = document.querySelectorAll('input[name="price"]');
                console.log(`📝 Found ${priceInputs.length} inputs with name="price":`);
                priceInputs.forEach((input, index) => {
                    console.log(`  ${index + 1}. ID: ${input.id}, Class: ${input.className}, Type: ${input.type}`);
                });
                
                // List all inputs with @PRICE in ID
                const priceIdInputs = document.querySelectorAll('input[id*="@PRICE"]');
                console.log(`📝 Found ${priceIdInputs.length} inputs with @PRICE in ID:`);
                priceIdInputs.forEach((input, index) => {
                    console.log(`  ${index + 1}. ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
                });
            }
        } catch (error) {
            console.error("❌ Could not paste price:", error);
        }
    }
    
    // Select Condition
    if (data.ebayCondition) {
        try {
            console.log("🔧 Looking for condition selection...");
            console.log("🎯 Target condition to select:", data.ebayCondition);
            
            const conditionSelected = await selectCondition(data.ebayCondition);
            if (conditionSelected) {
                console.log(`✅ Condition "${data.ebayCondition}" selected successfully`);
            } else {
                console.log("⚠️ Condition selection not found or already completed");
            }
        } catch (error) {
            console.error("❌ Could not select condition:", error);
        }
    }
    
    // Upload Images
    if (data.watermarkedImages && data.watermarkedImages.length > 0) {
        try {
            console.log("🖼️ Starting image upload process...");
            console.log("📸 Number of images to upload:", data.watermarkedImages.length);
            
            await uploadImages(data.watermarkedImages);
            console.log("✅ Image upload process completed");
        } catch (error) {
            console.error("❌ Could not upload images:", error);
        }
    } else if (data.imageUrls && data.imageUrls.length > 0) {
        try {
            console.log("🖼️ Starting image upload process (using imageUrls)...");
            console.log("📸 Number of images to upload:", data.imageUrls.length);
            
            await uploadImages(data.imageUrls);
            console.log("✅ Image upload process completed");
        } catch (error) {
            console.error("❌ Could not upload images:", error);
        }
    } else {
        console.log("⚠️ No images found in storage to upload");
    }
    
    // Handle Item Specifics
    if (data.itemSpecifics) {
        try {
            console.log("📋 Starting item specifics filling...");
            console.log("🎯 Item specifics data:", data.itemSpecifics);
            
            await fillItemSpecifics(data.itemSpecifics);
            console.log("✅ Item specifics filling completed");
        } catch (error) {
            console.error("❌ Could not fill item specifics:", error);
        }
    } else {
        console.log("⚠️ No item specifics data found in storage");
    }
    
    // Paste SKU
    if (data.ebaySku) {
        try {
            console.log("🏷️ Looking for Custom label (SKU) input field...");
            console.log("🎯 Target SKU to paste:", data.ebaySku);
            
            // Method 1: Find by exact label text and for attribute
            let skuInput = null;
            const allLabels = document.querySelectorAll('label.field__label');
            console.log(`🔍 Found ${allLabels.length} field labels on page`);
            
            for (const label of allLabels) {
                console.log(`📋 Label text: "${label.textContent.trim()}"`);
                if (label.textContent.includes('Custom label (SKU)')) {
                    console.log("✅ Found SKU label with text:", label.textContent.trim());
                    const forAttribute = label.getAttribute('for');
                    console.log(`🔗 Label for attribute: ${forAttribute}`);
                    
                    if (forAttribute) {
                        const element = document.getElementById(forAttribute);
                        if (element) {
                            console.log(`📝 Element details - ID: ${element.id}, Name: ${element.name}, Class: ${element.className}, Type: ${element.type}`);
                            
                            // Check if this is actually a text input field, not a switch
                            if (element.type === 'text' || element.tagName === 'INPUT' && element.className.includes('textbox')) {
                                skuInput = element;
                                console.log(`✅ Found correct SKU text input via label for attribute: ${forAttribute}`);
                                break;
                            } else {
                                console.log(`⚠️ Element is not a text input (type: ${element.type}, class: ${element.className}), continuing search...`);
                            }
                        } else {
                            console.log(`⚠️ Input with ID "${forAttribute}" not found`);
                        }
                    }
                }
            }
            
            // Method 2: Direct selectors if label method failed
            if (!skuInput) {
                console.log("⚠️ SKU input not found via label, trying direct selectors...");
                const skuSelectors = [
                    'input[name="customLabel"][type="text"]',
                    'input[name="customLabel"].textbox__control',
                    'input[id*="@TITLE"][name="customLabel"][type="text"]',
                    'input.textbox__control[name="customLabel"]',
                    'input[aria-describedby*="se-textbox-counter"][name="customLabel"]',
                    'input[aria-describedby*="se-textbox-counter"][type="text"]',
                    'input[name="customLabel"]'
                ];
                
                for (const selector of skuSelectors) {
                    try {
                        console.log(`🔍 Trying selector: ${selector}`);
                        const foundElement = await waitForElement(selector, 2000);
                        if (foundElement) {
                            console.log(`📝 Found element - ID: ${foundElement.id}, Name: ${foundElement.name}, Class: ${foundElement.className}, Type: ${foundElement.type}`);
                            
                            // Verify this is actually a text input field
                            if (foundElement.type === 'text' || foundElement.tagName === 'INPUT') {
                                skuInput = foundElement;
                                console.log(`✅ Found correct SKU text input with selector: ${selector}`);
                                break;
                            } else {
                                console.log(`⚠️ Element is not a text input (type: ${foundElement.type}), trying next selector...`);
                            }
                        }
                    } catch (e) {
                        console.log(`⚠️ Selector ${selector} not found`);
                    }
                }
            }
            
            // Method 3: Search by aria-describedby attribute
            if (!skuInput) {
                console.log("🔍 Trying to find by aria-describedby attribute...");
                const ariaInputs = document.querySelectorAll('input[aria-describedby*="se-textbox-counter"]');
                console.log(`🔍 Found ${ariaInputs.length} inputs with aria-describedby`);
                
                for (const input of ariaInputs) {
                    console.log(`📝 Input - ID: ${input.id}, Name: ${input.name}, Type: ${input.type}, Aria: ${input.getAttribute('aria-describedby')}`);
                    
                    // Check if this is a text input with customLabel name
                    if ((input.name === 'customLabel' || input.id.includes('@TITLE')) && input.type === 'text') {
                        skuInput = input;
                        console.log("✅ Found SKU text input via aria-describedby search");
                        break;
                    }
                }
            }
            
            // Method 4: Search for text inputs near the SKU label
            if (!skuInput) {
                console.log("🔍 Trying to find text input near SKU label...");
                const skuLabels = document.querySelectorAll('label.field__label');
                
                for (const label of skuLabels) {
                    if (label.textContent.includes('Custom label (SKU)')) {
                        console.log("✅ Found SKU label, looking for nearby text input...");
                        
                        // Look for text input in the same fieldset or parent container
                        const fieldset = label.closest('fieldset') || label.closest('.field') || label.parentElement;
                        if (fieldset) {
                            const textInputs = fieldset.querySelectorAll('input[type="text"]');
                            console.log(`🔍 Found ${textInputs.length} text inputs in fieldset`);
                            
                            for (const input of textInputs) {
                                console.log(`📝 Text input - ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
                                if (input.name === 'customLabel' || input.className.includes('textbox')) {
                                    skuInput = input;
                                    console.log("✅ Found SKU text input near label");
                                    break;
                                }
                            }
                        }
                        
                        if (skuInput) break;
                    }
                }
            }
            
            if (skuInput) {
                console.log("🎯 Attempting to paste SKU into field...");
                
                // Clear any existing value
                const oldValue = skuInput.value;
                if (oldValue) {
                    console.log(`🧹 Clearing existing value: "${oldValue}"`);
                }
                skuInput.value = '';
                
                // Set the new SKU value
                skuInput.value = data.ebaySku;
                console.log(`✏️ Set SKU value to: "${skuInput.value}"`);
                
                // Dispatch multiple events to ensure eBay recognizes the change (paste behavior)
                const events = ['input', 'change', 'paste', 'blur', 'keyup'];
                events.forEach(eventType => {
                    skuInput.dispatchEvent(new Event(eventType, { bubbles: true }));
                });
                console.log("📡 Dispatched events:", events);
                
                // Focus and blur to trigger any additional validation
                skuInput.focus();
                setTimeout(() => {
                    skuInput.blur();
                    console.log(`✅ SKU "${data.ebaySku}" pasted successfully into Custom label (SKU) field`);
                    console.log(`🔍 Final field value: "${skuInput.value}"`);
                }, 100);
                
            } else {
                console.error("❌ Could not find Custom label (SKU) input field with any method");
                console.log("🔍 Debugging - Available elements on page:");
                
                // List all labels
                const allLabels = document.querySelectorAll('label');
                console.log(`📋 Found ${allLabels.length} labels:`);
                allLabels.forEach((label, index) => {
                    console.log(`  ${index + 1}. Text: "${label.textContent.trim()}", For: ${label.getAttribute('for')}`);
                });
                
                // List all inputs with customLabel name
                const customLabelInputs = document.querySelectorAll('input[name="customLabel"]');
                console.log(`📝 Found ${customLabelInputs.length} inputs with name="customLabel":`);
                customLabelInputs.forEach((input, index) => {
                    console.log(`  ${index + 1}. ID: ${input.id}, Class: ${input.className}`);
                });
                
                // List all inputs with @TITLE in ID
                const titleInputs = document.querySelectorAll('input[id*="@TITLE"]');
                console.log(`📝 Found ${titleInputs.length} inputs with @TITLE in ID:`);
                titleInputs.forEach((input, index) => {
                    console.log(`  ${index + 1}. ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
                });
            }
        } catch (error) {
            console.error("❌ Could not paste SKU:", error);
        }
    }
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
    if (!window.location.href.includes('ebay.com/lstng')) {
        console.log("⚠️ Not on eBay listing page, skipping SKU pasting");
        return;
    }
    
    // Wait for page to be fully loaded
    await waitForPageLoad();
    console.log("✅ Page fully loaded");
    
    // Additional wait for dynamic content - eBay pages can be slow
    await wait(3000);
    
    chrome.storage.local.get(['ebayTitle', 'ebaySku', 'ebayPrice', 'ebayCondition', 'watermarkedImages', 'imageUrls', 'itemSpecifics'], async (result) => {
        console.log("📦 Retrieved data from storage:", result);
        console.log("🔍 SKU from storage:", result.ebaySku);
        console.log("🔍 Title from storage:", result.ebayTitle);
        console.log("🔍 Price from storage:", result.ebayPrice);
        console.log("🔍 Condition from storage:", result.ebayCondition);
        
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
            // Try multiple times with delays in case the page is still loading
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`🔄 Attempt ${attempts}/${maxAttempts} to paste data...`);
                
                try {
                    await runEbayAutomation(result);
                    
                    // Check if SKU was successfully pasted
                    if (result.ebaySku) {
                        const skuInput = document.querySelector('input[name="customLabel"]');
                        if (skuInput && skuInput.value === result.ebaySku) {
                            console.log("✅ SKU successfully pasted, cleaning up storage");
                            break;
                        } else if (attempts < maxAttempts) {
                            console.log("⚠️ SKU not found in field, retrying in 2 seconds...");
                            await wait(2000);
                            continue;
                        }
                    } else {
                        // No SKU to check, assume success
                        break;
                    }
                } catch (error) {
                    console.error(`❌ Attempt ${attempts} failed:`, error);
                    if (attempts < maxAttempts) {
                        console.log("🔄 Retrying in 2 seconds...");
                        await wait(2000);
                    }
                }
            }

            // Cleanup storage after use
            chrome.storage.local.remove(['ebayTitle', 'ebaySku', 'ebayPrice', 'ebayCondition'], () => {
                console.log("🧹 Title, SKU, Price, and Condition cleared from storage");
            });
        } else {
            console.log("⚠️ No title or SKU data found in storage");
        }
    });
}

// Add debugging functions to window for manual testing
window.debugEbayStorage = () => {
    chrome.storage.local.get(null, (allData) => {
        console.log("🔍 All Chrome storage data:", allData);
        console.log("🔍 SKU specifically:", allData.ebaySku);
        console.log("🔍 Title specifically:", allData.ebayTitle);
        console.log("🔍 Price specifically:", allData.ebayPrice);
        console.log("🔍 Condition specifically:", allData.ebayCondition);
        alert(`Storage data: ${JSON.stringify(allData, null, 2)}`);
    });
};

window.debugConditionSelection = (conditionValue = "1000") => {
    console.log(`🔧 Debugging condition selection for value: ${conditionValue}`);
    
    // Check for lightbox
    const lightboxSelectors = [
        '.lightbox-dialog__window',
        '[class*="lightbox-dialog"]',
        '[role="dialog"]',
        '.modal',
        '[class*="modal"]'
    ];
    
    console.log("🔍 Checking for lightbox...");
    for (const selector of lightboxSelectors) {
        const lightbox = document.querySelector(selector);
        if (lightbox) {
            console.log(`✅ Found lightbox: ${selector}`);
        }
    }
    
    // Check for radio buttons
    const allRadios = document.querySelectorAll('input[type="radio"]');
    console.log(`🔍 Found ${allRadios.length} radio buttons on page`);
    
    allRadios.forEach((radio, index) => {
        const label = document.querySelector(`label[for="${radio.id}"]`);
        console.log(`Radio ${index + 1}:`, {
            id: radio.id,
            value: radio.value,
            name: radio.name,
            checked: radio.checked,
            label: label ? label.textContent.trim() : 'No label'
        });
    });
    
    // Check for specific condition value
    const targetRadio = document.querySelector(`input[type="radio"][value="${conditionValue}"]`);
    if (targetRadio) {
        console.log(`✅ Found target radio button for value ${conditionValue}`);
    } else {
        console.log(`❌ No radio button found for value ${conditionValue}`);
    }
    
    return allRadios.length;
};

window.debugGoButton = () => {
    console.log("🔧 Debugging Go button detection...");
    
    // Check for title input
    const titleInput = document.querySelector('input[id*="@keyword-@box-@input-textbox"]');
    console.log("Title input found:", !!titleInput);
    if (titleInput) {
        console.log("Title input value:", titleInput.value);
    }
    
    // Check for Go buttons with various selectors
    const goSelectors = [
        'button.keyword-suggestion__label-btn',
        'button[type="submit"]',
        'input[type="submit"]',
        '[data-testid*="go"]',
        '[data-testid*="submit"]',
        '.btn-primary',
        '.btn-submit',
        '.keyword-suggestion__label-btn',
        'button[class*="go"]',
        'button[class*="submit"]',
        'button[class*="search"]',
        'button[class*="continue"]'
    ];
    
    console.log("🔍 Checking Go button selectors...");
    goSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`✅ Found element with ${selector}:`, {
                tagName: element.tagName,
                text: element.textContent.trim(),
                disabled: element.disabled,
                visible: element.offsetParent !== null,
                classes: element.className
            });
        }
    });
    
    // Check all buttons for text content
    const allButtons = document.querySelectorAll('button, input[type="submit"], a[role="button"]');
    console.log(`🔍 Found ${allButtons.length} total buttons on page`);
    
    const goButtons = [];
    allButtons.forEach((button, index) => {
        const text = button.textContent.toLowerCase().trim();
        const value = button.value ? button.value.toLowerCase().trim() : '';
        
        if (text.includes('go') || text.includes('search') || text.includes('continue') ||
            value.includes('go') || value.includes('search') || value.includes('continue')) {
            goButtons.push({
                index: index + 1,
                tagName: button.tagName,
                text: text,
                value: value,
                disabled: button.disabled,
                visible: button.offsetParent !== null,
                classes: button.className
            });
        }
    });
    
    console.log("🔍 Potential Go buttons found:", goButtons);
    
    return goButtons.length;
};

window.manualSkuPaste = (sku) => {
    if (!sku) {
        chrome.storage.local.get(['ebaySku'], (result) => {
            if (result.ebaySku) {
                manualSkuPaste(result.ebaySku);
            } else {
                alert('No SKU found in storage');
            }
        });
        return;
    }
    
    // Use the same improved logic to find the correct text input
    let skuInput = null;
    
    // Try to find text input with customLabel name
    const textInputs = document.querySelectorAll('input[name="customLabel"][type="text"]');
    console.log(`🔍 Found ${textInputs.length} text inputs with name="customLabel"`);
    
    for (const input of textInputs) {
        console.log(`📝 Text input - ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
        if (input.type === 'text' && input.name === 'customLabel') {
            skuInput = input;
            break;
        }
    }
    
    if (skuInput) {
        skuInput.value = sku;
        skuInput.dispatchEvent(new Event('input', { bubbles: true }));
        skuInput.dispatchEvent(new Event('change', { bubbles: true }));
        skuInput.dispatchEvent(new Event('paste', { bubbles: true }));
        console.log(`✅ Manually pasted SKU: ${sku}`);
        alert(`SKU pasted: ${sku}`);
    } else {
        console.log('❌ SKU text input field not found');
        alert('SKU text input field not found');
    }
};

window.manualPricePaste = (price) => {
    if (!price) {
        chrome.storage.local.get(['ebayPrice'], (result) => {
            if (result.ebayPrice) {
                manualPricePaste(result.ebayPrice);
            } else {
                alert('No price found in storage');
            }
        });
        return;
    }
    
    // Use the same improved logic to find the correct text input
    let priceInput = null;
    
    // Try to find text input with price name
    const textInputs = document.querySelectorAll('input[name="price"][type="text"]');
    console.log(`🔍 Found ${textInputs.length} text inputs with name="price"`);
    
    for (const input of textInputs) {
        console.log(`📝 Text input - ID: ${input.id}, Name: ${input.name}, Class: ${input.className}`);
        if (input.type === 'text' && input.name === 'price') {
            priceInput = input;
            break;
        }
    }
    
    if (priceInput) {
        priceInput.value = price;
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        priceInput.dispatchEvent(new Event('paste', { bubbles: true }));
        console.log(`✅ Manually pasted price: ${price}`);
        alert(`Price pasted: ${price}`);
    } else {
        console.log('❌ Price text input field not found');
        alert('Price text input field not found');
    }
};

// Condition selection function
async function selectCondition(conditionValue) {
    console.log(`🔧 Starting condition selection for value: ${conditionValue}`);
    
    try {
        // First, check if we're on the right page for condition selection
        const currentUrl = window.location.href;
        if (!currentUrl.includes('ebay.com/sl/prelist') && !currentUrl.includes('ebay.com/lstng')) {
            console.log("⚠️ Not on eBay listing page, skipping condition selection");
            return false;
        }
        // Wait for lightbox to appear (condition selection usually happens in a lightbox)
        console.log("🔍 Waiting for condition selection lightbox...");
        await wait(3000);
        
        // Check for lightbox dialog
        const lightboxSelectors = [
            '.lightbox-dialog__window',
            '[class*="lightbox-dialog"]',
            '[role="dialog"]',
            '.modal',
            '[class*="modal"]'
        ];
        
        let lightboxFound = false;
        for (const selector of lightboxSelectors) {
            const lightbox = document.querySelector(selector);
            if (lightbox) {
                console.log(`✅ Found lightbox with selector: ${selector}`);
                lightboxFound = true;
                break;
            }
        }
        
        if (!lightboxFound) {
            console.log("⚠️ No lightbox found, condition selection may not be available");
        }
        
        // Wait additional time for radio buttons to render
        await wait(1000);
        
        // Method 1: Direct value selector
        const directSelector = `input[type="radio"][value="${conditionValue}"]`;
        let conditionRadio = document.querySelector(directSelector);
        
        if (conditionRadio) {
            console.log(`✅ Found condition radio button with direct selector: ${directSelector}`);
        } else {
            // Method 2: Try common condition selectors
            const selectors = [
                `input[type="radio"][value="${conditionValue}"]`,
                `input[type="radio"][name*="condition"][value="${conditionValue}"]`,
                `input[type="radio"][id*="condition"][value="${conditionValue}"]`,
                `input[type="radio"][data-value="${conditionValue}"]`
            ];
            
            for (const selector of selectors) {
                try {
                    conditionRadio = document.querySelector(selector);
                    if (conditionRadio) {
                        console.log(`✅ Found condition radio button with selector: ${selector}`);
                        break;
                    }
                } catch (error) {
                    // Invalid selector, continue
                }
            }
        }
        
        // Method 3: Text-based search for condition labels
        if (!conditionRadio) {
            console.log("🔍 Trying text-based search for condition labels...");
            const conditionLabels = getConditionLabels(conditionValue);
            const radioButtons = document.querySelectorAll('input[type="radio"]');
            
            console.log(`🔍 Found ${radioButtons.length} radio buttons on page`);
            
            for (const radio of radioButtons) {
                const label = document.querySelector(`label[for="${radio.id}"]`);
                if (label) {
                    const labelText = label.textContent.toLowerCase().trim();
                    console.log(`🔍 Checking radio button with label: "${labelText}"`);
                    
                    for (const conditionLabel of conditionLabels) {
                        if (labelText.includes(conditionLabel.toLowerCase())) {
                            console.log(`✅ Found condition radio button by label text: "${labelText}"`);
                            conditionRadio = radio;
                            break;
                        }
                    }
                    if (conditionRadio) break;
                }
            }
        }
        
        // Method 4: Search within lightbox if found
        if (!conditionRadio && lightboxFound) {
            console.log("🔍 Searching for condition radio buttons within lightbox...");
            const lightbox = document.querySelector('.lightbox-dialog__window, [class*="lightbox-dialog"], [role="dialog"]');
            if (lightbox) {
                const lightboxRadios = lightbox.querySelectorAll('input[type="radio"]');
                console.log(`🔍 Found ${lightboxRadios.length} radio buttons in lightbox`);
                
                for (const radio of lightboxRadios) {
                    if (radio.value === conditionValue) {
                        console.log(`✅ Found condition radio button in lightbox with value: ${conditionValue}`);
                        conditionRadio = radio;
                        break;
                    }
                }
            }
        }
        
        if (conditionRadio) {
            console.log("🎯 Attempting to select condition radio button...");
            
            // Check if already selected
            if (conditionRadio.checked) {
                console.log("ℹ️ Condition radio button already selected");
                return true;
            }
            
            // Click the radio button
            conditionRadio.click();
            console.log(`✅ Condition radio button clicked for value: ${conditionValue}`);
            
            // Dispatch events to ensure the selection is recognized
            conditionRadio.dispatchEvent(new Event('change', { bubbles: true }));
            conditionRadio.dispatchEvent(new Event('click', { bubbles: true }));
            
            // Wait a moment for the selection to be processed
            await wait(1000);
            
            // Verify selection
            if (conditionRadio.checked) {
                console.log(`✅ Condition "${conditionValue}" successfully selected`);
                return true;
            } else {
                console.log("⚠️ Condition selection may not have been processed");
                return false;
            }
        } else {
            console.log(`⚠️ No condition radio button found for value: ${conditionValue}`);
            return false;
        }
        
    } catch (error) {
        console.error("❌ Error selecting condition:", error);
        return false;
    }
}

// Helper function to get condition labels based on value
function getConditionLabels(conditionValue) {
    const conditionMap = {
        "1000": ["new", "brand new", "new condition"],
        "1500": ["open box", "open-box", "opened"],
        "3000": ["used", "pre-owned", "second hand"],
        "4000": ["for parts", "not working", "for parts or not working", "broken"],
        "5000": ["refurbished", "reconditioned"],
        "6000": ["seller refurbished", "seller-refurbished"]
    };
    
    return conditionMap[conditionValue] || ["new"]; // Default to new if value not found
}

// Image upload function
async function uploadImages(imageUrls) {
    console.log("🖼️ Starting image upload process...");
    
    // Find file input for image upload
    const fileInputSelectors = [
        'input[type="file"][multiple]',
        'input[type="file"]',
        'input[accept*="image"]',
        'input[data-testid*="upload"]',
        'input[aria-label*="upload"]',
        'input[accept*="*"]'
    ];
    
    let fileInput = null;
    for (const selector of fileInputSelectors) {
        fileInput = document.querySelector(selector);
        if (fileInput) {
            console.log(`✅ Found file input with selector: ${selector}`);
            break;
        }
    }
    
    if (!fileInput) {
        console.error("❌ No file input found for image upload");
        return;
    }
    
    console.log("📁 File input details:", {
        id: fileInput.id,
        name: fileInput.name,
        accept: fileInput.accept,
        multiple: fileInput.multiple
    });
    
    try {
        // Convert image URLs to files
        const files = [];
        for (let i = 0; i < Math.min(imageUrls.length, 12); i++) { // eBay limit is usually 12 images
            const imageUrl = imageUrls[i];
            console.log(`📸 Processing image ${i + 1}: ${imageUrl}`);
            
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], `image_${i + 1}.jpg`, { type: 'image/jpeg' });
                files.push(file);
                console.log(`✅ Image ${i + 1} converted to file`);
            } catch (error) {
                console.error(`❌ Failed to convert image ${i + 1}:`, error);
            }
        }
        
        if (files.length === 0) {
            console.error("❌ No images could be converted to files");
            return;
        }
        
        console.log(`📦 Successfully prepared ${files.length} files for upload`);
        
        // Create DataTransfer object
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        
        // Set files to input
        fileInput.files = dataTransfer.files;
        
        // Dispatch change event
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log("✅ Files set to input and events dispatched");
        
        // Wait for upload to process
        await wait(3000);
        
        // Check if upload was successful
        const uploadedImages = document.querySelectorAll('.image-uploader__image, .image-item, [class*="image"]');
        console.log(`🔍 Found ${uploadedImages.length} uploaded images on page`);
        
        if (uploadedImages.length > 0) {
            console.log("✅ Images appear to have been uploaded successfully");
        } else {
            console.log("⚠️ No uploaded images detected, but files were set");
        }
        
    } catch (error) {
        console.error("❌ Error during image upload:", error);
    }
}

// Item specifics filling function
async function fillItemSpecifics(itemSpecifics) {
    console.log("📋 Starting item specifics filling...");
    
    // Wait for item specifics section to load
    await wait(2000);
    
    // Look for item specifics section
    const itemSpecificsSelectors = [
        '[data-testid*="item-specifics"]',
        '.item-specifics',
        '[class*="item-specifics"]',
        '[data-testid*="specifics"]',
        '.specifics',
        '[class*="specifics"]'
    ];
    
    let itemSpecificsSection = null;
    for (const selector of itemSpecificsSelectors) {
        itemSpecificsSection = document.querySelector(selector);
        if (itemSpecificsSection) {
            console.log(`✅ Found item specifics section: ${selector}`);
            break;
        }
    }
    
    if (!itemSpecificsSection) {
        console.log("⚠️ Item specifics section not found, trying to find individual fields");
    }
    
    // Fill each item specific
    for (const [key, value] of Object.entries(itemSpecifics)) {
        if (!value || value.trim() === '') continue;
        
        console.log(`📝 Filling item specific: ${key} = ${value}`);
        
        try {
            // Method 1: Look for input by name attribute
            let input = document.querySelector(`input[name*="${key}" i], input[name*="${key.toLowerCase()}" i]`);
            
            // Method 2: Look for select by name attribute
            if (!input) {
                input = document.querySelector(`select[name*="${key}" i], select[name*="${key.toLowerCase()}" i]`);
            }
            
            // Method 3: Look for textarea by name attribute
            if (!input) {
                input = document.querySelector(`textarea[name*="${key}" i], textarea[name*="${key.toLowerCase()}" i]`);
            }
            
            // Method 4: Look for input by placeholder or label
            if (!input) {
                const labels = document.querySelectorAll('label');
                for (const label of labels) {
                    if (label.textContent.toLowerCase().includes(key.toLowerCase())) {
                        const forAttr = label.getAttribute('for');
                        if (forAttr) {
                            input = document.getElementById(forAttr);
                            if (input) break;
                        }
                    }
                }
            }
            
            if (input) {
                console.log(`✅ Found input for ${key}:`, {
                    tagName: input.tagName,
                    type: input.type,
                    name: input.name,
                    id: input.id
                });
                
                if (input.tagName === 'SELECT') {
                    // Handle select dropdown
                    const option = input.querySelector(`option[value="${value}"], option:contains("${value}")`);
                    if (option) {
                        input.value = option.value;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`✅ Selected option for ${key}: ${value}`);
                    } else {
                        console.log(`⚠️ Option not found for ${key}: ${value}`);
                    }
                } else {
                    // Handle input/textarea
                    input.value = value;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`✅ Filled input for ${key}: ${value}`);
                }
            } else {
                console.log(`⚠️ No input found for item specific: ${key}`);
            }
            
        } catch (error) {
            console.error(`❌ Error filling item specific ${key}:`, error);
        }
        
        // Small delay between fields
        await wait(500);
    }
    
    console.log("✅ Item specifics filling completed");
}

// Manual image upload function for testing
window.manualImageUpload = async (imageUrls) => {
    if (!imageUrls) {
        chrome.storage.local.get(['watermarkedImages', 'imageUrls'], (result) => {
            const images = result.watermarkedImages || result.imageUrls || [];
            if (images.length > 0) {
                manualImageUpload(images);
            } else {
                alert('No images found in storage');
            }
        });
        return;
    }
    
    console.log("🧪 Manual image upload triggered");
    await uploadImages(imageUrls);
};

// Manual item specifics function for testing
window.manualItemSpecifics = async (itemSpecifics) => {
    if (!itemSpecifics) {
        chrome.storage.local.get(['itemSpecifics'], (result) => {
            if (result.itemSpecifics) {
                manualItemSpecifics(result.itemSpecifics);
            } else {
                alert('No item specifics found in storage');
            }
        });
        return;
    }
    
    console.log("🧪 Manual item specifics triggered");
    await fillItemSpecifics(itemSpecifics);
};

// Start the initialization with a small delay to ensure page is ready
setTimeout(() => {
    console.log("🚀 Starting eBay Lister initialization...");
    initializeEbayLister();
}, 1000);
