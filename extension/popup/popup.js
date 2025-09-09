// CipherCop Popup Script
console.log('CipherCop Popup Script Loaded');

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const popup = new CipherCopPopup();
    popup.init();
});

class CipherCopPopup {
    constructor() {
        this.currentTab = null;
        this.isScanning = false;
        this.lastResults = null;
        
        // Get DOM elements
        this.elements = {
            // Site info
            siteIcon: document.getElementById('siteIcon'),
            siteUrl: document.getElementById('siteUrl'),
            siteTitle: document.getElementById('siteTitle'),
            statusIndicator: document.getElementById('statusIndicator'),
            
            // Action buttons
            cloneBtn: document.getElementById('cloneBtn'),
            phishingBtn: document.getElementById('phishingBtn'),
            
            // Loading overlay
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText'),
            
            // Results section
            resultsSection: document.getElementById('resultsSection'),
            resultsTitle: document.getElementById('resultsTitle'),
            closeResults: document.getElementById('closeResults'),
            threatLevel: document.getElementById('threatLevel'),
            threatIcon: document.getElementById('threatIcon'),
            threatStatus: document.getElementById('threatStatus'),
            threatConfidence: document.getElementById('threatConfidence'),
            resultsDetails: document.getElementById('resultsDetails'),
            viewDetailsBtn: document.getElementById('viewDetailsBtn'),
            reportBtn: document.getElementById('reportBtn'),
            
            // Quick stats
            totalScans: document.getElementById('totalScans'),
            threatsBlocked: document.getElementById('threatsBlocked'),
            protectionLevel: document.getElementById('protectionLevel'),
            
            // Footer buttons
            settingsBtn: document.getElementById('settingsBtn'),
            historyBtn: document.getElementById('historyBtn'),
            helpBtn: document.getElementById('helpBtn'),
            
            // Settings panel
            settingsPanel: document.getElementById('settingsPanel'),
            closeSettings: document.getElementById('closeSettings'),
            autoScanEnabled: document.getElementById('autoScanEnabled'),
            notificationsEnabled: document.getElementById('notificationsEnabled'),
            protectionLevelSelect: document.getElementById('protectionLevelSelect')
        };
    }
    
    // Initialize popup
    async init() {
        try {
            await this.loadCurrentTab();
            this.setupEventListeners();
            await this.loadStats();
            await this.loadSettings();
            this.updateUI();
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            this.showError('Failed to initialize extension');
        }
    }
    
