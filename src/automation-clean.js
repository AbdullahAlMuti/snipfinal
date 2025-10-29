/**
 * @fileoverview Clean Chrome Extension Automation System
 * @author Advanced Automation System
 * @version 4.0.0
 */

// Global configuration
window.CONFIG = {
    debug: false, // Reduced logging for better performance
    verbose: false,
    logLevel: 'warn', // Only show warnings and errors
    timing: {
        minDelay: 300, // Reduced delays for faster execution
        maxDelay: 800,
        stepDelay: 1000,
        retryDelay: 2000,
        maxRetries: 2 // Reduced retries for faster failure detection
    }
};

// Simple logger
class Logger {
    constructor() {
        this.config = window.CONFIG;
    }

    _shouldLog(level) {
        if (!this.config.debug && level === 'debug') return false;
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.config.logLevel];
    }

    _log(level, message, data = null) {
        if (!this._shouldLog(level)) return;

        const timestamp = new Date().toISOString();
        const randomId = Math.random().toString(36).substr(2, 5);
        const prefix = `[${timestamp}] [${randomId}]`;
        const formattedMessage = `${prefix} [${level.toUpperCase()}] ${message}`;
        
        switch (level) {
            case 'debug':
                console.debug(formattedMessage, data || '');
                break;
            case 'info':
                console.info(formattedMessage, data || '');
                break;
            case 'warn':
                console.warn(formattedMessage, data || '');
                break;
            case 'error':
                console.error(formattedMessage, data || '');
                break;
        }
    }

    debug(message, data = null) { this._log('debug', message, data); }
    info(message, data = null) { this._log('info', message, data); }
    warn(message, data = null) { this._log('warn', message, data); }
    error(message, data = null) { this._log('error', message, data); }
}

// Utility functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// DOM Helper
class DOMHelper {
    constructor() {
        this.logger = window.logger;
    }

