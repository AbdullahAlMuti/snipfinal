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
        'input[type="text"][aria-describedby*="price"]'
      ];
      
      let priceInput = null;
      for (const selector of priceSelectors) {
        priceInput = document.querySelector(selector);
        if (priceInput) break;
      }
      
      if (priceInput) {
        priceInput.value = data.ebayPrice;
        ["input", "change", "blur"].forEach((eventType) =>
          priceInput.dispatchEvent(new Event(eventType, { bubbles: true }))
        );
        console.log("✅ Price filled:", data.ebayPrice);
      } else {
        console.error("❌ Price input not found");
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
        'input[id*="CUSTOMLABEL"]'
      ];
      
      let skuInput = null;
      for (const selector of skuSelectors) {
        skuInput = document.querySelector(selector);
        if (skuInput) break;
      }
      
      if (skuInput) {
        skuInput.value = data.ebaySku;
        ["input", "change", "blur"].forEach((eventType) =>
          skuInput.dispatchEvent(new Event(eventType, { bubbles: true }))
        );
        console.log("✅ SKU filled:", data.ebaySku);
      } else {
        console.error("❌ SKU input not found");
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