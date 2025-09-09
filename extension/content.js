// CipherCop Content Script
console.log('CipherCop Content Script Loaded on:', window.location.href);

// Initialize content script
(function() {
  'use strict';
  
  // Check if we're already initialized
  if (window.ciphercopInitialized) {
    return;
  }
  window.ciphercopInitialized = true;
  
  // Content script functionality
  const CipherCopContent = {
    
    // Initialize content script
    init() {
      this.addEventListeners();
      this.checkPageSecurity();
    },
    
    // Add event listeners
    addEventListeners() {
      // Listen for messages from popup/background
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        this.handleMessage(request, sender, sendResponse);
        return true; // Keep channel open
      });
      
      // Page navigation detection
      let currentUrl = window.location.href;
      const observer = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href;
          this.onNavigationChange();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },
    
    // Handle messages from extension
    handleMessage(request, sender, sendResponse) {
      switch (request.type) {
        case 'GET_PAGE_INFO':
          sendResponse(this.getPageInfo());
          break;
          
        case 'EXTRACT_METADATA':
          sendResponse(this.extractMetadata());
          break;
          
        case 'CHECK_FORMS':
          sendResponse(this.checkLoginForms());
          break;
          
        default:
          sendResponse({ error: 'Unknown request type' });
      }
    },
    
    // Get basic page information
    getPageInfo() {
      return {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        protocol: window.location.protocol,
        path: window.location.pathname,
        hasLoginForm: this.hasLoginForm(),
        hasPasswordField: this.hasPasswordField(),
        externalLinks: this.getExternalLinks(),
        metadata: this.extractMetadata()
      };
    },
    
    // Extract page metadata
    extractMetadata() {
      const metadata = {};
      
      // Get meta tags
      const metaTags = document.querySelectorAll('meta');
      metaTags.forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) {
          metadata[name] = content;
        }
      });
      
      // Get page description
      const description = document.querySelector('meta[name="description"]');
      if (description) {
        metadata.description = description.getAttribute('content');
      }
      
      // Get page keywords
      const keywords = document.querySelector('meta[name="keywords"]');
      if (keywords) {
        metadata.keywords = keywords.getAttribute('content');
      }
      
      // Get canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        metadata.canonical = canonical.getAttribute('href');
      }
      
      return metadata;
    },
    
    // Check for login forms
    hasLoginForm() {
      const forms = document.querySelectorAll('form');
      for (let form of forms) {
        const inputs = form.querySelectorAll('input');
        let hasEmail = false, hasPassword = false;
        
        for (let input of inputs) {
          const type = input.type.toLowerCase();
          const name = input.name.toLowerCase();
          const id = input.id.toLowerCase();
          
          if (type === 'email' || name.includes('email') || id.includes('email') ||
              name.includes('username') || id.includes('username')) {
            hasEmail = true;
          }
          
          if (type === 'password') {
            hasPassword = true;
          }
        }
        
        if (hasEmail && hasPassword) {
          return true;
        }
      }
      return false;
    },
    
    // Check for password fields
    hasPasswordField() {
      return document.querySelector('input[type="password"]') !== null;
    },
    
    // Check login forms details
    checkLoginForms() {
      const forms = [];
      const formElements = document.querySelectorAll('form');
      
      formElements.forEach((form, index) => {
        const inputs = form.querySelectorAll('input');
        const formData = {
          index: index,
          action: form.action || window.location.href,
          method: form.method || 'GET',
          hasPasswordField: false,
          hasEmailField: false,
          inputCount: inputs.length
        };
        
        inputs.forEach(input => {
          if (input.type === 'password') {
            formData.hasPasswordField = true;
          }
          if (input.type === 'email' || input.name.toLowerCase().includes('email')) {
            formData.hasEmailField = true;
          }
        });
        
        forms.push(formData);
      });
      
      return {
        formsCount: forms.length,
        forms: forms,
        hasLoginForm: forms.some(f => f.hasPasswordField && f.hasEmailField)
      };
    },
    
    // Get external links
    getExternalLinks() {
      const links = document.querySelectorAll('a[href]');
      const externalLinks = [];
      const currentDomain = window.location.hostname;
      
      links.forEach(link => {
        try {
          const url = new URL(link.href);
          if (url.hostname !== currentDomain) {
            externalLinks.push({
              href: link.href,
              text: link.textContent.trim(),
              domain: url.hostname
            });
          }
        } catch (e) {
          // Invalid URL, skip
        }
      });
      
      return externalLinks.slice(0, 10); // Limit to first 10
    },
    
    // Basic security check
    checkPageSecurity() {
      const issues = [];
      
      // Check HTTPS
      if (window.location.protocol !== 'https:') {
        issues.push('Page not using HTTPS');
      }
      
      // Check for suspicious URLs
      const suspiciousPatterns = [
        /paypal.*login/i,
        /amazon.*signin/i,
        /microsoft.*login/i,
        /google.*signin/i,
        /facebook.*login/i
      ];
      
      const url = window.location.href.toLowerCase();
      const domain = window.location.hostname.toLowerCase();
      
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(url) && !this.isLegitimateSource(domain)) {
          issues.push('Suspicious URL pattern detected');
        }
      });
      
      return issues;
    },
    
    // Check if domain is legitimate
    isLegitimateSource(domain) {
      const legitimateDomains = [
        'paypal.com',
        'amazon.com',
        'microsoft.com',
        'google.com',
        'facebook.com',
        'github.com',
        'stackoverflow.com'
      ];
      
      return legitimateDomains.some(legit => 
        domain === legit || domain.endsWith('.' + legit)
      );
    },
    
    // Handle navigation changes
    onNavigationChange() {
      console.log('Navigation detected:', window.location.href);
      
      // Send navigation event to background
      chrome.runtime.sendMessage({
        type: 'NAVIGATION_CHANGE',
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      CipherCopContent.init();
    });
  } else {
    CipherCopContent.init();
  }
  
})();
