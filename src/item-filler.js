/**
 * @fileoverview eBay Item Specifics Filler with "Find Keyword and Click First" Algorithm
 * @description Simple, direct automation that finds legends and clicks first suggestions
 * @version 6.0.0 - Find Keyword and Click First Algorithm
 */

class SimpleItemFillerSystem {
    constructor() {
        this.logger = window.logger || new Logger();
        this.logger.info('✅ SimpleItemFillerSystem initialized with "Find Keyword and Click First" algorithm.');
    }

    async run() {
        this.logger.info('🚀 Starting Simple Item Filler System...');
        
        // STEP 1: Smart Wait for "Apply all" button (MOST IMPORTANT)
        await this.smartWaitForApplyAll();

        // STEP 2: Find and click first suggestions
        await this.findAndClickFirstSuggestions();

        // STEP 3: Fill description if available
        await this.fillDescription();

        this.logger.info('🎉 Simple Item Filler System completed!');
        
        // STEP 4: Click AI description button after item filler completes
        await this.clickAIDescriptionButton();
    }

    /**
     * Smart Wait for "Apply all" button
     */
    async smartWaitForApplyAll() {
        this.logger.info('🔍 Starting Smart Wait for "Apply all" button...');
        
        const startTime = Date.now();
        let applyButton = null;
        
        // Wait up to 15 seconds for the button to become enabled
        while (Date.now() - startTime < 15000) {
            // Find the "Apply all" button with multiple strategies
            const applyAllSelectors = [
                'button[data-testid*="apply-all"]',
                'button[class*="apply-all"]',
                'button[class*="applyAll"]',
                'button[class*="apply_all"]',
                'input[type="button"][value*="Apply all"]',
                'input[type="submit"][value*="Apply all"]',
                '[role="button"]:contains("Apply all")'
            ];
            
            // Try selectors first
            for (const selector of applyAllSelectors) {
                try {
                    applyButton = document.querySelector(selector);
                    if (applyButton) break;
                } catch (e) {
                    // Invalid selector, continue
                }
            }
            
            // If not found with selectors, search by text content
            if (!applyButton) {
                const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
                
                for (const button of buttons) {
                    const buttonText = (button.innerText || button.textContent || button.value || '').trim().toLowerCase();
                    if (buttonText === 'apply all' || buttonText === 'applyall' || buttonText.includes('apply all')) {
                        applyButton = button;
                        break;
                    }
                }
            }
            
            if (applyButton) {
                // Check if button is enabled and visible
                const isDisabled = applyButton.hasAttribute('disabled') || 
                                 applyButton.disabled || 
                                 applyButton.classList.contains('disabled') ||
                                 applyButton.offsetParent === null;
                
                if (!isDisabled) {
                    this.logger.info('✅ "Apply all" button is now enabled! Clicking...');
                    applyButton.click();
                    await this.sleep(3000); // Wait for page to process
                    return true;
                } else {
                    this.logger.info('⏳ "Apply all" button found but still disabled or hidden. Waiting...');
                }
            } else {
                this.logger.info('⏳ "Apply all" button not found yet. Waiting...');
            }
            
            await this.sleep(500); // Check every 500ms
        }
        
        this.logger.warn('⚠️ "Apply all" button did not become enabled within timeout. Continuing...');
        return false;
    }

    /**
     * HIGHLIGHT - Find and Click First Suggestions Algorithm
     */
    async findAndClickFirstSuggestions() {
        this.logger.info('🔍 Starting "Find Keyword and Click First" algorithm...');
        
        // Wait a bit for the page to load suggestions
        await this.sleep(2000);
        
        // Search the entire page for all <legend> elements
        const legends = document.querySelectorAll('legend');
        this.logger.info(`📋 Found ${legends.length} legend elements on the page`);
        
        let processedCount = 0;
        
        // Loop through each legend
        for (const legend of legends) {
            const legendText = (legend.innerText || legend.textContent || '').trim();
            
            // Check if legend text contains suggestion keywords
            const suggestionKeywords = [
                'frequently selected',
                'suggested',
                'recommended',
                'popular',
                'most selected',
                'top choices'
            ];
            
            const hasSuggestionKeyword = suggestionKeywords.some(keyword => 
                legendText.toLowerCase().includes(keyword)
            );
            
            if (legendText && hasSuggestionKeyword) {
                this.logger.info(`🎯 Found suggestion legend: "${legendText}"`);
                
                try {
                    // Check if the field is already filled
                    const isAlreadyFilled = await this.checkIfFieldFilled(legend);
                    
                    if (isAlreadyFilled) {
                        this.logger.info(`ℹ️ Field already filled, skipping this legend`);
                        continue;
                    }
                    
                    // Click the very next button
                    const clicked = await this.clickNextButton(legend);
                    
                    if (clicked) {
                        processedCount++;
                        this.logger.info(`✅ Successfully clicked suggestion for legend: "${legendText}"`);
                        
                        // Human-like delay before moving to next legend
                        await this.sleep(1500);
                    } else {
                        this.logger.warn(`⚠️ Could not click suggestion for legend: "${legendText}"`);
                    }
                    
                } catch (error) {
                    this.logger.error(`💥 Error processing legend "${legendText}":`, error);
                }
            }
        }
        
        // Also look for suggestion buttons without legends
        await this.clickSuggestionButtonsWithoutLegends();
        
        this.logger.info(`🎉 Processed ${processedCount} suggestion legends`);
    }
    
