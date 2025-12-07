import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mail, Link, Shield, Search, FileText, Activity, TrendingUp, Users, CheckCircle, ChevronDown, Settings, Eye, Brain, Clock, ExternalLink } from 'lucide-react';
import ResultModal from '../components/ResultModal';
import PhishingResultDetails from '../components/results/PhishingResultDetails';
import { useTestPolling } from '../hooks/useTestPolling';
import { useNotification } from '../context/NotificationContext';


const PhishingPage = () => {
  const { startPolling } = useNotification();
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
  
  // Test history
  const [testHistory, setTestHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Result modal
  const [selectedTest, setSelectedTest] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasCheckedSessionStorage, setHasCheckedSessionStorage] = useState(false);
  
  const openResultModal = (test) => {
    setSelectedTest(test);
    setIsModalOpen(true);
  };
  
  const closeResultModal = () => {
    setIsModalOpen(false);
    // Refresh history to update viewed status
    setTimeout(() => {
      fetchTestHistory();
    }, 500);
  };

  // Fetch test history on component mount
  useEffect(() => {
    fetchTestHistory();
  }, []);

  // Check if we need to open modal from notification (after history is loaded, only once)
  useEffect(() => {
    if (hasCheckedSessionStorage) return; // Already checked
    
    const testIdToOpen = sessionStorage.getItem('openModalForTest');
    if (testIdToOpen && testHistory.length > 0) {
      console.log('📂 Opening modal for test:', testIdToOpen);
      sessionStorage.removeItem('openModalForTest');
      setHasCheckedSessionStorage(true);
      
      const test = testHistory.find(t => t._id === testIdToOpen);
      if (test) {
        console.log('✅ Test found, opening modal');
        setSelectedTest(test);
        setIsModalOpen(true);
      } else {
        console.log('❌ Test not found in history');
      }
    } else if (testHistory.length > 0) {
      // Mark as checked even if no testId to open
      setHasCheckedSessionStorage(true);
    }
  }, [testHistory, hasCheckedSessionStorage]);

  const fetchTestHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('http://localhost:5001/api/tests/history?testType=phishing&limit=5', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestHistory(Array.isArray(data.data) ? data.data : []);
      } else {
        setTestHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch test history:', error);
      setTestHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Save email phishing result to database
  const saveEmailToDatabase = async (mlResult) => {
    try {
      console.log('💾 Saving email phishing result to database...');
      
      const response = await fetch('http://localhost:5001/api/phishing/analyze-email-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          emailData: {
            subject: emailSubject || 'No subject',
            senderEmail: senderEmail || null,
            senderDomain: senderDomain || null,
            replyTo: replyTo || null,
            hasAttachment: hasAttachment,
            urgentKeywords: urgentKeywords,
            content: emailContent || '' // Send email content to backend
          },
          mlResult: mlResult
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Email phishing saved to database:', result.data.testId);
        fetchTestHistory(); // Refresh history
        return result;
      } else {
        const error = await response.json();
        console.error('❌ Failed to save to database:', error);
      }
    } catch (error) {
      console.error('❌ Database save error:', error);
    }
  };

  const handleUrlScan = async () => {
    if (!url) return;
    setIsScanning(true);
    setScanResult(null);
    setScanProgress({ step: 'Queueing analysis...', progress: 10 });
    
    try {
      // Queue the analysis (returns immediately with testId)
      const response = await fetch('http://localhost:5001/api/phishing/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to queue analysis');
      }

      const testId = data.data.testId;
      const queuePosition = data.data.queuePosition;
      
      setScanProgress({ 
        step: `Queued (Position: ${queuePosition})`, 
        progress: 20 
      });

      // Start background polling with notification
      startPolling(testId, 'phishing-url', '/Home?section=phishing');

      // Poll for results on current page
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `http://localhost:5001/api/tests/${testId}/status`,
            { credentials: 'include' }
          );
          
          const statusData = await statusResponse.json();
          
          if (statusData.success) {
            const status = statusData.data.processingStatus;
            
            if (status === 'processing') {
              setScanProgress({ step: 'Analyzing URL...', progress: 60 });
            } else if (status === 'completed') {
              clearInterval(pollInterval);
              setScanProgress({ step: 'Complete', progress: 100 });
              
              // Extract results from completed test
              const test = statusData.data;
              
              setScanResult({
                type: 'url',
                threat: test.result.threatLevel,
                isPhishing: test.result.isPhishing,
                riskScore: test.result.riskScore,
                combinedRiskScore: test.result.combinedRiskScore || test.result.riskScore,
                flags: test.flags || [],
                details: {
                  domain: test.inputData.url,
                  reputation: test.details?.reputation || 0,
                  similarSites: test.details?.similarDomains || 0,
                  domainAge: test.details?.domainAge || 'Unknown',
                  registrar: test.details?.registrar || 'Unknown',
                  country: test.details?.country || 'Unknown',
                  expiryDate: test.details?.expiryDate || 'Unknown',
                  nameServers: test.details?.nameServers || [],
                  status: test.details?.status || 'Unknown',
                  privacyProtection: test.details?.privacyProtection || false,
                  lastChecked: test.details?.lastChecked || new Date().toLocaleString()
                },
                aiAnalysis: {
                  enabled: !!test.details?.aiAnalysis,
                  analysis: test.details?.aiAnalysis || null,
                  riskScore: test.details?.aiAnalysis?.riskScore || 0,
                  recommendations: test.recommendations || [],
                  insights: test.insights || 'No AI insights available'
                }
              });
              
              fetchTestHistory(); // Refresh history
              setIsScanning(false);
            } else if (status === 'failed') {
              clearInterval(pollInterval);
              throw new Error(test.lastError || 'Analysis failed');
            }
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
        }
      }, 3000); // Poll every 3 seconds

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isScanning) {
          setIsScanning(false);
          setScanResult({
            type: 'url',
            threat: 'error',
            error: 'Analysis timeout. Please try again.',
            details: { domain: url, lastChecked: new Date().toLocaleString() }
          });
        }
      }, 120000);
      
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
      setIsScanning(false);
    }
  };

  const handleEmailScan = async () => {
    if (!emailContent) return;
    setIsScanning(true);
    setScanResult(null);
    setScanProgress({ step: 'Analyzing email...', progress: 10 });
    
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
      setScanProgress({ step: 'Running ML analysis...', progress: 30 });
      const mlResponse = await fetch('http://localhost:5008/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const mlData = await mlResponse.json();
      
      if (!mlData.prediction) {
        throw new Error(mlData.error || 'ML analysis failed');
      }
      
      // Queue the analysis
      setScanProgress({ step: 'Queueing analysis...', progress: 60 });
      const queueResponse = await fetch('http://localhost:5001/api/phishing/analyze-email-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          emailData: {
            subject: emailSubject || '',
            senderEmail: senderEmail || '',
            senderDomain: senderDomain || '',
            replyTo: replyTo || '',
            hasAttachment: hasAttachment || false,
            urgentKeywords: urgentKeywords || false,
            content: emailContent
          },
          mlResult: mlData
        })
      });

      const queueData = await queueResponse.json();
      
      if (!queueData.success) {
        throw new Error(queueData.error || 'Failed to queue analysis');
      }

      const testId = queueData.data.testId;
      const queuePosition = queueData.data.queuePosition;
      
      setScanProgress({ 
        step: `Queued (Position: ${queuePosition})`, 
        progress: 70 
      });

      // Start background polling with notification
      startPolling(testId, 'phishing-email', '/Home?section=phishing');

      // Poll for results on current page
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `http://localhost:5001/api/tests/${testId}/status`,
            { credentials: 'include' }
          );
          
          const statusData = await statusResponse.json();
          
          if (statusData.success) {
            const status = statusData.data.processingStatus;
            
            if (status === 'processing') {
              setScanProgress({ step: 'Analyzing email...', progress: 85 });
            } else if (status === 'completed') {
              clearInterval(pollInterval);
              setScanProgress({ step: 'Complete', progress: 100 });
              
              // Extract results
              const test = statusData.data;
              const isPhishing = test.result.isPhishing;
              const riskScore = test.result.riskScore;
              
              setScanResult({
                type: 'email',
                threat: test.result.threatLevel,
                isPhishing: isPhishing,
                riskScore: riskScore,
                confidence: Math.round(test.result.confidence * 100),
                prediction: test.result.verdict,
                probability: riskScore / 100,
                flags: test.flags || [],
                mlAnalysis: {
                  enabled: true,
                  prediction: test.result.verdict,
                  probability: riskScore / 100,
                  confidence: test.result.confidence,
                  features: test.details?.mlPrediction?.features_used || {}
                },
                details: {
                  suspiciousLinks: test.details?.linkCount || 0,
                  suspiciousKeywords: test.details?.suspiciousKeywords || 0,
                  phishingIndicators: isPhishing ? 1 : 0,
                  contentLength: emailContent.length,
                  contentAnalysis: test.insights || '',
                  lastChecked: test.details?.lastChecked || new Date().toLocaleString(),
                  htmlTags: test.details?.htmlTags || 0,
                  specialChars: test.details?.specialChars || 0,
                  linkDensity: test.details?.linkDensity || 0
                }
              });
              
              fetchTestHistory();
              setIsScanning(false);
            } else if (status === 'failed') {
              clearInterval(pollInterval);
              throw new Error(test.lastError || 'Analysis failed');
            }
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Email scan error:', error);
      setScanResult({
        type: 'email',
        threat: 'error',
        error: `Error: ${error.message}`,
        details: {
          lastChecked: new Date().toLocaleString()
        }
      });
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
      {/* Email Threat Analysis Section */}
      <div className="email-analysis-section animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        <div className="email-analysis-header">
          <div className="email-analysis-header-content">
            <div className="email-icon-wrapper">
              <Mail size={32} className="email-icon" />
              <Brain size={20} className="ai-badge" />
            </div>
            <div className="email-header-text">
              <h2>AI-Powered Email Threat Analysis</h2>
              <p>Advanced ML detection with 97.4% accuracy • Real-time phishing identification</p>
            </div>
          </div>
        </div>

        <div className="email-input-section">
          <div className="email-input-group">
            <div className="email-textarea-wrapper">
              <textarea
                id="emailContent"
                placeholder="Paste suspicious email content here for AI-powered threat analysis..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                className="email-textarea"
                rows={5}
                disabled={isScanning}
              />
              <div className="email-input-overlay">
                <div className="input-stats">
                  <span className="char-count">{emailContent.length} characters</span>
                  <div className="security-indicators">
                    <div className="indicator active">
                      <Shield size={12} />
                      <span>ML Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleEmailScan}
              disabled={!emailContent.trim() || isScanning}
              className="email-analyze-btn"
            >
              {isScanning ? (
                <>
                  <Activity className="animate-spin" size={18} />
                  <span>Analyzing Threat Patterns...</span>
                </>
              ) : (
                <>
                  <Brain size={18} />
                  <span>Analyze Email Threat</span>
                </>
              )}
            </button>
          </div>

          {/* Advanced Options Toggle */}
          <div className="advanced-options-section">
            <button 
              type="button"
              className="advanced-toggle-btn"
              onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
            >
              <div className="toggle-content">
                <div className="toggle-icon-wrapper">
                  <Settings size={20} className="toggle-icon" />
                </div>
                <div className="toggle-text">
                  <span className="toggle-title">Advanced Threat Parameters</span>
                  <span className="toggle-subtitle">Enhanced ML accuracy with metadata analysis</span>
                </div>
              </div>
              <div className="toggle-controls">
                <span className="optional-badge">OPTIONAL</span>
                <ChevronDown className={`chevron-icon ${showAdditionalInfo ? 'rotated' : ''}`} size={20} />
              </div>
            </button>
            
            {showAdditionalInfo && (
              <div className="advanced-options-content">
                <div className="options-grid">
                  <div className="option-group">
                    <label className="option-label">
                      <FileText size={16} />
                      Subject Line Analysis
                    </label>
                    <input
                      type="text"
                      placeholder="Email subject for sentiment analysis..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="option-input"
                    />
                  </div>
                  
                  <div className="option-group">
                    <label className="option-label">
                      <Mail size={16} />
                      Sender Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="sender@suspicious-domain.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="option-input"
                    />
                  </div>
                  
                  <div className="option-group">
                    <label className="option-label">
                      <Link size={16} />
                      Sender Domain
                    </label>
                    <input
                      type="text"
                      placeholder="domain-reputation.com"
                      value={senderDomain}
                      onChange={(e) => setSenderDomain(e.target.value)}
                      className="option-input"
                    />
                  </div>
                  
                  <div className="option-group">
                    <label className="option-label">
                      <AlertTriangle size={16} />
                      Reply-To Header
                    </label>
                    <input
                      type="email"
                      placeholder="Different reply address detection"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      className="option-input"
                    />
                  </div>
                </div>
                
                <div className="behavioral-indicators">
                  <h4 className="indicators-title">
                    <Eye size={16} />
                    Behavioral Threat Indicators
                  </h4>
                  <div className="indicators-grid">
                    <label className="indicator-checkbox">
                      <input
                        type="checkbox"
                        checked={hasAttachment}
                        onChange={(e) => setHasAttachment(e.target.checked)}
                        className="checkbox-input"
                      />
                      <div className="checkbox-content">
                        <span className="checkbox-title">File Attachments Present</span>
                        <span className="checkbox-subtitle">Malware delivery risk factor</span>
                      </div>
                    </label>
                    
                    <label className="indicator-checkbox">
                      <input
                        type="checkbox"
                        checked={urgentKeywords}
                        onChange={(e) => setUrgentKeywords(e.target.checked)}
                        className="checkbox-input"
                      />
                      <div className="checkbox-content">
                        <span className="checkbox-title">Urgent Language Detected</span>
                        <span className="checkbox-subtitle">Social engineering tactics</span>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="security-notice">
                  <AlertTriangle size={16} />
                  <div className="notice-content">
                    <strong>ML Enhancement:</strong> Additional metadata improves detection accuracy by 15-20% for advanced phishing campaigns
                  </div>
                </div>
              </div>
            )}
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

      {/* Your Recent Tests */}
      <div className="threats-section animate-fade-in-up">
        <h3>
          <Clock size={20} style={{ display: 'inline', marginRight: '8px' }} />
          Your Recent Phishing Tests
        </h3>
        {isLoadingHistory ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Activity className="animate-spin" size={24} style={{ display: 'inline' }} />
            <p>Loading your test history...</p>
          </div>
        ) : testHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
            <FileText size={48} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
            <p>No phishing tests yet. Start by analyzing a URL or email above!</p>
          </div>
        ) : (
          <div className="threats-list">
            {testHistory.map((test, index) => {
              const isUrl = test.testType === 'phishing-url';
              const isEmail = test.testType === 'phishing-email';
              
              // Use AI risk score if available, otherwise use combined or traditional
              const aiRiskScore = test.details?.aiAnalysis?.riskScore;
              const riskScore = aiRiskScore || test.result?.combinedRiskScore || test.result?.riskScore || 0;
              
              // Use AI threat level if available
              const aiThreatLevel = test.details?.aiAnalysis?.threatLevel;
              const threatLevel = aiThreatLevel || test.result?.threatLevel || 'low';
              
              const target = isUrl ? test.inputData?.url : 
                            isEmail ? test.inputData?.email || 'Email Analysis' : 
                            'Unknown';
              const date = new Date(test.createdAt).toLocaleString();
              
              return (
                <div 
                  key={test._id} 
                  className="threat-item clickable" 
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => openResultModal(test)}
                  title="Click to view full details"
                >
                  {/* Unseen indicator */}
                  {!test.viewedByUser && (
                    <div 
                      className="unseen-indicator" 
                      style={{
                        position: 'absolute',
                        left: '-10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        background: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                      }}
                      title="New result - Click to view"
                    />
                  )}
                  
                  <div className="threat-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isUrl ? <Link size={16} /> : <Mail size={16} />}
                      <span className="threat-domain" style={{ 
                        maxWidth: '400px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {target}
                      </span>
                    </div>
                    <span className="threat-time">{date}</span>
                  </div>
                  <div className="threat-details" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#888' }}>
                      Risk: {riskScore}%
                    </span>
                    <div className={`threat-level threat-${threatLevel}`}>
                      {threatLevel === 'low' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                      {threatLevel.toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Result Modal */}
      <ResultModal 
        testResult={selectedTest}
        isOpen={isModalOpen}
        onClose={closeResultModal}
      >
        {selectedTest && <PhishingResultDetails testResult={selectedTest} />}
      </ResultModal>
    </div>
  );
};

export default PhishingPage;

/* Enhanced CSS for cybersecurity-themed email analysis */
const styles = `
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.threat-item.clickable:hover {
  transform: translateX(5px);
  background: rgba(255, 255, 255, 0.08);
}

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

/* Email Analysis Section Styles */
.email-analysis-section {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 16px;
  padding: 28px;
  border: 1px solid #334155;
  margin: 24px 0;
  position: relative;
  overflow: hidden;
}

.email-analysis-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6);
  opacity: 0.6;
}

.email-analysis-header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}

.email-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1));
  border-radius: 16px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.email-icon {
  color: #ef4444;
  filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.3));
}

.ai-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 50%;
  padding: 4px;
  backdrop-filter: blur(8px);
}

.email-header-text h2 {
  color: #f1f5f9;
  margin: 0 0 8px 0;
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(135deg, #f1f5f9, #cbd5e1);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.email-header-text p {
  color: #94a3b8;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.email-input-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.email-input-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.email-textarea-wrapper {
  position: relative;
}

.email-textarea {
  width: 100%;
  padding: 16px 20px 40px 20px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid #475569;
  border-radius: 12px;
  color: #f1f5f9;
  font-size: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  resize: vertical;
  min-height: 140px;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
}

.email-textarea:focus {
  outline: none;
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1), 0 0 20px rgba(239, 68, 68, 0.1);
  background: rgba(15, 23, 42, 0.95);
}

.email-textarea::placeholder {
  color: #64748b;
  font-style: italic;
}

.email-input-overlay {
  position: absolute;
  bottom: 8px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.input-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.char-count {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.security-indicators {
  display: flex;
  gap: 8px;
}

.indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.indicator.active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.email-analyze-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.email-analyze-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.email-analyze-btn:hover:not(:disabled)::before {
  left: 100%;
}

.email-analyze-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(239, 68, 68, 0.3);
}

.email-analyze-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.advanced-options-section {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid #475569;
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.advanced-toggle-btn {
  width: 100%;
  padding: 20px 24px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #f1f5f9;
}

.advanced-toggle-btn:hover {
  background: rgba(51, 65, 85, 0.3);
}

.toggle-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 10px;
}

.toggle-icon {
  color: #8b5cf6;
}

.toggle-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.toggle-title {
  font-weight: 600;
  font-size: 16px;
}

.toggle-subtitle {
  font-size: 13px;
  color: #94a3b8;
}

.toggle-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.optional-badge {
  padding: 4px 8px;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chevron-icon {
  color: #94a3b8;
  transition: transform 0.3s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.advanced-options-content {
  padding: 24px;
  border-top: 1px solid #475569;
  background: rgba(15, 23, 42, 0.5);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.option-input {
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid #475569;
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 14px;
  transition: all 0.3s ease;
}

.option-input:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.option-input::placeholder {
  color: #64748b;
}

.behavioral-indicators {
  margin-bottom: 20px;
}

.indicators-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f5f9;
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 16px;
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.indicator-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid #475569;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator-checkbox:hover {
  background: rgba(30, 41, 59, 0.8);
  border-color: #64748b;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  accent-color: #ef4444;
  margin-top: 2px;
}

.checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checkbox-title {
  color: #f1f5f9;
  font-weight: 500;
  font-size: 14px;
}

.checkbox-subtitle {
  color: #94a3b8;
  font-size: 12px;
}

.security-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 10px;
  color: #fbbf24;
}

.notice-content {
  font-size: 13px;
  line-height: 1.5;
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

  .email-analysis-header-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }

  .indicators-grid {
    grid-template-columns: 1fr;
  }

  .toggle-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toggle-controls {
    align-self: flex-end;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
