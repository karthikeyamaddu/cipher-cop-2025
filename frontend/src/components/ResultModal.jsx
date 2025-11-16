import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './ResultModal.css';

const ResultModal = ({ testResult, isOpen, onClose, children }) => {
  
  // Mark as viewed when modal opens
  useEffect(() => {
    if (isOpen && testResult && !testResult.viewedByUser) {
      markAsViewed(testResult._id);
    }
  }, [isOpen, testResult]);
  
  const markAsViewed = async (testId) => {
    try {
      await fetch(`http://localhost:5001/api/tests/${testId}/mark-viewed`, {
        method: 'PUT',
        credentials: 'include'
      });
      console.log('✅ Test marked as viewed:', testId);
    } catch (error) {
      console.error('Failed to mark test as viewed:', error);
    }
  };
  
  const getTestTypeTitle = (testType) => {
    const titles = {
      'phishing-url': 'Phishing URL Analysis',
      'phishing-email': 'Email Phishing Analysis',
      'clone-ai': 'Clone Detection (AI)',
      'clone-ml': 'Clone Detection (ML)',
      'clone-combined': 'Clone Detection (Combined)',
      'malware-virustotal': 'Malware Scan (VirusTotal)',
      'malware-sandbox': 'Malware Analysis (Sandbox)',
      'scam-phone': 'Phone Number Scam Check'
    };
    return titles[testType] || 'Security Analysis';
  };
  
  if (!isOpen || !testResult) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{getTestTypeTitle(testResult.testType)}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          {children}
          
          {/* Test date at bottom of content */}
          <div className="test-date-footer">
            Tested: {new Date(testResult.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
