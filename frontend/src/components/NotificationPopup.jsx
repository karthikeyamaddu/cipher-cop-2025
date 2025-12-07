import { useNotification } from '../context/NotificationContext';
import { X, AlertTriangle, Shield, CheckCircle, ExternalLink } from 'lucide-react';

export default function NotificationPopup() {
  const { notifications, removeNotification, viewDetailedReport } = useNotification();

  const getIcon = (riskScore) => {
    if (riskScore >= 70) return <AlertTriangle className="w-6 h-6 text-red-500" />;
    if (riskScore >= 30) return <Shield className="w-6 h-6 text-yellow-500" />;
    return <CheckCircle className="w-6 h-6 text-green-500" />;
  };

  const getThreatLabel = (riskScore) => {
    if (riskScore >= 70) return { text: 'High Risk', color: 'text-red-500' };
    if (riskScore >= 30) return { text: 'Suspicious', color: 'text-yellow-500' };
    return { text: 'Safe', color: 'text-green-500' };
  };

  const getTestTypeLabel = (testType) => {
    const labels = {
      'phishing-url': 'URL Analysis',
      'phishing-email': 'Email Analysis',
      'scam-phone': 'Phone Scam Check',
      'clone-ai': 'Clone Detection (AI)',
      'clone-ml': 'Clone Detection (ML)',
      'clone-combined': 'Clone Detection',
      'malware-virustotal': 'Malware Scan (VirusTotal)',
      'malware-sandbox': 'Malware Scan (Sandbox)'
    };
    return labels[testType] || 'Analysis';
  };

  if (notifications.length === 0) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {notifications.map((notification) => {
        const riskScore = notification.result?.riskScore || 0;
        const threat = getThreatLabel(riskScore);
        const testTypeLabel = getTestTypeLabel(notification.testType);

        return (
          <div
            key={notification.id}
            style={{
              animation: 'slideIn 0.3s ease-out',
              backdropFilter: 'blur(10px)',
              background: 'rgba(17, 24, 39, 0.98)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '12px',
              padding: '12px 16px',
              minWidth: '320px',
              maxWidth: '380px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(6, 182, 212, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Header Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getIcon(riskScore)}
                <div>
                  <div style={{ color: 'white', fontWeight: '600', fontSize: '13px', lineHeight: '1.2' }}>
                    {testTypeLabel} Complete
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                style={{ 
                  color: '#6b7280', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.background = 'none';
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Score Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(31, 41, 55, 0.6)',
              borderRadius: '8px',
              border: '1px solid rgba(55, 65, 81, 0.4)'
            }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>
                Risk Score
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: riskScore >= 70 ? '#ef4444' : riskScore >= 30 ? '#eab308' : '#22c55e'
                }}>
                  {riskScore}/100
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: riskScore >= 70 ? 'rgba(239, 68, 68, 0.2)' : riskScore >= 30 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  color: riskScore >= 70 ? '#ef4444' : riskScore >= 30 ? '#eab308' : '#22c55e'
                }}>
                  {threat.text}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => viewDetailedReport(
                notification.testId,
                notification.testType,
                notification.pageRoute
              )}
              style={{
                width: '100%',
                background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
                color: 'white',
                fontWeight: '600',
                fontSize: '13px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #0891b2, #2563eb)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #06b6d4, #3b82f6)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(6, 182, 212, 0.3)';
              }}
            >
              <span>View Details</span>
              <ExternalLink style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
