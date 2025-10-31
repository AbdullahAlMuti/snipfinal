// popup.js - SKU Settings Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏷️ SKU Settings popup loaded');
    
    // Get DOM elements
    const skuSeriesSelect = document.getElementById('sku-series');
    const autoSkuCheckbox = document.getElementById('auto-sku');
    const saveBtn = document.getElementById('save-btn');
    
    // Load existing settings
    await loadSettings();
    
    // Add event listeners
    saveBtn.addEventListener('click', saveSettings);
    
    // Auto-save on change (optional)
    skuSeriesSelect.addEventListener('change', () => {
        console.log('📝 SKU series changed to:', skuSeriesSelect.value);
    });
    
    autoSkuCheckbox.addEventListener('change', () => {
        console.log('📝 Auto SKU toggled:', autoSkuCheckbox.checked);
    });
});

// Load settings from chrome.storage.sync
async function loadSettings() {
    try {
        console.log('📥 Loading SKU settings...');
        
        const result = await chrome.storage.sync.get(['selectedSKU', 'autoSkuEnabled']);
        
        const selectedSKU = result.selectedSKU || 'AB';
        const autoSkuEnabled = result.autoSkuEnabled !== undefined ? result.autoSkuEnabled : true;
        
        console.log('📊 Loaded settings:', { selectedSKU, autoSkuEnabled });
        
        // Update UI
        document.getElementById('sku-series').value = selectedSKU;
        document.getElementById('auto-sku').checked = autoSkuEnabled;
        
        console.log('✅ Settings loaded successfully');
    } catch (error) {
        console.error('❌ Error loading settings:', error);
        // Set defaults
        document.getElementById('sku-series').value = 'AB';
        document.getElementById('auto-sku').checked = true;
    }
}

// Save settings to chrome.storage.sync
async function saveSettings() {
    const saveBtn = document.getElementById('save-btn');
    const skuSeries = document.getElementById('sku-series').value;
    const autoSkuEnabled = document.getElementById('auto-sku').checked;
    
    try {
        console.log('💾 Saving SKU settings...');
        console.log('📊 Settings to save:', { selectedSKU: skuSeries, autoSkuEnabled });
        
        // Disable save button during save
        saveBtn.disabled = true;
        saveBtn.textContent = '💾 Saving...';
        
        // Save to chrome.storage.sync
        await chrome.storage.sync.set({
            selectedSKU: skuSeries,
            autoSkuEnabled: autoSkuEnabled
        });
        
        console.log('✅ Settings saved successfully');
        
        // Show success feedback
        saveBtn.textContent = '✅ Saved!';
        saveBtn.classList.add('success');
        
        // Send message to dashboard to update settings
        try {
            await chrome.runtime.sendMessage({ 
                type: "SKU_SETTINGS_UPDATED",
                data: {
                    selectedSKU: skuSeries,
                    autoSkuEnabled: autoSkuEnabled
                }
            });
            console.log('📤 Settings update message sent to dashboard');
        } catch (error) {
            console.log('⚠️ Could not send message to dashboard (popup may be closed)');
        }
        
        // Reset button after delay
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Settings';
            saveBtn.classList.remove('success');
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        
        // Show error feedback
        saveBtn.disabled = false;
        saveBtn.textContent = '❌ Error';
        saveBtn.style.background = '#dc3545';
        
        setTimeout(() => {
            saveBtn.textContent = '💾 Save Settings';
            saveBtn.style.background = '';
        }, 2000);
    }
}

// Generate SKU function (for reference)
function generateSKU(prefix) {
    const timestamp = Date.now().toString().slice(-6); // e.g., 239010
    return `${prefix}${timestamp}`;
}

// Export for testing
window.generateSKU = generateSKU;