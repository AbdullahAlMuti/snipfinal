/**
 * @fileoverview Standalone eBay Image Upload System
 * @author Advanced Image Upload System
 * @version 2.0.0 - Refactored for robust, single-entry-point execution
 * @description A complete, independent image upload system for eBay listings.
 */

// Utility Functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class ImageUploadSystem {
    constructor() {
        this.logger = window.logger || new Logger(); // Use global logger if available
        this.isUploading = false;
        this.uploadStartTime = null;
        this.logger.info('✅ ImageUploadSystem initialized.');
    }

    async uploadImages() {
        if (this.isUploading) {
            this.logger.warn('⚠️ Upload already in progress, skipping.');
            return false;
        }

        this.isUploading = true;
        this.uploadStartTime = Date.now();
        this.logger.info('🚀 Starting standalone image upload system...');

        try {
            // 1. Get images from storage
            const images = await this.getStoredImages();
            if (!images || images.length === 0) {
                this.logger.error('❌ No valid images found in Chrome storage.');
                return false;
            }
            this.logger.info(`✅ Found ${images.length} valid images in storage.`);

            // 2. Wait for the uploader UI to be ready
            const uploaderReady = await this.waitForUploaderReady();
            if (!uploaderReady) {
                this.logger.error('❌ Uploader UI did not become ready within the timeout.');
                return false;
            }
            this.logger.info('✅ Uploader is ready.');

            // 3. Convert images to File objects
            const files = await this.convertImagesToFiles(images);
            if (!files || files.length === 0) {
                this.logger.error('❌ Failed to convert images to File objects.');
                return false;
            }
            this.logger.info(`✅ Converted ${files.length} images to files.`);

            // 4. Execute upload strategies
            const uploadSuccess = await this.executeUploadStrategies(files);
            if (!uploadSuccess) {
                this.logger.error('❌ All upload strategies failed.');
                return false;
            }
            this.logger.info('✅ At least one upload strategy reported success.');

            // 5. Verify the upload was truly successful
            const verified = await this.verifyUploadSuccess(files.length);
            if (verified) {
                this.logger.info('🎉🎉 Upload completed and verified successfully!');
                await this.cleanupStorage();
                return true;
            } else {
                this.logger.warn('⚠️ Upload strategies completed, but verification failed. The upload was not successful.');
                return false;
            }

        } catch (error) {
            this.logger.error('💥 A critical error occurred in the upload system:', error);
            return false;
        } finally {
            this.isUploading = false;
            this.uploadStartTime = null;
        }
    }

    async getStoredImages() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['watermarkedImages'], (result) => {
                const images = result.watermarkedImages || [];
                const validImages = images.filter(img =>
                    img && typeof img === 'string' && img.startsWith('data:image/') && img.length > 100000
                );
                resolve(validImages);
            });
        });
    }

    async waitForUploaderReady() {
        const maxWaitTime = 20000; // 20 seconds
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitTime) {
            const fileInput = document.querySelector('input[type="file"]');
            const dropZone = document.querySelector('[class*="dropzone"], [class*="upload-area"]');
            if (fileInput || dropZone) {
                return true;
            }
            await sleep(500);
        }
        return false;
    }

    async convertImagesToFiles(base64Images) {
        const files = [];
        for (let i = 0; i < base64Images.length; i++) {
            try {
                const file = this.dataUrlToFile(base64Images[i], `product_image_${i + 1}.jpg`);
                files.push(file);
            } catch (error) {
                this.logger.error(`❌ Failed to convert image ${i + 1} to file:`, error);
            }
        }
        return files;
    }

    dataUrlToFile(dataUrl, filename) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    async executeUploadStrategies(files) {
        const strategies = [
            this.strategyDirectFileInput.bind(this),
            this.strategyDragAndDrop.bind(this)
        ];

        for (let i = 0; i < strategies.length; i++) {
            this.logger.info(`🎯 Executing Strategy ${i + 1}/${strategies.length}...`);
            try {
                if (await strategies[i](files)) {
                    this.logger.info(`✅ Strategy ${i + 1} succeeded.`);
                    return true;
                } else {
                    this.logger.warn(`⚠️ Strategy ${i + 1} failed. Trying next strategy.`);
                }
            } catch (error) {
                this.logger.error(`💥 Strategy ${i + 1} threw an error:`, error);
            }
        }
        return false;
    }

    async strategyDirectFileInput(files) {
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) return false;

        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));

        // Directly assign the files
        fileInput.files = dataTransfer.files;

        // Dispatch a 'change' event, which is what most frameworks listen for
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));

        this.logger.info('Dispatched change event to file input.');
        await sleep(2000); // Give the page time to react
        return (await this.checkUploadProgress(files.length)) > 0;
    }

    async strategyDragAndDrop(files) {
        const dropZone = document.querySelector('[class*="dropzone"], [class*="upload-area"], [class*="upload-buttons"]');
        if (!dropZone) return false;

        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));

        // Dispatch a sequence of events to simulate a real drag-and-drop
        dropZone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer }));
        await sleep(100);
        dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer }));
        await sleep(100);
        dropZone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));

        this.logger.info('Dispatched drag-and-drop events to drop zone.');
        await sleep(2000); // Give the page time to react
        return (await this.checkUploadProgress(files.length)) > 0;
    }

    async checkUploadProgress(expectedCount) {
        // A simple progress check: count the visible thumbnails
        const thumbnails = document.querySelectorAll('img[class*="thumbnail"], img[class*="image-preview"]');
        const validThumbnails = Array.from(thumbnails).filter(img => img.src.startsWith('blob:') || img.src.startsWith('data:'));
        
        if (validThumbnails.length > 0) {
            this.logger.info(`🔍 Found ${validThumbnails.length} potential new thumbnails.`);
        }
        return validThumbnails.length;
    }

    async verifyUploadSuccess(expectedCount) {
        this.logger.info(`🔍 Verifying upload success. Expecting ${expectedCount} images.`);
        const maxWaitTime = 30000; // 30 seconds for verification
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            const counterText = document.querySelector('[class*="photo-count"], [class*="image-count"]')?.textContent || "0/24";
            const match = counterText.match(/(\d+)/);
            const currentCount = match ? parseInt(match[1], 10) : 0;
            
            if (currentCount >= expectedCount) {
                this.logger.info(`✅ Verification successful! Photo counter shows ${currentCount} images.`);
                return true;
            }
            
            await sleep(1000); // Check every second
        }
        
        this.logger.error(`❌ Verification failed. Timed out waiting for photo counter to reach ${expectedCount}.`);
        return false;
    }

    async cleanupStorage() {
        this.logger.info('🗑️ Cleaning up images from Chrome storage...');
        chrome.storage.local.remove('watermarkedImages', () => {
            if (chrome.runtime.lastError) {
                this.logger.error('Error cleaning up storage:', chrome.runtime.lastError);
            } else {
                this.logger.info('✅ Storage cleanup successful.');
            }
        });
    }
}

// ==============================================================================
//  INITIALIZATION LOGIC
//  This runs automatically when the script is loaded on the correct page.
// ==============================================================================

// This self-executing function ensures that the script only runs once
// and does not conflict with other scripts.
(async function() {
    // Check if the system has already been initialized
    if (window.imageUploadSystemInitialized) {
        return;
    }
    window.imageUploadSystemInitialized = true;

    // Use a shared global logger if it exists from `automation-clean.js`
    const logger = window.logger || new Logger();
    
    logger.info('🚀 Standalone Image Uploader script loaded.');

    try {
        const uploadSystem = new ImageUploadSystem();
        await uploadSystem.uploadImages();
    } catch (error) {
        logger.error('💥 A fatal error occurred during image uploader initialization:', error);
    }
})();