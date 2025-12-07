import { useState, useEffect, useRef } from 'react';

export const useTestPolling = (testId, onComplete) => {
  const [status, setStatus] = useState('queued');
  const [result, setResult] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(5000); // Start at 5s
  
  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!testId || isPollingRef.current) return;

    isPollingRef.current = true;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:5001/api/tests/${testId}/status`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch test status');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Unknown error');
        }

        setStatus(data.status);
        setQueuePosition(data.queuePosition);

        // Terminal states
        if (data.status === 'completed') {
          setResult(data.result);
          clearInterval(intervalRef.current);
          isPollingRef.current = false;
          if (onComplete) onComplete(data.result);
        } else if (data.status === 'failed') {
          setError(data.error || 'Test failed');
          clearInterval(intervalRef.current);
          isPollingRef.current = false;
        } else {
          // Adjust polling interval based on elapsed time
          const elapsed = Date.now() - startTimeRef.current;
          
          if (elapsed < 30000) {
            // First 30s: poll every 5s
            setPollInterval(5000);
          } else if (elapsed < 60000) {
            // 30s-60s: poll every 10s
            setPollInterval(10000);
          } else {
            // After 60s: poll every 15s
            setPollInterval(15000);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError(err.message);
        clearInterval(intervalRef.current);
        isPollingRef.current = false;
      }
    };

    // Initial poll
    pollStatus();

    // Setup interval
    intervalRef.current = setInterval(pollStatus, pollInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      isPollingRef.current = false;
    };
  }, [testId, pollInterval, onComplete]);

  return {
    status,
    result,
    queuePosition,
    error,
    isPolling: isPollingRef.current
  };
};
