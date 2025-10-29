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

  // 1️⃣ Fill Title
    if (data.ebayTitle) {
    try {
      console.log("📝 Filling title...");
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
        titleInput.value = data.ebayTitle;
        ["input", "change", "blur"].forEach((eventType) =>
          titleInput.dispatchEvent(new Event(eventType, { bubbles: true }))
        );
        console.log("✅ Title filled:", data.ebayTitle);
        } else {
        console.error("❌ Title input not found");
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
        priceInput = document.querySelector(selector);
        if (priceInput && priceInput.type === 'text') {
          console.log(`✅ Found price input with selector: ${selector}`);
                                break;
        }
    }

      if (priceInput) {
        priceInput.value = data.ebayPrice;
        ["input", "change", "blur", "keyup"].forEach((eventType) =>
          priceInput.dispatchEvent(new Event(eventType, { bubbles: true }))
        );
        console.log("✅ Price filled:", data.ebayPrice);
            } else {
        // Fallback: Search by label text
        console.log("🔍 Trying fallback method: searching by label text...");
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
          const labelText = label.textContent?.toLowerCase() || '';
          if (labelText.includes('price') || labelText.includes('cost')) {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
              priceInput = document.getElementById(forAttr);
              if (priceInput && priceInput.type === 'text') {
                console.log(`✅ Found price input via label: "${labelText}"`);
            break;
        }
            }
          }
        }
        
        if (priceInput) {
          priceInput.value = data.ebayPrice;
          ["input", "change", "blur", "keyup"].forEach((eventType) =>
            priceInput.dispatchEvent(new Event(eventType, { bubbles: true }))
          );
          console.log("✅ Price filled via fallback:", data.ebayPrice);
        } else {
          console.error("❌ Price input not found");
          // Debug: List all text inputs on the page
          const allTextInputs = document.querySelectorAll('input[type="text"]');
          console.log(`🔍 Found ${allTextInputs.length} text inputs on page:`, 
            Array.from(allTextInputs).map(input => ({
              name: input.name,
              id: input.id,
              placeholder: input.placeholder,
              ariaLabel: input.getAttribute('aria-label'),
              className: input.className
            }))
          );
        }
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
        'input[placeholder*="sku"]'
      ];
      
      let skuInput = null;
      for (const selector of skuSelectors) {
        skuInput = document.querySelector(selector);
        if (skuInput && skuInput.type === 'text') {
          console.log(`✅ Found SKU input with selector: ${selector}`);
          break;
        }
      }
    
      if (skuInput) {
        skuInput.value = data.ebaySku;
        ["input", "change", "blur", "keyup"].forEach((eventType) =>
          skuInput.dispatchEvent(new Event(eventType, { bubbles: true }))
        );
        console.log("✅ SKU filled:", data.ebaySku);
            } else {
        // Fallback: Search by label text
        console.log("🔍 Trying fallback method: searching by label text...");
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
          const labelText = label.textContent?.toLowerCase() || '';
          if (labelText.includes('custom label') || labelText.includes('sku') || labelText.includes('identifier')) {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
              skuInput = document.getElementById(forAttr);
              if (skuInput && skuInput.type === 'text') {
                console.log(`✅ Found SKU input via label: "${labelText}"`);
            break;
        }
    }
          }
        }
        
        if (skuInput) {
          skuInput.value = data.ebaySku;
          ["input", "change", "blur", "keyup"].forEach((eventType) =>
            skuInput.dispatchEvent(new Event(eventType, { bubbles: true }))
          );
          console.log("✅ SKU filled via fallback:", data.ebaySku);
    } else {
          console.error("❌ SKU input not found");
          // Debug: List all text inputs on the page
          const allTextInputs = document.querySelectorAll('input[type="text"]');
          console.log(`🔍 Found ${allTextInputs.length} text inputs on page:`, 
            Array.from(allTextInputs).map(input => ({
              name: input.name,
              id: input.id,
              placeholder: input.placeholder,
              ariaLabel: input.getAttribute('aria-label'),
              className: input.className
            }))
          );
        }
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
// 🔁 Auto Start
// ─────────────────────────────────────────────
setTimeout(() => {
    console.log("🚀 Starting eBay Lister initialization...");
}, 1000);