    // Load current tab information
    async loadCurrentTab() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB' }, (response) => {
                if (response && response.success) {
                    this.currentTab = response.tab;
                    this.updateSiteInfo();
                } else {
                    console.error('Failed to get current tab:', response?.error);
                }
                resolve();
            });
        });
    }
    
    // Update site information display
    updateSiteInfo() {
        if (!this.currentTab) return;
        
        try {
            const url = new URL(this.currentTab.url);
            const domain = url.hostname;
            
            // Update site icon based on protocol
            const isSecure = url.protocol === 'https:';
            this.elements.siteIcon.textContent = isSecure ? '🔒' : '🌐';
            
            // Update URL and title
            this.elements.siteUrl.textContent = domain;
            this.elements.siteTitle.textContent = this.currentTab.title || 'No title';
            
            // Update status indicator
            const statusDot = this.elements.statusIndicator.querySelector('.status-dot');
            if (isSecure) {
                statusDot.style.background = '#4ade80';
            } else {
                statusDot.style.background = '#f59e0b';
            }
            
        } catch (error) {
            console.error('Error updating site info:', error);
            this.elements.siteUrl.textContent = 'Invalid URL';
            this.elements.siteTitle.textContent = 'Unknown site';
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Action buttons
        this.elements.cloneBtn.addEventListener('click', () => this.handleCloneCheck());
        this.elements.phishingBtn.addEventListener('click', () => this.handlePhishingCheck());
        
        // Results section
        this.elements.closeResults.addEventListener('click', () => this.hideResults());
        this.elements.viewDetailsBtn.addEventListener('click', () => this.showDetailedResults());
        this.elements.reportBtn.addEventListener('click', () => this.reportIssue());
        
        // Footer buttons
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        this.elements.historyBtn.addEventListener('click', () => this.showHistory());
        this.elements.helpBtn.addEventListener('click', () => this.showHelp());
        
        // Settings panel
        this.elements.closeSettings.addEventListener('click', () => this.hideSettings());
        this.elements.autoScanEnabled.addEventListener('change', () => this.saveSettings());
        this.elements.notificationsEnabled.addEventListener('change', () => this.saveSettings());
        this.elements.protectionLevelSelect.addEventListener('change', () => this.saveSettings());
    }
    
    // Handle clone detection
    async handleCloneCheck() {
        if (this.isScanning || !this.currentTab) return;
        
        this.isScanning = true;
        this.showLoading('Analyzing website for clones...');
        this.disableButtons();
        
        try {
            // First capture screenshot
            const screenshotResponse = await this.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
            
            if (!screenshotResponse.success) {
                throw new Error(screenshotResponse.error || 'Failed to capture screenshot');
            }
            
            // Then analyze for clones
            const analysisResponse = await this.sendMessage({
                type: 'ANALYZE_CLONE',
                data: {
                    url: this.currentTab.url,
                    screenshot: screenshotResponse.screenshot,
                    title: this.currentTab.title
                }
            });
            
            if (!analysisResponse.success) {
                throw new Error(analysisResponse.error || 'Clone analysis failed');
            }
            
            this.lastResults = {
                type: 'clone',
                data: analysisResponse.results,
                timestamp: new Date().toISOString()
            };
            
            this.showResults('Clone Detection Results', { type: 'clone', ...analysisResponse.results });
            await this.updateStats('clone', analysisResponse.results);
            
        } catch (error) {
            console.error('Clone check failed:', error);
            this.showError(error.message || 'Clone detection failed');
        } finally {
            this.isScanning = false;
            this.hideLoading();
            this.enableButtons();
        }
    }
    
    // Handle phishing detection
    async handlePhishingCheck() {
        if (this.isScanning || !this.currentTab) return;
        
        this.isScanning = true;
        this.showLoading('Analyzing website for phishing...');
        this.disableButtons();
        
        try {
            const response = await this.sendMessage({
                type: 'ANALYZE_PHISHING',
                data: {
                    url: this.currentTab.url,
                    title: this.currentTab.title
                }
            });
            
            if (!response.success) {
                throw new Error(response.error || 'Phishing analysis failed');
            }
            
            this.lastResults = {
                type: 'phishing',
                data: response.result,
                timestamp: new Date().toISOString()
            };
            
            this.showResults('Phishing Analysis Results', { type: 'phishing', data: response.result });
            await this.updateStats('phishing', response.result);
            
        } catch (error) {
            console.error('Phishing check failed:', error);
            this.showError(error.message || 'Phishing detection failed');
        } finally {
            this.isScanning = false;
            this.hideLoading();
            this.enableButtons();
        }
    }
    
    // Send message to background script
    sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                resolve(response || { success: false, error: 'No response' });
            });
        });
    }
    
    // Show loading overlay
    showLoading(text = 'Processing...') {
        this.elements.loadingText.textContent = text;
        this.elements.loadingOverlay.classList.add('show');
    }
    
    // Hide loading overlay
    hideLoading() {
        this.elements.loadingOverlay.classList.remove('show');
    }
    
    // Show results
    showResults(title, results) {
        this.elements.resultsTitle.textContent = title;
        this.hideSettings(); // Hide settings if open
        
        if (results.type === 'clone') {
            this.displayCloneResults(results);
        } else if (results.type === 'phishing') {
            this.displayPhishingResults(results);
        } else {
            this.displayGenericResults(results);
        }
        
        this.elements.resultsSection.classList.add('show');
        this.elements.resultsSection.classList.add('fade-in');
    }
    
    // Display clone detection results
    displayCloneResults(results) {
        const combined = results.combined || {};
        const threatLevel = combined.threat_level || 'UNKNOWN';
        const confidence = combined.confidence || 0;
        
        // Update threat level display
        this.updateThreatDisplay(threatLevel, confidence, combined.explanation || 'No explanation available');
        
        // Create detailed results with better formatting like ClonePage
        const details = document.createElement('div');
        details.className = 'clone-results-detail';
        
        // Overall assessment
        const overallDiv = document.createElement('div');
        overallDiv.className = 'result-section';
        overallDiv.innerHTML = `
            <h4 style="color: #1e293b; margin-bottom: 12px; font-size: 14px;">📊 Overall Assessment</h4>
            <div class="result-item">
                <span class="result-label">Decision:</span>
                <span class="result-value ${this.getDecisionClass(combined.decision)}">${combined.decision || 'Unknown'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Threat Level:</span>
                <span class="result-value ${this.getThreatClass(threatLevel)}">${threatLevel}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Confidence:</span>
                <span class="result-value">${confidence}%</span>
            </div>
        `;
        
        // AI Analysis (Gemini)
        if (results.gemini && !results.gemini.error) {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'result-section';
            aiDiv.innerHTML = `
                <h4 style="color: #1e293b; margin: 16px 0 12px 0; font-size: 14px;">🧠 AI Analysis (Gemini)</h4>
                <div class="result-item">
                    <span class="result-label">Decision:</span>
                    <span class="result-value ${this.getDecisionClass(results.gemini.decision)}">${results.gemini.decision || 'N/A'}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Risk Score:</span>
                    <span class="result-value">${results.gemini.score || 0}/100</span>
                </div>
                ${results.gemini.advice ? `
                <div class="result-item full-width">
                    <span class="result-label">Recommendation:</span>
                    <span class="result-value advice" style="font-style: italic;">${results.gemini.advice}</span>
                </div>
                ` : ''}
            `;
            overallDiv.appendChild(aiDiv);
        }
        
        // ML Analysis (Phishpedia)
        if (results.phishpedia && !results.phishpedia.error) {
            const mlDiv = document.createElement('div');
            mlDiv.className = 'result-section';
            mlDiv.innerHTML = `
                <h4 style="color: #1e293b; margin: 16px 0 12px 0; font-size: 14px;">🤖 ML Analysis (Phishpedia)</h4>
                <div class="result-item">
                    <span class="result-label">Result:</span>
                    <span class="result-value ${this.getMLResultClass(results.phishpedia.result)}">${results.phishpedia.result || 'N/A'}</span>
                </div>
                ${results.phishpedia.matched_brand && results.phishpedia.matched_brand !== 'unknown' ? `
                <div class="result-item">
                    <span class="result-label">Brand Detected:</span>
                    <span class="result-value">${results.phishpedia.matched_brand}</span>
                </div>
                ` : ''}
                <div class="result-item">
                    <span class="result-label">Confidence:</span>
                    <span class="result-value">${Math.round((results.phishpedia.confidence || 0) * 100)}%</span>
                </div>
                ${results.phishpedia.correct_domain && results.phishpedia.correct_domain !== 'unknown' ? `
                <div class="result-item">
                    <span class="result-label">Legitimate Domain:</span>
                    <span class="result-value">${results.phishpedia.correct_domain}</span>
                </div>
                ` : ''}
            `;
            overallDiv.appendChild(mlDiv);
        }
        
        // Error handling
        if (results.gemini?.error && results.phishpedia?.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-section';
            errorDiv.innerHTML = `
                <h4 style="color: #dc2626; margin: 16px 0 12px 0; font-size: 14px;">⚠️ Analysis Errors</h4>
                <div class="error-item">AI Service: ${results.gemini.error}</div>
                <div class="error-item">ML Service: ${results.phishpedia.error}</div>
            `;
            overallDiv.appendChild(errorDiv);
        }
        
        details.appendChild(overallDiv);
        this.elements.resultsDetails.innerHTML = '';
        this.elements.resultsDetails.appendChild(details);
    }
    
    // Helper methods for styling
    getDecisionClass(decision) {
        switch(decision) {
            case 'clone': return 'threat-high';
            case 'suspicious': return 'threat-medium';
            case 'clean': return 'threat-low';
            default: return 'threat-unknown';
        }
    }
    
    getThreatClass(level) {
        switch(level) {
            case 'HIGH': return 'threat-high';
            case 'MEDIUM': return 'threat-medium';
            case 'LOW': return 'threat-low';
            default: return 'threat-unknown';
        }
    }
    
    getMLResultClass(result) {
        switch(result) {
            case 'Phishing': return 'threat-high';
            case 'Benign': return 'threat-low';
            default: return 'threat-unknown';
        }
    }
    
    // Display phishing detection results
    displayPhishingResults(results) {
        // Debug: Log the received results structure
        console.log('Phishing results received:', JSON.stringify(results, null, 2));
        
        // Handle the nested backend response structure
        const responseData = results.data || results;
        const actualData = responseData.data || responseData; // Handle nested structure
        
        // Prioritize AI analysis over basic analysis when available
        const aiAnalysis = actualData.aiAnalysis?.analysis;
        const hasAI = aiAnalysis && actualData.aiAnalysis?.enabled;
        
        // Use AI analysis values if available, fallback to basic analysis
        const threatLevel = hasAI ? aiAnalysis.threatLevel : (actualData.threatLevel || 'low');
        const riskScore = hasAI ? aiAnalysis.riskScore : (actualData.riskScore || actualData.combinedRiskScore || 0);
        const isPhishing = hasAI ? aiAnalysis.isPhishing : (actualData.isPhishing || false);
        const confidence = hasAI ? aiAnalysis.confidence : 0;
        
        // Convert backend threat level to display format
        let displayThreatLevel = 'LOW';
        if (threatLevel === 'high' || isPhishing || riskScore >= 70) {
            displayThreatLevel = 'HIGH';
        } else if (threatLevel === 'medium' || riskScore >= 40) {
            displayThreatLevel = 'MEDIUM';
        }
        
        // Use AI insights if available
        const insights = hasAI ? aiAnalysis.summary : (actualData.aiAnalysis?.insights || 'Phishing analysis completed');
        
        this.updateThreatDisplay(displayThreatLevel, confidence || riskScore, insights);
        
        // Create detailed results with proper backend data structure
        const details = document.createElement('div');
        details.className = 'phishing-results-detail';
        
        // Overall assessment section
        const overallDiv = document.createElement('div');
        overallDiv.className = 'result-section';
        overallDiv.innerHTML = `
            <h4 style="color: #1e293b; margin-bottom: 12px; font-size: 14px;">🔍 Phishing Analysis</h4>
            <div class="result-item">
                <span class="result-label">Domain:</span>
                <span class="result-value">${actualData.domain || 'Unknown'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Is Phishing:</span>
                <span class="result-value ${isPhishing ? 'threat-high' : 'threat-low'}">${isPhishing ? 'Yes' : 'No'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Threat Level:</span>
                <span class="result-value ${this.getThreatClass(displayThreatLevel)}">${displayThreatLevel}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Risk Score:</span>
                <span class="result-value">${riskScore}%</span>
            </div>
            ${hasAI ? `
            <div class="result-item">
                <span class="result-label">AI Confidence:</span>
                <span class="result-value">${confidence}%</span>
            </div>
            ` : ''}
        `;
        
        // Domain details section
        if (actualData.details) {
            const domainDiv = document.createElement('div');
            domainDiv.className = 'result-section';
            domainDiv.innerHTML = `
                <h4 style="color: #1e293b; margin: 16px 0 12px 0; font-size: 14px;">🌐 Domain Information</h4>
                <div class="result-item">
                    <span class="result-label">Domain Age:</span>
                    <span class="result-value">${actualData.details.domainAge || 'Unknown'}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Country:</span>
                    <span class="result-value">${actualData.details.country || 'Unknown'}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Registrar:</span>
                    <span class="result-value">${actualData.details.registrar || 'Unknown'}</span>
                </div>
                ${actualData.details.reputation ? `
                <div class="result-item">
                    <span class="result-label">Reputation:</span>
                    <span class="result-value">${actualData.details.reputation}/100</span>
                </div>
                ` : ''}
            `;
            overallDiv.appendChild(domainDiv);
        }
        
        // AI Analysis section (enhanced)
        if (hasAI) {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'result-section';
            aiDiv.innerHTML = `
                <h4 style="color: #1e293b; margin: 16px 0 12px 0; font-size: 14px;">🤖 AI Analysis</h4>
                <div class="result-item">
                    <span class="result-label">AI Risk Score:</span>
                    <span class="result-value">${aiAnalysis.riskScore || 0}%</span>
                </div>
                <div class="result-item">
                    <span class="result-label">AI Confidence:</span>
                    <span class="result-value">${aiAnalysis.confidence || 0}%</span>
                </div>
                ${aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 ? `
                <div class="result-item full-width">
                    <span class="result-label">AI Recommendations:</span>
                    <span class="result-value advice" style="font-style: italic;">
                        ${aiAnalysis.recommendations.join('; ')}
                    </span>
                </div>
                ` : ''}
                ${aiAnalysis.riskFactors && aiAnalysis.riskFactors.length > 0 ? `
                <div class="result-item full-width">
                    <span class="result-label">Risk Factors:</span>
                    <span class="result-value advice" style="color: #dc2626;">
                        ${aiAnalysis.riskFactors.join('; ')}
                    </span>
                </div>
                ` : ''}
                ${aiAnalysis.technicalInsights ? `
                <div class="result-item full-width">
                    <span class="result-label">Technical Insights:</span>
                    <span class="result-value advice" style="font-style: italic;">${aiAnalysis.technicalInsights}</span>
                </div>
                ` : ''}
            `;
            overallDiv.appendChild(aiDiv);
        }
        
        // Security flags section
        if (actualData.flags && actualData.flags.length > 0) {
            const flagsDiv = document.createElement('div');
            flagsDiv.className = 'result-section';
            flagsDiv.innerHTML = `
                <h4 style="color: #1e293b; margin: 16px 0 12px 0; font-size: 14px;">⚠️ Security Flags</h4>
                ${actualData.flags.map(flag => `
                    <div class="result-item">
                        <span class="result-label">${flag.type || 'Flag'}:</span>
                        <span class="result-value ${flag.severity === 'high' ? 'threat-high' : flag.severity === 'medium' ? 'threat-medium' : 'threat-low'}">
                            ${flag.message || flag}
                        </span>
                    </div>
                `).join('')}
            `;
            overallDiv.appendChild(flagsDiv);
        }
        
        details.appendChild(overallDiv);
        this.elements.resultsDetails.innerHTML = '';
        this.elements.resultsDetails.appendChild(details);
    }
    
    // Display generic results
    displayGenericResults(results) {
        this.updateThreatDisplay('UNKNOWN', 0, 'Analysis completed with limited data');
        
        const details = document.createElement('div');
        details.innerHTML = `
            <div class="result-item">
                <span class="result-label">Status:</span>
                <span class="result-value">Analysis completed</span>
            </div>
        `;
        
        this.elements.resultsDetails.innerHTML = '';
        this.elements.resultsDetails.appendChild(details);
    }
    
    // Update threat level display
    updateThreatDisplay(threatLevel, confidence, explanation) {
        const icons = {
            'LOW': '🟢',
            'MEDIUM': '🟡',
            'HIGH': '🔴',
            'UNKNOWN': '🟠'
        };
        
        const statuses = {
            'LOW': 'Safe',
            'MEDIUM': 'Suspicious',
            'HIGH': 'Dangerous',
            'UNKNOWN': 'Unknown'
        };
        
        const classes = {
            'LOW': 'safe',
            'MEDIUM': 'warning',
            'HIGH': 'danger',
            'UNKNOWN': 'warning'
        };
        
        this.elements.threatIcon.textContent = icons[threatLevel] || icons['UNKNOWN'];
        this.elements.threatStatus.textContent = statuses[threatLevel] || statuses['UNKNOWN'];
        this.elements.threatConfidence.textContent = `Confidence: ${confidence}%`;
        
        // Update icon class
        this.elements.threatIcon.className = `threat-icon ${classes[threatLevel] || 'warning'}`;
    }
    
    // Hide results
    hideResults() {
        this.elements.resultsSection.classList.remove('show');
    }
    
    // Disable action buttons
    disableButtons() {
        this.elements.cloneBtn.disabled = true;
        this.elements.phishingBtn.disabled = true;
    }
    
    // Enable action buttons
    enableButtons() {
        this.elements.cloneBtn.disabled = false;
        this.elements.phishingBtn.disabled = false;
    }
    
    // Show error message
    showError(message) {
        // Create a temporary error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: #fee2e2;
            color: #dc2626;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #fecaca;
            font-size: 14px;
            z-index: 3000;
            animation: slideDown 0.3s ease;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    // Load and display stats
    async loadStats() {
        try {
            const data = await this.getStorageData(['scanHistory', 'totalScans', 'threatsBlocked']);
            
            const scanHistory = data.scanHistory || [];
            const totalScans = data.totalScans || scanHistory.length;
            const threatsBlocked = data.threatsBlocked || this.countThreats(scanHistory);
            
            this.elements.totalScans.textContent = totalScans;
            this.elements.threatsBlocked.textContent = threatsBlocked;
            
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    // Count threats from scan history
    countThreats(scanHistory) {
        return scanHistory.filter(scan => {
            if (scan.type === 'clone') {
                return scan.result?.combined?.threat_level === 'HIGH';
            } else if (scan.type === 'phishing') {
                return scan.result?.data?.isPhishing === true;
            }
            return false;
        }).length;
    }
    
    // Update stats after scan
    async updateStats(scanType, results) {
        try {
            const data = await this.getStorageData(['scanHistory', 'totalScans', 'threatsBlocked']);
            
            const scanHistory = data.scanHistory || [];
            const totalScans = (data.totalScans || 0) + 1;
            let threatsBlocked = data.threatsBlocked || 0;
            
            // Check if this scan found a threat
            let foundThreat = false;
            if (scanType === 'clone' && results.combined?.threat_level === 'HIGH') {
                foundThreat = true;
            } else if (scanType === 'phishing' && results.data?.isPhishing === true) {
                foundThreat = true;
            }
            
            if (foundThreat) {
                threatsBlocked++;
            }
            
            // Add to history
            scanHistory.unshift({
                type: scanType,
                url: this.currentTab.url,
                timestamp: new Date().toISOString(),
                result: results,
                threatDetected: foundThreat
            });
            
            // Keep only last 50 scans
            if (scanHistory.length > 50) {
                scanHistory.splice(50);
            }
            
            // Save to storage
            await this.setStorageData({
                scanHistory: scanHistory,
                totalScans: totalScans,
                threatsBlocked: threatsBlocked
            });
            
            // Update display
            this.elements.totalScans.textContent = totalScans;
            this.elements.threatsBlocked.textContent = threatsBlocked;
            
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }
    
    // Storage helpers
    getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }
    
    setStorageData(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, resolve);
        });
    }
    
    // Load settings
    async loadSettings() {
        try {
            const data = await this.getStorageData(['autoScanEnabled', 'notificationsEnabled', 'protectionLevel']);
            
            this.elements.autoScanEnabled.checked = data.autoScanEnabled !== false;
            this.elements.notificationsEnabled.checked = data.notificationsEnabled !== false;
            this.elements.protectionLevelSelect.value = data.protectionLevel || 'standard';
            
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    // Save settings
    async saveSettings() {
        try {
            await this.setStorageData({
                autoScanEnabled: this.elements.autoScanEnabled.checked,
                notificationsEnabled: this.elements.notificationsEnabled.checked,
                protectionLevel: this.elements.protectionLevelSelect.value
            });
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }
    
    // Show settings panel
    showSettings() {
        this.hideResults();
        this.elements.settingsPanel.classList.add('show');
    }
    
    // Hide settings panel
    hideSettings() {
        this.elements.settingsPanel.classList.remove('show');
    }
    
    // Show detailed results
    showDetailedResults() {
        if (this.lastResults) {
            // Open results in a new tab or popup
            const resultsWindow = window.open('', '_blank', 'width=600,height=400');
            resultsWindow.document.write(`
                <html>
                    <head><title>CipherCop - Detailed Results</title></head>
                    <body>
                        <h2>Detailed Analysis Results</h2>
                        <pre>${JSON.stringify(this.lastResults, null, 2)}</pre>
                    </body>
                </html>
            `);
        }
    }
    
    // Report issue
    reportIssue() {
        // Open reporting form or send to backend
        const reportData = {
            url: this.currentTab.url,
            results: this.lastResults,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        console.log('Report issue:', reportData);
        // Here you would typically send this to your backend
    }
    
    // Show history
    showHistory() {
        console.log('Show scan history');
        // Implement history view
    }
    
    // Show help
    showHelp() {
        chrome.tabs.create({ url: 'https://github.com/Samith-P/ciphercopdemo' });
    }
    
    // Update UI
    updateUI() {
        // Update based on current state
        if (!this.currentTab) {
            this.disableButtons();
            this.elements.siteUrl.textContent = 'No active tab';
            this.elements.siteTitle.textContent = 'Please navigate to a website';
        }
    }
}
