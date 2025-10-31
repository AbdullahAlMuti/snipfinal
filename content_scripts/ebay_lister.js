console.log("eBay Lister script loaded: Awaiting data...");

// ─────────────────────────────────────────────
// 🔧 Helper Functions
// ─────────────────────────────────────────────
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) return el; // Also check if element is visible
        await wait(250);
    }
    throw new Error(`Element with selector "${selector}" not found`);
}

// Helper to try multiple selectors with waiting
async function findElementWithSelectors(selectors, timeout = 15000) {
    const startTime = Date.now();
    let lastError = null;
    
    while (Date.now() - startTime < timeout) {
        for (const selector of selectors) {
            try {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null && !el.disabled) {
                    console.log(`✅ Found element with selector: ${selector}`);
                    return el;
                }
            } catch (e) {
                lastError = e;
            }
        }
        await wait(300);
    }
    
    throw lastError || new Error(`None of the selectors matched: ${selectors.join(', ')}`);
}

// ─────────────────────────────────────────────
// 🚀 Main Automation
// ─────────────────────────────────────────────
async function runEbayAutomation(data) {
  console.log("🚀 Starting eBay automation with data:", data);

  // Utility: React-safe setter
  const reactInput = (el, value) => {
    const lastValue = el.value;
    el.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    el.dispatchEvent(event);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  // 1️⃣ Fill SKU (FIRST - ensures proper field initialization)
  if (data.ebaySku) {
    try {
      console.log(`🏷️ [STEP 1] Attempting to fill SKU: ${data.ebaySku}`);
      const skuSelectors = [
        // Exact match patterns from eBay listing page
        'input[name="customLabel"].textbox__control',
        'input.textbox__control[name="customLabel"]',
        'input[name="customLabel"][aria-describedby*="@TITLE"]',
        'input[name="customLabel"][aria-describedby*="counter"]',
        'input[aria-describedby*="@TITLE"][aria-describedby*="counter"]',
        'input[id*="@TITLE"].textbox__control[aria-describedby*="counter"]',
        // Fallback patterns
        'input[name="customLabel"]',
        'input[type="text"][name="customLabel"]',
        'input[name="customLabel"][maxlength="50"]',
        'input[id*="CUSTOMLABEL" i]',
        'input[id*="customLabel" i]',
        'input[id*="custom-label" i]',
        'input[id*="@TITLE"]',
        'input[aria-describedby*="counter"]',
        'input[aria-label*="custom" i]',
        'input[aria-label*="sku" i]',
        'input[aria-label*="label" i]',
        'input[placeholder*="custom" i]',
        'input[placeholder*="sku" i]',
        'input[placeholder*="label" i]',
        'input[type="text"][name*="label" i]',
        'input[type="text"][id*="label" i]',
        'input[type="text"][class*="label" i]',
        'input[data-testid*="sku" i]',
        'input[data-testid*="label" i]',
        'input[class*="custom" i]',
        '[name="customLabel"]',
        // Try to find by maxlength and textbox class
        'input.textbox__control[maxlength="50"]',
        'input[maxlength="50"][aria-describedby*="@TITLE"]'
      ];

      let skuInput = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!skuInput && attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 SKU field search attempt ${attempts}/${maxAttempts}...`);
        
        try {
          skuInput = await findElementWithSelectors(skuSelectors, 5000);
        } catch (err) {
          console.log(`⏳ SKU field not found yet, attempt ${attempts}/${maxAttempts}...`);
          if (attempts < maxAttempts) {
            await wait(1000 * attempts); // Exponential backoff
          }
        }
      }

      // Fallback: Search by label text or nearby text content
      if (!skuInput) {
        console.log("🔍 Trying fallback method: searching by label/text for SKU...");
        
        // Method 1: Search by labels
        const labels = document.querySelectorAll('label, span, div, p, h3, h4');
        for (const element of labels) {
          const text = (element.textContent || '').toLowerCase();
          if (text.includes('custom label') || text.includes('custom label (sku)') || 
              text.includes('sku') || text.includes('identifier') || 
              text.includes('item number') || text.includes('custom identifier')) {
            console.log(`🔍 Found SKU-related text: "${text.substring(0, 50)}"`);
            
            // Check for attribute
            const forAttr = element.getAttribute('for');
            if (forAttr) {
              const found = document.getElementById(forAttr);
              if (found && found.tagName === 'INPUT' && found.offsetParent !== null) {
                skuInput = found;
                console.log(`✅ Found SKU input via 'for' attribute`);
                break;
              }
            }
            
            // Check next sibling
            let sibling = element.nextElementSibling;
            for (let i = 0; i < 3 && sibling; i++) {
              if (sibling.tagName === 'INPUT' && sibling.type === 'text' && sibling.offsetParent !== null) {
                skuInput = sibling;
                console.log(`✅ Found SKU input as sibling (${i + 1} levels down)`);
                break;
              }
              sibling = sibling.nextElementSibling;
            }
            if (skuInput) break;
            
            // Check parent container and its siblings
            const parent = element.closest('div, fieldset, form, section, li');
            if (parent) {
              const inputs = parent.querySelectorAll('input[type="text"]');
              for (const input of inputs) {
                // Check if input has maxlength="50" (common for SKU)
                const maxLength = input.getAttribute('maxlength');
                if (input.offsetParent !== null && (maxLength === '50' || maxLength === '40')) {
                  skuInput = input;
                  console.log(`✅ Found SKU input in parent (maxlength=${maxLength})`);
                  break;
                }
              }
              if (!skuInput && inputs.length > 0) {
                // Try any visible text input in parent
                for (const input of inputs) {
                  if (input.offsetParent !== null) {
                    skuInput = input;
                    console.log(`✅ Found SKU input in parent (first visible)`);
                    break;
                  }
                }
              }
            }
            if (skuInput) break;
          }
        }
        
        // Method 2: Look for inputs with maxlength="50" near "Custom label" text
        if (!skuInput) {
          console.log("🔍 Trying method 2: searching for inputs with maxlength 50...");
          const allTextInputs = document.querySelectorAll('input[type="text"]');
          for (const input of allTextInputs) {
            if (input.offsetParent !== null) {
              const maxLength = input.getAttribute('maxlength');
              const name = (input.name || '').toLowerCase();
              const id = (input.id || '').toLowerCase();
              const placeholder = (input.placeholder || '').toLowerCase();
              
              // Check if it's likely a SKU field
              if (maxLength === '50' || 
                  name.includes('label') || name.includes('sku') ||
                  id.includes('label') || id.includes('sku') ||
                  placeholder.includes('label') || placeholder.includes('sku')) {
                // Verify it's near "Custom label" text
                const parent = input.closest('div, fieldset, form, section');
                if (parent) {
                  const parentText = (parent.textContent || '').toLowerCase();
                  if (parentText.includes('custom label') || parentText.includes('sku')) {
                    skuInput = input;
                    console.log(`✅ Found SKU input by maxlength and nearby text`);
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Last resort: Find any input with maxlength 50 that's empty
      if (!skuInput) {
        console.log("🔍 Last resort: searching for empty input with maxlength 50...");
        const allInputs = document.querySelectorAll('input[type="text"]');
        for (const input of allInputs) {
          if (input.offsetParent !== null && !input.disabled) {
            const maxLength = input.getAttribute('maxlength');
            const value = (input.value || '').trim();
            const name = (input.name || '').toLowerCase();
            
            // If it has maxlength 50 and is empty, check if it's in a section with "Custom label"
            if (maxLength === '50' && value === '' && name.includes('label')) {
              const container = input.closest('div, section, fieldset, form');
              if (container) {
                const containerText = (container.textContent || '').toLowerCase();
                if (containerText.includes('custom') || containerText.includes('sku')) {
                  skuInput = input;
                  console.log(`✅ Found SKU input via maxlength 50 and container text`);
                  break;
                }
              }
            }
          }
        }
      }

      if (skuInput) {
        // Scroll into view if needed
        if (skuInput.getBoundingClientRect().top < 0 || skuInput.getBoundingClientRect().bottom > window.innerHeight) {
          skuInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await wait(500);
        }
        
        reactInput(skuInput, data.ebaySku);
        await wait(300); // Small delay after fill
        
        // Verify the value was set
        if (skuInput.value === data.ebaySku) {
          console.log(`✅ [STEP 1] SKU filled successfully: ${data.ebaySku}`);
        } else {
          console.warn(`⚠️ SKU input value mismatch. Expected: ${data.ebaySku}, Got: ${skuInput.value}`);
          // Try one more time with direct value assignment
          skuInput.value = data.ebaySku;
          skuInput.dispatchEvent(new Event('input', { bubbles: true }));
          skuInput.dispatchEvent(new Event('change', { bubbles: true }));
          await wait(200);
          console.log(`🔄 Retried filling SKU. Current value: ${skuInput.value}`);
        }
      } else {
        console.warn("⚠️ SKU input not found after all attempts");
        console.log("🔍 Debugging: All text inputs on page:", Array.from(document.querySelectorAll('input[type="text"]')).map(inp => ({
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          ariaLabel: inp.getAttribute('aria-label'),
          maxlength: inp.getAttribute('maxlength'),
          value: inp.value,
          visible: inp.offsetParent !== null,
          parentText: (inp.closest('div, section')?.textContent || '').substring(0, 100)
        })));
      }
    } catch (err) {
      console.error("❌ SKU fill failed:", err);
    }
  } else {
    console.warn("⚠️ No SKU data available to fill");
  }

  // Delay between SKU and Price fills
  await wait(500);

  // 2️⃣ Fill Price (LAST - ensures all other fields are set first)
  if (data.ebayPrice) {
    try {
      console.log(`💰 [STEP 2] Attempting to fill price: ${data.ebayPrice}`);
      const priceSelectors = [
        'input[name="price"].textbox__control',
        'input.textbox__control[name="price"]',
        'input[name="price"][aria-label*="price" i]',
        'input[name="price"][aria-describedby*="@PRICE"]',
        'input[aria-describedby*="@PRICE"][aria-describedby*="prefix"]',
        'input[id*="@PRICE"].textbox__control',
        'input[name="price"]',
        'input[type="text"][name="price"]',
        'input[type="number"][name="price"]',
        'input[aria-describedby*="price"]',
        'input[aria-describedby*="prefix"]',
        'input[id*="@PRICE"]',
        'input[id*="price"]',
        'input[aria-label*="price" i]',
        'input[placeholder*="price" i]',
        'input[data-testid*="price" i]',
        '[name="price"]'
      ];

      let priceInput = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!priceInput && attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 Price field search attempt ${attempts}/${maxAttempts}...`);
        
        try {
          priceInput = await findElementWithSelectors(priceSelectors, 5000);
        } catch (err) {
          console.log(`⏳ Price field not found yet, attempt ${attempts}/${maxAttempts}...`);
          if (attempts < maxAttempts) {
            await wait(1000 * attempts); // Exponential backoff
          }
        }
      }

      // Fallback: Try to find by label text
      if (!priceInput) {
        console.log("🔍 Trying fallback: searching by label text for price...");
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
          const labelText = (label.textContent || '').toLowerCase();
          if (labelText.includes('price') || labelText.includes('starting price') || labelText.includes('buy it now')) {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
              const found = document.getElementById(forAttr);
              if (found && (found.type === 'text' || found.type === 'number') && found.offsetParent !== null) {
                priceInput = found;
                console.log(`✅ Found price input via label: "${labelText.trim()}"`);
                break;
              }
            }
            // Also check next sibling
            const nextInput = label.nextElementSibling;
            if (nextInput && (nextInput.tagName === 'INPUT') && nextInput.offsetParent !== null) {
              priceInput = nextInput;
              console.log(`✅ Found price input as next sibling of label`);
              break;
            }
          }
        }
      }

      if (priceInput) {
        reactInput(priceInput, data.ebayPrice);
        await wait(300); // Small delay after fill
        console.log(`✅ [STEP 2] Price filled successfully: ${data.ebayPrice}`);
      } else {
        console.warn("⚠️ Price input not found after all attempts");
        console.log("🔍 Available text inputs:", Array.from(document.querySelectorAll('input[type="text"], input[type="number"]')).slice(0, 10).map(inp => ({
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          ariaLabel: inp.getAttribute('aria-label'),
          visible: inp.offsetParent !== null
        })));
      }
    } catch (err) {
      console.error("❌ Price fill failed:", err);
    }
  } else {
    console.warn("⚠️ No price data available to fill");
  }

  console.log("✅ eBay automation completed");
}

