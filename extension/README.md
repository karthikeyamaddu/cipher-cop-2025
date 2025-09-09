# CipherCop Security Extension

A professional browser extension for detecting clone websites and phishing attacks using advanced AI and machine learning technologies.

## 🚀 Features

### 🔍 Clone Detection
- **Dual Analysis**: Combines Google Gemini AI with Phishpedia ML model
- **Screenshot Analysis**: Captures and analyzes visual elements of websites
- **Brand Recognition**: Detects legitimate brands and compares with actual domains
- **Real-time Results**: Provides instant feedback on website legitimacy

### ⚠️ Phishing Detection
- **URL Analysis**: Comprehensive analysis of domain patterns and metadata
- **AI-Powered**: Uses Gemini AI for intelligent content analysis
- **WHOIS Integration**: Checks domain registration details and age
- **Risk Scoring**: Provides detailed risk assessments

### 🛡️ Security Features
- **Clean Interface**: Professional, non-intrusive design
- **Privacy Focused**: No data stored externally
- **Background Protection**: Optional passive monitoring
- **Notification System**: Alerts for detected threats

## 📦 Installation

### Method 1: Developer Mode (For Testing)
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension` folder
4. The CipherCop extension will appear in your browser toolbar

### Method 2: Package Installation
1. Package the extension: Go to `chrome://extensions/` → Pack extension
2. Select the `extension` folder as Extension root directory
3. Install the generated `.crx` file

## 🔧 Backend Requirements

Ensure the following backend services are running:

### Required Services
- **Node.js Backend**: `http://localhost:5001` (Authentication & data storage)
- **Gemini Clone Detection**: `http://localhost:5003` (AI-powered analysis)
- **Phishpedia ML**: `http://localhost:5000` (Machine learning detection)

### Optional Services
- **Phishing Detection**: `http://localhost:5002` (Traditional phishing analysis)
- **Malware Detection**: `http://localhost:5004` (VirusTotal integration)

## 🎯 Usage

### Clone Detection
1. Navigate to any website
2. Click the CipherCop extension icon
3. Click **"Check Clone Score"**
4. View real-time analysis results

### Phishing Analysis
1. Open the extension popup
2. Click **"Phishing Analysis"**
3. Review comprehensive security assessment
4. Follow provided recommendations

## 🔧 Configuration

### Settings Panel
- **Auto Scan**: Enable automatic background scanning
- **Notifications**: Control alert preferences
- **Protection Level**: Choose security sensitivity

### Storage Management
- Scan history (last 100 results)
- Statistics tracking
- Export/import functionality

## 📊 Features Overview

### Main Interface
```
┌─────────────────────────────────┐
│ 🛡️ CipherCop Security Scanner   │
├─────────────────────────────────┤
│ Current Site: example.com       │
│ Status: 🔒 Secure               │
├─────────────────────────────────┤
│ 🔍 Check Clone Score           │
│ ⚠️ Phishing Analysis           │
├─────────────────────────────────┤
│ Stats: 42 scans • 5 threats    │
└─────────────────────────────────┘
```

### Results Display
- **Threat Level**: Visual indicators (🟢 Safe, 🟡 Suspicious, 🔴 Dangerous)
- **Confidence Score**: Percentage-based accuracy
- **Detailed Analysis**: Technical breakdown of findings
- **Action Buttons**: Report issues, view details

## 🛠️ Technical Architecture

### File Structure
```
extension/
├── manifest.json           # Extension configuration
├── background.js          # Service worker
├── content.js             # Content script
├── popup/
│   ├── popup.html        # UI structure
│   ├── popup.js          # Frontend logic
│   └── popup.css         # Styling
├── utils/
│   ├── api.js           # API communication
│   ├── screenshot.js    # Screenshot utilities
│   └── storage.js       # Data management
└── icons/               # Extension icons
```

### API Integration
- **Gemini AI**: Advanced content analysis
- **Phishpedia**: Computer vision-based detection
- **Node.js Backend**: Data persistence and authentication

### Security Measures
- Manifest V3 compliance
- Minimal permissions model
- Content Security Policy
- Local data storage only

## 🚨 Permissions

### Required Permissions
- `activeTab`: Access current tab for analysis
- `tabs`: Query tab information
- `storage`: Local data storage
- `notifications`: Security alerts

### Host Permissions
- `http://localhost:*/*`: Backend API access
- `<all_urls>`: Website analysis capability

## 📈 Performance

### Optimization Features
- Screenshot compression
- Request timeout handling
- Error recovery mechanisms
- Efficient data storage

### Response Times
- Clone Detection: ~5-10 seconds
- Phishing Analysis: ~2-5 seconds
- Background Processing: Minimal impact

## 🔍 Troubleshooting

### Common Issues

**Extension not loading:**
- Check if all backend services are running
- Verify permissions are granted
- Check browser console for errors

**API connection failures:**
- Ensure localhost services are accessible
- Check firewall settings
- Verify port configurations

**Screenshot capture fails:**
- Check if tab is capturable (not chrome:// pages)
- Verify activeTab permission
- Try refreshing the page

### Debug Information
Enable Chrome DevTools for the extension:
1. Right-click extension icon → "Inspect popup"
2. Check Console tab for error messages
3. Review Network tab for API calls

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Start required backend services
3. Load extension in developer mode
4. Make changes and test

### Code Style
- Use modern JavaScript (ES6+)
- Follow async/await patterns
- Implement proper error handling
- Add comprehensive comments

## 📄 License

This project is part of the CipherCop security suite. All rights reserved.

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console errors
3. Verify backend service status
4. Report bugs with detailed information

## 📋 Version History

### v1.0.0 (Current)
- Initial release
- Clone detection with dual AI/ML approach
- Phishing analysis integration
- Professional UI design
- Local storage management

---

**Note**: This extension requires the CipherCop backend services to be running for full functionality. Ensure all required services are properly configured before use.
