import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Shield, AlertTriangle, Clock, Activity } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5001/api/dashboard/stats', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score <= 30) return '#4ade80';
    if (score <= 70) return '#fbbf24';
    return '#ef4444';
  };

  const getThreatLevelBadge = (level) => {
    const colors = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[level] || colors.medium;
  };

  const getTestTypeIcon = (testType) => {
    if (testType.startsWith('phishing')) return '🔗';
    if (testType.startsWith('clone')) return '🌐';
    if (testType.startsWith('malware')) return '🦠';
    if (testType.startsWith('scam')) return '📞';
    return '🔍';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <Activity className="animate-spin" size={48} style={{ margin: '0 auto 20px' }} />
          <p style={{ fontSize: '1.25rem' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 20px' }} />
          <p>Failed to load dashboard statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: 'white',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px'
          }}>
            <BarChart3 size={40} />
            Security Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem' }}>
            Your security testing overview and statistics
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {/* Total Tests */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'transform 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Shield size={24} style={{ color: '#60a5fa' }} />
              <h3 style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>Total Tests</h3>
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
              {stats.totalTests}
            </p>
          </div>

          {/* Last 24 Hours */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'transform 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Clock size={24} style={{ color: '#34d399' }} />
              <h3 style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>Last 24 Hours</h3>
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
              {stats.testsLast24h}
            </p>
          </div>

          {/* Last 7 Days */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'transform 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <TrendingUp size={24} style={{ color: '#fbbf24' }} />
              <h3 style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>Last 7 Days</h3>
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
              {stats.testsLast7d}
            </p>
          </div>

          {/* Last 30 Days */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'transform 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Activity size={24} style={{ color: '#a78bfa' }} />
              <h3 style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>Last 30 Days</h3>
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
              {stats.testsLast30d}
            </p>
          </div>
        </div>

        {/* Tests by Type */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '30px',
          border: '1px solid rgba(255,255,255,0.2)',
          marginBottom: '40px'
        }}>
          <h2 style={{ 
            color: 'white', 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <BarChart3 size={24} />
            Tests by Category
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {/* Phishing */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '8px'
              }}>🔗</div>
              <p style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '4px' }}>
                {stats.testsByType.phishing}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Phishing Tests</p>
            </div>

            {/* Clone */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '8px'
              }}>🌐</div>
              <p style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '4px' }}>
                {stats.testsByType.clone}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Clone Tests</p>
            </div>

            {/* Malware */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '8px'
              }}>🦠</div>
              <p style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '4px' }}>
                {stats.testsByType.malware}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Malware Tests</p>
            </div>

            {/* Scam */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '8px'
              }}>📞</div>
              <p style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '4px' }}>
                {stats.testsByType.scam}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Scam Tests</p>
            </div>
          </div>

          {/* Average Risk Score */}
          <div style={{ 
            marginTop: '30px', 
            padding: '20px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Average Risk Score</p>
            <p style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold',
              color: getRiskColor(stats.averageRiskScore)
            }}>
              {stats.averageRiskScore}
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '30px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <h2 style={{ 
            color: 'white', 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Clock size={24} />
            Recent Activity
          </h2>

          {stats.recentTests.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '40px' }}>
              No tests yet. Start by running your first security test!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recentTests.map((test, index) => (
                <div 
                  key={index}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ fontSize: '2rem' }}>
                      {getTestTypeIcon(test.testType)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                        {test.testType.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </p>
                      <p style={{ 
                        color: 'rgba(255,255,255,0.6)', 
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '400px'
                      }}>
                        {test.inputData?.url || test.inputData?.fileName || test.inputData?.phoneNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {test.result?.riskScore !== undefined && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: 'bold',
                          color: getRiskColor(test.result.riskScore)
                        }}>
                          {test.result.riskScore}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Risk</p>
                      </div>
                    )}
                    
                    {test.result?.threatLevel && (
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        border: '1px solid',
                        textTransform: 'uppercase'
                      }}
                      className={getThreatLevelBadge(test.result.threatLevel)}
                      >
                        {test.result.threatLevel}
                      </span>
                    )}
                    
                    <p style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      fontSize: '0.875rem',
                      minWidth: '80px',
                      textAlign: 'right'
                    }}>
                      {formatDate(test.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