// ─────────────────────────────────────────────
// 🔍 Page Readiness Check
// ─────────────────────────────────────────────
async function waitForPageReady() {
  console.log("⏳ Waiting for eBay listing page to be ready...");
  const maxWait = 15000; // 15 seconds max
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    // Check for key eBay listing page indicators
    const hasForm = document.querySelector('form') !== null;
    const hasInputs = document.querySelectorAll('input[type="text"], input[type="number"]').length > 0;
    const hasBody = document.body !== null;
    const hasInteractiveElements = document.querySelectorAll('button, input, select').length > 5;
    
    if (hasForm && hasInputs && hasBody && hasInteractiveElements) {
      const waitTime = Date.now() - startTime;
      console.log(`✅ Page ready detected after ${waitTime}ms`);
      return true;
    }
    
    await wait(500);
  }
  
  console.warn("⚠️ Page readiness timeout, continuing anyway...");
  return false;
}

// ─────────────────────────────────────────────
// 🏁 Message Listener
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === "RUN_EBAY_LISTER") {
    console.log("🎯 RUN_EBAY_LISTER received, starting automation...");
    
    // Wait for page to be ready
    await waitForPageReady();
    await wait(2000); // Additional buffer
    
    const data = await chrome.storage.local.get([
      "ebayTitle", "ebayPrice", "ebaySku", "watermarkedImages", "imageUrls", "itemSpecifics", 
      "productTitle", "pricingConfig", "amazonPrice"
    ]);

    console.log("📦 Retrieved data from storage:", {
      hasTitle: !!(data.ebayTitle || data.productTitle),
      hasPrice: !!data.ebayPrice,
      hasSku: !!data.ebaySku,
      price: data.ebayPrice,
      sku: data.ebaySku,
      title: data.ebayTitle || data.productTitle
    });

    // Verify we have at least title
    if (!data.ebayTitle && !data.productTitle) {
      console.error("❌ No stored product title. Need to run List-It first.");
      return;
    }
    
    // Fallback price calculation if ebayPrice is missing
    let finalPrice = data.ebayPrice;
    if (!finalPrice && data.pricingConfig && data.amazonPrice) {
      console.log("💰 Calculating price from pricing config...");
      const { tax, trackingCost, ebayFee, promo, profit } = data.pricingConfig;
      finalPrice = (data.amazonPrice + trackingCost) * (1 + tax + ebayFee + profit - promo);
      finalPrice = finalPrice.toFixed(2);
      console.log(`💰 Calculated price: ${finalPrice}`);
    }
    
    if (!finalPrice) {
      console.warn("⚠️ No price available - price will not be filled");
    }
    
    if (!data.ebaySku) {
      console.warn("⚠️ No SKU available - SKU will not be filled");
    }
    
    const title = data.ebayTitle || data.productTitle;
    
    await runEbayAutomation({
      ebayTitle: title,
      ebayPrice: finalPrice,
      ebaySku: data.ebaySku
    });

    console.log("✅ eBay automation completed");
  }
});

