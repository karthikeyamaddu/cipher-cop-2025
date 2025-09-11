import React, { useState } from 'react';
import { Copy, Search, Globe, AlertTriangle, CheckCircle, TrendingUp, Users, Upload, Eye, FileImage, X, Brain, Cpu } from 'lucide-react';

const ClonePage = () => {
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisType, setAnalysisType] = useState('combined'); // 'ai', 'ml', 'combined'

  // API Configuration
  const API_ENDPOINTS = {
    ai: 'http://localhost:5003/analyze',
    ml: {
      upload: 'http://localhost:5000/upload',
      detect: 'http://localhost:5000/detect'
    }
  };

  // Helper function to extract and clean explanation text from AI responses
  const extractExplanation = (explanation) => {
    if (!explanation) return '';
    
    try {
      // Remove code fences if present
      let cleanText = explanation.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.explanation || cleanText;
      }
    } catch (e) {
      // If parsing fails, return the original text cleaned up
    }
    
    // Clean up the text by removing incomplete JSON
    return explanation.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/\{[\s\S]*$/, '').trim();
  };

  // Helper function to normalize ML response data structure
  const normalizeMlResponse = (data) => {
    // Handle both old and new response formats
    if (data.result !== undefined) {
      // New format from /detect endpoint
      return {
        result: data.result,
        matched_brand: data.matched_brand,
        confidence: data.confidence,
        correct_domain: data.correct_domain,
        detection_time: data.detection_time,
        logo_extraction: data.logo_extraction,
        error: data.error
      };
    } else if (data.isPhishing !== undefined) {
      // Old format from /analyze endpoint  
      return {
        result: data.isPhishing ? 'Phishing' : 'Benign',
        matched_brand: data.brand,
        confidence: data.confidence,
        correct_domain: data.legitUrl?.replace('https://', '').replace('http://', ''),
        detection_time: null,
        logo_extraction: null
      };
    }
    return data;
  };

  // Helper function to normalize AI response data structure  
  const normalizeAiResponse = (data) => {
    return {
      decision: data.decision,
      score: data.score,
      advice: data.advice,
      explanation: data.explanation,
      signals: data.signals
    };
  };

  // Helper function to extract ML data from integrated AI response
  const extractMlFromAiResponse = (aiData) => {
    const mlData = aiData.signals?.ml_phishpedia;
    if (!mlData) {
      return {
        result: 'Unknown',
        matched_brand: 'unknown',
        confidence: 0,
        correct_domain: 'unknown',
        detection_time: '0.00'
      };
    }

    return {
      result: mlData.result || 'Unknown',
      matched_brand: mlData.matched_brand || mlData.brand || 'unknown', 
      confidence: mlData.confidence || 0,
      correct_domain: mlData.correct_domain || 'unknown',
      detection_time: mlData.detection_time || '0.00'
    };
  };

  // Main function to call both ML and AI services
  const callBothServices = async (url, imageFile) => {
    const results = {
      ml: { status: 'pending', data: null, error: null },
      ai: { status: 'pending', data: null, error: null }
    };

    // Call AI Service (now includes integrated ML analysis)
    try {
      console.log('Calling integrated AI+ML service...');
      
      let aiResponse;
      if (imageFile) {
        // Case 1: User uploaded screenshot - send to AI
        const formData = new FormData();
        formData.append('screenshot', imageFile);
        if (url && url.trim()) {
          formData.append('url', url.trim());
        }
        
        aiResponse = await fetch(API_ENDPOINTS.ai, {
          method: 'POST',
          body: formData
        });
      } else {
        // Case 2: URL-only - AI will take screenshot and run both AI+ML analysis
        aiResponse = await fetch(API_ENDPOINTS.ai, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
      }

      if (aiResponse.ok) {
        const rawData = await aiResponse.json();
        console.log('AI+ML Integrated Response:', rawData);
        
        // Extract AI results
        results.ai.data = normalizeAiResponse(rawData);
        results.ai.status = 'completed';
        
        // Extract ML results from integrated response
        const mlData = extractMlFromAiResponse(rawData);
        results.ml.data = mlData;
        results.ml.status = rawData.signals?.ml_phishpedia?.status === 'success' ? 'completed' : 
                           rawData.signals?.ml_phishpedia?.error ? 'failed' : 'completed';
        
        if (rawData.signals?.ml_phishpedia?.error) {
          results.ml.error = rawData.signals.ml_phishpedia.error;
        }
        
        console.log('AI Service completed successfully');
        console.log('ML Service results extracted from AI response');
      } else {
        const errorData = await aiResponse.json();
        results.ai.error = errorData.error || `HTTP ${aiResponse.status}`;
        results.ai.status = 'failed';
        results.ml.error = 'AI service failed - ML analysis not available';
        results.ml.status = 'failed';
      }
    } catch (error) {
      results.ai.error = error.message;
      results.ai.status = 'failed';
      results.ml.error = 'AI service failed - ML analysis not available';  
      results.ml.status = 'failed';
      console.log('AI+ML Service failed:', error.message);
    }

    return results;
  };

  // Handle URL analysis
  const handleUrlCheck = async () => {
    if (!url) return;
    setIsScanning(true);
    setScanResult(null);
    
    try {
      if (analysisType === 'combined') {
        // Call both ML and AI services
        const results = await callBothServices(url, null);
        setScanResult({
          type: 'url',
          target: url,
          analysisType,
          data: results,
          details: { lastChecked: new Date().toLocaleString() }
        });
      } else {
        // Call single service
        let response, data;
        
        if (analysisType === 'ml') {
          // ML service requires screenshot for meaningful analysis
          throw new Error('ML analysis requires a screenshot');
        } else if (analysisType === 'ai') {
          response = await fetch(API_ENDPOINTS.ai, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI analysis failed');
          }
          
          data = normalizeAiResponse(await response.json());
        }
        
        setScanResult({
          type: 'url',
          target: url,
          analysisType,
          data,
          details: { lastChecked: new Date().toLocaleString() }
        });
      }
    } catch (error) {
      console.error('URL analysis error:', error);
      setScanResult({
        type: 'url',
        target: url,
        analysisType,
        error: error.message,
        details: { lastChecked: new Date().toLocaleString() }
      });
    } finally {
      setIsScanning(false);
    }
  };

  // File validation and selection handler
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, JPEG, GIF, BMP) or PDF');
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  // URL validation helper
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Handle URL input change with validation
  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
  };

  // Handle screenshot analysis
  const handleScreenshotAnalysis = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    setScanResult(null);
    
    try {
      if (analysisType === 'combined') {
        // Call both services for screenshot analysis
        const results = await callBothServices(url, selectedFile);
        setScanResult({
          type: 'screenshot',
          target: selectedFile.name,
          analysisType,
          data: results,
          details: {
            fileSize: (selectedFile.size / 1024).toFixed(2) + ' KB',
            lastChecked: new Date().toLocaleString()
          }
        });
      } else {
        // Call single service
        let data;
        
        if (analysisType === 'ml') {
          // Use proper ML workflow: upload then detect
          const uploadFormData = new FormData();
          uploadFormData.append('image', selectedFile);
          
          const uploadResponse = await fetch(API_ENDPOINTS.ml.upload, {
            method: 'POST',
            body: uploadFormData
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: HTTP ${uploadResponse.status}`);
          }
          
          const uploadData = await uploadResponse.json();
          if (!uploadData.success) {
            throw new Error(uploadData.error || 'Image upload failed');
          }
          
          // Call detect with the uploaded image URL
          const detectResponse = await fetch(API_ENDPOINTS.ml.detect, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: url || '',
              imageUrl: uploadData.imageUrl
            })
          });

          if (!detectResponse.ok) {
            const errorData = await detectResponse.json();
            throw new Error(errorData.error || 'ML analysis failed');
          }
          
          data = normalizeMlResponse(await detectResponse.json());
          
        } else if (analysisType === 'ai') {
          // AI expects FormData
          const formData = new FormData();
          formData.append('screenshot', selectedFile);
          
          if (url && url.trim()) {
            formData.append('url', url.trim());
          }
          
          const response = await fetch(API_ENDPOINTS.ai, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI analysis failed');
          }
          
          data = normalizeAiResponse(await response.json());
        }
        
        setScanResult({
          type: 'screenshot',
          target: selectedFile.name,
          analysisType,
          data,
          details: {
            fileSize: (selectedFile.size / 1024).toFixed(2) + ' KB',
            lastChecked: new Date().toLocaleString()
          }
        });
      }
    } catch (error) {
      console.error('Screenshot analysis error:', error);
      setScanResult({
        type: 'screenshot',
        target: selectedFile.name,
        analysisType,
        error: error.message,
        details: {
          fileSize: (selectedFile.size / 1024).toFixed(2) + ' KB',
          lastChecked: new Date().toLocaleString()
        }
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Helper functions for threat level display
  const getThreatLevel = (scanResult) => {
    if (scanResult.error) return 'threat-high';
    
    if (scanResult.analysisType === 'combined') {
      const mlThreat = scanResult.data.ml.data?.result === 'Phishing';
      const aiThreat = scanResult.data.ai.data?.decision === 'clone';
      
      if (mlThreat || aiThreat) return 'threat-high';
      if (scanResult.data.ai.data?.decision === 'suspicious') return 'threat-medium';
      return 'threat-low';
    } else if (scanResult.analysisType === 'ml') {
      return scanResult.data.result === 'Phishing' ? 'threat-high' : 'threat-low';
    } else if (scanResult.analysisType === 'ai') {
      if (scanResult.data.decision === 'clone') return 'threat-high';
      if (scanResult.data.decision === 'suspicious') return 'threat-medium';
      return 'threat-low';
    }
    
    return 'threat-medium';
  };

  const getThreatIcon = (scanResult) => {
    const level = getThreatLevel(scanResult);
    if (level === 'threat-low') return <CheckCircle size={16} />;
    return <AlertTriangle size={16} />;
  };

  const getThreatText = (scanResult) => {
    if (scanResult.error) return 'ERROR';
    
    if (scanResult.analysisType === 'combined') {
      const mlThreat = scanResult.data.ml.data?.result === 'Phishing';
      const aiThreat = scanResult.data.ai.data?.decision === 'clone';
      
      if (mlThreat && aiThreat) return 'HIGH RISK - BOTH DETECTED';
      if (mlThreat || aiThreat) return 'HIGH RISK - CLONE DETECTED';
      if (scanResult.data.ai.data?.decision === 'suspicious') return 'MEDIUM RISK';
      return 'LOW RISK';
    } else if (scanResult.analysisType === 'ml') {
      return scanResult.data.result === 'Phishing' ? 'CLONE DETECTED' : 'CLEAN';
    } else if (scanResult.analysisType === 'ai') {
      if (scanResult.data.decision === 'clone') return 'CLONE DETECTED';
      if (scanResult.data.decision === 'suspicious') return 'SUSPICIOUS';
      return 'CLEAN';
    }
    
    return 'UNKNOWN';
  };

  const stats = [
    { icon: Eye, label: 'Sites Analyzed', value: '2K+', color: 'text-blue-400' },
    { icon: Copy, label: 'Clones Detected', value: '1K', color: 'text-red-400' },
    { icon: FileImage, label: 'Screenshots Processed', value: '8K+', color: 'text-green-400' },
    { icon: TrendingUp, label: 'Detection Accuracy', value: '90%', color: 'text-purple-400' }
  ];

  const recentClones = [
    { 
      original: 'paypal.com', 
      clone: 'paypaI-security.com', 
      similarity: 94, 
      status: 'blocked',
      time: '5 minutes ago' 
    },
    { 
      original: 'microsoft.com', 
      clone: 'microsft-update.net', 
      similarity: 87, 
      status: 'investigating',
      time: '12 minutes ago' 
    },
    { 
      original: 'google.com', 
      clone: 'goog1e-login.org', 
      similarity: 91, 
      status: 'blocked',
      time: '28 minutes ago' 
    },
    { 
      original: 'facebook.com', 
      clone: 'faceb00k-verify.com', 
      similarity: 89, 
      status: 'blocked',
      time: '45 minutes ago' 
    }
  ];

  return (
    <div className="clone-page">
      <div className="page-header animate-fade-in">
        <div className="header-content">
          <div className="header-icon">
            <Copy size={48} className="animate-spin-slow" />
          </div>
          <div className="header-text">
            <h1>Clone Detection</h1>
            <p>Identify and prevent website and application cloning</p>
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
        {/* Analysis Type Selector - Compact */}
        <div className="analysis-selector-compact" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          padding: '12px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <label htmlFor="analysis-type" style={{
            color: '#e2e8f0',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: 'fit-content'
          }}>Analysis Method:</label>
          <select 
            id="analysis-type"
            value={analysisType} 
            onChange={(e) => setAnalysisType(e.target.value)}
            className="analysis-select"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#fff',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '200px'
            }}
          >
            <option value="combined" style={{backgroundColor: '#1e293b', color: '#fff'}}>🔬 Combined (AI + ML)</option>
            <option value="ai" style={{backgroundColor: '#1e293b', color: '#fff'}}>🧠 AI Only (Gemini)</option>
            <option value="ml" style={{backgroundColor: '#1e293b', color: '#fff'}}>⚡ ML Only (Phishpedia)</option>
          </select>
        </div>

        <div className="scan-grid">
          {/* URL Clone Checker */}
          <div className="scan-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="scan-header">
              <Globe className="scan-icon" />
              <h3>Website Clone Checker</h3>
            </div>
            <div className="scan-content">
              <input
                type="url"
                placeholder="Enter website URL to check for clones"
                value={url}
                onChange={handleUrlChange}
                className="scan-input"
              />
              <button 
                onClick={handleUrlCheck}
                disabled={!url || isScanning}
                className="scan-button"
              >
                {isScanning ? (
                  <Copy className="animate-spin" />
                ) : (
                  <Search />
                )}
                {isScanning ? 'Analyzing...' : 'Analyze URL'}
              </button>
            </div>
          </div>

          {/* Screenshot Upload */}
          <div className="scan-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="scan-header">
              <FileImage className="scan-icon" />
              <h3>Screenshot Analysis</h3>
            </div>
            <div className="scan-content">
              {!selectedFile ? (
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="screenshot-input"
                    onChange={handleFileSelect}
                    className="file-input"
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="screenshot-input" className="file-upload-label">
                    <Upload size={32} />
                    <span>Upload Website Screenshot</span>
                    <small>PNG, JPG, JPEG or PDF files supported</small>
                  </label>
                </div>
              ) : (
                <div className="selected-file">
                  <div className="file-info">
                    <FileImage size={24} />
                    <div className="file-details">
                      <span className="file-name">{selectedFile.name}</span>
                      <span className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <button onClick={removeSelectedFile} className="remove-file">
                      <X size={16} />
                    </button>
                  </div>
                  <button 
                    onClick={handleScreenshotAnalysis}
                    disabled={isScanning}
                    className="scan-button"
                  >
                    {isScanning ? (
                      <Copy className="animate-spin" />
                    ) : (
                      <Search />
                    )}
                    {isScanning ? 'Analyzing...' : url ? 'Analyze URL + Screenshot' : 'Analyze Screenshot'}
                  </button>
                </div>
              )}
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
              <div className={`threat-badge ${getThreatLevel(scanResult)}`}>
                {getThreatIcon(scanResult)}
                {getThreatText(scanResult)}
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
                  {/* Combined Results Display */}
                  {scanResult.analysisType === 'combined' && (
                    <div className="combined-results">
                      <div className="service-results-grid">
                        {/* ML Results */}
                        <div className="service-result ml-result">
                          <div className="service-header">
                            <Cpu size={20} />
                            <h4>ML Analysis (Phishpedia)</h4>
                            <span className={`status-badge ${scanResult.data.ml.status}`}>
                              {scanResult.data.ml.status}
                            </span>
                          </div>
                          {scanResult.data.ml.status === 'completed' && scanResult.data.ml.data ? (
                            <div className="service-details">
                              <div className="detail-item">
                                <span className="label">Result:</span>
                                <span className={`value ${scanResult.data.ml.data.result === 'Phishing' ? 'threat' : 'safe'}`}>
                                  {scanResult.data.ml.data.result === 'Phishing' ? 'Clone Detected' : 
                                   scanResult.data.ml.data.result === 'Benign' ? 'Clean' : 
                                   scanResult.data.ml.data.result}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="label">Brand:</span>
                                <span className="value">{scanResult.data.ml.data.matched_brand || 'Unknown'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="label">Confidence:</span>
                                <span className="value">{Math.round(scanResult.data.ml.data.confidence * 100)}%</span>
                              </div>
                              {scanResult.data.ml.data.correct_domain && scanResult.data.ml.data.correct_domain !== 'unknown' && (
                                <div className="detail-item">
                                  <span className="label">Legitimate Domain:</span>
                                  <span className="value">{scanResult.data.ml.data.correct_domain}</span>
                                </div>
                              )}
                              {scanResult.data.ml.data.detection_time && (
                                <div className="detail-item">
                                  <span className="label">Detection Time:</span>
                                  <span className="value">{scanResult.data.ml.data.detection_time}s</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="service-error">
                              <p>❌ {scanResult.data.ml.error || 'Service failed'}</p>
                            </div>
                          )}
                        </div>

                        {/* AI Results */}
                        <div className="service-result ai-result">
                          <div className="service-header">
                            <Brain size={20} />
                            <h4>AI Analysis (Gemini)</h4>
                            <span className={`status-badge ${scanResult.data.ai.status}`}>
                              {scanResult.data.ai.status}
                            </span>
                          </div>
                          {scanResult.data.ai.status === 'completed' && scanResult.data.ai.data ? (
                            <div className="service-details">
                              <div className="detail-item">
                                <span className="label">Decision:</span>
                                <span className={`value ${scanResult.data.ai.data.decision === 'clone' ? 'threat' : scanResult.data.ai.data.decision === 'suspicious' ? 'warning' : 'safe'}`}>
                                  {scanResult.data.ai.data.decision || 'Unknown'}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="label">Risk Score:</span>
                                <span className="value">{scanResult.data.ai.data.score || 0}/100</span>
                              </div>
                              {scanResult.data.ai.data.signals?.brand_mismatch?.brand && (
                                <div className="detail-item">
                                  <span className="label">Detected Brand:</span>
                                  <span className="value">{scanResult.data.ai.data.signals.brand_mismatch.brand}</span>
                                </div>
                              )}
                              {scanResult.data.ai.data.advice && (
                                <div className="detail-item full-width">
                                  <span className="label">Recommendation:</span>
                                  <span className="value advice">{scanResult.data.ai.data.advice}</span>
                                </div>
                              )}
                              {scanResult.data.ai.data.explanation && (
                                <div className="detail-item full-width">
                                  <span className="label">AI Explanation:</span>
                                  <span className="value explanation">{extractExplanation(scanResult.data.ai.data.explanation)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="service-error">
                              <p>❌ {scanResult.data.ai.error || 'Service failed'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single Service Results */}
                  {scanResult.analysisType !== 'combined' && (
                    <div className="single-result">
                      {scanResult.analysisType === 'ml' && (
                        <div className="ml-single-result">
                          <div className="result-header">
                            <Cpu size={24} />
                            <h4>Phishpedia ML Analysis</h4>
                          </div>
                          <div className="result-details">
                            <div className="detail-item">
                              <span className="label">Result:</span>
                              <span className={`value ${scanResult.data.result === 'Phishing' ? 'threat' : 'safe'}`}>
                                {scanResult.data.result === 'Phishing' ? 'Clone Detected' : 
                                 scanResult.data.result === 'Benign' ? 'Clean' : 
                                 scanResult.data.result}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Brand:</span>
                              <span className="value">{scanResult.data.matched_brand || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Confidence:</span>
                              <span className="value">{Math.round(scanResult.data.confidence * 100)}%</span>
                            </div>
                            {scanResult.data.correct_domain && scanResult.data.correct_domain !== 'unknown' && (
                              <div className="detail-item">
                                <span className="label">Legitimate Domain:</span>
                                <span className="value">{scanResult.data.correct_domain}</span>
                              </div>
                            )}
                            {scanResult.data.detection_time && (
                              <div className="detail-item">
                                <span className="label">Detection Time:</span>
                                <span className="value">{scanResult.data.detection_time}s</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {scanResult.analysisType === 'ai' && (
                        <div className="ai-single-result">
                          <div className="result-header">
                            <Brain size={24} />
                            <h4>Gemini AI Analysis</h4>
                          </div>
                          <div className="result-details">
                            <div className="detail-item">
                              <span className="label">Decision:</span>
                              <span className={`value ${scanResult.data.decision === 'clone' ? 'threat' : scanResult.data.decision === 'suspicious' ? 'warning' : 'safe'}`}>
                                {scanResult.data.decision || 'Unknown'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Risk Score:</span>
                              <span className="value">{scanResult.data.score || 0}/100</span>
                            </div>
                            {scanResult.data.signals?.brand_mismatch?.brand && (
                              <div className="detail-item">
                                <span className="label">Detected Brand:</span>
                                <span className="value">{scanResult.data.signals.brand_mismatch.brand}</span>
                              </div>
                            )}
                            {scanResult.data.advice && (
                              <div className="detail-item full-width">
                                <span className="label">Recommendation:</span>
                                <span className="value advice">{scanResult.data.advice}</span>
                              </div>
                            )}
                            {scanResult.data.explanation && (
                              <div className="detail-item full-width">
                                <span className="label">AI Explanation:</span>
                                <span className="value explanation">{extractExplanation(scanResult.data.explanation)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Common Details */}
                  <div className="scan-metadata">
                    <div className="metadata-item">
                      <span className="label">Target:</span>
                      <span className="value">{scanResult.target}</span>
                    </div>
                    {scanResult.details.fileSize && (
                      <div className="metadata-item">
                        <span className="label">File Size:</span>
                        <span className="value">{scanResult.details.fileSize}</span>
                      </div>
                    )}
                    <div className="metadata-item">
                      <span className="label">Last Checked:</span>
                      <span className="value">{scanResult.details.lastChecked}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Clone Detections */}
      <div className="threats-section animate-fade-in-up">
        <h3>Recent Clone Detections</h3>
        <div className="clone-list">
          {recentClones.map((clone, index) => (
            <div key={index} className="clone-item" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="clone-info">
                <div className="clone-details">
                  <span className="original-site">Original: {clone.original}</span>
                  <span className="clone-site">Clone: {clone.clone}</span>
                  <span className="clone-time">{clone.time}</span>
                </div>
                <div className="similarity-mini">
                  <span>{clone.similarity}% similar</span>
                  <div className="mini-bar">
                    <div 
                      className="mini-fill" 
                      style={{ 
                        width: `${clone.similarity}%`,
                        background: clone.similarity > 90 ? '#ef4444' : '#f59e0b'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className={`status-badge status-${clone.status}`}>
                {clone.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClonePage;
