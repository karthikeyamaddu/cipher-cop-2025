import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editableUser, setEditableUser] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [recentTests, setRecentTests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setEditableUser(user);
      fetchUserStats();
      fetchRecentTests();
    }
    setLoading(false);
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/tests/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Stats response:', result);
        
        if (result.success) {
          const statsData = result.data;
          const transformedStats = {
            totalTests: statsData.totalTests || 0,
            threatsDetected: statsData.summary.totalThreats || 0,
            phishingTests: 0,
            malwareTests: 0,
            cloneTests: 0,
            scamTests: 0,
            sandboxTests: 0
          };

          if (statsData.byType) {
            statsData.byType.forEach(stat => {
              switch(stat._id) {
                case 'phishing':
                  transformedStats.phishingTests = stat.count;
                  break;
                case 'malware':
                  transformedStats.malwareTests = stat.count;
                  break;
                case 'clone':
                  transformedStats.cloneTests = stat.count;
                  break;
                case 'scam':
                  transformedStats.scamTests = stat.count;
                  break;
                case 'sandbox':
                  transformedStats.sandboxTests = stat.count;
                  break;
              }
            });
          }

          setUserStats(transformedStats);
          setError('');
        } else {
          console.error('Failed to fetch user stats:', result.error);
          setError('Failed to load statistics');
        }
      } else {
        console.error('Failed to fetch user stats, status:', response.status);
        setError('Failed to load statistics');
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError('Failed to load statistics');
    }
  };

  const fetchRecentTests = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/tests/history?limit=5', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Tests response:', result);
        
        if (result.success && result.data.tests) {
          setRecentTests(result.data.tests.slice(0, 5));
        } else {
          console.error('Failed to fetch recent tests:', result.error);
        }
      } else {
        console.error('Failed to fetch recent tests, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching recent tests:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setEditableUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/user/update', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: editableUser.fullName,
          email: editableUser.email
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsEditing(false);
        alert('Profile updated successfully!');
        if (result.data) {
          setEditableUser(prev => ({
            ...prev,
            fullName: result.data.fullName,
            email: result.data.email
          }));
        }
      } else {
        alert(`Failed to update profile: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div>Initializing security protocols...</div>
        </div>
        <style jsx>{`
          .loading-container {
            width: 100%;
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 60%, #0f3460 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00d4ff;
            font-size: 18px;
            font-family: 'Inter', 'Arial', sans-serif;
          }
          .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0,212,255,0.3);
            border-left-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
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

      {/* Header */}
      <div className="profile-header">
        <div className="header-content">
          <div className="user-avatar">
            <div className="avatar-circle">
              {editableUser.fullName 
                ? editableUser.fullName.charAt(0).toUpperCase() 
                : (editableUser.email ? editableUser.email.charAt(0).toUpperCase() : 'U')
              }
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
        {/* Profile Management Card */}
        <div className="content-card profile-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="title-icon">🔐</span>
              Operative Profile Configuration
            </h2>
            <button 
              className={`action-btn ${isEditing ? 'save-btn' : 'edit-btn'}`}
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
            >
              {isEditing ? '💾 Secure Changes' : '⚙️ Modify Profile'}
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
                  className={isEditing ? 'editable' : ''}
                  placeholder="Enter operative full name"
                />
              </div>
              <div className="form-group">
                <label>📧 Secure Contact</label>
                <input
                  type="email"
                  value={editableUser.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  className={isEditing ? 'editable' : ''}
                  placeholder="Enter encrypted communication address"
                />
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
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setIsEditing(false);
                    setEditableUser(user);
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="content-card stats-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="title-icon">🛡️</span>
              Threat Intelligence Dashboard
            </h2>
            <div className="card-subtitle">
              <span className="ai-indicator">🤖</span>
              AI-Enhanced Security Metrics
            </div>
          </div>

          {error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <div className="error-message">{error}</div>
              <button className="retry-btn" onClick={fetchUserStats}>Retry</button>
            </div>
          ) : (
            <div className="stats-grid">
              <div className="stat-item total-tests">
                <div className="stat-icon">🔍</div>
                <div className="stat-content">
                  <div className="stat-number">{userStats?.totalTests || 0}</div>
                  <div className="stat-label">Total Analysis</div>
                </div>
                <div className="stat-trend">⚡</div>
              </div>

              <div className="stat-item threats-found critical">
                <div className="stat-icon">🚨</div>
                <div className="stat-content">
                  <div className="stat-number">{userStats?.threatsDetected || 0}</div>
                  <div className="stat-label">Threats Neutralized</div>
                </div>
                <div className="stat-trend">🛡️</div>
              </div>

              <div className="stat-item phishing-tests">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <div className="stat-number">{userStats?.phishingTests || 0}</div>
                  <div className="stat-label">Phishing Detected</div>
                </div>
                <div className="stat-trend">⚡</div>
              </div>

              <div className="stat-item malware-tests">
                <div className="stat-icon">🛡️</div>
                <div className="stat-content">
                  <div className="stat-number">{userStats?.malwareTests || 0}</div>
                  <div className="stat-label">Malware Quarantined</div>
                </div>
                <div className="stat-trend">🔬</div>
              </div>

              <div className="stat-item clone-tests">
                <div className="stat-icon">🔄</div>
                <div className="stat-content">
                  <div className="stat-number">{userStats?.cloneTests || 0}</div>
                  <div className="stat-label">Clone Sites Found</div>
                </div>
                <div className="stat-trend">🎯</div>
              </div>

              <div className="stat-item sandbox-tests">
                <div className="stat-icon">🧬</div>
                <div className="stat-content">
                  <div className="stat-number">{userStats?.sandboxTests || 0}</div>
                  <div className="stat-label">AI Sandbox Analysis</div>
                </div>
                <div className="stat-trend">🤖</div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Tests */}
        <div className="content-card recent-tests-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="title-icon">📊</span>
              Mission Activity Log
            </h2>
            <div className="card-subtitle">
              <span className="live-indicator"></span>
              Recent threat analysis operations
            </div>
          </div>

          <div className="tests-list">
            {recentTests && recentTests.length > 0 ? (
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
                  onClick={() => navigate('/dashboard')}
                >
                  Begin Mission
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .profile-container {
          min-height: 100vh;
          height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 60%, #0f3460 100%);
          color: #e2e8f0;
          padding: 20px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow-x: hidden;
          overflow-y: auto;
          font-family: 'Inter', 'Arial', sans-serif;
          scroll-behavior: smooth;
        }

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

        .profile-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #00ff88, #ff6b35);
        }

        .bg-effects {
          position: fixed;
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
          animation: float 8s ease-in-out infinite;
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
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #00ff88, transparent);
          bottom: -150px;
          left: -150px;
          animation-delay: 2s;
        }

        .bg-orb-3 {
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, #ff6b35, transparent);
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(180deg); }
        }

        .profile-header {
          margin-bottom: 30px;
          animation: slideInDown 0.6s ease-out;
          position: relative;
          z-index: 1;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 25px;
          background: rgba(0, 212, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 24px;
          padding: 30px;
          box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
        }

        .user-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-circle {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          color: #0a0a0f;
          box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3);
          position: relative;
        }

        .avatar-circle::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: linear-gradient(45deg, #00d4ff, #00ff88, #ff6b35);
          z-index: -1;
          animation: rotate 4s linear infinite;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .avatar-status {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 22px;
          height: 22px;
          background: #00ff88;
          border-radius: 50%;
          border: 3px solid rgba(0, 255, 136, 0.3);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-size: 32px;
          margin: 0 0 8px 0;
          font-weight: 700;
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-transform: uppercase;
          letter-spacing: 1.5px;
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
          padding: 6px 12px;
          border-radius: 16px;
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
          margin: 0;
        }

        .header-actions {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: flex-end;
        }

        .system-status {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 255, 136, 0.1);
          padding: 10px 16px;
          border-radius: 16px;
          border: 1px solid rgba(0, 255, 136, 0.2);
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-indicator.online {
          background: #00ff88;
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
          border-radius: 16px;
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

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
          max-width: 1200px;
          margin: 0 auto;
          padding-bottom: 40px;
          position: relative;
          z-index: 1;
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
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 212, 255, 0.15);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        }

        .ai-indicator {
          margin-right: 8px;
          animation: pulse 2s infinite;
        }

        .live-indicator {
          width: 8px;
          height: 8px;
          background: #00ff88;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
          margin-right: 8px;
        }

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
        }

        .edit-btn {
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: #000;
        }

        .save-btn {
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          color: #000;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 212, 255, 0.4);
        }

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
          padding: 14px 18px;
          color: #e2e8f0;
          font-size: 16px;
          transition: all 0.3s ease;
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

        .form-group input:focus {
          outline: none;
          border-color: #00d4ff;
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
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
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 10px;
        }

        .stats-grid::-webkit-scrollbar {
          width: 6px;
        }

        .stats-grid::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .stats-grid::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #00d4ff, #00ff88);
          border-radius: 3px;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 18px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
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
          font-size: 28px;
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 700;
          color: #e2e8f0;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-trend {
          font-size: 20px;
          opacity: 0.8;
        }

        .tests-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 400px;
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
          transform: translateX(4px);
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

        .error-state {
          text-align: center;
          padding: 40px 20px;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.7;
        }

        .error-message {
          font-size: 16px;
          color: #ef4444;
          margin-bottom: 20px;
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
            flex-direction: row;
            width: 100%;
            justify-content: center;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .user-name {
            font-size: 24px;
          }

          .card-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }

          .content-card {
            padding: 24px;
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