// ─────────────────────────────────────────────
// 🧪 Manual Testing Functions
// ─────────────────────────────────────────────
window.testSkuFill = function(sku = "TEST-SKU-123") {
  console.log("🧪 Manual SKU fill test...");
  
  const reactInput = (el, value) => {
    const lastValue = el.value;
    el.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    el.dispatchEvent(event);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  const skuSelectors = [
    'input[name="customLabel"]',
    'input[id*="CUSTOMLABEL"]',
    'input[id*="@TITLE"]',
    'input[aria-describedby*="counter"]',
    'input[aria-label*="custom"]',
    'input[aria-label*="sku"]',
    'input[placeholder*="custom"]',
    'input[placeholder*="sku"]',
    'input[type="text"][name*="label"]',
    'input[type="text"][id*="label"]',
    'input[type="text"][class*="label"]'
  ];

  let skuInput = null;
  for (const selector of skuSelectors) {
    const found = document.querySelector(selector);
    if (found && found.type === 'text') {
      skuInput = found;
      console.log(`✅ Found SKU input with selector: ${selector}`);
      break;
    }
  }

  if (skuInput) {
    reactInput(skuInput, sku);
    console.log("✅ SKU filled manually:", sku);
    return true;
  } else {
    console.warn("⚠️ SKU input not found for manual test");
    return false;
  }
};

window.debugSkuFields = function() {
  console.log("🔍 Debugging SKU fields...");
  
  const allTextInputs = document.querySelectorAll('input[type="text"]');
  console.log(`📝 Found ${allTextInputs.length} text inputs:`, 
    Array.from(allTextInputs).map(input => ({
      name: input.name,
      id: input.id,
      placeholder: input.placeholder,
      ariaLabel: input.getAttribute('aria-label'),
      className: input.className,
      value: input.value
    }))
  );
  
  const allLabels = document.querySelectorAll('label');
  console.log(`🏷️ Found ${allLabels.length} labels:`, 
    Array.from(allLabels).map(label => ({
      text: label.textContent?.trim(),
      for: label.getAttribute('for'),
      id: label.id
    }))
  );
};

// ─────────────────────────────────────────────
// 🔁 Auto Start - Try to fill SKU/Price on page load
// ─────────────────────────────────────────────
async function attemptAutoFill() {
  console.log("🔄 Attempting auto-fill on page load...");
  
  // Wait a bit for page to be ready
  await wait(3000);
  await waitForPageReady();
  
  const data = await chrome.storage.local.get([
    "ebayTitle", "ebayPrice", "ebaySku", "productTitle"
  ]);
  
  // Only attempt if we have data and we're on a listing page
  const isListingPage = window.location.href.includes('/sl/') || 
                        window.location.href.includes('/lstng') ||
                        window.location.href.includes('/sell');
  
  if (isListingPage && (data.ebaySku || data.ebayPrice)) {
    console.log("✅ Found stored data, attempting auto-fill...", {
      hasSku: !!data.ebaySku,
      hasPrice: !!data.ebayPrice
    });
    
    const title = data.ebayTitle || data.productTitle;
    await runEbayAutomation({
      ebayTitle: title,
      ebayPrice: data.ebayPrice,
      ebaySku: data.ebaySku
    });
  } else {
    console.log("ℹ️ No stored data found or not on listing page, skipping auto-fill");
  }
}

// Auto-fill attempt after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(attemptAutoFill, 1000);
  });
} else {
  setTimeout(attemptAutoFill, 2000);
}

console.log("🚀 eBay Lister script initialized");