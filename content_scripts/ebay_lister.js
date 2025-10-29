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
        'input[placeholder*="sku"]'
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
        reactInput(skuInput, data.ebaySku);
        console.log("✅ SKU filled:", data.ebaySku);
      } else {
        console.warn("⚠️ SKU input not found");
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