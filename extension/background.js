// CipherCop Background Service Worker
console.log('CipherCop Extension Background Script Loaded');

// API Configuration
const API_ENDPOINTS = {
  clone: {
    gemini: 'http://localhost:5003/analyze',
    phishpedia: {
      upload: 'http://localhost:5000/upload',
      detect: 'http://localhost:5000/detect'
    }
  },
  phishing: 'http://localhost:5001/api/phishing/analyze'
};

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('CipherCop Extension Installed');
  
  // Set default storage values
  chrome.storage.local.set({
    extensionEnabled: true,
    lastScanResults: null,
    scanHistory: []
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.type);
  
  switch (request.type) {
    case 'CAPTURE_SCREENSHOT':
      handleScreenshotCapture(sendResponse);
      return true; // Keep channel open for async response
      
    case 'ANALYZE_CLONE':
      handleCloneAnalysis(request.data, sendResponse);
      return true;
      
    case 'ANALYZE_PHISHING':
      handlePhishingAnalysis(request.data, sendResponse);
      return true;
      
    case 'GET_CURRENT_TAB':
      getCurrentTabInfo(sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Capture screenshot of current tab
async function handleScreenshotCapture(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    // Capture visible area of the tab
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90
    });
    
    sendResponse({
      success: true,
      screenshot: screenshot,
      url: tab.url,
      title: tab.title
    });
    
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle clone detection analysis
async function handleCloneAnalysis(data, sendResponse) {
  try {
    console.log('Starting clone analysis for:', data.url);
    
    const results = {
      gemini: null,
      phishpedia: null,
      combined: null
    };
    
    // Run both analyses in parallel
    const [geminiResult, phishpediaResult] = await Promise.allSettled([
      analyzeWithGemini(data),
      analyzeWithPhishpedia(data)
    ]);
    
    // Process Gemini results
    if (geminiResult.status === 'fulfilled') {
      results.gemini = geminiResult.value;
    } else {
      console.warn('Gemini analysis failed:', geminiResult.reason);
      results.gemini = { error: geminiResult.reason.message };
    }
    
    // Process Phishpedia results
    if (phishpediaResult.status === 'fulfilled') {
      results.phishpedia = phishpediaResult.value;
    } else {
      console.warn('Phishpedia analysis failed:', phishpediaResult.reason);
      results.phishpedia = { error: phishpediaResult.reason.message };
    }
    
    // Combine results
    results.combined = combineCloneResults(results.gemini, results.phishpedia);
    
    // Store results
    await storeAnalysisResult('clone', data.url, results);
    
    sendResponse({
      success: true,
      results: results
    });
    
  } catch (error) {
    console.error('Clone analysis failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Analyze with Gemini AI
async function analyzeWithGemini(data) {
  const response = await fetch(API_ENDPOINTS.clone.gemini, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: data.url
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API failed: ${response.status}`);
  }
  
  return await response.json();
}

// Analyze with Phishpedia ML
async function analyzeWithPhishpedia(data) {
  // Convert screenshot to blob for upload
  const screenshotBlob = await fetch(data.screenshot).then(r => r.blob());
  
  // Step 1: Upload screenshot
  const uploadFormData = new FormData();
  uploadFormData.append('image', screenshotBlob, 'screenshot.png');
  
  const uploadResponse = await fetch(API_ENDPOINTS.clone.phishpedia.upload, {
    method: 'POST',
    body: uploadFormData
  });
  
  if (!uploadResponse.ok) {
    throw new Error(`Phishpedia upload failed: ${uploadResponse.status}`);
  }
  
  const uploadResult = await uploadResponse.json();
  
  if (!uploadResult.success) {
    throw new Error('Phishpedia upload failed');
  }
  
  // Step 2: Analyze with uploaded image
  const detectResponse = await fetch(API_ENDPOINTS.clone.phishpedia.detect, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: data.url,
      imageUrl: uploadResult.imageUrl
    })
  });
  
  if (!detectResponse.ok) {
    throw new Error(`Phishpedia detection failed: ${detectResponse.status}`);
  }
  
  return await detectResponse.json();
}

// Handle phishing analysis
async function handlePhishingAnalysis(data, sendResponse) {
  try {
    console.log('Starting phishing analysis for:', data.url);
    
    // First, authenticate to get session cookies
    await authenticateForPhishing();
    
    const response = await fetch(API_ENDPOINTS.phishing, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: data.url
      }),
      credentials: 'include' // Include cookies for authentication
    });
    
    if (!response.ok) {
      throw new Error(`Phishing API failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Store results
    await storeAnalysisResult('phishing', data.url, result);
    
    sendResponse({
      success: true,
      result: result
    });
    
  } catch (error) {
    console.error('Phishing analysis failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Authenticate for phishing analysis
async function authenticateForPhishing() {
  try {
    const loginResponse = await fetch('http://localhost:5001/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'hi@gmail.com',
        password: '123456'
      }),
      credentials: 'include' // Include cookies
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Authentication failed: ${loginResponse.status}`);
    }
    
    const authResult = await loginResponse.json();
    console.log('Authentication successful for phishing analysis');
    return authResult;
    
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// Get current tab information
async function getCurrentTabInfo(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    sendResponse({
      success: true,
      tab: {
        url: tab.url,
        title: tab.title,
        favicon: tab.favIconUrl
      }
    });
    
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Combine clone detection results
function combineCloneResults(geminiResult, phishpediaResult) {
  const combined = {
    threat_level: 'UNKNOWN',
    confidence: 0,
    decision: 'unknown',
    explanation: 'Analysis incomplete'
  };
  
  // If both failed
  if ((!geminiResult || geminiResult.error) && (!phishpediaResult || phishpediaResult.error)) {
    combined.explanation = 'Both detection systems failed';
    return combined;
  }
  
  // Gemini-based scoring
  let geminiScore = 0;
  if (geminiResult && !geminiResult.error) {
    if (geminiResult.decision === 'clone') geminiScore = 90;
    else if (geminiResult.decision === 'suspicious') geminiScore = 60;
    else geminiScore = 10;
  }
  
  // Phishpedia-based scoring
  let phishpediaScore = 0;
  if (phishpediaResult && !phishpediaResult.error) {
    if (phishpediaResult.result === 'Phishing') phishpediaScore = 85;
    else phishpediaScore = 5;
  }
  
  // Combined scoring (weighted average)
  const finalScore = (geminiScore * 0.6 + phishpediaScore * 0.4);
  
  // Determine threat level
  if (finalScore >= 75) {
    combined.threat_level = 'HIGH';
    combined.decision = 'clone';
    combined.explanation = 'High probability of clone/phishing site detected';
  } else if (finalScore >= 45) {
    combined.threat_level = 'MEDIUM';
    combined.decision = 'suspicious';
    combined.explanation = 'Suspicious patterns detected, proceed with caution';
  } else {
    combined.threat_level = 'LOW';
    combined.decision = 'clean';
    combined.explanation = 'Site appears to be legitimate';
  }
  
  combined.confidence = Math.round(finalScore);
  
  return combined;
}

// Store analysis results
async function storeAnalysisResult(type, url, result) {
  try {
    const storageData = await chrome.storage.local.get(['scanHistory']);
    const history = storageData.scanHistory || [];
    
    const entry = {
      type: type,
      url: url,
      timestamp: new Date().toISOString(),
      result: result
    };
    
    // Keep only last 50 results
    history.unshift(entry);
    if (history.length > 50) {
      history.splice(50);
    }
    
    await chrome.storage.local.set({
      lastScanResults: entry,
      scanHistory: history
    });
    
  } catch (error) {
    console.error('Failed to store analysis result:', error);
  }
}

// Notification helper
function showNotification(title, message, type = 'basic') {
  chrome.notifications.create({
    type: type,
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message
  });
}
