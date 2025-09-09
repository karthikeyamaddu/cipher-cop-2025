// Screenshot Utilities for CipherCop Extension

class ScreenshotCapture {
    constructor() {
        this.defaultOptions = {
            format: 'png',
            quality: 90
        };
    }
    
    // Capture visible tab
    async captureVisibleTab(options = {}) {
        const captureOptions = { ...this.defaultOptions, ...options };
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }
            
            // Check if tab is capturable
            if (!this.isCapturableTab(tab)) {
                throw new Error('Cannot capture this type of tab');
            }
            
            const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, captureOptions);
            
            return {
                success: true,
                screenshot: screenshot,
                tabInfo: {
                    url: tab.url,
                    title: tab.title,
                    favIconUrl: tab.favIconUrl
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Check if tab can be captured
    isCapturableTab(tab) {
        const uncapturableProtocols = ['chrome:', 'chrome-extension:', 'chrome-devtools:', 'moz-extension:'];
        
        if (!tab.url) return false;
        
        return !uncapturableProtocols.some(protocol => tab.url.startsWith(protocol));
    }
    
    // Capture with retry mechanism
    async captureWithRetry(maxRetries = 3, delay = 1000, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.captureVisibleTab(options);
                
                if (result.success) {
                    return result;
                } else {
                    lastError = new Error(result.error);
                }
                
            } catch (error) {
                lastError = error;
            }
            
            // Wait before retrying (except for last attempt)
            if (attempt < maxRetries) {
                await this.sleep(delay);
            }
        }
        
        throw new Error(`Screenshot capture failed after ${maxRetries} attempts: ${lastError.message}`);
    }
    
    // Convert screenshot to different formats
    async convertScreenshot(screenshot, targetFormat = 'jpeg', quality = 0.8) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const convertedDataURL = canvas.toDataURL(`image/${targetFormat}`, quality);
                resolve(convertedDataURL);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load screenshot for conversion'));
            };
            
            img.src = screenshot;
        });
    }
    
    // Resize screenshot
    async resizeScreenshot(screenshot, maxWidth = 1024, maxHeight = 768) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw resized image
                ctx.drawImage(img, 0, 0, width, height);
                
                const resizedDataURL = canvas.toDataURL('image/png');
                resolve(resizedDataURL);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load screenshot for resizing'));
            };
            
            img.src = screenshot;
        });
    }
    
    // Get screenshot metadata
    getScreenshotMetadata(screenshot) {
        try {
            // Extract metadata from data URL
            const [header, data] = screenshot.split(',');
            const mimeType = header.match(/data:([^;]+)/)[1];
            const isBase64 = header.includes('base64');
            
            if (isBase64) {
                const sizeInBytes = Math.round((data.length * 3) / 4);
                const sizeInKB = Math.round(sizeInBytes / 1024);
                
                return {
                    mimeType: mimeType,
                    encoding: 'base64',
                    sizeBytes: sizeInBytes,
                    sizeKB: sizeInKB,
                    dataLength: data.length
                };
            }
            
            return {
                mimeType: mimeType,
                encoding: 'unknown',
                sizeBytes: data.length,
                sizeKB: Math.round(data.length / 1024),
                dataLength: data.length
            };
            
        } catch (error) {
            return {
                error: 'Failed to parse screenshot metadata',
                details: error.message
            };
        }
    }
    
    // Compress screenshot if too large
    async compressScreenshot(screenshot, maxSizeKB = 500) {
        const metadata = this.getScreenshotMetadata(screenshot);
        
        if (metadata.sizeKB <= maxSizeKB) {
            return screenshot; // Already small enough
        }
        
        // Start with quality reduction
        let quality = 0.8;
        let compressed = screenshot;
        
        while (quality > 0.1) {
            compressed = await this.convertScreenshot(screenshot, 'jpeg', quality);
            const newMetadata = this.getScreenshotMetadata(compressed);
            
            if (newMetadata.sizeKB <= maxSizeKB) {
                return compressed;
            }
            
            quality -= 0.1;
        }
        
        // If quality reduction isn't enough, resize
        const resized = await this.resizeScreenshot(compressed, 800, 600);
        return resized;
    }
    
    // Extract colors from screenshot (for analysis purposes)
    async extractDominantColors(screenshot, numColors = 5) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Resize to small canvas for faster processing
                const size = 50;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);
                
                const imageData = ctx.getImageData(0, 0, size, size);
                const pixels = imageData.data;
                const colorCount = {};
                
                // Count colors (simplified - group similar colors)
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = Math.floor(pixels[i] / 32) * 32;
                    const g = Math.floor(pixels[i + 1] / 32) * 32;
                    const b = Math.floor(pixels[i + 2] / 32) * 32;
                    const color = `${r},${g},${b}`;
                    
                    colorCount[color] = (colorCount[color] || 0) + 1;
                }
                
                // Get top colors
                const sortedColors = Object.entries(colorCount)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, numColors)
                    .map(([color, count]) => ({
                        rgb: color.split(',').map(Number),
                        count: count,
                        percentage: Math.round((count / (size * size)) * 100)
                    }));
                
                resolve(sortedColors);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load screenshot for color extraction'));
            };
            
            img.src = screenshot;
        });
    }
    
    // Helper function for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenshotCapture;
} else {
    window.ScreenshotCapture = ScreenshotCapture;
}
