import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activePolls, setActivePolls] = useState(new Map());

  // Start polling for a test
  const startPolling = (testId, testType, pageRoute) => {
    if (activePolls.has(testId)) {
      return; // Already polling
    }

    console.log(`📡 Starting polling for test ${testId} (${testType})`);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `http://localhost:5001/api/tests/${testId}/status`,
          { credentials: 'include' }
        );

        const data = await response.json();

        if (data.success && data.data) {
          const status = data.data.processingStatus;

          if (status === 'completed') {
            clearInterval(pollInterval);
            setActivePolls(prev => {
              const newMap = new Map(prev);
              newMap.delete(testId);
              return newMap;
            });

            // Get the correct risk score (use combinedRiskScore for phishing URL with AI)
            const result = data.data.result;
            const displayRiskScore = result.combinedRiskScore || result.riskScore || 0;

            // Show notification
            showNotification({
              testId,
              testType,
              pageRoute,
              result: {
                ...result,
                riskScore: displayRiskScore // Use combined score if available
              },
              details: data.data.details,
              timestamp: new Date()
            });

            console.log(`✅ Test ${testId} completed, notification shown (Risk: ${displayRiskScore})`);
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            setActivePolls(prev => {
              const newMap = new Map(prev);
              newMap.delete(testId);
              return newMap;
            });

            console.log(`❌ Test ${testId} failed`);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    setActivePolls(prev => {
      const newMap = new Map(prev);
      newMap.set(testId, pollInterval);
      return newMap;
    });
  };

  // Stop polling for a test
  const stopPolling = (testId) => {
    const pollInterval = activePolls.get(testId);
    if (pollInterval) {
      clearInterval(pollInterval);
      setActivePolls(prev => {
        const newMap = new Map(prev);
        newMap.delete(testId);
        return newMap;
      });
      console.log(`🛑 Stopped polling for test ${testId}`);
    }
  };

  // Show notification
  const showNotification = (notification) => {
    setNotifications(prev => [...prev, { ...notification, id: Date.now() }]);
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // View detailed report (redirect and open modal)
  const viewDetailedReport = (testId, testType, pageRoute) => {
    console.log('🔗 Navigating to:', pageRoute);
    console.log('📍 Current location:', window.location.pathname);
    
    // Store testId in sessionStorage to open modal on page load
    sessionStorage.setItem('openModalForTest', testId);
    
    // Parse the pageRoute to get path and search params
    const url = new URL(pageRoute, window.location.origin);
    const pathname = url.pathname;
    const search = url.search;
    
    console.log('🎯 Target path:', pathname, 'Search:', search);
    
    // Navigate with search params
    navigate({
      pathname: pathname,
      search: search
    });
    
    // Remove notification after a short delay
    setTimeout(() => {
      const notification = notifications.find(n => n.testId === testId);
      if (notification) {
        removeNotification(notification.id);
      }
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activePolls.forEach(interval => clearInterval(interval));
    };
  }, []);

  const value = {
    notifications,
    startPolling,
    stopPolling,
    removeNotification,
    viewDetailedReport,
    activePolls: activePolls.size
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
