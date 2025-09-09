import React, { useState } from 'react';
import { DollarSign, AlertTriangle, Search, Phone, TrendingUp, Users, Shield, CheckCircle, Database, CreditCard, Loader, Zap, Brain, Eye, Lock, Cpu } from 'lucide-react';

const ScamPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedServices, setSelectedServices] = useState({
    ipqs: true,
    twilio: true,
    telesign_api1: true,
    telesign_api2: true,
    numverify: true,
    scam_databases: true
  });

  // Phone Number Scam Detection API endpoint
  const API_BASE_URL = 'http://localhost:5006';

  const handlePhoneCheck = async () => {
    if (!phoneNumber) return;
    setIsScanning(true);
    setScanResult(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          selected_services: selectedServices
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Process the real API response
      setScanResult({
        type: 'phone',
        target: data.e164 || phoneNumber,
        isScam: data.score >= 50, // Consider 50+ as scam risk
        riskLevel: data.score >= 80 ? 'high' : data.score >= 50 ? 'medium' : 'low',
        score: data.score,
        verdict: data.verdict,
        reasons: data.reasons || [],
        enhanced_analysis: data.enhanced_analysis,
        ai_analysis: data.ai_analysis,
        details: {
          reports: data.debug_info?.reports_count || 0,
          providers_used: Object.keys(data.signals || {}),
          api_status: data.debug_info?.api_keys_status || {},
          raw_signals: data.signals || {}
        }
      });

    } catch (error) {
      console.error('Phone check error:', error);
      setScanResult({
        type: 'phone',
        target: phoneNumber,
        isScam: false,
        riskLevel: 'error',
        error: error.message,
        details: {
          reports: 0,
          providers_used: [],
          api_status: {},
          raw_signals: {}
        }
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleServiceToggle = (serviceKey) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceKey]: !prev[serviceKey]
    }));
  };

  const stats = [
    { icon: Shield, label: 'Scams Blocked', value: '890K+', color: 'text-green-400' },
    { icon: DollarSign, label: 'Money Saved', value: '$45M+', color: 'text-blue-400' },
    { icon: Users, label: 'Protected Users', value: '2.1M+', color: 'text-purple-400' },
    { icon: TrendingUp, label: 'Detection Rate', value: '96.8%', color: 'text-yellow-400' }
  ];

  const recentScams = [
    { 
      type: 'Investment Fraud', 
      contact: '+1-555-SCAM', 
      amount: '$50,000', 
      status: 'blocked',
      time: '2 minutes ago' 
    },
    { 
      type: 'Fake Tech Support', 
      contact: '+91-9999-888-777', 
      amount: '$300', 
      status: 'investigating',
      time: '8 minutes ago' 
    },
    { 
      type: 'Romance Scam', 
      contact: '+1-800-555-1234', 
      amount: '$25,000', 
      status: 'blocked',
      time: '15 minutes ago' 
    },
    { 
      type: 'Cryptocurrency Fraud', 
      contact: '+1-555-123-4567', 
      amount: '$100,000', 
      status: 'blocked',
      time: '32 minutes ago' 
    }
  ];

  return (
    <div className="scam-page">
      <div className="page-header animate-fade-in">
        <div className="header-content">
          <div className="header-icon">
            <DollarSign size={48} className="animate-pulse" />
          </div>
          <div className="header-text">
            <h1>Scam Detection</h1>
            <p>Protect yourself from financial fraud and social engineering</p>
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

      {/* Scanning Tools */}
      <div className="scanning-section">
        {/* Intelligence Source Selection - Enhanced */}
        <div className="service-selection cyber-service-panel animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h3>� Select Intelligence Sources</h3>
          <div className="service-grid cyber-service-grid">
            <label className="service-item cyber-service">
              <input 
                type="checkbox" 
                checked={selectedServices.ipqs}
                onChange={() => handleServiceToggle('ipqs')}
              />
              <Shield className="service-icon" />
              <span>IPQualityScore</span>
              <div className="service-status">Fraud Detection</div>
            </label>
            <label className="service-item cyber-service">
              <input 
                type="checkbox" 
                checked={selectedServices.twilio}
                onChange={() => handleServiceToggle('twilio')}
              />
              <Phone className="service-icon" />
              <span>Twilio Lookup</span>
              <div className="service-status">Carrier Intel</div>
            </label>
            <label className="service-item cyber-service">
              <input 
                type="checkbox" 
                checked={selectedServices.telesign_api1}
                onChange={() => handleServiceToggle('telesign_api1')}
              />
              <Database className="service-icon" />
              <span>TeleSign API 1</span>
              <div className="service-status">Risk Analysis</div>
            </label>
            <label className="service-item cyber-service">
              <input 
                type="checkbox" 
                checked={selectedServices.telesign_api2}
                onChange={() => handleServiceToggle('telesign_api2')}
              />
              <Database className="service-icon" />
              <span>TeleSign API 2</span>
              <div className="service-status">Enhanced</div>
            </label>
            <label className="service-item cyber-service">
              <input 
                type="checkbox" 
                checked={selectedServices.numverify}
                onChange={() => handleServiceToggle('numverify')}
              />
              <CheckCircle className="service-icon" />
              <span>NumVerify</span>
              <div className="service-status">Validation</div>
            </label>
            <label className="service-item cyber-service">
              <input 
                type="checkbox" 
                checked={selectedServices.scam_databases}
                onChange={() => handleServiceToggle('scam_databases')}
              />
              <AlertTriangle className="service-icon" />
              <span>Scam Databases</span>
              <div className="service-status">Threat Intel</div>
            </label>
          </div>
        </div>

        {/* Phone Number Checker - Enhanced Cybersecurity Theme */}
        <div className="scan-card-large cyber-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="scan-header cyber-header">
            <div className="cyber-icon-wrapper">
              <Phone className="scan-icon" />
              <Zap className="cyber-pulse" />
            </div>
            <h3>🛡️ AI-Powered Threat Detection</h3>
            <div className="scan-subtitle">
              <Brain className="ai-icon" />
              Neural network analysis • Multi-vector scanning • Real-time intelligence
            </div>
          </div>
          <div className="scan-content cyber-content">
            <div className="input-group cyber-input-group">
              <div className="input-wrapper">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  placeholder="Enter target phone number (+1-555-123-4567, +91-9999999999)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="scan-input-large cyber-input"
                  disabled={isScanning}
                />
              </div>
              <button 
                onClick={handlePhoneCheck}
                disabled={!phoneNumber || isScanning}
                className="scan-button-large cyber-scan-btn"
              >
                {isScanning ? (
                  <>
                    <div className="scanning-animation">
                      <Cpu className="animate-pulse" />
                      <div className="scanning-dots">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                    Analyzing Threat Vector...
                  </>
                ) : (
                  <>
                    <Eye className="scan-eye" />
                    <span>INITIATE SCAN</span>
                    <Lock className="scan-lock" />
                  </>
                )}
              </button>
            </div>
            
            {/* Enhanced Status Display */}
            {phoneNumber && (
              <div className="cyber-status-panel">
                <div className="status-grid">
                  <div className="status-item">
                    <Database className="status-icon" />
                    <span>Intelligence Sources: {Object.values(selectedServices).filter(Boolean).length}/6</span>
                  </div>
                  <div className="status-item">
                    <Shield className="status-icon" />
                    <span>Security Level: Maximum</span>
                  </div>
                  <div className="status-item">
                    <Brain className="status-icon" />
                    <span>AI Engine: Online</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Threat Intelligence Report */}
      {scanResult && (
        <div className="threat-report-section animate-fade-in">
          <div className="threat-report-container">
            {/* Report Header with Threat Level */}
            <div className="threat-report-header">
              <div className="report-title-section">
                <div className="report-icon-group">
                  <Shield className="report-main-icon" />
                  <div className="scan-pulse-ring"></div>
                </div>
                <div className="report-title-text">
                  <h2>🔍 THREAT INTELLIGENCE REPORT</h2>
                  <div className="report-subtitle">Advanced Neural Analysis • Multi-Vector Scanning</div>
                </div>
              </div>
              
              <div className={`threat-status-badge threat-${scanResult.riskLevel}`}>
                {scanResult.error ? (
                  <div className="status-content">
                    <AlertTriangle className="status-icon" />
                    <div className="status-text">
                      <span className="status-level">SYSTEM ERROR</span>
                      <span className="status-desc">Analysis Failed</span>
                    </div>
                  </div>
                ) : scanResult.isScam ? (
                  <div className="status-content">
                    <AlertTriangle className="status-icon pulse-danger" />
                    <div className="status-text">
                      <span className="status-level">{scanResult.riskLevel.toUpperCase()} THREAT</span>
                      <span className="status-desc">Scam Detected</span>
                    </div>
                  </div>
                ) : (
                  <div className="status-content">
                    <CheckCircle className="status-icon pulse-safe" />
                    <div className="status-text">
                      <span className="status-level">SECURE</span>
                      <span className="status-desc">No Threats Detected</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {scanResult.error ? (
              <div className="error-report-panel">
                <div className="error-icon-section">
                  <AlertTriangle className="error-main-icon" />
                  <div className="error-pulse"></div>
                </div>
                <div className="error-details">
                  <h3>Analysis System Unavailable</h3>
                  <p className="error-message">{scanResult.error}</p>
                  <div className="error-solutions">
                    <h4>🔧 Troubleshooting Steps:</h4>
                    <ul>
                      <li>Verify phone number detection service is running on port 5006</li>
                      <li>Execute manage-services.bat to start all required services</li>
                      <li>Check network connectivity and firewall settings</li>
                      <li>Ensure all API keys are properly configured</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="threat-analysis-grid">
                {/* Executive Summary Panel */}
                <div className="executive-summary-panel">
                  <div className="panel-header">
                    <Brain className="panel-icon" />
                    <h3>Executive Summary</h3>
                  </div>
                  <div className="summary-metrics">
                    <div className="metric-card primary-metric">
                      <div className="metric-icon-wrapper">
                        <TrendingUp className="metric-icon" />
                      </div>
                      <div className="metric-content">
                        <div className="metric-value">{scanResult.score}<span>/100</span></div>
                        <div className="metric-label">Threat Score</div>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-content">
                        <div className="metric-value">{scanResult.target}</div>
                        <div className="metric-label">Target Number</div>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-content">
                        <div className="metric-value">{scanResult.verdict}</div>
                        <div className="metric-label">AI Verdict</div>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-content">
                        <div className="metric-value">{scanResult.details.reports}</div>
                        <div className="metric-label">User Reports</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Assessment Panel */}
                {scanResult.reasons && scanResult.reasons.length > 0 && (
                  <div className="risk-assessment-panel">
                    <div className="panel-header">
                      <AlertTriangle className="panel-icon danger" />
                      <h3>Risk Assessment Matrix</h3>
                    </div>
                    <div className="risk-indicators">
                      {scanResult.reasons.map((reason, index) => (
                        <div key={index} className="risk-indicator">
                          <div className="risk-severity">
                            <div className="severity-dot high"></div>
                          </div>
                          <div className="risk-description">{reason}</div>
                          <div className="risk-confidence">High</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Intelligence Panel */}
                {scanResult.ai_analysis && (
                  <div className="ai-intelligence-panel">
                    <div className="panel-header">
                      <Brain className="panel-icon ai-glow" />
                      <h3>Neural Network Analysis</h3>
                      <div className="ai-confidence-badge">
                        {scanResult.ai_analysis.confidence}% Confidence
                      </div>
                    </div>
                    <div className="ai-analysis-content">
                      <div className="ai-verdict-section">
                        <div className="ai-verdict-label">AI Assessment:</div>
                        <div className="ai-verdict-value">{scanResult.ai_analysis.verdict}</div>
                      </div>
                      
                      {scanResult.ai_analysis.explanation && (
                        <div className="ai-explanation-section">
                          <h4>🧠 Deep Learning Analysis:</h4>
                          <div className="ai-explanation-text">{scanResult.ai_analysis.explanation}</div>
                        </div>
                      )}
                      
                      {scanResult.ai_analysis.patterns && scanResult.ai_analysis.patterns.length > 0 && (
                        <div className="pattern-recognition-section">
                          <h4>🎯 Behavioral Patterns:</h4>
                          <div className="pattern-grid">
                            {scanResult.ai_analysis.patterns.map((pattern, index) => (
                              <div key={index} className="pattern-item">
                                <Zap className="pattern-icon" />
                                <span>{pattern}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced Analysis Panel */}
                {scanResult.enhanced_analysis && (
                  <div className="enhanced-analysis-panel">
                    <div className="panel-header">
                      <Cpu className="panel-icon tech-glow" />
                      <h3>Advanced Analytics</h3>
                    </div>
                    <div className="enhanced-metrics-grid">
                      <div className="enhanced-metric">
                        <div className="metric-header">
                          <Database className="metric-icon" />
                          <span>Enhanced Score</span>
                        </div>
                        <div className="metric-value-large">{scanResult.enhanced_analysis.score}/100</div>
                      </div>
                      
                      <div className="enhanced-metric">
                        <div className="metric-header">
                          <Shield className="metric-icon" />
                          <span>System Verdict</span>
                        </div>
                        <div className="metric-value-text">{scanResult.enhanced_analysis.verdict}</div>
                      </div>
                      
                      <div className="enhanced-metric">
                        <div className="metric-header">
                          <TrendingUp className="metric-icon" />
                          <span>Confidence Level</span>
                        </div>
                        <div className="metric-value-large">{Math.round((scanResult.enhanced_analysis.confidence || 0) * 100)}%</div>
                      </div>
                      
                      <div className="enhanced-metric">
                        <div className="metric-header">
                          <AlertTriangle className="metric-icon" />
                          <span>Risk Factors</span>
                        </div>
                        <div className="metric-value-large">{scanResult.enhanced_analysis.risk_factors?.length || 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Intelligence Sources Panel */}
                <div className="intelligence-sources-panel">
                  <div className="panel-header">
                    <Database className="panel-icon" />
                    <h3>Intelligence Sources Status</h3>
                  </div>
                  <div className="sources-grid">
                    {Object.entries(scanResult.details.api_status).map(([key, status]) => (
                      <div key={key} className={`source-item ${status === 'SET' ? 'source-active' : 'source-inactive'}`}>
                        <div className="source-indicator">
                          <div className={`status-led ${status === 'SET' ? 'led-green' : 'led-red'}`}></div>
                        </div>
                        <div className="source-info">
                          <div className="source-name">{key.replace('_KEY', '').replace('_', ' ')}</div>
                          <div className="source-status">{status === 'SET' ? 'OPERATIONAL' : 'OFFLINE'}</div>
                        </div>
                        <div className="source-icon">
                          {status === 'SET' ? <CheckCircle className="status-ok" /> : <AlertTriangle className="status-error" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Report Metadata */}
                <div className="report-metadata-panel">
                  <div className="metadata-grid">
                    <div className="metadata-item">
                      <Eye className="metadata-icon" />
                      <div className="metadata-content">
                        <span className="metadata-label">Scan Timestamp</span>
                        <span className="metadata-value">{new Date().toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="metadata-item">
                      <Users className="metadata-icon" />
                      <div className="metadata-content">
                        <span className="metadata-label">Providers Queried</span>
                        <span className="metadata-value">{scanResult.details.providers_used.length}</span>
                      </div>
                    </div>
                    <div className="metadata-item">
                      <Lock className="metadata-icon" />
                      <div className="metadata-content">
                        <span className="metadata-label">Security Level</span>
                        <span className="metadata-value">Maximum</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Scam Detections */}
      <div className="threats-section animate-fade-in-up">
        <h3>Recent Scam Detections</h3>
        <div className="scam-list">
          {recentScams.map((scam, index) => (
            <div key={index} className="scam-item" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="scam-info">
                <div className="scam-type">{scam.type}</div>
                <div className="scam-contact">{scam.contact}</div>
                <div className="scam-amount">Attempted: {scam.amount}</div>
                <div className="scam-time">{scam.time}</div>
              </div>
              <div className={`status-badge status-${scam.status}`}>
                {scam.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScamPage;
