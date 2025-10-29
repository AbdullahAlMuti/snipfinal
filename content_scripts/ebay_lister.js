console.log("eBay Lister script loaded: Awaiting data...");

// ─────────────────────────────────────────────
// 🔧 Helper Functions
// ─────────────────────────────────────────────
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
        await wait(250);
    }
  throw new Error(`Element with selector "${selector}" not found`);
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

  // 1️⃣ Fill Title
  if (data.ebayTitle) {
    try {
      const titleSelectors = [
        'input[name="title"]',
        'input[id*="keyword"]',
        'input[aria-label*="title"]'
      ];
      let titleInput = null;
      for (const selector of titleSelectors) {
        titleInput = document.querySelector(selector);
        if (titleInput) break;
      }
      if (titleInput) {
        reactInput(titleInput, data.ebayTitle);
        console.log("✅ Title filled:", data.ebayTitle);
      } else {
        console.warn("⚠️ Title input not found");
      }
    } catch (err) {
      console.error("❌ Title fill failed:", err);
    }
  }

  // 2️⃣ Fill Price
  if (data.ebayPrice) {
    try {
      console.log("💰 Filling price...");
      const priceSelectors = [
        'input[name="price"]',
        'input[type="text"][aria-describedby*="price"]',
        'input[type="text"][aria-describedby*="prefix"]',
        'input[id*="@PRICE"]',
        'input.textbox__control[name="price"]',
        'input[aria-label*="price"]',
        'input[placeholder*="price"]'
      ];

      let priceInput = null;
      for (const selector of priceSelectors) {
        const found = document.querySelector(selector);
        if (found && found.type === 'text') {
          priceInput = found;
          console.log(`✅ Found price input with selector: ${selector}`);
          break;
        }
      }

      if (priceInput) {
        reactInput(priceInput, data.ebayPrice);
        console.log("✅ Price filled:", data.ebayPrice);
      } else {
        console.warn("⚠️ Price input not found");
      }
    } catch (err) {
      console.error("❌ Price fill failed:", err);
    }
  }

  // 3️⃣ Fill SKU
  if (data.ebaySku) {
    try {
      console.log("🏷️ Filling SKU...");
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

      // Fallback: Search by label text
      if (!skuInput) {
        console.log("🔍 Trying fallback method: searching by label text...");
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
          const labelText = label.textContent?.toLowerCase() || '';
          if (labelText.includes('custom label') || labelText.includes('sku') || 
              labelText.includes('identifier') || labelText.includes('item number')) {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
              const found = document.getElementById(forAttr);
              if (found && found.type === 'text') {
                skuInput = found;
                console.log(`✅ Found SKU input via label: "${labelText}"`);
                break;
              }
            }
          }
        }
      }

      if (skuInput) {
        reactInput(skuInput, data.ebaySku);
        console.log("✅ SKU filled:", data.ebaySku);
      } else {
        console.warn("⚠️ SKU input not found");
        // Debug: List all text inputs on the page
        const allTextInputs = document.querySelectorAll('input[type="text"]');
        console.log(`🔍 Found ${allTextInputs.length} text inputs on page:`, 
          Array.from(allTextInputs).map(input => ({
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            ariaLabel: input.getAttribute('aria-label'),
            className: input.className,
            value: input.value
          }))
        );
        
        // Debug: List all labels on the page
        const allLabels = document.querySelectorAll('label');
        console.log(`🔍 Found ${allLabels.length} labels on page:`, 
          Array.from(allLabels).map(label => ({
            text: label.textContent?.trim(),
            for: label.getAttribute('for'),
            id: label.id
          }))
        );
      }
    } catch (err) {
      console.error("❌ SKU fill failed:", err);
    }
  }

  console.log("✅ eBay automation completed");
}

// ─────────────────────────────────────────────
// 🏁 Message Listener
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === "RUN_EBAY_LISTER") {
    console.log("🎯 RUN_EBAY_LISTER received, starting automation...");
    
    // Wait for page to be fully loaded
    await wait(2000);
    
    const data = await chrome.storage.local.get([
      "ebayTitle", "ebayPrice", "ebaySku", "watermarkedImages", "imageUrls", "itemSpecifics"
    ]);

    console.log("📦 Retrieved data from storage:", data);

    // Fallback price calculation if ebayPrice is missing
    let finalPrice = data.ebayPrice;
    if (!finalPrice && data.pricingConfig && data.amazonPrice) {
      const { tax, trackingCost, ebayFee, promo, profit } = data.pricingConfig;
      finalPrice = (data.amazonPrice + trackingCost) * (1 + tax + ebayFee + profit - promo);
      finalPrice = finalPrice.toFixed(2);
    }

    if (!data.ebayTitle && !data.productTitle) {
      console.error("❌ No stored product title. Need to run List-It first.");
        return;
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
// 🔁 Auto Start
// ─────────────────────────────────────────────
setTimeout(() => {
  console.log("🚀 Starting eBay Lister initialization...");
}, 1000);