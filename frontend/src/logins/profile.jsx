import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Activity, Settings, Mail, Phone, Lock, Save, Edit3, LogOut, AlertTriangle, CheckCircle, TrendingUp, Target, Bug, Copy, Zap, Eye, EyeOff } from 'lucide-react';
import './Profile.css';

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
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpType, setOtpType] = useState(''); // 'email' or 'phone'
  const [otpValue, setOtpValue] = useState('');
  const [otpTarget, setOtpTarget] = useState(''); // email address or phone number
  const [otpLoading, setOtpLoading] = useState(false);

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
              const testType = stat._id;
              // Group by prefix
              if (testType.startsWith('phishing')) {
                transformedStats.phishingTests += stat.count;
              } else if (testType.startsWith('malware')) {
                transformedStats.malwareTests += stat.count;
              } else if (testType.startsWith('clone')) {
                transformedStats.cloneTests += stat.count;
              } else if (testType.startsWith('scam')) {
                transformedStats.scamTests += stat.count;
              } else if (testType === 'sandbox') {
                transformedStats.sandboxTests += stat.count;
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

  // Fetch ALL user activities
  const fetchRecentTests = useCallback(async () => {
    setTestsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/user/activities?limit=20', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setRecentTests(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
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

    // Phone validation (10 digits only)
    if (editableUser.phone) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(editableUser.phone)) {
        errors.phone = 'Please enter exactly 10 digits (e.g., 9959511898)';
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
      // Step 1: Send OTP
      const response = await fetch('http://localhost:5001/api/user/send-email-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editableUser.email }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Step 2: Show OTP Modal
        setOtpType('email');
        setOtpTarget(editableUser.email);
        setOtpValue('');
        setShowOtpModal(true);
        setSuccessMessage('OTP sent to your email successfully!');
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

  // OTP verification handler
  const handleOtpVerification = async () => {
    if (!otpValue || otpValue.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const endpoint = otpType === 'email' 
        ? '/api/user/verify-email-otp' 
        : '/api/user/verify-phone-otp';
      
      const body = otpType === 'email' 
        ? { email: otpTarget, otp: otpValue.trim() }
        : { phone: otpTarget, otp: otpValue.trim() };

      const response = await fetch(`http://localhost:5001${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Update user verification status
        if (otpType === 'email') {
          setEditableUser(prev => ({ ...prev, emailVerified: true }));
          setSuccessMessage('Email verified successfully!');
        } else {
          setEditableUser(prev => ({ ...prev, phoneVerified: true }));
          setSuccessMessage('Phone verified successfully!');
        }
        
        // Close modal and reset
        setShowOtpModal(false);
        setOtpValue('');
        setOtpType('');
        setOtpTarget('');
      } else {
        setError(result.error || 'Invalid or expired OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError('Network error occurred');
    } finally {
      setOtpLoading(false);
    }
  };

  // Close OTP modal
  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
    setOtpValue('');
    setOtpType('');
    setOtpTarget('');
    setError('');
  };

  // Phone verification handler
  const handlePhoneVerification = async () => {
    if (!editableUser.phone) {
      setError('Please enter a phone number first');
      return;
    }

    // Validate 10 digits only (no country code)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(editableUser.phone)) {
      setError('Please enter exactly 10 digits (e.g., 9959511898)');
      return;
    }

    setIsVerifyingPhone(true);
    setError('');

    try {
      // Step 1: Send OTP (backend will handle phone cleaning and validation)
      const response = await fetch('http://localhost:5001/api/user/send-phone-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: editableUser.phone }), // Send original format
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Step 2: Show OTP Modal
        setOtpType('phone');
        setOtpTarget(editableUser.phone); // Show original format to user
        setOtpValue('');
        setShowOtpModal(true);
        setSuccessMessage('OTP sent to your phone successfully!');
      } else {
        // Handle Twilio trial account limitations and other errors
        if (result.error && (result.error.includes('unverified') || result.error.includes('Trial'))) {
          setError('Twilio trial account limitation: Please verify your phone number at https://console.twilio.com/us1/develop/phone-numbers/manage/verified or upgrade your Twilio account.');
        } else {
          setError(result.error || 'Failed to send verification code');
        }
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
      <div className="profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span className="loading-text">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Success Message */}
      {successMessage && (
        <div className="notification notification-success">
          <div className="notification-content">
            <CheckCircle size={20} />
            <span className="notification-text">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              className="notification-close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="notification notification-error">
          <div className="notification-content">
            <AlertTriangle size={20} />
            <span className="notification-text">{error}</span>
            <button
              onClick={() => setError('')}
              className="notification-close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="profile-header">
        <div className="header-card">
          <div className="header-content">
            {/* Avatar */}
            <div className="user-avatar">
              <div className="avatar-circle">
                {editableUser.fullName
                  ? editableUser.fullName.charAt(0).toUpperCase()
                  : (editableUser.email ? editableUser.email.charAt(0).toUpperCase() : 'U')
                }
              </div>
              <div className="avatar-status">
                <div className="status-dot"></div>
              </div>
            </div>

            {/* User Info */}
            <div className="user-info">
              <h1 className="user-name">
                {editableUser.fullName || 'User'}
              </h1>
              <p className="user-role">Security Analyst</p>
              <div className="user-badges">
                <span className="badge badge-verified">VERIFIED</span>
                <span className="badge badge-ai">AI-ENABLED</span>
              </div>
              <p className="user-email">{editableUser.email}</p>
            </div>

            {/* Actions */}
            <div className="header-actions">
              <div className="status-indicator">
                <div className="status-dot-pulse"></div>
                <span className="status-text">ONLINE</span>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} />
            <span>Profile</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={16} />
            <span>Security</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Activity size={16} />
            <span>Activity</span>
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="content-card">
            <div className="card-header">
              <div className="card-title-section">
                <div className="card-icon">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="card-title">Profile Settings</h2>
                  <p className="card-subtitle">Manage your account information</p>
                </div>
              </div>
              <button
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                disabled={saveLoading}
                className={`btn ${isEditing ? 'btn-success' : 'btn-primary'}`}
              >
                {saveLoading ? (
                  <>
                    <div className="loading-spinner" style={{ width: '1rem', height: '1rem' }}></div>
                    <span>Saving...</span>
                  </>
                ) : isEditing ? (
                  <>
                    <Save size={16} />
                    <span>Save</span>
                  </>
                ) : (
                  <>
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>

            <div className="form-grid">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">
                  <User size={16} />
                  Full Name
                </label>
                <input
                  type="text"
                  value={editableUser.fullName || ''}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={!isEditing}
                  className={`form-input ${validationErrors.fullName ? 'error' : ''}`}
                  placeholder="Enter your full name"
                />
                {validationErrors.fullName && (
                  <div className="error-message">
                    <AlertTriangle size={14} />
                    {validationErrors.fullName}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">
                  <Mail size={16} />
                  Email Address
                </label>
                <div className="input-with-button">
                  <input
                    type="email"
                    value={editableUser.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    className={`form-input ${validationErrors.email ? 'error' : ''}`}
                    placeholder="Enter your email"
                  />
                  <button
                    type="button"
                    onClick={handleEmailVerification}
                    disabled={!editableUser.email || isVerifyingEmail}
                    className={`verify-btn ${editableUser.emailVerified ? 'verified' : 'unverified'}`}
                  >
                    {isVerifyingEmail ? (
                      <div className="loading-spinner" style={{ width: '0.75rem', height: '0.75rem' }}></div>
                    ) : editableUser.emailVerified ? (
                      'Verified'
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
                {validationErrors.email && (
                  <div className="error-message">
                    <AlertTriangle size={14} />
                    {validationErrors.email}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label">
                  <Phone size={16} />
                  Phone Number
                </label>
                <div className="input-with-button">
                  <input
                    type="tel"
                    value={editableUser.phone || ''}
                    onChange={(e) => {
                      // Only allow digits, limit to 10 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      handleInputChange('phone', value);
                    }}
                    disabled={!isEditing}
                    className={`form-input ${validationErrors.phone ? 'error' : ''}`}
                    placeholder="9959511898 (10 digits only)"
                    maxLength="10"
                  />
                  <button
                    type="button"
                    onClick={handlePhoneVerification}
                    disabled={!editableUser.phone || isVerifyingPhone}
                    className={`verify-btn ${editableUser.phoneVerified ? 'verified' : 'unverified'}`}
                  >
                    {isVerifyingPhone ? (
                      <div className="loading-spinner" style={{ width: '0.75rem', height: '0.75rem' }}></div>
                    ) : editableUser.phoneVerified ? (
                      'Verified'
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Enter 10 digits only (e.g., 9959511898). Do not include +91 or country code.
                </div>
                {validationErrors.phone && (
                  <div className="error-message">
                    <AlertTriangle size={14} />
                    {validationErrors.phone}
                  </div>
                )}
              </div>

              {/* Account Info */}
              <div className="form-group">
                <label className="form-label">Account Information</label>
                <div className="account-info">
                  <div className="info-row">
                    <span className="info-label">User ID</span>
                    <span className="info-value">
                      {editableUser.username || editableUser.email?.split('@')[0] || 'N/A'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Member Since</span>
                    <span className="info-value">
                      {editableUser.createdAt
                        ? new Date(editableUser.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                        : 'Recently'
                      }
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Security Level</span>
                    <span className="info-value verified">Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="modal-footer">
                <button onClick={handleCancel} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="content-card">
            <div className="card-header">
              <div className="card-title-section">
                <div className="card-icon">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="card-title">Security Settings</h2>
                  <p className="card-subtitle">Manage your account security</p>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="security-item">
              <div className="security-info">
                <Lock size={20} />
                <div>
                  <h3 className="security-title">Password</h3>
                  <p className="security-description">Change your account password</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="btn btn-primary"
              >
                Change Password
              </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="security-item">
              <div className="security-info">
                <Shield size={20} />
                <div>
                  <h3 className="security-title">Two-Factor Authentication</h3>
                  <p className="security-description">Add an extra layer of security</p>
                </div>
              </div>
              <button disabled className="btn" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Coming Soon
              </button>
            </div>

            {/* Login Notifications */}
            <div className="security-item">
              <div className="security-info">
                <Mail size={20} />
                <div>
                  <h3 className="security-title">Login Notifications</h3>
                  <p className="security-description">Get notified of account access</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked className="toggle-input" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <>
            {/* Statistics Summary */}
            <div className="content-card">
              <div className="card-header">
                <div className="card-title-section">
                  <div className="card-icon">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h2 className="card-title">Security Analytics</h2>
                    <p className="card-subtitle">Your threat detection statistics</p>
                  </div>
                </div>
              </div>

              {statsLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <span className="loading-text">Loading statistics...</span>
                </div>
              ) : error && !userStats ? (
                <div className="empty-state">
                  <AlertTriangle className="empty-icon" />
                  <p className="empty-title">Failed to load statistics</p>
                  <button onClick={fetchUserStats} className="btn btn-primary">
                    Retry
                  </button>
                </div>
              ) : (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-header">
                      <Target size={20} style={{ color: '#3b82f6' }} />
                      <span className="stat-label">Total Scans</span>
                    </div>
                    <div className="stat-value">{userStats?.totalTests || 0}</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <Shield size={20} style={{ color: '#ef4444' }} />
                      <span className="stat-label">Threats Found</span>
                    </div>
                    <div className="stat-value">{userStats?.threatsDetected || 0}</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <AlertTriangle size={20} style={{ color: '#f97316' }} />
                      <span className="stat-label">Phishing</span>
                    </div>
                    <div className="stat-value">{userStats?.phishingTests || 0}</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <Bug size={20} style={{ color: '#8b5cf6' }} />
                      <span className="stat-label">Malware</span>
                    </div>
                    <div className="stat-value">{userStats?.malwareTests || 0}</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <Copy size={20} style={{ color: '#06b6d4' }} />
                      <span className="stat-label">Clone Sites</span>
                    </div>
                    <div className="stat-value">{userStats?.cloneTests || 0}</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <Zap size={20} style={{ color: '#10b981' }} />
                      <span className="stat-label">Sandbox</span>
                    </div>
                    <div className="stat-value">{userStats?.sandboxTests || 0}</div>
                  </div>
                </div>
              )}
            </div>

            {/* All Activities */}
            <div className="content-card">
              <div className="card-header">
                <div className="card-title-section">
                  <div className="card-icon">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h2 className="card-title">All Activities</h2>
                    <p className="card-subtitle">Complete history of your security scans (User ID: {user?._id})</p>
                  </div>
                </div>
                <button onClick={fetchRecentTests} className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
                  <Activity size={16} />
                  Refresh
                </button>
              </div>

              <div className="activity-list">
                {testsLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span className="loading-text">Loading all activities...</span>
                  </div>
                ) : recentTests && recentTests.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', fontSize: '0.875rem', color: '#3b82f6' }}>
                      <strong>Showing {recentTests.length} most recent activities</strong> linked to your account
                    </div>
                    {recentTests.map((test, index) => {
                      const getTestTypeLabel = (type) => {
                        const labels = {
                          'phishing-url': 'Phishing URL',
                          'phishing-email': 'Email Phishing',
                          'clone-ai': 'Clone Detection (AI)',
                          'clone-ml': 'Clone Detection (ML)',
                          'clone-combined': 'Clone Detection (Combined)',
                          'malware-virustotal': 'Malware (VirusTotal)',
                          'malware-sandbox': 'Malware (Sandbox)',
                          'scam-phone': 'Scam Phone'
                        };
                        return labels[type] || type;
                      };

                      const getTarget = (test) => {
                        if (test.inputData?.url) return test.inputData.url;
                        if (test.inputData?.fileName) return test.inputData.fileName;
                        if (test.inputData?.emailSubject) return test.inputData.emailSubject;
                        if (test.inputData?.phoneNumber) return test.inputData.phoneNumber;
                        if (test.inputData?.screenshotName) return test.inputData.screenshotName;
                        return 'Analysis';
                      };

                      const getThreatStatus = (test) => {
                        if (test.result.isPhishing) return { status: 'PHISHING DETECTED', color: '#ef4444' };
                        if (test.result.isMalware) return { status: 'MALWARE DETECTED', color: '#dc2626' };
                        if (test.result.isClone) return { status: 'CLONE DETECTED', color: '#f97316' };
                        if (test.result.isScam) return { status: 'SCAM DETECTED', color: '#ea580c' };
                        return { status: 'SAFE', color: '#10b981' };
                      };

                      const threat = getThreatStatus(test);

                      return (
                        <div key={test._id} className="activity-item" style={{ borderLeft: `4px solid ${threat.color}` }}>
                          <div className="activity-info">
                            <div className="activity-icon" style={{ fontSize: '1.5rem' }}>
                              {getThreatIcon(test.testType)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="activity-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {getTestTypeLabel(test.testType)}
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  padding: '0.125rem 0.5rem', 
                                  background: 'rgba(100, 116, 139, 0.1)', 
                                  borderRadius: '4px',
                                  color: '#64748b'
                                }}>
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="activity-description" style={{ 
                                maxWidth: '500px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {getTarget(test)}
                              </div>
                              {test.result.riskScore !== undefined && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                  Risk Score: {test.result.riskScore}% | Threat Level: {test.result.threatLevel || 'N/A'}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="activity-result">
                            <div className="activity-status" style={{ 
                              background: threat.color,
                              color: 'white',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {threat.status}
                            </div>
                            <div className="activity-date" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {formatDate(test.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="empty-state">
                    <Activity className="empty-icon" />
                    <p className="empty-title">No activities yet</p>
                    <p className="empty-description">Start scanning to see your complete activity history here</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <div className="card-icon">
                  <Lock size={20} />
                </div>
                <h3 className="modal-title">Change Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className={`form-input ${validationErrors.currentPassword ? 'error' : ''}`}
                  placeholder="Enter current password"
                />
                {validationErrors.currentPassword && (
                  <div className="error-message">
                    <AlertTriangle size={14} />
                    {validationErrors.currentPassword}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className={`form-input ${validationErrors.newPassword ? 'error' : ''}`}
                  placeholder="Enter new password (min 6 characters)"
                />
                {validationErrors.newPassword && (
                  <div className="error-message">
                    <AlertTriangle size={14} />
                    {validationErrors.newPassword}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`form-input ${validationErrors.confirmPassword ? 'error' : ''}`}
                  placeholder="Confirm new password"
                />
                {validationErrors.confirmPassword && (
                  <div className="error-message">
                    <AlertTriangle size={14} />
                    {validationErrors.confirmPassword}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={passwordLoading}
                className="btn btn-primary"
              >
                {passwordLoading ? (
                  <>
                    <div className="loading-spinner" style={{ width: '1rem', height: '1rem' }}></div>
                    <span>Changing...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="modal-overlay" onClick={handleCloseOtpModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <div className="card-icon">
                  {otpType === 'email' ? <Mail size={20} /> : <Phone size={20} />}
                </div>
                <h3 className="modal-title">
                  Verify {otpType === 'email' ? 'Email' : 'Phone Number'}
                </h3>
              </div>
              <button
                onClick={handleCloseOtpModal}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Enter the 6-digit OTP sent to your {otpType === 'email' ? 'email' : 'phone'}:
              </p>
              <p className="modal-target">
                <strong>{otpTarget}</strong>
              </p>
              
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  type="text"
                  value={otpValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpValue(value);
                  }}
                  className="form-input"
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '1.2rem', 
                    letterSpacing: '0.2rem',
                    fontWeight: 'bold'
                  }}
                />
              </div>

              <div className="otp-info">
                <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                  {otpType === 'email' ? 'Check your email inbox and spam folder' : 'Check your SMS messages'}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={handleCloseOtpModal}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleOtpVerification}
                disabled={otpLoading || otpValue.length !== 6}
                className="btn btn-primary"
              >
                {otpLoading ? (
                  <>
                    <div className="loading-spinner" style={{ width: '1rem', height: '1rem' }}></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    <span>Verify OTP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;