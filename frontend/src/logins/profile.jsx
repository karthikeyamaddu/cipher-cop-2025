import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
    profession: '',
    email: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [testHistory, setTestHistory] = useState([]);
  const [testStats, setTestStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile info (from existing auth)
        const authResponse = await fetch("http://localhost:5001/checkAuth", {
          method: "GET",
          credentials: "include",
        });
        if (authResponse.ok) {
          const userData = await authResponse.json();
          setProfile({
            fullName: userData.user.fullName || 'John Doe',
            phone: '9876543210',
            profession: 'Cybersecurity Analyst',
            email: userData.user.email || 'john@example.com'
          });
        }

        // Fetch test history
        const historyResponse = await fetch("http://localhost:5001/api/tests/history?limit=5", {
          method: "GET",
          credentials: "include",
        });
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setTestHistory(historyData.data.tests);
        }

        // Fetch test statistics
        const statsResponse = await fetch("http://localhost:5001/api/tests/stats", {
          method: "GET",
          credentials: "include",
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setTestStats(statsData.data);
        }

      } catch (error) {
        console.error("Failed to fetch profile data:", error);
        // Fallback data
        setProfile({
          fullName: 'John Doe',
          phone: '9876543210',
          profession: 'Cybersecurity Analyst',
          email: 'john@example.com'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTestIcon = (testType) => {
    switch (testType) {
      case 'phishing': return '🎣';
      case 'malware': return '🦠';
      case 'clone': return '👥';
      case 'scam': return '💰';
      default: return '🔍';
    }
  };

  const getThreatColor = (result) => {
    // Check boolean threat indicators first
    if (result.isPhishing || result.isMalware || result.isClone || result.isScam) {
      return '#ef4444'; // Red for confirmed threats
    }
    
    // Check threat level for non-boolean assessments (like medium risk phishing)
    if (result.threatLevel === 'high') {
      return '#ef4444'; // Red for high threat
    } else if (result.threatLevel === 'medium') {
      return '#f59e0b'; // Orange for medium threat
    }
    
    return '#22c55e'; // Green for safe/low threat
  };

  const firstLetter = profile.fullName ? profile.fullName[0].toUpperCase() : 'U';

  if (loading) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 60%, #475569 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0',
        fontSize: 18
      }}>
        Loading Profile...
      </div>
    );
  }

  return (
    <div className="profile-container" style={{ 
      width: '100%', 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 60%, #475569 100%)', 
      position: 'relative', 
      padding: '48px 0', 
      fontFamily: 'Inter, system-ui, sans-serif',
      animation: 'fadeIn 0.8s ease-out'
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '150px',
        height: '150px',
        background: 'rgba(59,130,246,0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '8%',
        width: '200px',
        height: '200px',
        background: 'rgba(99,102,241,0.15)',
        borderRadius: '50%',
        filter: 'blur(50px)'
      }}></div>

      {/* Profile Header */}
      <div style={{ 
        position: 'absolute', 
        top: 32, 
        right: 48, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 20,
        animation: 'slideInRight 0.6s ease-out'
      }}>
        <div style={{ 
          width: 70, 
          height: 70, 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)', 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: 32, 
          fontWeight: 'bold', 
          boxShadow: '0 8px 32px rgba(30,64,175,0.4)', 
          border: '4px solid rgba(255,255,255,0.9)',
          transition: 'transform 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          {firstLetter}
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          background: 'rgba(30,41,59,0.9)', 
          borderRadius: 16, 
          padding: '12px 24px', 
          boxShadow: '0 4px 20px rgba(15,23,42,0.3)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59,130,246,0.3)'
        }}>
          <span style={{ 
            fontSize: 24, 
            fontWeight: 800, 
            color: '#e2e8f0', 
            letterSpacing: '0.5px',
            lineHeight: 1.2
          }}>{profile.fullName || 'User'}</span>
          <span style={{ 
            color: '#94a3b8', 
            fontSize: 16, 
            fontWeight: 500,
            marginTop: '2px'
          }}>{profile.profession || 'Profession'}</span>
        </div>
      </div>
      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        gap: 32, 
        marginTop: 140,
        animation: 'slideInUp 0.8s ease-out 0.2s both',
        padding: '0 20px'
      }}>
        {/* Left Column - Profile Edit Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 360, maxWidth: 400 }}>
          {/* Edit Form */}
          <form style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 28, 
            background: 'rgba(30,41,59,0.95)', 
            borderRadius: 24, 
            boxShadow: '0 8px 40px rgba(15,23,42,0.4)', 
            padding: '40px 32px', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59,130,246,0.3)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 48px rgba(15,23,42,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(15,23,42,0.4)';
          }}
          >
          <div style={{ 
            textAlign: 'center', 
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '2px solid rgba(59,130,246,0.3)'
          }}>
            <h3 style={{ 
              fontSize: 22, 
              fontWeight: 700, 
              color: '#e2e8f0', 
              margin: 0,
              letterSpacing: '0.5px'
            }}>Edit Profile</h3>
            <p style={{
              fontSize: 14,
              color: '#94a3b8',
              margin: '4px 0 0 0'
            }}>Update your personal information</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ 
              fontWeight: 600, 
              color: '#e2e8f0', 
              fontSize: 15,
              marginBottom: 4
            }}>Full Name</label>
            <input 
              name="fullName" 
              value={profile.fullName} 
              onChange={handleChange} 
              disabled={!editMode} 
              style={{ 
                padding: '14px 18px', 
                borderRadius: 12, 
                border: editMode ? '2px solid #3b82f6' : '2px solid #64748b', 
                fontSize: 16, 
                background: editMode ? '#1e293b' : '#334155', 
                color: '#e2e8f0',
                transition: 'all 0.3s ease', 
                outline: 'none',
                boxShadow: editMode ? '0 2px 12px rgba(59,130,246,0.2)' : 'none',
                fontFamily: 'inherit'
              }} 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ 
              fontWeight: 600, 
              color: '#e2e8f0', 
              fontSize: 15,
              marginBottom: 4
            }}>Phone Number</label>
            <input 
              name="phone" 
              value={profile.phone} 
              onChange={handleChange} 
              disabled={!editMode} 
              style={{ 
                padding: '14px 18px', 
                borderRadius: 12, 
                border: editMode ? '2px solid #3b82f6' : '2px solid #64748b', 
                fontSize: 16, 
                background: editMode ? '#1e293b' : '#334155', 
                color: '#e2e8f0',
                transition: 'all 0.3s ease', 
                outline: 'none',
                boxShadow: editMode ? '0 2px 12px rgba(59,130,246,0.2)' : 'none',
                fontFamily: 'inherit'
              }} 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ 
              fontWeight: 600, 
              color: '#e2e8f0', 
              fontSize: 15,
              marginBottom: 4
            }}>Profession</label>
            <input 
              name="profession" 
              value={profile.profession} 
              onChange={handleChange} 
              disabled={!editMode} 
              style={{ 
                padding: '14px 18px', 
                borderRadius: 12, 
                border: editMode ? '2px solid #3b82f6' : '2px solid #64748b', 
                fontSize: 16, 
                background: editMode ? '#1e293b' : '#334155', 
                color: '#e2e8f0',
                transition: 'all 0.3s ease', 
                outline: 'none',
                boxShadow: editMode ? '0 2px 12px rgba(59,130,246,0.2)' : 'none',
                fontFamily: 'inherit'
              }} 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ 
              fontWeight: 600, 
              color: '#e2e8f0', 
              fontSize: 15,
              marginBottom: 4
            }}>Email</label>
            <input 
              name="email" 
              value={profile.email} 
              onChange={handleChange} 
              disabled={!editMode} 
              style={{ 
                padding: '14px 18px', 
                borderRadius: 12, 
                border: editMode ? '2px solid #3b82f6' : '2px solid #64748b', 
                fontSize: 16, 
                background: editMode ? '#1e293b' : '#334155', 
                color: '#e2e8f0',
                transition: 'all 0.3s ease', 
                outline: 'none',
                boxShadow: editMode ? '0 2px 12px rgba(59,130,246,0.2)' : 'none',
                fontFamily: 'inherit'
              }} 
            />
          </div>
          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 16, 
            marginTop: 28,
            paddingTop: 20,
            borderTop: '2px solid rgba(59,130,246,0.3)'
          }}>
            <button 
              type="button" 
              onClick={() => setEditMode(!editMode)} 
              style={{ 
                background: editMode 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                color: '#fff', 
                border: 'none', 
                padding: '14px 32px', 
                borderRadius: 12, 
                fontWeight: 600, 
                fontSize: 16, 
                boxShadow: '0 4px 16px rgba(59,130,246,0.3)', 
                cursor: 'pointer', 
                transition: 'all 0.3s ease', 
                letterSpacing: '0.5px',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(59,130,246,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(59,130,246,0.3)';
              }}
            >
              {editMode ? '💾 Save Changes' : '✏️ Edit Profile'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/Home')} 
              style={{ 
                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', 
                color: '#fff', 
                border: 'none', 
                padding: '14px 32px', 
                borderRadius: 12, 
                fontWeight: 600, 
                fontSize: 16, 
                boxShadow: '0 4px 16px rgba(100,116,139,0.3)', 
                cursor: 'pointer', 
                transition: 'all 0.3s ease', 
                letterSpacing: '0.5px',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(100,116,139,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(100,116,139,0.3)';
              }}
            >
              🏠 Back to Home
            </button>
          </div>
        </form>

        {/* Test Statistics */}
        {testStats && (
          <div style={{ 
            background: 'rgba(30,41,59,0.95)', 
            borderRadius: 24, 
            boxShadow: '0 8px 40px rgba(15,23,42,0.4)', 
            padding: '32px', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59,130,246,0.3)'
          }}>
            <h3 style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              color: '#e2e8f0', 
              margin: '0 0 20px 0',
              letterSpacing: '0.5px',
              textAlign: 'center'
            }}>📊 Test Statistics</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: 8,
                border: '1px solid rgba(59,130,246,0.4)'
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Total Tests:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{testStats.totalTests}</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: 8,
                border: '1px solid rgba(59,130,246,0.4)'
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Threats Found:</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>{testStats.summary.totalThreats}</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: 8,
                border: '1px solid rgba(59,130,246,0.4)'
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Avg Risk Score:</span>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>{Math.round(testStats.summary.avgRiskScore)}%</span>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Right Column - Profile Overview & Test History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 400, maxWidth: 500 }}>
          {/* Profile Summary */}
          <div style={{ 
            background: 'rgba(30,41,59,0.95)', 
            borderRadius: 24, 
            boxShadow: '0 8px 40px rgba(15,23,42,0.4)', 
            padding: '40px 32px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 24, 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59,130,246,0.3)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 48px rgba(15,23,42,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(15,23,42,0.4)';
          }}
          >
            <div style={{ 
              textAlign: 'center', 
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: '2px solid rgba(59,130,246,0.3)'
            }}>
              <h3 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                color: '#e2e8f0', 
                margin: 0,
                letterSpacing: '0.5px'
              }}>Profile Overview</h3>
              <p style={{
                fontSize: 14,
                color: '#94a3b8',
                margin: '4px 0 0 0'
              }}>Your current information</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
                borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.4)'
              }}>
                <div style={{ color: '#60a5fa', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>👤 Full Name</div>
                <div style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 500 }}>{profile.fullName}</div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
                borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.4)'
              }}>
                <div style={{ color: '#60a5fa', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>📞 Phone Number</div>
                <div style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 500 }}>{profile.phone}</div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
                borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.4)'
              }}>
                <div style={{ color: '#60a5fa', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>💼 Profession</div>
                <div style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 500 }}>{profile.profession}</div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
                borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.4)'
              }}>
                <div style={{ color: '#60a5fa', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>📧 Email</div>
                <div style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 500 }}>{profile.email}</div>
              </div>
            </div>
          </div>

          {/* Test History */}
          <div style={{ 
            background: 'rgba(30,41,59,0.95)', 
            borderRadius: 24, 
            boxShadow: '0 8px 40px rgba(15,23,42,0.4)', 
            padding: '32px', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59,130,246,0.3)'
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '2px solid rgba(59,130,246,0.3)'
            }}>
              <h3 style={{ 
                fontSize: 20, 
                fontWeight: 700, 
                color: '#e2e8f0', 
                margin: 0,
                letterSpacing: '0.5px'
              }}>🕒 Recent Tests</h3>
              <span style={{ 
                fontSize: 14, 
                color: '#94a3b8' 
              }}>Last 5 tests</span>
            </div>
            
            {testHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {testHistory.map((test, index) => (
                  <div 
                    key={test._id} 
                    style={{ 
                      padding: '16px', 
                      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
                      borderRadius: 12,
                      border: '1px solid rgba(59,130,246,0.4)',
                      transition: 'transform 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateX(4px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateX(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{getTestIcon(test.testType)}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600, textTransform: 'capitalize' }}>
                          {test.testType} Test
                        </span>
                      </div>
                      <div style={{ 
                        color: getThreatColor(test.result),
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,0.2)'
                      }}>
                        {/* Show proper threat level instead of just THREAT/SAFE */}
                        {test.result.isPhishing || test.result.isMalware || test.result.isClone || test.result.isScam 
                          ? 'THREAT' 
                          : test.result.threatLevel === 'high' 
                            ? 'HIGH RISK'
                            : test.result.threatLevel === 'medium'
                              ? 'MEDIUM RISK'
                              : 'SAFE'}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                      {test.inputData.url || test.inputData.fileName || 'Content analysis'}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {formatDate(test.createdAt)}
                      </span>
                      <span style={{ fontSize: 12, color: '#60a5fa' }}>
                        Risk: {test.result.riskScore || 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: '#94a3b8' 
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontSize: 16 }}>No tests performed yet</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>Start testing URLs, files, and content to see your history here!</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Title */}
      <div style={{ 
        position: 'absolute', 
        top: 24, 
        left: 40, 
        fontSize: 18, 
        color: 'rgba(255,255,255,0.9)', 
        fontWeight: 600, 
        letterSpacing: '1px',
        textTransform: 'uppercase',
        animation: 'slideInLeft 0.6s ease-out'
      }}>
        ⚙️ Profile Settings
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(50px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInLeft {
          from { 
            opacity: 0;
            transform: translateX(-50px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
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
      `}</style>
    </div>
  );
};

export default ProfilePage;
