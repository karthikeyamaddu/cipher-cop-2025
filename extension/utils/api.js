// API Communication Utilities for CipherCop Extension

class CipherCopAPI {
    constructor() {
        this.endpoints = {
            clone: {
                gemini: 'http://localhost:5003/analyze',
                phishpedia: {
                    upload: 'http://localhost:5000/upload',
                    detect: 'http://localhost:5000/detect'
                }
            },
            phishing: 'http://localhost:5001/api/phishing/analyze-simple', // Use simple endpoint for extension
            malware: 'http://localhost:5004/analyze'
        };
        
        this.defaultTimeout = 30000; // 30 seconds
    }
    
    // Make HTTP request with timeout
    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    
    // Analyze with Gemini AI for clone detection
    async analyzeWithGemini(url, screenshot = null) {
        const payload = { url };
        
        if (screenshot) {
            // Convert screenshot to form data if needed
            payload.screenshot = screenshot;
        }
        
        return await this.makeRequest(this.endpoints.clone.gemini, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
    }
    
    // Analyze with Phishpedia ML
    async analyzeWithPhishpedia(url, screenshot) {
        // Step 1: Upload screenshot
        const screenshotBlob = this.dataURItoBlob(screenshot);
        const uploadFormData = new FormData();
        uploadFormData.append('image', screenshotBlob, 'screenshot.png');
        
        const uploadResult = await this.makeRequest(this.endpoints.clone.phishpedia.upload, {
            method: 'POST',
            body: uploadFormData
        });
        
        if (!uploadResult.success) {
            throw new Error('Screenshot upload failed');
        }
        
        // Step 2: Analyze with uploaded image
        return await this.makeRequest(this.endpoints.clone.phishpedia.detect, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                imageUrl: uploadResult.imageUrl
            })
        });
    }
    
    // Analyze for phishing
    async analyzePhishing(url) {
        try {
            return await this.makeRequest(this.endpoints.phishing, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });
        } catch (error) {
            console.error('Phishing analysis error:', error);
            throw new Error(`Phishing analysis failed: ${error.message}`);
        }
    }
    
    // Get authentication token for backend API
    async getAuthToken() {
        try {
            // Try to authenticate with the backend for extension usage
            const response = await fetch('http://localhost:5001/api/auth/extension-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    extensionId: chrome?.runtime?.id || 'browser-extension',
                    version: chrome?.runtime?.getManifest?.()?.version || '1.0.0',
                    userAgent: 'CipherCop-Extension'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.token;
            }
            
            return null;
        } catch (error) {
            console.warn('Authentication failed:', error);
            return null;
        }
    }
    
    // Convert data URI to Blob
    dataURItoBlob(dataURI) {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        
        return new Blob([ab], { type: mimeString });
    }
    
    // Validate URL
    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    // Extract domain from URL
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (_) {
            return null;
        }
    }
    
    // Check if URL is secure (HTTPS)
    isSecureURL(url) {
        try {
            return new URL(url).protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CipherCopAPI;
} else {
    window.CipherCopAPI = CipherCopAPI;
}
