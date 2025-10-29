// ebay-snipping-extension/background.js

// Listens for the message from the Amazon content script to start the eBay process.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🔍 Background script received message:", request);
  console.log("🔍 Sender:", sender);
  
  if (request.action === "startOptiList") {
    console.log("🚀 Starting Opti-list workflow with title:", request.title);
    
    // 1. Save the selected title and condition to chrome.storage.local.
    const storageData = { 
      ebayTitle: request.title,
      ebayCondition: request.condition || "1000" // Default to "New" condition (1000)
    };
    
    chrome.storage.local.set(storageData, () => {
      console.log("✅ Title and condition saved to storage:", storageData);
      
      // 2. Create the new eBay tab.
      console.log("🔍 Creating eBay tab...");
      chrome.tabs.create({ url: "https://www.ebay.com/sl/prelist/suggest?sr=shListingsTopNav" }, (tab) => {
        console.log("✅ eBay tab created with ID:", tab.id);
        
        // 3. Listen for the tab to complete loading before injecting the script.
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          console.log("🔍 Tab update:", tabId, info.status);
          if (tabId === tab.id && info.status === 'complete') {
            console.log("✅ eBay tab loaded completely, injecting script...");
            // Remove the listener to prevent it from firing multiple times.
            chrome.tabs.onUpdated.removeListener(listener);
            
            // 4. The automation script is already injected via manifest content_scripts
            // No need to inject manually as the automation-clean.js is already loaded
            console.log("✅ Automation script is already loaded via manifest");
            sendResponse({ success: true, message: "Automation ready" });
          }
        });
      });
    });
    return true; // Indicates an asynchronous response.
  } else if (request.action === 'openNewTabForDescription') {
    console.log("📝 Opening new tab for description with URL:", request.amazonURL);
    
    // Store the URL temporarily so the new script can access it
    chrome.storage.local.set({ tempAmazonURL: request.amazonURL }, () => {
      console.log("✅ Amazon URL stored in storage");
      
      // Create the new tab in the background (active: false)
      chrome.tabs.create({ url: request.targetURL, active: false }, (tab) => {
        console.log("✅ New tab created with ID:", tab.id);
        
        // Wait for the tab to finish loading before injecting the script
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          console.log("🔍 Tab update:", tabId, info.status);
          if (tabId === tab.id && info.status === 'complete') {
            console.log("✅ Tab loaded completely, injecting description script...");
            chrome.tabs.onUpdated.removeListener(listener);
            
            // Wait a bit more for the page to be fully ready
            setTimeout(() => {
              // Inject the new paster script into the fully loaded tab
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content_scripts/description_paster.js"]
              }).then(() => {
                console.log("✅ Description script injected successfully");
              }).catch((error) => {
                console.error("❌ Error injecting description script:", error);
              });
            }, 2000); // Wait 2 seconds before injecting
          }
        });
      });
    });
    return true; // Indicates an asynchronous response
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
    console.log("❌ Unknown action:", request.action);
    sendResponse({ success: false, error: "Unknown action" });
  }
});