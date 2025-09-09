import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Bug, Copy, DollarSign, Menu, X, Lock, Eye, Users, Zap, TrendingUp, Globe, CheckCircle, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PhishingPage from './PhishingPage';
import MalwarePage from './MalwarePage';
import ClonePage from './ClonePage';
import ScamPage from './ScamPage';
import './Home.css';
import ProfilePage from './profile.jsx';
const Home = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Changed to false by default
  const [isLoading, setIsLoading] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);
  const { user, logout, isAuthenticated, checkAuthStatus } = useAuth();
  const navigate = useNavigate();

  // Check authentication when component mounts
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle feature activation after login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const activateFeature = urlParams.get('feature') ||
      (window.history.state && window.history.state.activateFeature);

    if (activateFeature && isAuthenticated) {
      setActiveSection(activateFeature);
      // Clean up the URL
      window.history.replaceState(null, '', '/Home');
    }
  }, [isAuthenticated]);

  const handleFeatureAccess = (featureId) => {
    if (!isAuthenticated) {
      // Store the feature they wanted to access
      sessionStorage.setItem('requestedFeature', featureId);
      navigate('/Login', { state: { from: '/Home', requestedFeature: featureId } });
      return;
    }
    // User is authenticated, allow access to feature
    setActiveSection(featureId);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setActiveSection('home'); // Reset to home after logout
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Reduced loading time
    return () => clearTimeout(timer);
  }, []);

  // Trigger animations when section changes
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [activeSection]);

  const sidebarItems = [
    { id: 'phishing', name: 'Phishing', icon: AlertTriangle },
    { id: 'malware', name: 'Malware Detection', icon: Bug },
    { id: 'clone', name: 'Clone Check', icon: Copy },
    { id: 'scam', name: 'Scam Check', icon: DollarSign },
    { id: 'profile', name: 'Profile', icon: User }
  ];

  const features = [
    {
      icon: Shield,
      title: 'Advanced Threat Protection',
      description: 'Real-time monitoring and protection against cyber threats',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      icon: Eye,
      title: '24/7 Security Monitoring',
      description: 'Continuous surveillance of your digital assets',
      gradient: 'from-green-500 to-blue-500'
    },
    {
      icon: Users,
      title: 'Expert Security Team',
      description: 'Dedicated professionals ensuring your safety',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Zap,
      title: 'Rapid Response',
      description: 'Instant alerts and immediate threat mitigation',
      gradient: 'from-yellow-500 to-red-500'
    }
  ];

  const stats = [
    { number: '99.9%', label: 'Uptime', icon: TrendingUp },
    { number: '24/7', label: 'Support', icon: Users },
    { number: '500K+', label: 'Protected Sites', icon: Globe },
    { number: '0', label: 'Breaches', icon: CheckCircle }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'phishing':
        return <PhishingPage key={animationKey} />;
      case 'malware':
        return <MalwarePage key={animationKey} />;
      case 'clone':
        return <ClonePage key={animationKey} />;
      case 'scam':
        return <ScamPage key={animationKey} />;
      case 'profile':
        return <ProfilePage key={animationKey} />;
        return <React.Suspense fallback={<div>Loading Profile...</div>}>
          {React.createElement(require('./profile.jsx').default)}
        </React.Suspense>;
      default:
        return (
          <div className="home-content">
            <div className="hero-section">
              <div className="hero-text animate-slide-in-left">
                <h1>Spot the Fake</h1>
                <p>Advanced cybersecurity solutions to protect your digital assets. Detect phishing, analyze malware, check for website clones, and identify scams with our comprehensive security suite.</p>
                <div className="hero-buttons">
                  <button
                    className="btn-primary hover-scale"
                    onClick={() => !isAuthenticated ? navigate('/Login') : handleFeatureAccess('phishing')}
                  >
                    Get Started
                  </button>
                  <button className="btn-secondary hover-scale">Learn More</button>
                </div>
              </div>
              <div className="hero-visual animate-slide-in-right">
                <div className="security-shield">
                  <Shield size={80} />
                  <div className="shield-rings">
                    <div className="ring ring-1"></div>
                    <div className="ring ring-2"></div>
                    <div className="ring ring-3"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="features-section">
              <h2 className="animate-slide-in-up">Security Features</h2>
              <div className="features-grid">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="feature-item animate-fade-in-up hover-lift"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    <div className={`feature-icon-wrapper bg-gradient-to-br ${feature.gradient}`}>
                      <feature.icon className="feature-icon" />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Loading Screen */}
      {isLoading && (
        <div className="loading-screen">
          <div className="loading-spinner">
            <Shield size={48} className="animate-spin" />
          </div>
          <div className="loading-text">Loading CyberShield...</div>
        </div>
      )}

      <div className={`app ${isLoading ? 'loading' : ''}`}>
        {/* Sidebar */}
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo animate-pulse">
              <Lock className="logo-icon" />
              <span>CyberShield</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li>
                <button
                  className={`nav-item ${activeSection === 'home' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSection('home');
                    setSidebarOpen(false);
                  }}
                >
                  <Shield className="nav-icon" />
                  <span>Home</span>
                </button>
              </li>
              {sidebarItems.map((item) => (
                <li key={item.id}>
                  <button
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => handleFeatureAccess(item.id)}
                  >
                    <item.icon className="nav-icon" />
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <header className="header">
            <div className="header-left">
              <button
                className="hamburger-menu"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
              >
                <div className={`hamburger-lines ${sidebarOpen ? 'open' : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
              <div className="header-title">
                <h1>Cybersecurity Dashboard</h1>
              </div>
            </div>
            <div className="header-actions">
              {isAuthenticated ? (
                <>
                  <div className="user-info">
                    <User size={20} />
                    <span>Welcome, {user?.fullName || 'User'}</span>
                  </div>
                  <button
                    className="logout-btn"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut size={20} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="auth-buttons">
                  <button
                    className="login-btn"
                    onClick={() => navigate('/Login')}
                  >
                    <User size={20} />
                    <span>Login</span>
                  </button>
                  <button
                    className="signup-btn"
                    onClick={() => navigate('/Signup')}
                  >
                    <span>Sign Up</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="content">
            {renderContent()}
          </main>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="overlay"
            onClick={() => setSidebarOpen(false)}
            style={{
              opacity: sidebarOpen ? 1 : 0,
              visibility: sidebarOpen ? 'visible' : 'hidden'
            }}
          />
        )}
      </div>
    </>
  );
};

export default Home;