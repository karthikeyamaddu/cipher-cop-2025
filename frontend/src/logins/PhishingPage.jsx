import React, { useState } from 'react';
import { AlertTriangle, Mail, Link, Shield, Search, FileText, Activity, TrendingUp, Users, CheckCircle, ChevronDown, Settings, Eye, Brain } from 'lucide-react';


const PhishingPage = () => {
  const [url, setUrl] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [scanProgress, setScanProgress] = useState({ step: '', progress: 0 });
  
  // Additional email fields
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [senderDomain, setSenderDomain] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [urgentKeywords, setUrgentKeywords] = useState(false);

  const handleUrlScan = async () => {
    if (!url) return;
    setIsScanning(true);
    setScanResult(null);
    setScanProgress({ step: 'Initializing WHOIS + Gemini Analysis...', progress: 20 });
    
    try {
      // WHOIS + Gemini Analysis Only
      setScanProgress({ step: 'Running WHOIS + Gemini Analysis...', progress: 60 });
      
      const response = await fetch('http://localhost:5001/api/phishing/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      
      setScanProgress({ step: 'Finalizing Results...', progress: 90 });
      
      if (data.success) {
        // Fix threat level inconsistency by using AI risk score if available and high
        let finalThreatLevel = data.data.threatLevel;
        let finalIsPhishing = data.data.isPhishing;
        
        // Check if AI analysis provided a higher risk score
        if (data.data.aiAnalysis && data.data.aiAnalysis.riskScore) {
          const aiRiskScore = data.data.aiAnalysis.riskScore;
          if (aiRiskScore >= 70) {
            finalThreatLevel = 'high';
            finalIsPhishing = true;
          } else if (aiRiskScore >= 40) {
            finalThreatLevel = 'medium';
            finalIsPhishing = false;
          } else {
            finalThreatLevel = 'low';
            finalIsPhishing = false;
          }
        }
        
        setScanResult({
          type: 'url',
          threat: finalThreatLevel,
          isPhishing: finalIsPhishing,
          riskScore: data.data.riskScore,
          combinedRiskScore: data.data.combinedRiskScore,
          flags: data.data.flags,
          details: {
            domain: data.data.domain,
            reputation: data.data.details.reputation,
            similarSites: data.data.details.similarDomains,
            domainAge: data.data.details.domainAge,
            registrar: data.data.details.registrar,
            country: data.data.details.country,
            expiryDate: data.data.details.expiryDate,
            nameServers: data.data.details.nameServers,
            status: data.data.details.status,
            privacyProtection: data.data.details.privacyProtection,
            lastChecked: data.data.details.lastChecked
          },
          aiAnalysis: {
            enabled: data.data.aiAnalysis.enabled,
            analysis: data.data.aiAnalysis.analysis,
            riskScore: data.data.aiAnalysis.riskScore,
            recommendations: data.data.aiAnalysis.recommendations,
            insights: data.data.aiAnalysis.insights
          }
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
      
      setScanProgress({ step: 'Complete', progress: 100 });
      
    } catch (error) {
      console.error('URL scan error:', error);
      setScanResult({
        type: 'url',
        threat: 'error',
        error: error.message,
        details: {
          domain: url,
          lastChecked: new Date().toLocaleString()
        }
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleEmailScan = async () => {
    if (!emailContent) return;
    setIsScanning(true);
    setScanResult(null);
    
    try {
      // Prepare the request data with all available fields
      const requestData = {
        email_text: emailContent,
        subject: emailSubject || "",
        sender_domain: senderDomain || null,
        sender_email: senderEmail || null,
        reply_to: replyTo || null,
        has_attachment: hasAttachment || null,
        urgent_keywords: urgentKeywords || null
      };

      // Call the ML-based phishing email detection service
      const response = await fetch('http://localhost:5008/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      
      if (data.prediction) {
        const isPhishing = data.prediction === 'phishing';
        const riskScore = Math.round(data.probability * 100);
        
        // Use the same logic as index.html for classification
        let threatLevel = 'low';
        if (isPhishing) {
          threatLevel = 'high';
        } else if (data.probability > 0.3) {
          threatLevel = 'medium'; // Suspicious content
        }
        
        setScanResult({
          type: 'email',
          threat: threatLevel,
          isPhishing: isPhishing,
          riskScore: riskScore,
          confidence: Math.round(data.confidence * 100),
          prediction: data.prediction,
          probability: data.probability,
          flags: isPhishing ? 
            ['ML Detection: Phishing content detected', `Confidence: ${Math.round(data.confidence * 100)}%`] : 
            data.probability > 0.3 ? 
              ['ML Detection: Suspicious patterns found', `Confidence: ${Math.round(data.confidence * 100)}%`] :
              ['ML Detection: Content appears legitimate', `Confidence: ${Math.round(data.confidence * 100)}%`],
          mlAnalysis: {
            enabled: true,
            prediction: data.prediction,
            probability: data.probability,
            confidence: data.confidence,
            features: data.features_used
          },
          details: {
            suspiciousLinks: data.features_used?.links_count || 0,
            suspiciousKeywords: data.features_used?.urgent_keywords || 0,
            phishingIndicators: isPhishing ? 1 : 0,
            contentLength: data.features_used?.email_length || emailContent.length,
            senderReputation: data.features_used?.domain_length ? Math.max(10, 100 - (data.features_used.domain_length * 2)) : 75,
            contentAnalysis: `ML Analysis: ${data.prediction} (${Math.round(data.confidence * 100)}% confidence)`,
            lastChecked: new Date().toLocaleString(),
            domainAge: data.features_used?.domain_age || 'Unknown',
            htmlTags: data.features_used?.html_tags || 0,
            specialChars: data.features_used?.special_chars || 0,
            linkDensity: data.features_used?.link_density || 0
          }
        });
      } else {
        throw new Error(data.error || 'ML analysis failed');
      }
    } catch (error) {
      console.error('Email ML scan error:', error);
      setScanResult({
        type: 'email',
        threat: 'error',
        error: `ML Service Error: ${error.message}`,
        details: {
          lastChecked: new Date().toLocaleString()
        }
      });
    } finally {
      setIsScanning(false);
    }
  };

  const stats = [
    { icon: Shield, label: 'Threats Blocked', value: '2K+', color: 'text-green-400' },
    { icon: AlertTriangle, label: 'Phishing Attempts', value: '5K+', color: 'text-red-400' },
    { icon: Users, label: 'Protected Users', value: '1K+', color: 'text-blue-400' },
    { icon: TrendingUp, label: 'Success Rate', value: '90+', color: 'text-purple-400' }
  ];

  const recentThreats = [
    { domain: 'fake-bank-login.com', threat: 'high', time: '2 minutes ago' },
    { domain: 'phishing-paypal.net', threat: 'high', time: '5 minutes ago' },
    { domain: 'suspicious-amazon.org', threat: 'medium', time: '12 minutes ago' },
    { domain: 'fake-microsoft.co', threat: 'high', time: '18 minutes ago' }
  ];

  return (
    <div className="phishing-page">
      <div className="page-header animate-fade-in">
        <div className="header-content">
          <div className="header-icon">
            <AlertTriangle size={48} className="animate-pulse" />
          </div>
          <div className="header-text">
            <h1>Phishing Protection</h1>
            <p>Advanced detection and prevention against phishing attacks</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid animate-fade-in-up">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ animationDelay: `${index * 0.1}s` }}>
            <stat.icon className={`stat-icon ${stat.color}`} />
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
      {/* WHOIS + Gemini Detection */}
      
      {/* Integrated Phishing Detection */}
      <div className="integrated-detection-section animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="integrated-header">
          <div className="integrated-header-content">
            <div className="integrated-icon-wrapper">
              <Shield size={32} className="integrated-icon whois-icon" />
            </div>
            <div className="integrated-header-text">
              <h2>Advanced Phishing Detection</h2>
              <p>Comprehensive analysis using ML + WHOIS + Gemini AI technology</p>
            </div>
          </div>
        </div>

        <div className="integrated-input-section">
          <div className="integrated-input-group">
            <input
              type="url"
              placeholder="Enter URL to analyze (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlScan()}
              className="integrated-input"
              disabled={isScanning}
            />
            <button
              onClick={handleUrlScan}
              disabled={!url.trim() || isScanning}
              className="integrated-analyze-btn"
            >
              {isScanning ? (
                <>
                  <Activity className="animate-spin" size={16} />
                  {scanProgress.step}
                </>
              ) : (
                <>
                  <Search size={16} />
                  Analyze URL
                </>
              )}
            </button>
          </div>
          
          {isScanning && (
            <div className="scan-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${scanProgress.progress}%` }}
                ></div>
              </div>
              <div className="progress-text">{scanProgress.step}</div>
            </div>
          )}
        </div>
      </div>
      {/* Scanning Tools */}
      <div className="scanning-section">
        <div className="section-header">
          <h2>Additional Analysis Tools</h2>
          <p>Email content analysis and historical threat data</p>
        </div>
        <div className="scan-grid">
          {/* Email Scanner - Keeping only this one */}
          <div className="scan-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="scan-header">
              <Mail className="scan-icon" />
              <h3>Email Content Scanner</h3>
            </div>
            <div className="scan-content">
              <div className="email-analysis-form">
                <div className="form-group">
                  <label htmlFor="emailContent">Email Content:</label>
                  <textarea
                    id="emailContent"
                    placeholder="Paste email content here to analyze for phishing attempts..."
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    className="scan-textarea"
                    rows={4}
                  />
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
                  <button 
                    type="button"
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-blue-100/50 rounded-t-xl transition-colors"
                    onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <Settings className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-blue-900">Advanced Email Metadata</span>
                        <p className="text-sm text-blue-700 mt-0.5">Enhanced phishing detection parameters</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full mr-2 font-medium">OPTIONAL</span>
                      <ChevronDown className={`w-5 h-5 text-blue-600 transition-transform ${showAdditionalInfo ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {showAdditionalInfo && (
                    <div className="border-t border-blue-200 p-6 bg-white/70 rounded-b-xl">
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                          <Shield className="w-5 h-5 text-blue-600 mr-2" />
                          Email Header Analysis
                        </h4>
                        <p className="text-sm text-gray-600">Provide additional email metadata to enhance ML detection accuracy</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <label htmlFor="emailSubject" className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                            Subject Line Analysis
                          </label>
                          <input
                            type="text"
                            id="emailSubject"
                            placeholder="Enter email subject for sentiment analysis..."
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white shadow-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="senderEmail" className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                            Sender Email Address
                          </label>
                          <input
                            type="email"
                            id="senderEmail"
                            placeholder="sender@suspicious-domain.com"
                            value={senderEmail}
                            onChange={(e) => setSenderEmail(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white shadow-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="senderDomain" className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                            Sender Domain
                          </label>
                          <input
                            type="text"
                            id="senderDomain"
                            placeholder="domain-reputation.com"
                            value={senderDomain}
                            onChange={(e) => setSenderDomain(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white shadow-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="replyTo" className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                            Reply-To Header
                          </label>
                          <input
                            type="email"
                            id="replyTo"
                            placeholder="Different reply address detection"
                            value={replyTo}
                            onChange={(e) => setReplyTo(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white shadow-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                          <Eye className="w-4 h-4 text-gray-600 mr-2" />
                          Behavioral Indicators
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-center group cursor-pointer">
                            <input
                              type="checkbox"
                              id="hasAttachment"
                              checked={hasAttachment}
                              onChange={(e) => setHasAttachment(e.target.checked)}
                              className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="ml-3">
                              <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">File Attachments Present</span>
                              <p className="text-xs text-gray-500">Malware delivery risk factor</p>
                            </div>
                          </label>
                          
                          <label className="flex items-center group cursor-pointer">
                            <input
                              type="checkbox"
                              id="urgentKeywords"
                              checked={urgentKeywords}
                              onChange={(e) => setUrgentKeywords(e.target.checked)}
                              className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="ml-3">
                              <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">Urgent Language Detected</span>
                              <p className="text-xs text-gray-500">Social engineering tactics</p>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          <strong>Security Note:</strong> Additional metadata improves ML model accuracy by 15-20% for advanced phishing detection
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleEmailScan}
                  disabled={!emailContent || isScanning}
                  className="scan-button primary"
                >
                  {isScanning ? (
                    <Activity className="animate-spin" />
                  ) : (
                    <Shield />
                  )}
                  {isScanning ? 'Analyzing...' : 'Analyze for Phishing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="results-section animate-fade-in">
          <div className="results-card">
            <div className="results-header">
              <h3>Analysis Results</h3>
              <div className={`threat-badge threat-${scanResult.threat}`}>
                {scanResult.threat === 'low' || scanResult.threat === 'safe' ? (
                  <CheckCircle size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
                {scanResult.threat.toUpperCase()}
              </div>
            </div>
            
            <div className="results-content">
              {scanResult.error ? (
                <div className="error-message">
                  <AlertTriangle size={24} className="error-icon" />
                  <div>
                    <h4>Analysis Failed</h4>
                    <p>{scanResult.error}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Security Flags */}
                  {scanResult.flags && scanResult.flags.length > 0 && (
                    <div className="flags-section">
                      <h4>Security Assessment</h4>
                      <div className="flags-list">
                        {scanResult.flags.map((flag, index) => (
                          <div key={index} className="flag-item">
                            <AlertTriangle size={14} />
                            {flag}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* URL Results */}
                  {scanResult.type === 'url' && (
                    <>
                      {/* Domain Analysis */}
                      <div className="result-details">
                        <h4>Domain Analysis</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Domain:</span>
                            <span className="detail-value">{scanResult.details.domain}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Reputation Score:</span>
                            <span className="detail-value">{scanResult.details.reputation}/100</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Similar Suspicious Sites:</span>
                            <span className="detail-value">{scanResult.details.similarSites}</span>
                          </div>
                          {scanResult.details.domainAge && (
                            <div className="detail-item">
                              <span className="detail-label">Domain Age:</span>
                              <span className="detail-value">{scanResult.details.domainAge}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email Results */}
                  {scanResult.type === 'email' && (
                    <div className="result-details">
                      <h4>Email Analysis</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Classification:</span>
                          <span className="detail-value">
                            {scanResult.mlAnalysis?.prediction === 'phishing' ? 'Phishing Detected' : 'Likely Legitimate'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Confidence:</span>
                          <span className="detail-value">
                            {scanResult.mlAnalysis?.confidence ? Math.round(scanResult.mlAnalysis.confidence * 100) + '%' : 'N/A'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Risk Probability:</span>
                          <span className="detail-value">
                            {scanResult.mlAnalysis?.probability ? Math.round(scanResult.mlAnalysis.probability * 100) + '%' : 'N/A'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Content Length:</span>
                          <span className="detail-value">{scanResult.details?.contentLength || 0} characters</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Analysis for URLs */}
                  {scanResult.aiAnalysis && scanResult.aiAnalysis.enabled && (
                    <div className="ai-analysis-section">
                      <h4>AI Security Analysis</h4>
                      {scanResult.aiAnalysis.riskScore && (
                        <div className="ai-risk-score">
                          <div className="score-container">
                            <span className="score-label">AI Risk Score</span>
                            <span className="score-value">{scanResult.aiAnalysis.riskScore}/100</span>
                            {/* Show warning if AI score is much higher than traditional score */}
                            {scanResult.aiAnalysis.riskScore > scanResult.riskScore + 20 && (
                              <div className="score-warning">
                                <AlertTriangle size={16} />
                                <span>AI detected higher risk than traditional analysis</span>
                              </div>
                            )}
                          </div>
                          <div className="score-bar">
                            <div 
                              className="score-fill" 
                              style={{ 
                                width: `${scanResult.aiAnalysis.riskScore}%`,
                                backgroundColor: scanResult.aiAnalysis.riskScore > 70 ? '#ef4444' : 
                                               scanResult.aiAnalysis.riskScore > 40 ? '#f59e0b' : '#10b981'
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {scanResult.aiAnalysis.insights && (
                        <div className="ai-insights">
                          <h5>AI Insights</h5>
                          <p>{scanResult.aiAnalysis.insights}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technical Details for Email - REMOVED */}
                  {/* {scanResult.type === 'email' && scanResult.mlAnalysis?.features && (
                    <div className="technical-details-section">
                      <button 
                        className="details-toggle-btn"
                        onClick={() => setShowFeatures(!showFeatures)}
                      >
                        Technical Details
                        <ChevronDown className={`toggle-icon ${showFeatures ? 'rotated' : ''}`} />
                      </button>
                      
                      {showFeatures && (
                        <div className="technical-details">
                          <h5>Feature Analysis</h5>
                          <div className="features-grid">
                            {Object.entries(scanResult.mlAnalysis.features).map(([key, value]) => (
                              <div key={key} className="feature-item">
                                <span className="feature-name">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="feature-value">
                                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )} */}
                </>
              )}
              
              <div className="scan-timestamp">
                Analyzed: {scanResult.details.lastChecked}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Threats */}
      <div className="threats-section animate-fade-in-up">
        <h3>Recent Threats Detected</h3>
        <div className="threats-list">
          {recentThreats.map((threat, index) => (
            <div key={index} className="threat-item" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="threat-info">
                <span className="threat-domain">{threat.domain}</span>
                <span className="threat-time">{threat.time}</span>
              </div>
              <div className={`threat-level threat-${threat.threat}`}>
                <AlertTriangle size={16} />
                {threat.threat.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhishingPage;

/* Additional CSS for integrated detection */
const styles = `
.integrated-detection-section {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #2a2a4a;
  margin: 20px 0;
}

.integrated-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.integrated-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: rgba(52, 211, 153, 0.1);
  border-radius: 12px;
}

.integrated-icon {
  position: absolute;
}

.whois-icon {
  color: #34d399;
}

.integrated-header-text h2 {
  color: #e2e8f0;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.integrated-header-text p {
  color: #94a3b8;
  margin: 0;
  font-size: 14px;
}

.integrated-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.integrated-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  transition: all 0.2s;
}

.integrated-input:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.integrated-analyze-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 140px;
  justify-content: center;
}

.integrated-analyze-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
}

.integrated-analyze-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scan-progress {
  margin-top: 16px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(51, 65, 85, 0.6);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  color: #94a3b8;
  font-size: 14px;
  text-align: center;
}

.score-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
  color: #fbbf24;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .integrated-input-group {
    flex-direction: column;
  }

  .integrated-input {
    width: 100%;
  }

  .integrated-analyze-btn {
    width: 100%;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
