// ebay-snipping-extension/background.js

// Listens for the message from the Amazon content script to start the eBay process.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_OPTILIST") {
    
    // 1. Save the selected title and condition to chrome.storage.local.
    const storageData = { 
      ebayTitle: request.title,
      ebayCondition: request.condition || "1000" // Default to "New" condition (1000)
    };
    
    chrome.storage.local.set(storageData, () => {
      chrome.tabs.create({ url: "https://www.ebay.com/sl/prelist/suggest?sr=shListingsTopNav" }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            
            // Send RUN_EBAY_LISTER message to the eBay tab
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: "RUN_EBAY_LISTER" }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Error sending RUN_EBAY_LISTER:", chrome.runtime.lastError);
                } else {
                  console.log("✅ RUN_EBAY_LISTER sent successfully");
                }
              });
            }, 2000); // Wait 2 seconds for page to fully load
            
            sendResponse({ success: true, message: "Automation ready" });
          }
        });
      });
    });
    return true; // Indicates an asynchronous response.
  } else if (request.action === 'openNewTabForDescription') {
    chrome.storage.local.set({ tempAmazonURL: request.amazonURL }, () => {
      chrome.tabs.create({ url: request.targetURL, active: false }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content_scripts/description_paster.js"]
              }).catch((error) => {
                console.error("Error injecting description script:", error);
              });
            }, 2000);
          }
        });
      });
    });
    return true;
  } else if (request.action === 'openNewTabForProductDetails') {
    // Store the title temporarily so the new script can access it
    chrome.storage.local.set({ tempAmazonTitle: request.amazonTitle }, () => {
      // Create the new tab in the background (active: false)
      chrome.tabs.create({ url: request.targetURL, active: false }, (tab) => {
        // Wait for the tab to finish loading before injecting the script
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            // Inject the new paster script into the fully loaded tab
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content_scripts/description_paster.js"]
            });
          }
        });
      });
    });
    return true; // Indicates an asynchronous response
  } else {
    sendResponse({ success: false, error: "Unknown action" });
  }
});