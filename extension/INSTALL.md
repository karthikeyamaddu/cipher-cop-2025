# CipherCop Extension - Installation Guide

## 🚀 Quick Start

### Prerequisites
Make sure your CipherCop backend services are running:
```bash
# Terminal 1: Node.js Backend (Port 5001)
cd backend
npm start

# Terminal 2: Gemini Clone Detection (Port 5003)
cd backend_py/clone-detection/gemini
python app.py

# Terminal 3: Phishpedia ML (Port 5000)
cd backend_py/clone-detection/phishpedia+detectron2/Phishpedia
python WEBtool/app.py
```

### Install Extension

#### Method 1: Chrome Developer Mode
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Toggle "Developer mode" ON (top right)
4. Click "Load unpacked"
5. Select the `extension` folder from this project
6. The CipherCop extension will appear in your toolbar

#### Method 2: Edge Developer Mode
1. Open Microsoft Edge
2. Navigate to `edge://extensions/`
3. Toggle "Developer mode" ON (bottom left)
4. Click "Load unpacked"
5. Select the `extension` folder
6. Extension is now installed

### First Use
1. Navigate to any website (e.g., https://example.com)
2. Click the CipherCop extension icon in the toolbar
3. Use either:
   - **"Check Clone Score"** - Detects website cloning
   - **"Phishing Analysis"** - Analyzes for phishing threats

### Features
- ✅ Real-time clone detection
- ✅ AI-powered phishing analysis
- ✅ Clean, professional interface
- ✅ Local data storage (privacy-focused)
- ✅ Detailed threat analysis
- ✅ Scan history and statistics

### Troubleshooting
- **Extension not working?** Check if backend services are running
- **No results?** Verify network connectivity to localhost
- **Can't capture screenshot?** Don't use on chrome:// or extension pages
- **API errors?** Check browser console for detailed error messages

### Support
For technical issues, check the main README.md file in the extension folder.

---
**Ready to protect against cyber threats! 🛡️**