    /**
     * Click suggestion buttons that don't have legends
     */
    async clickSuggestionButtonsWithoutLegends() {
        this.logger.info('🔍 Looking for suggestion buttons without legends...');
        
        // Look for common suggestion button patterns
        const suggestionButtonSelectors = [
            'button.fake-link',
            'button[class*="suggestion"]',
            'button[class*="recommended"]',
            'button[class*="popular"]',
            'button[class*="frequently"]',
            'a[class*="suggestion"]',
            'a[class*="recommended"]',
            'a[class*="popular"]',
            '[role="button"][class*="suggestion"]'
        ];
        
        let clickedCount = 0;
        
        for (const selector of suggestionButtonSelectors) {
            try {
                const buttons = document.querySelectorAll(selector);
                this.logger.info(`🔍 Found ${buttons.length} buttons with selector: ${selector}`);
                
                for (const button of buttons) {
                    // Check if button is clickable and not already processed
                    if (button.offsetParent !== null && 
                        !button.disabled && 
                        !button.classList.contains('processed')) {
                        
                        const buttonText = (button.innerText || button.textContent || '').trim();
                        this.logger.info(`🎯 Clicking suggestion button: "${buttonText}"`);
                        
                        button.click();
                        button.classList.add('processed'); // Mark as processed
                        clickedCount++;
                        
                        // Small delay between clicks
                        await this.sleep(800);
                    }
                }
            } catch (e) {
                // Invalid selector, continue
            }
        }
        
        this.logger.info(`✅ Clicked ${clickedCount} suggestion buttons without legends`);
    }

    /**
     * Check if the field is already filled
     */
    async checkIfFieldFilled(legend) {
        try {
            // Find the parent fieldset
            const fieldset = legend.closest('fieldset');
            if (!fieldset) return false;
            
            // Look for the main dropdown button in this fieldset
            const dropdownButton = fieldset.querySelector('button[name*="attributes"]');
            
            if (dropdownButton) {
                const buttonText = dropdownButton.innerText.trim();
                const placeholderTexts = ['–', 'Select', 'Choose', '', 'None', 'N/A', 'Please select'];
                
                const isFilled = buttonText && !placeholderTexts.includes(buttonText);
                if (isFilled) {
                    this.logger.info(`ℹ️ Field already filled with: "${buttonText}"`);
                }
                return isFilled;
            }
            
            // Also check for input fields
            const inputField = fieldset.querySelector('input, textarea');
            if (inputField) {
                const isFilled = inputField.value && inputField.value.trim() !== '';
                if (isFilled) {
                    this.logger.info(`ℹ️ Input field already filled with: "${inputField.value}"`);
                }
                return isFilled;
            }
            
            return false;
            
        } catch (error) {
            this.logger.error('💥 Error checking if field is filled:', error);
            return false;
        }
    }

