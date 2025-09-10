import React, { useState } from 'react';
import { AlertTriangle, Brain, Activity, CheckCircle, Shield, TrendingUp } from 'lucide-react';

const MLPhishingDetection = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const analyzeUrl = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:5007/api/phishing/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to connect to phishing detection service. Make sure the service is running on port 5007.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      analyzeUrl();
    }
  };

  const getThreatColor = (threatLevel) => {
    switch (threatLevel) {
      case 'safe':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getThreatIcon = (threatLevel) => {
    switch (threatLevel) {
      case 'safe':
        return <CheckCircle size={20} />;
      case 'medium':
      case 'high':
        return <AlertTriangle size={20} />;
      default:
        return <Shield size={20} />;
    }
  };

  return (
    <div className="ml-phishing-detection">
      <div className="ml-header">
        <div className="ml-header-content">
          <Brain size={32} className="ml-icon" />
          <div className="ml-header-text">
            <h2>ML-Based Phishing Detection</h2>
            <p>Advanced machine learning model trained to detect phishing URLs with high accuracy</p>
          </div>
        </div>
      </div>

      <div className="ml-input-section">
        <div className="ml-input-group">
          <input
            type="url"
            placeholder="Enter URL to analyze (e.g., https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            className="ml-input"
            disabled={isAnalyzing}
          />
          <button
            onClick={analyzeUrl}
            disabled={!url.trim() || isAnalyzing}
            className="ml-analyze-btn"
          >
            {isAnalyzing ? (
              <>
                <Activity className="animate-spin" size={16} />
                Analyzing...
              </>
            ) : (
              <>
                <Brain size={16} />
                Analyze URL
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="ml-error">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="ml-result">
          <div className="ml-result-header">
            <div className="ml-result-title">
              <h3>Analysis Results</h3>
              <div className={`ml-threat-badge ml-threat-${result.threatLevel}`}>
                {getThreatIcon(result.threatLevel)}
                {result.threatLevel.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="ml-result-content">
            {/* Main Assessment */}
            <div className="ml-assessment">
              <div className="ml-assessment-item">
                <span className="ml-label">Domain:</span>
                <span className="ml-value">{result.domain}</span>
              </div>
              <div className="ml-assessment-item">
                <span className="ml-label">Is Phishing:</span>
                <span className={`ml-value ${result.isPhishing ? 'text-red-400' : 'text-green-400'}`}>
                  {result.isPhishing ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="ml-assessment-item">
                <span className="ml-label">Risk Score:</span>
                <span className={`ml-value ${getThreatColor(result.threatLevel)}`}>
                  {result.riskScore}/100
                </span>
              </div>
              <div className="ml-assessment-item">
                <span className="ml-label">Model Confidence:</span>
                <span className="ml-value">
                  {(result.mlModel?.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Risk Score Visualization */}
            <div className="ml-risk-visualization">
              <h4>Risk Assessment</h4>
              <div className="ml-risk-bar">
                <div className="ml-risk-bar-bg">
                  <div 
                    className={`ml-risk-bar-fill ml-risk-${result.threatLevel}`}
                    style={{ width: `${result.riskScore}%` }}
                  ></div>
                </div>
                <div className="ml-risk-labels">
                  <span>Safe</span>
                  <span>Suspicious</span>
                  <span>Dangerous</span>
                </div>
              </div>
            </div>

            {/* Probability Scores */}
            {result.probability && (
              <div className="ml-probability">
                <h4>Model Predictions</h4>
                <div className="ml-prob-items">
                  <div className="ml-prob-item">
                    <span className="ml-prob-label">Phishing Probability:</span>
                    <span className="ml-prob-value text-red-400">
                      {(result.probability.phishing * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="ml-prob-item">
                    <span className="ml-prob-label">Safe Probability:</span>
                    <span className="ml-prob-value text-green-400">
                      {(result.probability.safe * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Security Flags */}
            {result.flags && result.flags.length > 0 && (
              <div className="ml-flags">
                <h4>Security Flags</h4>
                <div className="ml-flags-list">
                  {result.flags.map((flag, index) => (
                    <div key={index} className="ml-flag-item">
                      <AlertTriangle size={14} />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Domain Details */}
            {result.details && (
              <div className="ml-domain-details">
                <h4>Domain Information</h4>
                <div className="ml-details-grid">
                  <div className="ml-detail-item">
                    <span className="ml-detail-label">Reputation Score:</span>
                    <span className="ml-detail-value">{result.details.reputation}/100</span>
                  </div>
                  <div className="ml-detail-item">
                    <span className="ml-detail-label">Similar Suspicious Domains:</span>
                    <span className="ml-detail-value">{result.details.similarDomains}</span>
                  </div>
                  <div className="ml-detail-item">
                    <span className="ml-detail-label">Domain Status:</span>
                    <span className="ml-detail-value">{result.details.status}</span>
                  </div>
                  <div className="ml-detail-item">
                    <span className="ml-detail-label">Last Checked:</span>
                    <span className="ml-detail-value">{result.details.lastChecked}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ML Model Info */}
            {result.mlModel && (
              <div className="ml-model-info">
                <h4>Model Information</h4>
                <div className="ml-model-details">
                  <div className="ml-model-item">
                    <span className="ml-model-label">Algorithm:</span>
                    <span className="ml-model-value">{result.mlModel.name}</span>
                  </div>
                  <div className="ml-model-item">
                    <span className="ml-model-label">Features Analyzed:</span>
                    <span className="ml-model-value">{result.mlModel.features}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .ml-phishing-detection {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #2a2a4a;
          margin: 20px 0;
        }

        .ml-header {
          margin-bottom: 24px;
        }

        .ml-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ml-icon {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.1);
          padding: 12px;
          border-radius: 12px;
          width: 56px;
          height: 56px;
        }

        .ml-header-text h2 {
          color: #e2e8f0;
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .ml-header-text p {
          color: #94a3b8;
          margin: 0;
          font-size: 14px;
        }

        .ml-input-section {
          margin-bottom: 24px;
        }

        .ml-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .ml-input {
          flex: 1;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid #334155;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          transition: all 0.2s;
        }

        .ml-input:focus {
          outline: none;
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
        }

        .ml-analyze-btn {
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
        }

        .ml-analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }

        .ml-analyze-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ml-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #fca5a5;
          margin-bottom: 24px;
        }

        .ml-result {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid #334155;
          border-radius: 12px;
          overflow: hidden;
        }

        .ml-result-header {
          padding: 20px;
          border-bottom: 1px solid #334155;
        }

        .ml-result-title {
          display: flex;
          justify-content: between;
          align-items: center;
        }

        .ml-result-title h3 {
          color: #e2e8f0;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .ml-threat-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-left: auto;
        }

        .ml-threat-safe {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .ml-threat-medium {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .ml-threat-high {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .ml-result-content {
          padding: 20px;
        }

        .ml-assessment {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .ml-assessment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 8px;
        }

        .ml-label {
          color: #94a3b8;
          font-size: 14px;
        }

        .ml-value {
          color: #e2e8f0;
          font-weight: 500;
        }

        .ml-risk-visualization {
          margin-bottom: 24px;
        }

        .ml-risk-visualization h4 {
          color: #e2e8f0;
          margin: 0 0 12px 0;
          font-size: 16px;
        }

        .ml-risk-bar {
          margin-bottom: 8px;
        }

        .ml-risk-bar-bg {
          width: 100%;
          height: 8px;
          background: rgba(51, 65, 85, 0.6);
          border-radius: 4px;
          overflow: hidden;
        }

        .ml-risk-bar-fill {
          height: 100%;
          transition: width 0.8s ease;
          border-radius: 4px;
        }

        .ml-risk-safe {
          background: linear-gradient(90deg, #22c55e, #16a34a);
        }

        .ml-risk-medium {
          background: linear-gradient(90deg, #f59e0b, #d97706);
        }

        .ml-risk-high {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .ml-risk-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .ml-probability, .ml-flags, .ml-domain-details, .ml-model-info {
          margin-bottom: 24px;
        }

        .ml-probability h4, .ml-flags h4, .ml-domain-details h4, .ml-model-info h4 {
          color: #e2e8f0;
          margin: 0 0 12px 0;
          font-size: 16px;
        }

        .ml-prob-items {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .ml-prob-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 6px;
        }

        .ml-prob-label {
          color: #94a3b8;
          font-size: 14px;
        }

        .ml-prob-value {
          font-weight: 600;
        }

        .ml-flags-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ml-flag-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 6px;
          color: #fca5a5;
          font-size: 14px;
        }

        .ml-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .ml-detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 6px;
        }

        .ml-detail-label {
          color: #94a3b8;
          font-size: 14px;
        }

        .ml-detail-value {
          color: #e2e8f0;
          font-weight: 500;
        }

        .ml-model-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .ml-model-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 6px;
        }

        .ml-model-label {
          color: #93c5fd;
          font-size: 14px;
        }

        .ml-model-value {
          color: #dbeafe;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .ml-input-group {
            flex-direction: column;
          }

          .ml-input {
            width: 100%;
          }

          .ml-analyze-btn {
            width: 100%;
            justify-content: center;
          }

          .ml-assessment {
            grid-template-columns: 1fr;
          }

          .ml-details-grid {
            grid-template-columns: 1fr;
          }

          .ml-model-details {
            grid-template-columns: 1fr;
          }

          .ml-prob-items {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MLPhishingDetection;