    async waitForElement(selector, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) {
                this.logger.debug(`Element found: ${selector}`);
                return element;
            }
            await sleep(50);
        }
        
        this.logger.warn(`Element not found: ${selector}`);
        return null;
    }

    async typeText(element, text) {
        if (!element) return false;
        
        try {
            element.focus();
            element.value = '';
            
            for (let i = 0; i < text.length; i++) {
                element.value += text[i];
                if (i % 5 === 0) {
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
                await sleep(20 + Math.random() * 20);
            }
            
            element.dispatchEvent(new Event('change', { bubbles: true }));
            this.logger.debug(`Text typed: "${text}"`);
            return true;
        } catch (error) {
            this.logger.error('Failed to type text:', error);
            return false;
        }
    }

    async pasteText(element, text) {
        if (!element) return false;
        
        try {
            element.focus();
            element.value = '';
            
            element.value = text;
            
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('paste', { bubbles: true }));
            
            this.logger.debug(`Text pasted: "${text}"`);
            return true;
        } catch (error) {
            this.logger.error('Failed to paste text:', error);
            return false;
        }
    }

    async clickElement(element) {
        if (!element) return false;
        
        try {
            element.click();
            this.logger.debug(`Element clicked: ${element.tagName}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to click element:', error);
            return false;
        }
    }
}

// Main Automation Controller
class AutomationController {
    constructor() {
        this.logger = window.logger;
        this.domHelper = new DOMHelper();
        this.currentStep = 0;
        this.completedSteps = new Set();
    }

    async execute(title) {
        this.logger.info('🚀 Starting eBay automation (Steps 1-3 only)...');
        this.logger.info(`📋 Title: "${title}"`);
        
        try {
            if (!this.completedSteps.has('step1')) {
                this.logger.info('🔍 Step 1: Starting title input and Go button click');
                const step1Success = await this.step1(title);
                if (!step1Success) {
                    this.logger.error('❌ Step 1 failed - attempting recovery');
                    if (this.isStep1AlreadyComplete()) {
                        this.logger.info('✅ Recovery successful - Step 1 already complete');
                        this.completedSteps.add('step1');
                    } else {
                        this.logger.error('❌ Step 1 failed and recovery unsuccessful');
                        return false;
                    }
                } else {
                    this.logger.info('✅ Step 1 completed - BREAKING from Step 1');
                }
            } else {
                this.logger.info('✅ Step 1 already completed - SKIPPING');
            }
            
            if (!this.completedSteps.has('step2')) {
                this.logger.info('🔍 Step 2: Starting continue without match');
                const step2Success = await this.step2();
                if (!step2Success) {
                    this.logger.warn('⚠️ Step 2 failed, attempting recovery...');
                    if (this.isStep2AlreadyComplete()) {
                        this.logger.info('✅ Recovery successful - Step 2 already complete');
                        this.completedSteps.add('step2');
                    } else {
                        this.logger.warn('⚠️ Step 2 failed but continuing to next step...');
                    }
                } else {
                    this.logger.info('✅ Step 2 completed - BREAKING from Step 2');
                }
            } else {
                this.logger.info('✅ Step 2 already completed - SKIPPING');
            }
            
            if (!this.completedSteps.has('step3')) {
                this.logger.info('🔍 Step 3: Starting condition selection');
                const step3Success = await this.step3();
                if (!step3Success) {
                    this.logger.warn('⚠️ Step 3 failed, attempting recovery...');
                    this.logger.warn('⚠️ Step 3 failed but continuing...');
                } else {
                    this.logger.info('✅ Step 3 completed - BREAKING from Step 3');
                }
            } else {
                this.logger.info('✅ Step 3 already completed - SKIPPING');
            }
            
            this.logger.info('✅ Prelist automation completed (Steps 1-3) - Image upload will be handled on the next page');
            return true;
            
        } catch (error) {
            this.logger.error('💥 Automation failed:', error);
            return false;
        }
    }

    async step1(title) {
        this.logger.info('🔍 Step 1: Filling title and clicking Go button');
        
        try {
            if (this.isStep1AlreadyComplete()) {
                this.logger.info('✅ Step 1 already complete - no title input found, moving to next step');
                this.completedSteps.add('step1');
                return true;
            }
            
            const titleInput = await this.domHelper.waitForElement('input[type="text"], input[name*="title"], input[placeholder*="title"], input[id*="title"]');
            if (!titleInput) {
                this.logger.error('❌ Title input not found');
                return false;
            }
            
            const pasted = await this.domHelper.pasteText(titleInput, title);
            if (!pasted) {
                this.logger.error('❌ Failed to paste title');
                return false;
            }
            
            this.logger.info('✅ Title pasted successfully');
            
            await sleep(1000);
            
            let goButton = null;
            let clickAttempts = 0;
            const maxClickAttempts = 3;
            
            while (clickAttempts < maxClickAttempts && !goButton) {
                clickAttempts++;
                this.logger.info(`🔍 Attempt ${clickAttempts}/${maxClickAttempts} to find Go button...`);
                
                goButton = await this.findGoButton();
                if (!goButton) {
                    this.logger.warn(`⚠️ Go button not found on attempt ${clickAttempts}, waiting...`);
                    await sleep(1000);
                }
            }
            
            if (!goButton) {
                this.logger.error('❌ Go button not found after all attempts');
                return false;
            }
            
            const clickSuccess = await this.clickGoButtonWithRetry(goButton);
            if (!clickSuccess) {
                this.logger.error('❌ Failed to click Go button with all methods');
                return false;
            }
            
            this.logger.info('✅ Step 1 completed - BREAKING from Step 1');
            this.completedSteps.add('step1');
            return true;
            
        } catch (error) {
            this.logger.error('Step 1 failed:', error);
            return false;
        }
    }

    isStep1AlreadyComplete() {
        const titleInput = document.querySelector('input[type="text"], input[name*="title"], input[placeholder*="title"], input[id*="title"]');
        const goButton = document.querySelector('button.keyword-suggestion__label-btn, button[type="submit"]');
        
        if (!titleInput && !goButton) {
            this.logger.info('🔍 No title input or Go button found - Step 1 already complete');
            return true;
        }
        
        const currentUrl = window.location.href;
        if (!currentUrl.includes('ebay.com/sl/prelist')) {
            this.logger.info('🔍 Not on prelist page - Step 1 already complete');
            return true;
        }
        
        return false;
    }

    async step2() {
        this.logger.info('🔍 Step 2: Looking for "Continue without match" button');
        
        try {
            if (this.isStep2AlreadyComplete()) {
                this.logger.info('✅ Step 2 already complete - no continue button found, moving to next step');
                this.completedSteps.add('step2');
                return true;
            }
            
            await sleep(1000);
            
            const continueButton = await this.findContinueButton();
            if (!continueButton) {
                this.logger.warn('⚠️ Continue button not found, skipping step 2');
                this.completedSteps.add('step2');
                return true;
            }
            
            const clicked = await this.domHelper.clickElement(continueButton);
            if (!clicked) {
                this.logger.error('❌ Failed to click continue button');
                return false;
            }
            
            this.logger.info('✅ Step 2 completed - BREAKING from Step 2');
            this.completedSteps.add('step2');
            return true;
            
        } catch (error) {
            this.logger.error('Step 2 failed:', error);
            return false;
        }
    }

    isStep2AlreadyComplete() {
        const buttons = document.querySelectorAll('button, a');
        let continueButton = null;
        
        for (const button of buttons) {
            const text = button.textContent.toLowerCase();
            if (text.includes('continue without match') || 
                text.includes('continue')) {
                continueButton = button;
                break;
            }
        }
        
        if (!continueButton) {
            this.logger.info('🔍 No continue button found - Step 2 already complete');
            return true;
        }
        
        return false;
    }

    async step3() {
        this.logger.info('🔍 Step 3: Selecting condition based on stored value');
        
        try {
            const condition = await this.getConditionFromStorage();
            this.logger.info(`📋 Using condition value: ${condition}`);
            
            this.logger.info('🔍 Waiting for condition selection lightbox...');
            await sleep(3000);
            
            const lightboxSelectors = [
                '.lightbox-dialog__window',
                '[class*="lightbox-dialog"]',
                '[role="dialog"]',
                '.modal',
                '[class*="modal"]'
            ];
            
            let lightboxFound = false;
            for (const selector of lightboxSelectors) {
                const lightbox = document.querySelector(selector);
                if (lightbox) {
                    this.logger.info(`✅ Found lightbox with selector: ${selector}`);
                    lightboxFound = true;
                    break;
                }
            }
            
            if (!lightboxFound) {
                this.logger.warn('⚠️ No lightbox found, condition selection may not be available');
            }
            
            await sleep(1000);
            
            const conditionRadio = await this.findConditionRadioButton(condition);
            if (!conditionRadio) {
                this.logger.warn(`⚠️ Condition radio button not found for value: ${condition}, skipping step 3`);
                return true;
            }
            
            const clicked = await this.domHelper.clickElement(conditionRadio);
            if (!clicked) {
                this.logger.error(`❌ Failed to click condition radio button for value: ${condition}`);
                return false;
            }
            
            await sleep(1000);
            
            const continueButton = await this.findContinueToListingButton();
            if (continueButton) {
                await this.domHelper.clickElement(continueButton);
                this.logger.info('✅ Clicked Continue to listing button');
            }
            
            this.logger.info('✅ Step 3 completed');
            this.completedSteps.add('step3');
            return true;
            
        } catch (error) {
            this.logger.error('Step 3 failed:', error);
            return false;
        }
    }

    async findGoButton() {
        this.logger.info('🔍 Looking for Go button...');
        
        const selectors = [
            'button.keyword-suggestion__label-btn',
            'button[type="submit"]',
            'input[type="submit"]',
            '[data-testid*="go"]',
            '[data-testid*="submit"]',
            '.btn-primary',
            '.btn-submit',
            '.keyword-suggestion__label-btn',
            'button[class*="go"]',
            'button[class*="submit"]',
            'button[class*="search"]',
            'button[class*="continue"]'
        ];
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    if (this.isButtonClickable(element)) {
                        this.logger.info(`✅ Found clickable Go button with selector: ${selector}`);
                        return element;
                    } else {
                        this.logger.debug(`Found Go button but not clickable: ${selector}`);
                    }
                }
            } catch (error) {
            }
        }
        
        const buttons = document.querySelectorAll('button, input[type="submit"], a[role="button"]');
        this.logger.debug(`Found ${buttons.length} potential buttons for text search`);
        
        for (const button of buttons) {
            const text = button.textContent.toLowerCase().trim();
            const value = button.value ? button.value.toLowerCase().trim() : '';
            
            if (text.includes('go') || text.includes('search') || text.includes('continue') ||
                value.includes('go') || value.includes('search') || value.includes('continue')) {
                
                if (this.isButtonClickable(button)) {
                    this.logger.info(`✅ Found clickable Go button by text: "${text || value}"`);
                    return button;
                } else {
                    this.logger.debug(`Found Go button by text but not clickable: "${text || value}"`);
                }
            }
        }
        
        this.logger.warn('⚠️ No Go button found');
        return null;
    }

    isButtonClickable(button) {
        if (!button) return false;
        
        if (button.offsetParent === null) {
            this.logger.debug('Button not visible (offsetParent is null)');
            return false;
        }
        
        if (button.disabled || button.hasAttribute('disabled')) {
            this.logger.debug('Button is disabled');
            return false;
        }
        
        const clickableClasses = ['disabled', 'inactive', 'hidden'];
        const hasDisabledClass = clickableClasses.some(cls => button.classList.contains(cls));
        if (hasDisabledClass) {
            this.logger.debug('Button has disabled class');
            return false;
        }
        
        const rect = button.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            this.logger.debug('Button has zero dimensions');
            return false;
        }
        
        return true;
    }

    async clickGoButtonWithRetry(goButton) {
        this.logger.info('🎯 Attempting to click Go button with multiple methods...');
        
        const clickMethods = [
            () => this.clickMethod1(goButton),
            () => this.clickMethod2(goButton),
            () => this.clickMethod3(goButton),
            () => this.clickMethod4(goButton)
        ];
        
        for (let i = 0; i < clickMethods.length; i++) {
            try {
                this.logger.info(`🔘 Trying click method ${i + 1}/${clickMethods.length}...`);
                const success = await clickMethods[i]();
                if (success) {
                    this.logger.info(`✅ Go button clicked successfully with method ${i + 1}`);
                    return true;
                }
            } catch (error) {
                this.logger.debug(`Click method ${i + 1} failed:`, error);
            }
        }
        
        this.logger.error('❌ All click methods failed');
        return false;
    }

    async clickMethod1(button) {
        button.click();
        await sleep(500);
        return true;
    }

    async clickMethod2(button) {
        button.focus();
        button.click();
        await sleep(500);
        return true;
    }

    async clickMethod3(button) {
        const events = ['mousedown', 'mouseup', 'click'];
        for (const eventType of events) {
            button.dispatchEvent(new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        }
        await sleep(500);
        return true;
    }

    async clickMethod4(button) {
        if (button.type === 'submit' || button.tagName === 'BUTTON') {
            const form = button.closest('form');
            if (form) {
                form.submit();
                await sleep(500);
                return true;
            }
        }
        return false;
    }

    async findContinueButton() {
        const selectors = [
            '[data-testid*="continue"]',
            '.btn-continue',
            '.continue-btn',
            'button[class*="continue"]',
            'a[class*="continue"]'
        ];
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    this.logger.debug(`Found continue button with selector: ${selector}`);
                    return element;
                }
            } catch (error) {
            }
        }
        
        const buttons = document.querySelectorAll('button, a');
        for (const button of buttons) {
            const text = button.textContent.toLowerCase();
            if (text.includes('continue without match') || 
                text.includes('continue')) {
                this.logger.debug('Found continue button by text content');
                return button;
            }
        }
        
        return null;
    }

    async getConditionFromStorage() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['ebayCondition'], (result) => {
                const condition = result.ebayCondition || "1000";
                this.logger.info(`📋 Retrieved condition from storage: ${condition}`);
                resolve(condition);
            });
        });
    }

    async findConditionRadioButton(conditionValue) {
        this.logger.info(`🔍 Looking for condition radio button with value: ${conditionValue}`);
        
        const directSelector = `input[type="radio"][value="${conditionValue}"]`;
        const directElement = document.querySelector(directSelector);
        if (directElement) {
            this.logger.debug(`Found condition radio button with direct selector: ${directSelector}`);
            return directElement;
        }
        
        const selectors = [
            `input[type="radio"][value="${conditionValue}"]`,
            `input[type="radio"][name*="condition"][value="${conditionValue}"]`,
            `input[type="radio"][id*="condition"][value="${conditionValue}"]`,
            `input[type="radio"][data-value="${conditionValue}"]`
        ];
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    this.logger.debug(`Found condition radio button with selector: ${selector}`);
                    return element;
                }
            } catch (error) {
            }
        }
        
        const conditionLabels = this.getConditionLabels(conditionValue);
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        
        this.logger.debug(`Found ${radioButtons.length} radio buttons on page`);
        
        for (const radio of radioButtons) {
            const label = document.querySelector(`label[for="${radio.id}"]`);
            if (label) {
                const labelText = label.textContent.toLowerCase().trim();
                this.logger.debug(`Checking radio button with label: "${labelText}"`);
                
                for (const conditionLabel of conditionLabels) {
                    if (labelText.includes(conditionLabel.toLowerCase())) {
                        this.logger.debug(`Found condition radio button by label text: "${labelText}"`);
                        return radio;
                    }
                }
            }
        }
        
        this.logger.debug('Searching for condition radio buttons within lightbox...');
        const lightbox = document.querySelector('.lightbox-dialog__window, [class*="lightbox-dialog"], [role="dialog"]');
        if (lightbox) {
            const lightboxRadios = lightbox.querySelectorAll('input[type="radio"]');
            this.logger.debug(`Found ${lightboxRadios.length} radio buttons in lightbox`);
            
            for (const radio of lightboxRadios) {
                if (radio.value === conditionValue) {
                    this.logger.debug(`Found condition radio button in lightbox with value: ${conditionValue}`);
                    return radio;
                }
            }
        }
        
        this.logger.warn(`⚠️ No condition radio button found for value: ${conditionValue}`);
        return null;
    }

    getConditionLabels(conditionValue) {
        const conditionMap = {
            "1000": ["new", "brand new", "new condition"],
            "1500": ["open box", "open-box", "opened"],
            "3000": ["used", "pre-owned", "second hand"],
            "4000": ["for parts", "not working", "for parts or not working", "broken"],
            "5000": ["refurbished", "reconditioned"],
            "6000": ["seller refurbished", "seller-refurbished"]
        };
        
        return conditionMap[conditionValue] || ["new"];
    }

    async findNewRadioButton() {
        return await this.findConditionRadioButton("1000");
    }

    async findContinueToListingButton() {
        const selectors = [
            '[data-testid*="continue"]',
            '.btn-continue',
            '.continue-btn',
            'button[class*="continue"]',
            'button[class*="listing"]'
        ];
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    this.logger.debug(`Found Continue to listing button with selector: ${selector}`);
                    return element;
                }
            } catch (error) {
            }
        }
        
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
            const text = button.textContent.toLowerCase();
            if (text.includes('continue to listing') || 
                text.includes('continue')) {
                this.logger.debug('Found Continue to listing button by text content');
                return button;
            }
        }
        
        return null;
    }
}

// Platform detection
function detectPlatform(url) {
    if (url.includes('amazon.com')) return 'amazon';
    if (url.includes('ebay.com/sl/prelist')) return 'ebay-listing';
    if (url.includes('ebay.com/lstng')) return 'ebay-upload';
    return null;
}

// Check if we're on the eBay upload page with dynamic draft ID
function isEbayUploadPage(url) {
    if (!url.includes('ebay.com/lstng')) return false;
    
    const urlObj = new URL(url);
    const draftId = urlObj.searchParams.get('draftId');
    const mode = urlObj.searchParams.get('mode');
    
    return draftId && mode === 'AddItem';
}

// Get title from storage
async function getTitleFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['ebayTitle'], (result) => {
            resolve(result.ebayTitle || null);
        });
    });
}

// Global error handler
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('PerformanceObserver does not support buffered flag')) {
        return;
    }
    window.logger.error('💥 Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    window.logger.error('💥 Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Main initialization
async function initializeAutomation() {
    if (!window.logger) {
        window.logger = new Logger();
    }

    window.logger.info('🚀 Starting clean automation system...');

    try {
        const currentUrl = window.location.href;

        if (currentUrl.includes('/sl/prelist')) {
            window.logger.info('🔍 Detected eBay prelist page - executing steps 1-3 only');
            const title = await getTitleFromStorage();
            if (!title) {
                window.logger.warn('❌ No title found in storage for prelist page.');
                return;
            }
            window.logger.info(`📋 Title: "${title}"`);
            
            if (!window.automationController) {
                 window.automationController = new AutomationController();
            }
            await window.automationController.execute(title);

        } else if (isEbayUploadPage(currentUrl)) {
            window.logger.info('🔍 Detected eBay upload page. Loading modules...');

            try {
                const uploaderModuleUrl = chrome.runtime.getURL('src/image-uploader.js');
                await import(uploaderModuleUrl);
                window.logger.info('✅ Image uploader module loaded.');

                const fillerModuleUrl = chrome.runtime.getURL('src/item-filler.js');
                await import(fillerModuleUrl);
                window.logger.info('✅ Item filler module loaded.');

            } catch (error) {
                window.logger.error('💥 Failed to import automation modules:', error);
            }
        } else {
            window.logger.warn('❌ Unsupported page - not on an eBay prelist or upload page.');
            window.logger.info(`🔗 Current URL: ${currentUrl}`);
        }

    } catch (error) {
        window.logger.error('💥 Top-level initialization failed:', error);
    }
}

// Initialize global instances
window.logger = new Logger();
window.automationController = new AutomationController();

// Start automation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAutomation);
} else {
    initializeAutomation();
}
