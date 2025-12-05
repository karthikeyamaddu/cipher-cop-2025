import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Phone, Activity, Clock, Users } from 'lucide-react';

const ScamResultDetails = ({ testResult }) => {
  if (!testResult) return null;

  const { result, details, inputData, createdAt } = testResult;
  const isScam = result?.isScam || false;
  const riskScore = Math.round((result?.riskScore || 0) * 100) / 100; // Round to 2 decimals
  const threatLevel = result?.threatLevel || 'low';

  const getRiskColor = () => {
    if (riskScore >= 70) return '#ef4444';
    if (riskScore >= 40) return '#f59e0b';
    return '#10b981';
  };

  return (
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
            {isScam ? (
              <>
                <AlertTriangle size={32} color="#ef4444" />
                <h3 style={{ color: '#ef4444', margin: '8px 0' }}>SCAM DETECTED</h3>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  This number is associated with scam activity
                </p>
              </>
            ) : (
              <>
                <CheckCircle size={32} color="#10b981" />
                <h3 style={{ color: '#10b981', margin: '8px 0' }}>NUMBER APPEARS SAFE</h3>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  No scam reports found
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Phone Info */}
      <div className="result-section">
        <h3>
          <Phone size={20} />
          Phone Number Information
        </h3>
        <div className="info-grid">
          {inputData?.phoneNumber && (
            <div className="info-item">
              <span className="info-label">Phone Number</span>
              <span className="info-value">{inputData.phoneNumber}</span>
            </div>
          )}
          {details?.lineType && (
            <div className="info-item">
              <span className="info-label">Line Type</span>
              <span className="info-value">{details.lineType}</span>
            </div>
          )}
          {details?.carrier && (
            <div className="info-item">
              <span className="info-label">Carrier</span>
              <span className="info-value">{details.carrier}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Threat Level</span>
            <span className={`threat-badge threat-${threatLevel}`}>
              {threatLevel.toUpperCase()}
            </span>
          </div>
          {details?.reportsCount !== undefined && (
            <div className="info-item">
              <span className="info-label">Reports</span>
              <span className="info-value">{details.reportsCount} reports</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Checked</span>
            <span className="info-value">
              <Clock size={14} style={{ marginRight: '6px' }} />
              {new Date(createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Provider Results */}
      {details?.providers && details.providers.length > 0 && (
        <div className="result-section">
          <h3>
            <Users size={20} />
            Provider Results
          </h3>
          <div className="analysis-box">
            {details.providers.map((provider, index) => (
              <div key={index} className="analysis-item">
                <span className="analysis-label">{provider}</span>
                <span className="analysis-value text-success">Checked</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fraud Score */}
      {details?.fraudScore !== undefined && (
        <div className="result-section">
          <h3>
            <Activity size={20} />
            Fraud Analysis
          </h3>
          <div className="analysis-box">
            <div className="analysis-item">
              <span className="analysis-label">Fraud Score</span>
              <span className={`analysis-value ${details.fraudScore > 50 ? 'text-danger' : 'text-success'}`}>
                {details.fraudScore}/100
              </span>
            </div>
            {details.enhancedAnalysis && (
              <div className="analysis-item">
                <span className="analysis-label">Enhanced Check</span>
                <span className="analysis-value">Completed</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {testResult.recommendations && testResult.recommendations.length > 0 && (
        <div className="result-section">
          <h3>
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
  );
};

export default ScamResultDetails;
