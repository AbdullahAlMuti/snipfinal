# eBay Snipping Tool - Chrome Extension

A powerful Chrome extension that automates the process of scraping Amazon product data and creating eBay listings with watermarked images.

## 🚀 Features

### Amazon Scraping
- **Comprehensive Image Extraction**: Advanced algorithms to extract all high-quality product images from Amazon pages
- **High-Resolution Processing**: Automatically converts images to 1600x1600px with proper aspect ratio
- **Watermarking**: Applies watermarks to main product images for brand protection
- **Smart Filtering**: Triple-filter security system ensures only valid, scraped images are processed

### eBay Automation
- **Sequential Workflow**: Automated 4-step process for eBay listing creation
- **Step 1**: Title input and "Go" button click
- **Step 2**: "Continue without match" button handling
- **Step 3**: Condition selection (always selects "New")
- **Step 4**: Automatic image upload from Chrome storage

### Advanced Features
- **Anti-Detection**: Human-like delays and behavior patterns
- **Error Recovery**: Robust error handling with automatic recovery mechanisms
- **Performance Optimized**: Reduced delays and optimized execution times
- **Dynamic URL Handling**: Supports dynamic eBay draft IDs and upload pages

## 📁 Project Structure

```
ebay-snipping-extension/
├── manifest.json                 # Extension configuration
├── background.js                 # Background service worker
├── content_scripts/
│   └── amazon_injector.js        # Amazon page content script
├── src/
│   └── automation-clean.js       # eBay automation system
├── ui/
│   ├── panel.html                # Main UI panel
│   └── panel.css                 # Panel styling
├── assets/
│   └── watermark.png             # Watermark image
└── icons/                        # Extension icons
```

## 🔧 Installation

1. **Download the Extension**
   ```bash
   git clone <repository-url>
   cd ebay-snipping-extension
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension folder

3. **Grant Permissions**
   - The extension will request permissions for Amazon and eBay domains
   - Accept all permissions for full functionality

## 🎯 Usage

### Amazon Scraping
1. Navigate to any Amazon product page
2. Click the "List it" button that appears on the left side
3. The extension will automatically:
   - Extract all high-quality product images
   - Resize them to 1600x1600px
   - Apply watermarks to the main image
   - Store them in Chrome storage

### eBay Listing Creation
1. After scraping from Amazon, click "Opti_list" in the panel
2. The extension will automatically:
   - Open a new eBay listing page
   - Fill in the product title
   - Navigate through the listing process
   - Upload the scraped images

## ⚙️ Configuration

### Performance Settings
The extension includes optimized performance settings:

```javascript
window.CONFIG = {
    debug: false,           // Reduced logging for better performance
    verbose: false,
    logLevel: 'warn',      // Only show warnings and errors
    timing: {
        minDelay: 300,     // Reduced delays for faster execution
        maxDelay: 800,
        stepDelay: 1000,
        retryDelay: 2000,
        maxRetries: 2      // Reduced retries for faster failure detection
    }
};
```

### Security Features
- **Triple-Filter System**: Three layers of validation for scraped images
- **Size Validation**: Only processes images >100KB
- **Watermark Verification**: Ensures only watermarked images are stored
- **Content Verification**: Validates image format and content

## 🔍 Troubleshooting

### Common Issues

1. **Images Not Uploading**
   - Check if images are properly stored in Chrome storage
   - Verify the eBay upload page URL pattern
   - Check browser console for error messages

2. **Automation Not Starting**
   - Ensure you're on the correct eBay page
   - Check if the title is stored in Chrome storage
   - Verify extension permissions

3. **Performance Issues**
   - Reduce debug logging by setting `debug: false`
   - Check for memory leaks in browser dev tools
   - Clear Chrome storage if needed

### Debug Mode
Enable debug mode for detailed logging:

```javascript
window.CONFIG.debug = true;
window.CONFIG.logLevel = 'debug';
```

## 🛡️ Security

### Image Processing
- All images are processed locally in the browser
- No external servers are used for image processing
- Watermarks are applied using Canvas API
- Images are stored securely in Chrome's local storage

### Data Privacy
- No personal data is collected or transmitted
- All processing happens locally in the browser
- Chrome storage is used only for temporary image storage

## 🚀 Performance Optimizations

### Recent Improvements
- **Reduced Delays**: Optimized timing for faster execution
- **Efficient DOM Queries**: Improved element selection strategies
- **Memory Management**: Better cleanup of temporary objects
- **Error Recovery**: Automatic retry mechanisms for failed operations

### Memory Management
- Automatic cleanup of processed images
- Efficient storage management
- Reduced memory footprint

## 📊 System Architecture

### Automation Flow
```
Amazon Page → Image Extraction → Watermarking → Chrome Storage
     ↓
eBay Listing Page → Title Input → Go Button → Continue Button
     ↓
Condition Selection → New Radio Button → Continue to Listing
     ↓
Image Upload → Chrome Storage → File Conversion → eBay Upload
```

### Error Handling
- **Global Error Handlers**: Catch and log all errors
- **Step Recovery**: Automatic recovery for failed steps
- **Retry Mechanisms**: Intelligent retry with exponential backoff
- **Graceful Degradation**: Continue operation even if some steps fail

## 🔄 Updates and Maintenance

### Version History
- **v4.0.0**: Complete rewrite with optimized performance
- **v3.x**: Modular architecture implementation
- **v2.x**: Enhanced error handling and recovery
- **v1.x**: Initial implementation

### Future Improvements
- Enhanced anti-detection mechanisms
- Support for additional e-commerce platforms
- Advanced image processing options
- Batch processing capabilities

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and support:
1. Check the troubleshooting section
2. Review browser console logs
3. Create an issue with detailed information
4. Include system information and error messages

---

**Note**: This extension is designed for legitimate e-commerce use. Please ensure compliance with all applicable terms of service and local laws.
