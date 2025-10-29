// description_paster.js - Handles description generation and pasting

console.log('📝 Description paster script loaded');
console.log('🌐 Current URL:', window.location.href);
console.log('🏷️ Page title:', document.title);

// Start the process immediately and also on load
const startDescriptionProcess = async () => {
    console.log('📝 Starting description process...');
    
    try {
        // Get the Amazon URL from storage
        const result = await chrome.storage.local.get(['tempAmazonURL']);
        const amazonURL = result.tempAmazonURL;
        
        console.log('📦 Storage result:', result);
        
        if (!amazonURL) {
            console.error('❌ No Amazon URL found in storage');
            console.log('🔍 Available storage keys:', Object.keys(result));
            return;
        }
        
        console.log('🔗 Amazon URL found:', amazonURL);
        
        // Wait a bit for the page to be fully ready
        console.log('⏳ Waiting for page to be ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to find the input field and paste the URL
        console.log('📝 Attempting to paste URL...');
        const urlPasted = await pasteAmazonURL(amazonURL);
        
        if (urlPasted) {
            console.log('✅ URL pasted successfully');
            // Try to find and click the send button
            console.log('🔘 Attempting to click send button...');
            await clickSendButton();
        } else {
            console.log('❌ Failed to paste URL');
        }
        
    } catch (error) {
        console.error('❌ Error in description process:', error);
    }
};

// Start immediately
startDescriptionProcess();

// Also start on load event
window.addEventListener('load', startDescriptionProcess);

// Start on DOMContentLoaded as well
document.addEventListener('DOMContentLoaded', startDescriptionProcess);

// Function to paste the Amazon URL into the input field
async function pasteAmazonURL(url) {
    console.log('📝 Looking for input field to paste URL...');
    
    // Try multiple selectors for input fields
    const inputSelectors = [
        'input[type="text"]',
        'input[placeholder*="message"]',
        'input[placeholder*="text"]',
        'input[placeholder*="input"]',
        'textarea',
        '.input-field input',
        '.message-input',
        '.text-input',
        '#message-input',
        '#text-input',
        '[contenteditable="true"]'
    ];
    
    let inputField = null;
    
    for (const selector of inputSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Checking selector "${selector}": found ${elements.length} elements`);
        
        for (const element of elements) {
            if (element.offsetParent !== null && !element.disabled && !element.readOnly) {
                inputField = element;
                console.log('✅ Found visible input field:', element);
                break;
            }
        }
        
        if (inputField) break;
    }
    
    if (!inputField) {
        console.error('❌ No suitable input field found');
        return false;
    }
    
    try {
        // Focus the input field
        inputField.focus();
        console.log('✅ Input field focused');
        
        // Clear any existing content
        inputField.value = '';
        inputField.textContent = '';
        
        // Set the value
        if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
            inputField.value = url;
        } else {
            inputField.textContent = url;
        }
        
        // Trigger input events
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        inputField.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('✅ URL pasted successfully:', url);
        return true;
        
    } catch (error) {
        console.error('❌ Error pasting URL:', error);
        return false;
    }
}

// Function to find and click the send button
async function clickSendButton() {
    console.log('📝 Looking for send button...');
    
    // Wait a bit for the input to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try multiple selectors for send buttons
    const sendButtonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button[class*="send"]',
        'button[class*="submit"]',
        'button[class*="go"]',
        'button[class*="post"]',
        'button[class*="publish"]',
        'button[class*="share"]',
        '.send-button',
        '.submit-button',
        '.go-button',
        '.post-button',
        '#send-button',
        '#submit-button',
        '#go-button',
        'button:contains("Send")',
        'button:contains("Submit")',
        'button:contains("Go")',
        'button:contains("Post")',
        'button:contains("Publish")',
        'button:contains("Share")'
    ];
    
    let sendButton = null;
    
    for (const selector of sendButtonSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Checking send button selector "${selector}": found ${elements.length} elements`);
        
        for (const element of elements) {
            if (element.offsetParent !== null && !element.disabled) {
                const text = element.textContent?.toLowerCase() || '';
                if (text.includes('send') || text.includes('submit') || text.includes('go') || 
                    text.includes('post') || text.includes('publish') || text.includes('share') ||
                    selector.includes('submit') || selector.includes('send')) {
                    sendButton = element;
                    console.log('✅ Found send button:', element, 'Text:', text);
                    break;
                }
            }
        }
        
        if (sendButton) break;
    }
    
    if (!sendButton) {
        console.error('❌ No send button found');
        return false;
    }
    
    try {
        // Scroll the button into view
        sendButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait a bit for scroll
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Click the button
        sendButton.click();
        console.log('✅ Send button clicked successfully');
        
        // Visual feedback
        sendButton.style.backgroundColor = '#28a745';
        sendButton.style.color = 'white';
        
        setTimeout(() => {
            sendButton.style.backgroundColor = '';
            sendButton.style.color = '';
        }, 2000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error clicking send button:', error);
        return false;
    }
}

// Debug function to check page elements
window.debugDescriptionPage = function() {
    console.log('🔍 Debugging description page elements...');
    console.log('🌐 URL:', window.location.href);
    console.log('🏷️ Title:', document.title);
    
    const inputFields = document.querySelectorAll('input, textarea, [contenteditable="true"]');
    console.log(`📝 Found ${inputFields.length} input fields:`);
    inputFields.forEach((field, index) => {
        if (index < 10) { // Limit to first 10
            console.log(`  ${index + 1}.`, field.tagName, field.type, field.placeholder, field.className);
        }
    });
    
    const buttons = document.querySelectorAll('button, input[type="submit"]');
    console.log(`🔘 Found ${buttons.length} buttons:`);
    buttons.forEach((button, index) => {
        if (index < 10) { // Limit to first 10
            console.log(`  ${index + 1}.`, button.tagName, button.textContent?.trim(), button.className);
        }
    });
    
    return { inputFields: inputFields.length, buttons: buttons.length };
};

// Manual trigger function
window.manualDescriptionProcess = async function() {
    console.log('🔧 Manually triggering description process...');
    
    const result = await chrome.storage.local.get(['tempAmazonURL']);
    const amazonURL = result.tempAmazonURL;
    
    if (!amazonURL) {
        console.error('❌ No Amazon URL found in storage');
        console.log('🔍 Available storage keys:', Object.keys(result));
        return;
    }
    
    console.log('🔗 Using Amazon URL:', amazonURL);
    
    const urlPasted = await pasteAmazonURL(amazonURL);
    if (urlPasted) {
        const buttonClicked = await clickSendButton();
        if (buttonClicked) {
            console.log('✅ Manual description process completed successfully!');
        } else {
            console.log('⚠️ URL pasted but send button not clicked');
        }
    } else {
        console.log('❌ Failed to paste URL');
    }
};

// Test function to set a fake Amazon URL for testing
window.testDescriptionProcess = async function(testURL = 'https://www.amazon.com/test-product/dp/B123456789') {
    console.log('🧪 Testing description process with URL:', testURL);
    
    // Set a test URL in storage
    await chrome.storage.local.set({ tempAmazonURL: testURL });
    console.log('✅ Test URL set in storage');
    
    // Run the process
    await manualDescriptionProcess();
};

// Force start function
window.forceStartDescription = function() {
    console.log('🔧 Force starting description process...');
    startDescriptionProcess();
};