    /**
     * Click the very next button after the legend
     */
    async clickNextButton(legend) {
        try {
            // Get the parent fieldset
            const fieldset = legend.closest('fieldset');
            if (!fieldset) {
                this.logger.warn('⚠️ No fieldset found for legend');
                return false;
            }
            
            // Look for clickable elements in the fieldset
            const clickableSelectors = [
                'button.fake-link',
                'button[class*="suggestion"]',
                'button[class*="recommended"]',
                'button[class*="popular"]',
                'a[class*="suggestion"]',
                'a[class*="recommended"]',
                'a[class*="popular"]',
                '[role="button"]',
                'button:not([disabled])',
                'a:not([disabled])'
            ];
            
            for (const selector of clickableSelectors) {
                try {
                    const buttons = fieldset.querySelectorAll(selector);
                    
                    for (const button of buttons) {
                        // Check if button is visible and clickable
                        if (button.offsetParent !== null && 
                            !button.disabled && 
                            !button.classList.contains('processed')) {
                            
                            const buttonText = (button.innerText || button.textContent || '').trim();
                            this.logger.info(`🎯 Clicking button: "${buttonText}"`);
                            
                            button.click();
                            button.classList.add('processed'); // Mark as processed
                            return true;
                        }
                    }
                } catch (e) {
                    // Invalid selector, continue
                }
            }
            
            // If no specific buttons found, try the next element after legend
            const nextElement = legend.nextElementSibling;
            if (nextElement && (nextElement.tagName === 'BUTTON' || nextElement.tagName === 'A')) {
                if (nextElement.offsetParent !== null && !nextElement.disabled) {
                    const buttonText = (nextElement.innerText || nextElement.textContent || '').trim();
                    this.logger.info(`🎯 Clicking next element: "${buttonText}"`);
                    nextElement.click();
                    return true;
                }
            }
            
            this.logger.warn('⚠️ No suitable button found to click in fieldset');
            return false;
            
        } catch (error) {
            this.logger.error('💥 Error clicking next button:', error);
            return false;
        }
    }

    /**
     * Fill product description if available
     */
    async fillDescription() {
        try {
            // Get description from storage
            const result = await new Promise(resolve => {
                chrome.storage.local.get(['description'], resolve);
            });
            
            if (!result.description) {
                this.logger.info('ℹ️ No description found in storage, skipping description fill');
                return;
            }
            
            this.logger.info('📝 Filling product description...');
            
            const descriptionEditor = document.querySelector('.rte-editor > iframe');
            
            if (descriptionEditor && descriptionEditor.contentDocument) {
                const editorBody = descriptionEditor.contentDocument.body;
                if (!editorBody.innerText || editorBody.innerText.trim() === '') {
                    const formattedDescription = result.description
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/\n/g, '<br>');
                    
                    editorBody.innerHTML = `<p>${formattedDescription}</p>`;
                    this.logger.info('✅ Description filled in iframe editor.');
                } else {
                    this.logger.info('ℹ️ Description field already contains text. Skipping.');
                }
            } else {
                this.logger.warn('⚠️ Could not find the description editor iframe.');
            }
            
        } catch (error) {
            this.logger.error('💥 Error filling description:', error);
        }
    }

    /**
     * Click AI description button after item filler completes
     */
    async clickAIDescriptionButton() {
        this.logger.info('🤖 Looking for "Use AI description" button after item filler completion...');
        
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            // Look for the AI description button
            const aiButton = document.querySelector('button.se-rte__ai-description-button.ai-icon.btn');
            
            if (aiButton) {
                this.logger.info('✅ Found "Use AI description" button');
                
                // Check if button is clickable
                if (!aiButton.disabled && aiButton.offsetParent !== null) {
                    this.logger.info('🤖 Clicking "Use AI description" button...');
                    aiButton.click();
                    this.logger.info('✅ Successfully clicked "Use AI description" button');
                    return true;
                } else {
                    this.logger.info('⏳ AI description button found but not clickable yet, waiting...');
                }
            } else {
                this.logger.info('⏳ AI description button not found yet, waiting...');
            }
            
            // Wait before next check
            await this.sleep(500);
        }
        
        this.logger.warn('⚠️ "Use AI description" button not found within timeout');
        return false;
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==============================================================================
//  SIMPLE INITIALIZATION LOGIC
//  Implements conflict prevention and smart timing
// ==============================================================================

(async function() {
    // Prevent double initialization
    if (window.simpleItemFillerSystemInitialized) {
        return;
    }
    window.simpleItemFillerSystemInitialized = true;

    const logger = window.logger || new Logger();
    logger.info('🚀 Simple Item Filler script loaded with "Find Keyword and Click First" algorithm.');

    // Smart timing: Wait for page to be fully interactive
    await new Promise(resolve => setTimeout(resolve, 4000));

    try {
        const fillerSystem = new SimpleItemFillerSystem();
        await fillerSystem.run();
    } catch (error) {
        logger.error('💥 A fatal error occurred during the simple item filling process:', error);
    }
})();