import React from 'react';
import { X, AlertTriangle, CheckCircle, Shield, Globe, FileImage, Brain, Cpu, Clock, TrendingUp } from 'lucide-react';
import './ResultModal.css';

const CloneResultModal = ({ testResult, isOpen, onClose }) => {
  if (!isOpen || !testResult) return null;

  const { result, details, inputData, tags, createdAt } = testResult;
  const isClone = result?.isClone || false;
  const riskScore = Math.round((result?.riskScore || 0) * 100) / 100; // Round to 2 decimals
  const threatLevel = result?.threatLevel || 'low';

  // Determine color based on risk
  const getRiskColor = () => {
    if (riskScore >= 70) return '#ef4444'; // red
    if (riskScore >= 40) return '#f59e0b'; // orange
    return '#10b981'; // green
  };

  // Get analysis type labels
  const getAnalysisLabel = () => {
    if (tags?.analysisType === 'ai') return 'AI Analysis (Gemini)';
    if (tags?.analysisType === 'ml') return 'ML Analysis (Phishpedia)';
    return 'Combined Analysis (AI + ML)';
  };

  const getInputTypeLabel = () => {
    if (tags?.inputType === 'both') return 'Screenshot + URL';
    if (tags?.inputType === 'screenshot-only') return 'Screenshot Only';
    return 'URL Only';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>
            <Shield size={24} color={getRiskColor()} />
            Clone Detection Results
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Risk Score Section */}
          <div className="result-section risk-score-section">
            <div className="risk-score-container">
              <div 
                className="risk-score-circle" 
                style={{ 
                  borderColor: getRiskColor(),
                  boxShadow: `0 0 20px ${getRiskColor()}33`
                }}
              >
                <span className="risk-score-value" style={{ color: getRiskColor() }}>
                  {riskScore}
                </span>
                <span className="risk-score-label">Risk Score</span>
              </div>
              <div className="risk-verdict">
                {isClone ? (
                  <>
                    <AlertTriangle size={32} color="#ef4444" />
                    <h3 style={{ color: '#ef4444', margin: '8px 0' }}>CLONE DETECTED</h3>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                      This appears to be a fraudulent clone website
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle size={32} color="#10b981" />
                    <h3 style={{ color: '#10b981', margin: '8px 0' }}>APPEARS LEGITIMATE</h3>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                      No clone indicators detected
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Screenshot Display */}
          {inputData?.fullImageId && (
            <div className="result-section">
              <h3>
                <FileImage size={20} />
                Analyzed Screenshot
              </h3>
              <div className="screenshot-container">
                <img 
                  src={`http://localhost:5001/api/images/full/${inputData.fullImageId}`}
                  alt="Analyzed screenshot"
                  className="screenshot-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="screenshot-error" style={{ display: 'none' }}>
                  <FileImage size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>Screenshot not available</p>
                </div>
                {inputData.screenshotName && (
                  <div className="screenshot-info">
                    <span>{inputData.screenshotName}</span>
                    <span>
                      {inputData.imageFormat?.toUpperCase()} • {Math.round(inputData.compressedSize / 1024)}KB
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Info */}
          <div className="result-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <TrendingUp size={20} />
              Analysis Details
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Analysis Type</span>
                <span className="info-value">
                  {tags?.analysisType === 'ai' && <Brain size={16} style={{ marginRight: '6px' }} />}
                  {tags?.analysisType === 'ml' && <Cpu size={16} style={{ marginRight: '6px' }} />}
                  {tags?.analysisType === 'combined' && (
                    <>
                      <Brain size={16} style={{ marginRight: '4px' }} />
                      <Cpu size={16} style={{ marginRight: '6px' }} />
                    </>
                  )}
                  {getAnalysisLabel()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Input Type</span>
                <span className="info-value">{getInputTypeLabel()}</span>
              </div>
              {inputData?.url && (
                <div className="info-item">
                  <span className="info-label">URL</span>
                  <span className="info-value" style={{ 
                    wordBreak: 'break-all',
                    fontSize: '13px'
                  }}>
                    <Globe size={14} style={{ marginRight: '6px' }} />
                    {inputData.url}
                  </span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Threat Level</span>
                <span className={`threat-badge threat-${threatLevel}`}>
                  {threatLevel.toUpperCase()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Confidence</span>
                <span className="info-value">{Math.round((result?.confidence || 0) * 100)}%</span>
              </div>
              <div className="info-item">
                <span className="info-label">Analyzed</span>
                <span className="info-value">
                  <Clock size={14} style={{ marginRight: '6px' }} />
                  {new Date(createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>


          {/* AI Analysis */}
          {details?.aiAnalysis && (
            <div className="result-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Brain size={20} color="#8b5cf6" />
                AI Analysis (Gemini)
              </h3>
              <div className="analysis-box">
                <div className="analysis-item">
                  <span className="analysis-label">Decision</span>
                  <span className={`analysis-value ${details.aiAnalysis.decision === 'clone' ? 'text-danger' : 'text-success'}`}>
                    {details.aiAnalysis.decision?.toUpperCase()}
                  </span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">AI Score</span>
                  <span className="analysis-value">{details.aiAnalysis.score || 0}/100</span>
                </div>
                {details.aiAnalysis.detectedBrand && (
                  <div className="analysis-item">
                    <span className="analysis-label">Detected Brand</span>
                    <span className="analysis-value">{details.aiAnalysis.detectedBrand}</span>
                  </div>
                )}
                {details.aiAnalysis.confidence && (
                  <div className="analysis-item">
                    <span className="analysis-label">Confidence</span>
                    <span className="analysis-value">{Math.round(details.aiAnalysis.confidence * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ML Analysis */}
          {details?.mlAnalysis && (
            <div className="result-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Cpu size={20} color="#3b82f6" />
                ML Analysis (Phishpedia)
              </h3>
              <div className="analysis-box">
                <div className="analysis-item">
                  <span className="analysis-label">Result</span>
                  <span className={`analysis-value ${details.mlAnalysis.result === 'Phishing' ? 'text-danger' : 'text-success'}`}>
                    {details.mlAnalysis.result}
                  </span>
                </div>
                {details.mlAnalysis.matchedBrand && details.mlAnalysis.matchedBrand !== 'unknown' && (
                  <div className="analysis-item">
                    <span className="analysis-label">Matched Brand</span>
                    <span className="analysis-value">{details.mlAnalysis.matchedBrand}</span>
                  </div>
                )}
                {details.mlAnalysis.legitimateDomain && details.mlAnalysis.legitimateDomain !== 'unknown' && (
                  <div className="analysis-item">
                    <span className="analysis-label">Legitimate Domain</span>
                    <span className="analysis-value">{details.mlAnalysis.legitimateDomain}</span>
                  </div>
                )}
                <div className="analysis-item">
                  <span className="analysis-label">Confidence</span>
                  <span className="analysis-value">{Math.round((details.mlAnalysis.confidence || 0) * 100)}%</span>
                </div>
                {details.mlAnalysis.detectionTime && (
                  <div className="analysis-item">
                    <span className="analysis-label">Detection Time</span>
                    <span className="analysis-value">{details.mlAnalysis.detectionTime}s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {testResult.recommendations && testResult.recommendations.length > 0 && (
            <div className="result-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Shield size={20} />
                Recommendations
              </h3>
              <ul className="recommendations-list">
                {testResult.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Insights */}
          {testResult.insights && (
            <div className="result-section">
              <div className="insights-box">
                <p>{testResult.insights}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloneResultModal;
