import React from 'react';
import { AlertTriangle, CheckCircle, Globe, Calendar, Shield, TrendingUp, Flag, Lightbulb } from 'lucide-react';
import './ResultDetails.css';

const PhishingResultDetails = ({ testResult }) => {
  const { result, details, inputData } = testResult;
  
  // Debug: Log the data structure
  console.log('📊 PhishingResultDetails - Full testResult:', testResult);
  console.log('📊 Result object:', result);
  console.log('📊 Details object:', details);  console.log('📧 InputData object:', inputData);
  console.log('📧 Email content exists?', !!inputData?.content);
  console.log('📧 Email content value:', inputData?.content);
  
  // Extract individual scores for breakdown
  // Handle both old and new data structures
  // Old data: details might be undefined
  // New data: details.aiAnalysis.riskScore exists
  const aiRiskScore = details?.aiAnalysis?.riskScore || 
                      details?.aiRiskScore ||  // Fallback for old structure
                      testResult?.aiRiskScore ||  // Top-level fallback
                      null;
  const traditionalRiskScore = result?.riskScore || null;
  const combinedRiskScore = result?.combinedRiskScore || null;
  
  // Main display score - Show what the user sees in the analysis result
  // Priority: AI score (85) > Combined (40) > Traditional (10)
  // If AI score exists, ALWAYS use it (this matches the "AI Risk Score 85/100" display)
  const mainRiskScore = Math.round((aiRiskScore || combinedRiskScore || traditionalRiskScore || 0) * 100) / 100; // Round to 2 decimals
  
  // Extract threat level - prioritize AI analysis threat level
  const threatLevel = details?.aiAnalysis?.threatLevel || 
                      result?.threatLevel || 
                      (mainRiskScore > 70 ? 'high' : mainRiskScore > 40 ? 'medium' : 'low');
  
  console.log('📊 Extracted values:', { 
    mainRiskScore, 
    threatLevel,
    aiRiskScore,
    traditionalRiskScore,
    combinedRiskScore,
    hasAiAnalysis: !!details?.aiAnalysis
  });
  
  const getRiskColor = (score) => {
    if (score <= 30) return '#4ade80';
    if (score <= 70) return '#fbbf24';
    return '#ef4444';
  };
  
  // Determine if it's phishing based on multiple indicators
  const isPhishing = result?.isPhishing || 
                     threatLevel === 'high' ||
                     mainRiskScore > 70;
  
  const getThreatIcon = () => {
    if (isPhishing) {
      return <AlertTriangle size={48} style={{ color: '#ef4444' }} />;
    }
    return <CheckCircle size={48} style={{ color: '#4ade80' }} />;
  };
  
  return (
    <div className="result-details">
      {/* Overall Status */}
      <div className="result-status-card">
        <div className="status-icon">
          {getThreatIcon()}
        </div>
        <div className="status-info">
          <h3 className={isPhishing ? 'threat' : 'safe'}>
            {isPhishing ? 'PHISHING DETECTED' : 'APPEARS SAFE'}
          </h3>
          <p className="status-subtitle">
            {isPhishing 
              ? 'This appears to be a phishing attempt. Do not enter credentials.'
              : 'No immediate threats detected, but always stay cautious.'}
          </p>
        </div>
      </div>
      
      {/* Risk Score */}
      <div className="risk-score-section">
        <div className="risk-score-header">
          <TrendingUp size={20} />
          <span>Risk Assessment</span>
        </div>
        <div className="risk-score-display">
          <div 
            className="risk-score-circle"
            style={{ 
              background: `conic-gradient(${getRiskColor(mainRiskScore)} ${mainRiskScore * 3.6}deg, rgba(255,255,255,0.1) 0deg)`
            }}
          >
            <div className="risk-score-inner">
              <span className="risk-score-value" style={{ color: getRiskColor(mainRiskScore) }}>
                {mainRiskScore}
              </span>
              <span className="risk-score-label">/ 100</span>
            </div>
          </div>
          <div className="risk-score-info">
            <div className="risk-level">
              Threat Level: <span className={`level-${threatLevel}`}>
                {threatLevel.toUpperCase()}
              </span>
            </div>
            {(result?.confidence || details?.aiAnalysis?.confidence) && (
              <div className="confidence">
                Confidence: {Math.round((result?.confidence || details?.aiAnalysis?.confidence) * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Score Breakdown */}
      {(aiRiskScore || traditionalRiskScore || combinedRiskScore) && (
        <div className="info-section">
          <div className="info-header">
            <TrendingUp size={20} />
            <span>Score Breakdown</span>
          </div>
          <div className="info-grid">
            {aiRiskScore && (
              <div className="info-item">
                <span className="info-label">AI Analysis Score:</span>
                <span className="info-value" style={{ color: getRiskColor(aiRiskScore), fontWeight: 'bold' }}>
                  {aiRiskScore}/100
                </span>
              </div>
            )}
            {traditionalRiskScore && (
              <div className="info-item">
                <span className="info-label">Traditional Analysis:</span>
                <span className="info-value" style={{ color: getRiskColor(traditionalRiskScore), fontWeight: 'bold' }}>
                  {traditionalRiskScore}/100
                </span>
              </div>
            )}
            {combinedRiskScore && (
              <div className="info-item">
                <span className="info-label">Combined Score:</span>
                <span className="info-value" style={{ color: getRiskColor(combinedRiskScore), fontWeight: 'bold' }}>
                  {combinedRiskScore}/100
                </span>
              </div>
            )}
            {details?.reputation !== undefined && (
              <div className="info-item">
                <span className="info-label">Domain Reputation:</span>
                <span className="info-value" style={{ color: getRiskColor(100 - details.reputation), fontWeight: 'bold' }}>
                  {details.reputation}/100
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Target Information */}
      <div className="info-section">
        <div className="info-header">
          <Globe size={20} />
          <span>Target Information</span>
        </div>
        <div className="info-grid">
          {inputData?.url && (
            <div className="info-item">
              <span className="info-label">URL:</span>
              <span className="info-value url-value">{inputData.url}</span>
            </div>
          )}
          {inputData?.emailSubject && (
            <div className="info-item">
              <span className="info-label">Email Subject:</span>
              <span className="info-value">{inputData.emailSubject}</span>
            </div>
          )}
          {inputData?.senderEmail && (
            <div className="info-item">
              <span className="info-label">Sender:</span>
              <span className="info-value">{inputData.senderEmail}</span>
            </div>
          )}
          {inputData?.content && (
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <span className="info-label">Email Content:</span>
              <div style={{ 
                marginTop: '8px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                maxHeight: '200px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#e5e7eb'
              }}>
                {inputData.content}
                {console.log('📧 Email content in modal:', inputData.content)}
              </div>
            </div>
          )}
          {details?.domainAge && (
            <div className="info-item">
              <span className="info-label">Domain Age:</span>
              <span className="info-value">{details.domainAge}</span>
            </div>
          )}
          {details?.registrar && (
            <div className="info-item">
              <span className="info-label">Registrar:</span>
              <span className="info-value">{details.registrar}</span>
            </div>
          )}
          {details?.country && (
            <div className="info-item">
              <span className="info-label">Country:</span>
              <span className="info-value">{details.country}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Security Flags */}
      {testResult.flags && testResult.flags.length > 0 && (
        <div className="flags-section">
          <div className="flags-header">
            <Flag size={20} />
            <span>Security Flags</span>
          </div>
          <div className="flags-list">
            {testResult.flags.map((flag, index) => (
              <div key={index} className="flag-item">
                <AlertTriangle size={16} />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recommendations */}
      {testResult.recommendations && testResult.recommendations.length > 0 && (
        <div className="recommendations-section">
          <div className="recommendations-header">
            <Shield size={20} />
            <span>Recommendations</span>
          </div>
          <div className="recommendations-list">
            {testResult.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <CheckCircle size={16} />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* AI Insights */}
      {testResult.insights && (
        <div className="insights-section">
          <div className="insights-header">
            <Lightbulb size={20} />
            <span>AI Insights</span>
          </div>
          <p className="insights-text">{testResult.insights}</p>
        </div>
      )}
      
      {/* Processing Time */}
      {testResult.processingTime && (
        <div className="processing-time">
          <Calendar size={16} />
          <span>Analysis completed in {(testResult.processingTime / 1000).toFixed(2)}s</span>
        </div>
      )}
    </div>
  );
};

export default PhishingResultDetails;
