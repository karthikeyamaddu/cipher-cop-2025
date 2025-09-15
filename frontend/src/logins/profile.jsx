import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [editableUser, setEditableUser] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [recentTests, setRecentTests] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, security, activity
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  // Initialize user data
  useEffect(() => {
    if (user) {
      setEditableUser(user);
      fetchUserStats();
      fetchRecentTests();
    }
    setLoading(false);
  }, [user]);

  // Auto-hide success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch user statistics
  const fetchUserStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/tests/stats', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          const statsData = result.data;
          const transformedStats = {
            totalTests: statsData.totalTests || 0,
            threatsDetected: statsData.summary?.totalThreats || 0,
            phishingTests: 0,
            malwareTests: 0,
            cloneTests: 0,
            scamTests: 0,
            sandboxTests: 0
          };

          if (statsData.byType) {
            statsData.byType.forEach(stat => {
              switch(stat._id) {
                case 'phishing': transformedStats.phishingTests = stat.count; break;
                case 'malware': transformedStats.malwareTests = stat.count; break;
                case 'clone': transformedStats.cloneTests = stat.count; break;
                case 'scam': transformedStats.scamTests = stat.count; break;
                case 'sandbox': transformedStats.sandboxTests = stat.count; break;
              }
            });
          }

          setUserStats(transformedStats);
          setError('');
        } else {
          setError('Failed to load statistics');
        }
      } else {
        setError('Failed to connect to server');
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError('Network error occurred');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch recent tests
  const fetchRecentTests = useCallback(async () => {
    setTestsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/tests/history?limit=5', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.tests) {
          setRecentTests(result.data.tests.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Error fetching recent tests:', error);
    } finally {
      setTestsLoading(false);
    }
  }, []);

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!editableUser.fullName || editableUser.fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters long';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editableUser.email || !emailRegex.test(editableUser.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation (international format)
    if (editableUser.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = editableUser.phone.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        errors.phone = 'Please enter a valid phone number (e.g., +1234567890)';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setEditableUser(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Save profile changes
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaveLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5001/api/user/update', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editableUser.fullName.trim(),
          email: editableUser.email.trim(),
          phone: editableUser.phone ? editableUser.phone.trim() : ''
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsEditing(false);
        setSuccessMessage('Profile updated successfully!');
        if (result.data) {
          setEditableUser(prev => ({
            ...prev,
            fullName: result.data.fullName,
            email: result.data.email
          }));
        }
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Network error occurred');
    } finally {
      setSaveLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditableUser(user);
    setValidationErrors({});
    setError('');
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    // Validate password fields
    const errors = {};
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/user/change-password', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccessMessage('Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setValidationErrors({});
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Network error occurred');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Email verification handler
  const handleEmailVerification = async () => {
    if (!editableUser.email) {
      setError('Please enter an email address first');
      return;
    }

    setIsVerifyingEmail(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5001/api/user/verify-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editableUser.email }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccessMessage('Verification email sent! Check your inbox.');
        // In a real app, you'd wait for the user to click the verification link
        // For demo purposes, we'll simulate verification after a delay
        setTimeout(() => {
          setEditableUser(prev => ({ ...prev, emailVerified: true }));
          setSuccessMessage('Email verified successfully!');
        }, 3000);
      } else {
        setError(result.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      setError('Network error occurred');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Phone verification handler
  const handlePhoneVerification = async () => {
    if (!editableUser.phone) {
      setError('Please enter a phone number first');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = editableUser.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsVerifyingPhone(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5001/api/user/verify-phone', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: editableUser.phone }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccessMessage('Verification code sent! Check your SMS.');
        // In a real app, you'd show an OTP input modal
        // For demo purposes, we'll simulate verification after a delay
        setTimeout(() => {
          setEditableUser(prev => ({ ...prev, phoneVerified: true }));
          setSuccessMessage('Phone verified successfully!');
        }, 3000);
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error verifying phone:', error);
      setError('Network error occurred');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // Utility functions
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getThreatIcon = (type) => {
    const icons = {
      'phishing': '🎯',
      'malware': '🛡️',
      'clone': '🔄',
      'scam': '⚠️',
      'sandbox': '🔬'
    };
    return icons[type] || '🔍';
  };

  const getThreatColor = (result) => {
    if (result.isPhishing || result.isMalware || result.isClone || result.isScam) {
      return '#ff6b35';
    }
    return '#00ff88';
  };

  const getTestResultText = (result, testType) => {
    if (testType === 'sandbox') {
      return result.threat_level || 'Analysis Complete';
    }
    return (result.isPhishing || result.isMalware || result.isClone || result.isScam) ? 'THREAT DETECTED' : 'SAFE';
  };

  // Loading screen
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-text">Initializing security protocols...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Background Effects */}
      <div className="bg-effects">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="notification success-notification">
          <div className="notification-icon">✅</div>
          <span>{successMessage}</span>
          <button className="notification-close" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="notification error-notification">
          <div className="notification-icon">⚠️</div>
          <span>{error}</span>
          <button className="notification-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Header */}
      <div className="profile-header">
        <div className="header-content">
          <div className="user-avatar">
            <div className="avatar-circle">
              <div className="avatar-inner">
                {editableUser.fullName 
                  ? editableUser.fullName.charAt(0).toUpperCase() 
                  : (editableUser.email ? editableUser.email.charAt(0).toUpperCase() : 'U')
                }
              </div>
            </div>
            <div className="avatar-status"></div>
          </div>
          
          <div className="user-info">
            <h1 className="user-name">{editableUser.fullName || 'User'}</h1>
            <p className="user-role">Cybersecurity Analyst</p>
            <div className="security-clearance">
              <span className="clearance-badge">CLASSIFIED</span>
              <span className="ai-status">AI-ENHANCED</span>
            </div>
            <p className="user-email">{editableUser.email}</p>
          </div>
          
          <div className="header-actions">
            <div className="user-welcome">
              <span>Welcome, {editableUser.fullName || 'User'}</span>
            </div>
            <div className="system-status">
              <div className="status-indicator online"></div>
              <span className="status-text">SECURE</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <span>🔓</span> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Tab Navigation */}
        <div className="tab-navigation" role="tablist" aria-label="Profile sections">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            role="tab"
            aria-selected={activeTab === 'profile'}
            aria-controls="profile-panel"
            id="profile-tab"
          >
            <span>👤</span> Profile
          </button>
          <button 
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            role="tab"
            aria-selected={activeTab === 'security'}
            aria-controls="security-panel"
            id="security-tab"
          >
            <span>🔒</span> Security
          </button>
          <button 
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
            role="tab"
            aria-selected={activeTab === 'activity'}
            aria-controls="activity-panel"
            id="activity-tab"
          >
            <span>📊</span> Activity
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="tab-content" role="tabpanel" id="profile-panel" aria-labelledby="profile-tab">
            {/* Profile Management Card */}
            <div className="content-card profile-card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="title-icon" aria-hidden="true">🔐</span>
                  Operative Profile Configuration
                </h2>
                <button 
                  className={`action-btn ${isEditing ? 'save-btn' : 'edit-btn'}`}
                  onClick={isEditing ? handleSave : () => setIsEditing(true)}
                  disabled={saveLoading}
                  aria-label={isEditing ? 'Save profile changes' : 'Edit profile'}
                >
                  {saveLoading ? (
                    <>
                      <div className="mini-spinner" aria-hidden="true"></div>
                      <span aria-live="polite">Saving...</span>
                    </>
                  ) : isEditing ? (
                    <>💾 Secure Changes</>
                  ) : (
                    <>⚙️ Modify Profile</>
                  )}
                </button>
              </div>
              
              <div className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>🏷️ Operative Name</label>
                    <input
                      type="text"
                      value={editableUser.fullName || ''}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      disabled={!isEditing}
                      className={`${isEditing ? 'editable' : ''} ${validationErrors.fullName ? 'error' : ''}`}
                      placeholder="Enter operative full name"
                    />
                    {validationErrors.fullName && (
                      <span className="error-text">{validationErrors.fullName}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>📧 Secure Contact</label>
                    <div className="input-with-verification">
                      <input
                        type="email"
                        value={editableUser.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                        className={`${isEditing ? 'editable' : ''} ${validationErrors.email ? 'error' : ''}`}
                        placeholder="Enter encrypted communication address"
                      />
                      <button 
                        className={`verify-btn ${editableUser.emailVerified ? 'verified' : ''}`}
                        type="button"
                        onClick={() => handleEmailVerification()}
                        disabled={!editableUser.email || isVerifyingEmail}
                        title={editableUser.emailVerified ? 'Email verified' : 'Verify email address'}
                      >
                        {isVerifyingEmail ? (
                          <span className="loading-spinner"></span>
                        ) : editableUser.emailVerified ? (
                          <>✅ Verified</>
                        ) : (
                          <>📧 Verify</>
                        )}
                      </button>
                    </div>
                    {validationErrors.email && (
                      <span className="error-text">{validationErrors.email}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>📱 Secure Phone</label>
                    <div className="input-with-verification">
                      <input
                        type="tel"
                        value={editableUser.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing}
                        className={`${isEditing ? 'editable' : ''} ${validationErrors.phone ? 'error' : ''}`}
                        placeholder="+1 (555) 123-4567"
                      />
                      <button 
                        className={`verify-btn ${editableUser.phoneVerified ? 'verified' : ''}`}
                        type="button"
                        onClick={() => handlePhoneVerification()}
                        disabled={!editableUser.phone || isVerifyingPhone}
                        title={editableUser.phoneVerified ? 'Phone verified' : 'Verify phone number'}
                      >
                        {isVerifyingPhone ? (
                          <span className="loading-spinner"></span>
                        ) : editableUser.phoneVerified ? (
                          <>✅ Verified</>
                        ) : (
                          <>📱 Verify</>
                        )}
                      </button>
                    </div>
                    {validationErrors.phone && (
                      <span className="error-text">{validationErrors.phone}</span>
                    )}
                  </div>
                </div>

                <div className="form-info">
                  <div className="info-item">
                    <span className="info-label">🆔 Agent ID:</span>
                    <span className="info-value">{editableUser.username || editableUser.email?.split('@')[0] || 'CLASSIFIED'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">📅 Deployment Date:</span>
                    <span className="info-value">
                      {editableUser.createdAt 
                        ? new Date(editableUser.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Recently activated'
                      }
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">🔒 Security Level:</span>
                    <span className="info-value security-level">LEVEL 5 - CLASSIFIED</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">🤖 AI Integration:</span>
                    <span className="info-value ai-status-text">NEURAL LINK ACTIVE</span>
                  </div>
                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button className="cancel-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="tab-content" role="tabpanel" id="security-panel" aria-labelledby="security-tab">
            <div className="content-card security-card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="title-icon" aria-hidden="true">🔐</span>
                  Security Settings
                </h2>
              </div>
              
              <div className="security-options">
                <div className="security-item">
                  <div className="security-info">
                    <h3><span aria-hidden="true">🔑</span> Password</h3>
                    <p>Change your account password</p>
                  </div>
                  <button 
                    className="security-btn" 
                    onClick={() => setShowPasswordModal(true)}
                    aria-label="Open password change dialog"
                  >
                    Change Password
                  </button>
                </div>
                
                <div className="security-item">
                  <div className="security-info">
                    <h3><span aria-hidden="true">🛡️</span> Two-Factor Authentication</h3>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <button className="security-btn disabled" disabled aria-label="Two-factor authentication coming soon">
                    Coming Soon
                  </button>
                </div>
                
                <div className="security-item">
                  <div className="security-info">
                    <h3><span aria-hidden="true">📱</span> Login Notifications</h3>
                    <p>Get notified when someone logs into your account</p>
                  </div>
                  <label className="toggle-switch" aria-label="Toggle login notifications">
                    <input type="checkbox" defaultChecked aria-describedby="notifications-desc" />
                    <span className="slider"></span>
                  </label>
                  <div id="notifications-desc" className="sr-only">
                    Receive email notifications when your account is accessed
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="tab-content">
            {/* Statistics Summary */}
            <div className="content-card stats-card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="title-icon">📊</span>
                  Threat Intelligence Dashboard
                </h2>
                <div className="card-subtitle">
                  <span className="ai-indicator">🤖</span>
                  AI-Enhanced Security Metrics
                </div>
              </div>

              {statsLoading ? (
                <div className="loading-state">
                  <div className="mini-spinner"></div>
                  <span>Loading statistics...</span>
                </div>
              ) : error && !userStats ? (
                <div className="error-state">
                  <div className="error-icon">⚠️</div>
                  <div className="error-message">Failed to load statistics</div>
                  <button className="retry-btn" onClick={fetchUserStats}>
                    Retry
                  </button>
                </div>
              ) : (
                <div className="stats-grid">
                  <div className="stat-item total-tests">
                    <div className="stat-icon">🔍</div>
                    <div className="stat-content">
                      <div className="stat-number">{userStats?.totalTests || 0}</div>
                      <div className="stat-label">Total Analysis</div>
                      <div className="stat-change positive">+12%</div>
                    </div>
                    <div className="stat-trend">📈</div>
                  </div>

                  <div className="stat-item threats-found critical">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-content">
                      <div className="stat-number">{userStats?.threatsDetected || 0}</div>
                      <div className="stat-label">Threats Neutralized</div>
                      <div className="stat-change negative">-3%</div>
                    </div>
                    <div className="stat-trend">🛡️</div>
                  </div>

                  <div className="stat-item phishing-tests">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-content">
                      <div className="stat-number">{userStats?.phishingTests || 0}</div>
                      <div className="stat-label">Phishing Detected</div>
                      <div className="stat-change positive">+8%</div>
                    </div>
                    <div className="stat-trend">📊</div>
                  </div>

                  <div className="stat-item malware-tests">
                    <div className="stat-icon">🛡️</div>
                    <div className="stat-content">
                      <div className="stat-number">{userStats?.malwareTests || 0}</div>
                      <div className="stat-label">Malware Quarantined</div>
                      <div className="stat-change positive">+15%</div>
                    </div>
                    <div className="stat-trend">🔬</div>
                  </div>

                  <div className="stat-item clone-tests">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                      <div className="stat-number">{userStats?.cloneTests || 0}</div>
                      <div className="stat-label">Clone Sites Found</div>
                      <div className="stat-change neutral">0%</div>
                    </div>
                    <div className="stat-trend">⚖️</div>
                  </div>

                  <div className="stat-item sandbox-tests">
                    <div className="stat-icon">🧬</div>
                    <div className="stat-content">
                      <div className="stat-number">{userStats?.sandboxTests || 0}</div>
                      <div className="stat-label">AI Sandbox Analysis</div>
                      <div className="stat-change positive">+22%</div>
                    </div>
                    <div className="stat-trend">🔮</div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Tests */}
            <div className="content-card recent-tests-card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="title-icon">📋</span>
                  Mission Activity Log
                </h2>
                <div className="card-subtitle">
                  <span className="live-indicator"></span>
                  Recent threat analysis operations
                </div>
              </div>

              <div className="tests-list">
                {testsLoading ? (
                  <div className="loading-state">
                    <div className="mini-spinner"></div>
                    <span>Loading recent activity...</span>
                  </div>
                ) : recentTests && recentTests.length > 0 ? (
                  recentTests.map((test, index) => (
                    <div key={test._id} className="test-item" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="test-header">
                        <div className="test-type">
                          <span className="test-icon">{getThreatIcon(test.testType)}</span>
                          <span className="test-type-text">{test.testType.toUpperCase()}</span>
                        </div>
                        <div 
                          className="test-result"
                          style={{ 
                            color: getThreatColor(test.result),
                            background: `${getThreatColor(test.result)}20`
                          }}
                        >
                          {getTestResultText(test.result, test.testType)}
                        </div>
                      </div>

                      <div className="test-content">
                        <div className="test-target">
                          {test.inputData?.url || test.inputData?.fileName || 'Content Analysis'}
                        </div>
                        <div className="test-details">
                          <span className="test-date">{formatDate(test.createdAt)}</span>
                          {test.result.riskScore && (
                            <span className="risk-score">Risk: {test.result.riskScore}%</span>
                          )}
                        </div>
                      </div>

                      <div className="test-progress">
                        <div 
                          className="progress-bar"
                          style={{ 
                            width: test.result.riskScore ? `${test.result.riskScore}%` : '100%',
                            background: getThreatColor(test.result)
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🤖</div>
                    <div className="empty-title">No missions executed yet</div>
                    <div className="empty-subtitle">
                      Initialize threat analysis protocols to begin monitoring cyber threats!
                    </div>
                    <button 
                      className="cta-btn"
                      onClick={() => {
                        // Navigate back to home to access features
                        window.history.back();
                      }}
                    >
                      Begin Mission
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Change Password</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className={validationErrors.currentPassword ? 'error' : ''}
                  placeholder="Enter current password"
                />
                {validationErrors.currentPassword && (
                  <span className="error-text">{validationErrors.currentPassword}</span>
                )}
              </div>
              
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className={validationErrors.newPassword ? 'error' : ''}
                  placeholder="Enter new password (min 6 characters)"
                />
                {validationErrors.newPassword && (
                  <span className="error-text">{validationErrors.newPassword}</span>
                )}
              </div>
              
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={validationErrors.confirmPassword ? 'error' : ''}
                  placeholder="Confirm new password"
                />
                {validationErrors.confirmPassword && (
                  <span className="error-text">{validationErrors.confirmPassword}</span>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </button>
              <button 
                className="save-btn"
                onClick={handlePasswordChange}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <>
                    <div className="mini-spinner"></div>
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Styles */}
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .profile-container {
          min-height: calc(100vh - 80px);
          width: 100%;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 60%, #0f3460 100%);
          color: #e2e8f0;
          padding: 20px;
          margin: 0;
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          scroll-behavior: smooth;
        }

        /* Scrollbar Styles */
        .profile-container::-webkit-scrollbar {
          width: 8px;
        }

        .profile-container::-webkit-scrollbar-track {
          background: rgba(0, 212, 255, 0.1);
          border-radius: 4px;
        }

        .profile-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          border-radius: 4px;
        }

        /* Background Effects */
        .bg-effects {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
        }

        .bg-orb {
          position: absolute;
          border-radius: 50%;
          opacity: 0.08;
          animation: float 12s ease-in-out infinite;
        }

        .bg-orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #00d4ff, transparent);
          top: -200px;
          right: -200px;
          animation-delay: 0s;
        }

        .bg-orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #00ff88, transparent);
          bottom: -175px;
          left: -175px;
          animation-delay: 4s;
        }

        .bg-orb-3 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, #ff6b35, transparent);
          top: 30%;
          left: 60%;
          animation-delay: 8s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.08; }
          50% { transform: translateY(-40px) rotate(180deg); opacity: 0.12; }
        }

        /* Loading Screen */
        .loading-container {
          width: 100%;
          min-height: calc(100vh - 80px);
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 60%, #0f3460 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00d4ff;
          font-family: 'Inter', sans-serif;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(0,212,255,0.2);
          border-left-color: #00d4ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          font-size: 18px;
          font-weight: 500;
          letter-spacing: 1px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Notifications */
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          font-weight: 500;
          z-index: 1000;
          animation: slideInRight 0.3s ease-out;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }

        .success-notification {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
          color: #00ff88;
        }

        .error-notification {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .notification-close {
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        /* Profile Header */
        .profile-header {
          margin-bottom: 32px;
          animation: slideInDown 0.6s ease-out;
          position: relative;
          z-index: 1;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 28px;
          background: rgba(0, 212, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
          transition: all 0.3s ease;
        }

        .header-content:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 212, 255, 0.15);
        }

        .user-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3);
          position: relative;
          overflow: hidden;
        }

        .avatar-circle::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: linear-gradient(45deg, #00d4ff, #00ff88, #ff6b35, #00d4ff);
          z-index: -1;
          animation: rotate 4s linear infinite;
        }

        .avatar-inner {
          font-size: 38px;
          font-weight: bold;
          color: #0a0a0f;
          z-index: 1;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .avatar-status {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          background: #00ff88;
          border-radius: 50%;
          border: 4px solid rgba(0, 255, 136, 0.3);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-size: 36px;
          margin: 0 0 8px 0;
          font-weight: 800;
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .user-role {
          font-size: 18px;
          color: #00d4ff;
          margin: 0 0 12px 0;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .security-clearance {
          display: flex;
          gap: 12px;
          margin: 12px 0;
          flex-wrap: wrap;
        }

        .clearance-badge, .ai-status {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .clearance-badge {
          background: linear-gradient(135deg, #ff6b35, #ff8e53);
          color: #000;
        }

        .ai-status {
          background: linear-gradient(135deg, #00ff88, #00d4ff);
          color: #000;
        }

        .user-email {
          font-size: 16px;
          color: #94a3b8;
          margin: 8px 0 0 0;
        }

        .header-actions {
          display: flex;
          flex-direction: row;
          gap: 16px;
          align-items: center;
        }

        .user-welcome {
          display: flex;
          align-items: center;
          color: #e2e8f0;
          font-weight: 500;
          font-size: 14px;
        }

        .system-status {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 255, 136, 0.1);
          padding: 12px 18px;
          border-radius: 20px;
          border: 1px solid rgba(0, 255, 136, 0.2);
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-indicator.online {
          background: #00ff88;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }

        .status-text {
          font-size: 14px;
          font-weight: bold;
          color: #00ff88;
          letter-spacing: 1px;
        }

        .logout-btn {
          background: linear-gradient(135deg, #ff6b35, #ff8e53);
          border: none;
          border-radius: 20px;
          color: #000;
          padding: 14px 24px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 107, 53, 0.4);
        }

        /* Main Content */
        .main-content {
          display: flex;
          flex-direction: column;
          gap: 32px;
          max-width: 100%;
          width: 100%;
          margin: 0 auto;
          padding: 0 0 40px 0;
          position: relative;
          z-index: 1;
        }

        /* Tab Navigation */
        .tab-navigation {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          background: rgba(0, 212, 255, 0.06);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 212, 255, 0.15);
          border-radius: 20px;
          padding: 8px;
        }

        .tab-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 12px 24px;
          border-radius: 16px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tab-btn:hover {
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.1);
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          color: #000;
          box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);
        }

        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .content-card {
          background: rgba(0, 212, 255, 0.06);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 212, 255, 0.15);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
          animation: slideInUp 0.6s ease-out;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .content-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #00d4ff, #00ff88, #ff6b35);
        }

        .content-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0, 212, 255, 0.15);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
          padding-bottom: 20px;
        }

        .card-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #00d4ff;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .title-icon {
          font-size: 28px;
        }

        .card-subtitle {
          font-size: 14px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          margin-top: 8px;
          gap: 8px;
        }

        .ai-indicator {
          animation: pulse 2s infinite;
        }

        .live-indicator {
          width: 8px;
          height: 8px;
          background: #00ff88;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        /* Action Buttons */
        .action-btn {
          border: none;
          border-radius: 16px;
          padding: 12px 24px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
          overflow: hidden;
        }

        .action-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .edit-btn {
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: #000;
        }

        .save-btn {
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          color: #000;
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 212, 255, 0.4);
        }

        .mini-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.2);
          border-left-color: #000;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Form Styles */
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-group input {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 16px 20px;
          color: #e2e8f0;
          font-size: 16px;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .form-group input:disabled {
          background: rgba(255, 255, 255, 0.04);
          color: #94a3b8;
          cursor: not-allowed;
        }

        .form-group input.editable {
          background: rgba(0, 212, 255, 0.1);
          border-color: #00d4ff;
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
        }

        .form-group input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .form-group input:focus {
          outline: none;
          border-color: #00d4ff;
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
        }

        .error-text {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .error-text::before {
          content: '⚠️';
          font-size: 10px;
        }

        /* Input with Verification Styles */
        .input-with-verification {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .input-with-verification input {
          flex: 1;
        }

        .verify-btn {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          min-width: 80px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .verify-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .verify-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .verify-btn.verified {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          cursor: default;
        }

        .verify-btn.verified:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: none;
          box-shadow: none;
        }

        .loading-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .form-info {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          margin-top: 16px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 14px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .security-level {
          color: #ff6b35 !important;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .ai-status-text {
          color: #00ff88 !important;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .form-actions {
          display: flex;
          gap: 16px;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .cancel-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: #e2e8f0;
          padding: 12px 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        /* Statistics Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        }

        .stat-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #00d4ff, #00ff88);
        }

        .critical::before {
          background: linear-gradient(90deg, #ff6b35, #ff8e53) !important;
        }

        .stat-icon {
          font-size: 32px;
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
        }

        .stat-number {
          font-size: 36px;
          font-weight: 800;
          color: #e2e8f0;
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-label {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .stat-change {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 8px;
          display: inline-block;
        }

        .stat-change.positive {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
        }

        .stat-change.negative {
          background: rgba(255, 107, 53, 0.2);
          color: #ff6b35;
        }

        .stat-change.neutral {
          background: rgba(148, 163, 184, 0.2);
          color: #94a3b8;
        }

        .stat-trend {
          font-size: 24px;
          opacity: 0.8;
        }

        /* Loading and Error States */
        .loading-state, .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 16px;
          text-align: center;
        }

        .error-icon {
          font-size: 48px;
          opacity: 0.7;
        }

        .error-message {
          font-size: 16px;
          color: #ef4444;
        }

        .retry-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          border-radius: 12px;
          color: white;
          padding: 12px 24px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
        }

        /* Tests List */
        .tests-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 600px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .tests-list::-webkit-scrollbar {
          width: 6px;
        }

        .tests-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .tests-list::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          border-radius: 3px;
        }

        .test-item {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s ease;
          animation: slideInLeft 0.6s ease-out;
        }

        .test-item:hover {
          transform: translateX(6px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .test-type {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .test-icon {
          font-size: 18px;
        }

        .test-type-text {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .test-result {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 12px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .test-content {
          margin-bottom: 16px;
        }

        .test-target {
          font-size: 14px;
          color: #e2e8f0;
          margin-bottom: 8px;
          word-break: break-all;
          line-height: 1.4;
        }

        .test-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .test-date {
          font-size: 12px;
          color: #94a3b8;
        }

        .risk-score {
          font-size: 12px;
          color: #00d4ff;
          font-weight: 600;
        }

        .test-progress {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 2px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
          opacity: 0.6;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #e2e8f0;
        }

        .empty-subtitle {
          font-size: 16px;
          margin-bottom: 24px;
          line-height: 1.5;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-btn {
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          border: none;
          border-radius: 16px;
          color: #000;
          padding: 14px 28px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 212, 255, 0.4);
        }

        /* Security Settings */
        .security-options {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .security-item {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
        }

        .security-item:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-2px);
        }

        .security-info h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .security-info p {
          margin: 0;
          color: #94a3b8;
          font-size: 14px;
        }

        .security-btn {
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          border: none;
          border-radius: 12px;
          color: #000;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .security-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
        }

        .security-btn.disabled {
          background: rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          cursor: not-allowed;
        }

        .security-btn.disabled:hover {
          transform: none;
          box-shadow: none;
        }

        /* Toggle Switch */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.2);
          transition: 0.4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background: linear-gradient(135deg, #00d4ff, #00ff88);
        }

        input:checked + .slider:before {
          transform: translateX(26px);
          background-color: #000;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }

        .modal-content {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 24px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideInUp 0.3s ease-out;
        }

        .modal-header {
          background: rgba(0, 212, 255, 0.1);
          padding: 24px 32px;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: #00d4ff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
        }

        .modal-body {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .modal-footer {
          background: rgba(0, 0, 0, 0.2);
          padding: 24px 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          gap: 16px;
          justify-content: flex-end;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Accessibility */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* Focus styles for accessibility */
        .tab-btn:focus,
        .action-btn:focus,
        .security-btn:focus,
        .form-group input:focus,
        .modal-close:focus {
          outline: 2px solid #00d4ff;
          outline-offset: 2px;
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .profile-container,
          .content-card,
          .test-item,
          .stat-item,
          .bg-orb,
          .avatar-circle::before,
          .loading-spinner,
          .mini-spinner {
            animation: none;
          }
          
          .content-card:hover,
          .stat-item:hover,
          .test-item:hover,
          .action-btn:hover,
          .security-btn:hover {
            transform: none;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .content-card {
            border: 2px solid #00d4ff;
            background: #000;
          }
          
          .form-group input {
            border: 2px solid #fff;
            background: #000;
          }
          
          .stat-item {
            border: 2px solid #00ff88;
            background: #000;
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .profile-container {
            padding: 16px;
          }

          .header-content {
            flex-direction: column;
            gap: 20px;
            text-align: center;
            padding: 24px;
          }

          .header-actions {
            flex-direction: column;
            width: 100%;
            justify-content: center;
            gap: 12px;
          }

          .user-welcome {
            text-align: center;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .user-name {
            font-size: 28px;
          }

          .card-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }

          .content-card {
            padding: 24px;
          }

          .notification {
            top: 10px;
            right: 10px;
            left: 10px;
            text-align: center;
          }

          .input-with-verification {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }

          .verify-btn {
            min-width: 100%;
            justify-content: center;
          }
        }

        /* Animations */
        @keyframes slideInDown {
          from { 
            opacity: 0;
            transform: translateY(-30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from { 
            opacity: 0;
            transform: translateX(-30px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;