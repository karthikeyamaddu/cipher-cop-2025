// Storage Utilities for CipherCop Extension

class CipherCopStorage {
    constructor() {
        this.storageTypes = {
            LOCAL: 'local',
            SYNC: 'sync'
        };
        
        this.defaultKeys = {
            extensionEnabled: true,
            autoScanEnabled: true,
            notificationsEnabled: true,
            protectionLevel: 'standard',
            scanHistory: [],
            totalScans: 0,
            threatsBlocked: 0,
            lastScanResults: null,
            userSettings: {},
            whitelistedDomains: [],
            blacklistedDomains: []
        };
    }
    
    // Get data from storage
    async get(keys, storageType = this.storageTypes.LOCAL) {
        return new Promise((resolve, reject) => {
            try {
                const storage = chrome.storage[storageType];
                storage.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(result);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Set data in storage
    async set(data, storageType = this.storageTypes.LOCAL) {
        return new Promise((resolve, reject) => {
            try {
                const storage = chrome.storage[storageType];
                storage.set(data, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Remove data from storage
    async remove(keys, storageType = this.storageTypes.LOCAL) {
        return new Promise((resolve, reject) => {
            try {
                const storage = chrome.storage[storageType];
                storage.remove(keys, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Clear all storage
    async clear(storageType = this.storageTypes.LOCAL) {
        return new Promise((resolve, reject) => {
            try {
                const storage = chrome.storage[storageType];
                storage.clear(() => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Initialize storage with default values
    async initialize() {
        try {
            const existingData = await this.get(Object.keys(this.defaultKeys));
            const initData = {};
            
            // Only set defaults for missing keys
            Object.entries(this.defaultKeys).forEach(([key, defaultValue]) => {
                if (!(key in existingData)) {
                    initData[key] = defaultValue;
                }
            });
            
            if (Object.keys(initData).length > 0) {
                await this.set(initData);
                console.log('Storage initialized with defaults:', initData);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            throw error;
        }
    }
    
    // Save scan result
    async saveScanResult(scanType, url, result, threatDetected = false) {
        try {
            const [historyData, statsData] = await Promise.all([
                this.get(['scanHistory']),
                this.get(['totalScans', 'threatsBlocked'])
            ]);
            
            const scanHistory = historyData.scanHistory || [];
            const totalScans = (statsData.totalScans || 0) + 1;
            const threatsBlocked = (statsData.threatsBlocked || 0) + (threatDetected ? 1 : 0);
            
            // Create scan entry
            const scanEntry = {
                id: this.generateId(),
                type: scanType,
                url: url,
                timestamp: new Date().toISOString(),
                result: result,
                threatDetected: threatDetected,
                domain: this.extractDomain(url)
            };
            
            // Add to history (keep last 100 entries)
            scanHistory.unshift(scanEntry);
            if (scanHistory.length > 100) {
                scanHistory.splice(100);
            }
            
            // Save everything
            await this.set({
                scanHistory: scanHistory,
                totalScans: totalScans,
                threatsBlocked: threatsBlocked,
                lastScanResults: scanEntry
            });
            
            return scanEntry;
            
        } catch (error) {
            console.error('Failed to save scan result:', error);
            throw error;
        }
    }
    
    // Get scan history with filters
    async getScanHistory(filters = {}) {
        try {
            const data = await this.get(['scanHistory']);
            let history = data.scanHistory || [];
            
            // Apply filters
            if (filters.type) {
                history = history.filter(scan => scan.type === filters.type);
            }
            
            if (filters.threatOnly) {
                history = history.filter(scan => scan.threatDetected);
            }
            
            if (filters.domain) {
                history = history.filter(scan => scan.domain === filters.domain);
            }
            
            if (filters.since) {
                const sinceDate = new Date(filters.since);
                history = history.filter(scan => new Date(scan.timestamp) >= sinceDate);
            }
            
            if (filters.limit) {
                history = history.slice(0, filters.limit);
            }
            
            return history;
            
        } catch (error) {
            console.error('Failed to get scan history:', error);
            throw error;
        }
    }
    
    // Get statistics
    async getStatistics() {
        try {
            const data = await this.get(['totalScans', 'threatsBlocked', 'scanHistory']);
            const scanHistory = data.scanHistory || [];
            
            // Calculate additional stats
            const stats = {
                totalScans: data.totalScans || 0,
                threatsBlocked: data.threatsBlocked || 0,
                scansByType: this.groupScansByType(scanHistory),
                recentActivity: this.getRecentActivity(scanHistory),
                topThreats: this.getTopThreats(scanHistory),
                protectionRate: this.calculateProtectionRate(data.totalScans, data.threatsBlocked)
            };
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get statistics:', error);
            throw error;
        }
    }
    
    // Manage whitelist
    async addToWhitelist(domain) {
        try {
            const data = await this.get(['whitelistedDomains']);
            const whitelist = data.whitelistedDomains || [];
            
            if (!whitelist.includes(domain)) {
                whitelist.push(domain);
                await this.set({ whitelistedDomains: whitelist });
            }
            
            return whitelist;
        } catch (error) {
            console.error('Failed to add to whitelist:', error);
            throw error;
        }
    }
    
    async removeFromWhitelist(domain) {
        try {
            const data = await this.get(['whitelistedDomains']);
            const whitelist = data.whitelistedDomains || [];
            const filtered = whitelist.filter(d => d !== domain);
            
            await this.set({ whitelistedDomains: filtered });
            return filtered;
        } catch (error) {
            console.error('Failed to remove from whitelist:', error);
            throw error;
        }
    }
    
    // Manage blacklist
    async addToBlacklist(domain) {
        try {
            const data = await this.get(['blacklistedDomains']);
            const blacklist = data.blacklistedDomains || [];
            
            if (!blacklist.includes(domain)) {
                blacklist.push(domain);
                await this.set({ blacklistedDomains: blacklist });
            }
            
            return blacklist;
        } catch (error) {
            console.error('Failed to add to blacklist:', error);
            throw error;
        }
    }
    
    async removeFromBlacklist(domain) {
        try {
            const data = await this.get(['blacklistedDomains']);
            const blacklist = data.blacklistedDomains || [];
            const filtered = blacklist.filter(d => d !== domain);
            
            await this.set({ blacklistedDomains: filtered });
            return filtered;
        } catch (error) {
            console.error('Failed to remove from blacklist:', error);
            throw error;
        }
    }
    
    // Export data for backup
    async exportData() {
        try {
            const allData = await this.get(null); // Get all data
            return {
                version: '1.0',
                exportDate: new Date().toISOString(),
                data: allData
            };
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }
    
    // Import data from backup
    async importData(backupData) {
        try {
            if (!backupData.data) {
                throw new Error('Invalid backup data format');
            }
            
            // Validate critical fields
            const requiredKeys = ['extensionEnabled', 'scanHistory'];
            const hasRequiredKeys = requiredKeys.every(key => key in backupData.data);
            
            if (!hasRequiredKeys) {
                throw new Error('Backup data is missing required fields');
            }
            
            await this.set(backupData.data);
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }
    
    // Helper methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (_) {
            return 'unknown';
        }
    }
    
    groupScansByType(scanHistory) {
        const groups = {};
        scanHistory.forEach(scan => {
            groups[scan.type] = (groups[scan.type] || 0) + 1;
        });
        return groups;
    }
    
    getRecentActivity(scanHistory, days = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        
        return scanHistory.filter(scan => 
            new Date(scan.timestamp) >= since
        ).length;
    }
    
    getTopThreats(scanHistory, limit = 5) {
        const threats = scanHistory
            .filter(scan => scan.threatDetected)
            .reduce((acc, scan) => {
                acc[scan.domain] = (acc[scan.domain] || 0) + 1;
                return acc;
            }, {});
            
        return Object.entries(threats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([domain, count]) => ({ domain, count }));
    }
    
    calculateProtectionRate(totalScans, threatsBlocked) {
        if (totalScans === 0) return 100;
        return Math.round(((totalScans - threatsBlocked) / totalScans) * 100);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CipherCopStorage;
} else {
    window.CipherCopStorage = CipherCopStorage;
}
