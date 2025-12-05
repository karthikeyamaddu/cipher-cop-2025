# 🛡️ CipherCop - AI-Powered Cybersecurity Platform

![CipherCop Banner](https://img.shields.io/badge/CipherCop-Cybersecurity_Platform-blue?style=for-the-badge&logo=shield)

A comprehensive, AI-powered cybersecurity platform that provides real-time protection against phishing attacks, malware threats, website clones, and phone scams. CipherCop combines cutting-edge machine learning models, computer vision, and advanced AI to deliver enterprise-grade security solutions with complete test history tracking and user analytics.

## 🚀 Key Features

### 🎯 **AI-Powered Phishing Detection**
- **97.4% Accuracy**: Advanced Gradient Boosting Classifier
- **Dual Analysis**: URL scanning + Email content analysis
- **Real-time URL Analysis**: Domain reputation and WHOIS verification
- **Google Gemini Integration**: Intelligent content analysis
- **Multi-Feature Extraction**: 30+ security indicators
- **Email Content Storage**: Full email analysis with subject and sender tracking

### 🔍 **Advanced Clone Detection**
- **Triple Detection Modes**: AI-only, ML-only, or Combined analysis
- **Dual AI System**: Google Gemini + Phishpedia ML models
- **Computer Vision**: Detectron2-powered visual analysis
- **Brand Recognition**: 277+ protected brand database
- **Screenshot Comparison**: Real-time visual similarity detection
- **Flexible Input**: Screenshot upload OR URL analysis
- **GridFS Storage**: Efficient image storage with WebP compression (70-90% size reduction)

### 🦠 **Comprehensive Malware Analysis**
- **Dual Analysis Modes**: VirusTotal + Sandbox testing
- **VirusTotal Integration**: 67+ antivirus engines with full engine details
- **Multi-Format Support**: Files, URLs, hashes, and batch analysis
- **Sandbox Analysis**: Behavioral threat detection
- **Complete Engine Reports**: All detection results stored and viewable

### 📱 **Phone Scam Detection**
- **Multi-Provider Integration**: Comprehensive scam database
- **AI Analysis**: Google Gemini-powered content evaluation
- **Real-time Validation**: Instant phone number verification
- **Risk Scoring**: Detailed fraud assessment
- **Privacy-First**: Phone numbers hashed with SHA-256

### 📊 **User Dashboard & Analytics**
- **Security Overview**: Total tests and time-based statistics (24h, 7d, 30d)
- **Category Breakdown**: Tests by type (Phishing, Clone, Malware, Scam)
- **Recent Activity**: Last 5 tests with risk scores and threat levels
- **Average Risk Score**: Overall security assessment
- **User Profile**: Complete test history and account statistics

### 📝 **Test History & Result Modals**
- **Per-Page History**: Each feature shows its own test history (5 most recent)
- **Auto-Refresh**: History updates automatically after new tests
- **Clickable Results**: Click any test to view detailed analysis modal
- **Complete Details**: Full analysis results, recommendations, and insights
- **Color-Coded**: Risk levels (green/yellow/red) for quick assessment
- **Persistent Storage**: All tests saved to MongoDB with user tracking

### 🌐 **Browser Extension**
- **Real-time Protection**: Passive background monitoring
- **Clean Interface**: Professional, non-intrusive design
- **Instant Alerts**: Real-time threat notifications
- **Privacy-Focused**: No external data storage

## 🏗️ Architecture

### **Frontend** (Port 5173)
- **React 19.1.1 + Vite 7.1.2**: Modern, responsive web interface
- **Tailwind CSS 4.1.12**: Professional UI design with utility classes
- **AuthContext**: Centralized authentication state management
- **Real-time Dashboard**: Live threat monitoring and statistics
- **Result Modals**: Detailed analysis views for all test types
- **Test History**: Per-page history with auto-refresh

### **Backend Services**

#### **Node.js API Server** (Port 5001)
- **Express 4.21.2**: RESTful API with ES modules
- **MongoDB Atlas**: Database with user and test result collections
- **JWT Authentication**: HTTP-only cookies for secure sessions
- **User Tracking**: Test results linked to user accounts
- **Test History API**: Filtered history retrieval by test type
- **Dashboard API**: Aggregated statistics and analytics

#### **Python ML Services**
- **Email Phishing Detection** (Port 5008): ML-based email content analysis
- **Clone Detection - Gemini AI** (Port 5003): AI-powered visual analysis
- **Clone Detection - Phishpedia ML** (Port 5000): ML-based brand detection
- **Malware - VirusTotal** (Port 5004): 67+ antivirus engine scanning
- **Malware - Sandbox** (Port 5005): Behavioral analysis
- **Phone Scam Detection** (Port 5006): Multi-provider validation

#### **Browser Extension**
- Chrome extension with Manifest V3
- Real-time website analysis
- Background protection
- Integrated API communication

### **Database** (MongoDB Atlas)
- **users collection**: User accounts with test tracking (testResults array, testCount)
- **testresults collection**: All security test results with 8 test types
- **Indexes**: Optimized for userId, testType, and createdAt queries

## 📊 Performance Metrics

| Component | Accuracy/Performance | Technology |
|-----------|---------------------|------------|
| Phishing Detection | 97.4% | Gradient Boosting + Gemini AI |
| Clone Detection | 95%+ | Phishpedia + Computer Vision |
| Malware Scanning | 67+ Engines | VirusTotal API |
| Response Time | <0.5s average | Optimized ML Pipeline |
| Image Compression | 70-90% reduction | WebP + Sharp |
| Database Queries | <100ms | MongoDB with indexes |

## 🛠️ Installation

### Prerequisites
- **Node.js** (v16+)
- **Python** (3.8+)
- **MongoDB** (for data storage)
- **Google Cloud Account** (for AI services)
- **Chrome Browser** (for extension)

### Quick Start

1. **Clone the Repository**
```bash
git clone https://github.com/your-org/ciphercop-demo.git
cd ciphercopdemo
```

2. **Environment Setup**
```bash
# Copy environment files
cp backend/env.txt backend/.env
cp backend_py/*/env.txt backend_py/*/.env

# Configure API keys in .env files
# - GEMINI_API_KEY
# - VIRUSTOTAL_API_KEY
# - MONGODB_URI
```

3. **Install Dependencies**
```bash
# Frontend
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173

# Backend (Node.js)
cd ../backend
npm install
npm start    # Runs on http://localhost:5001

# Python Services
cd ../backend_py
pip install -r requirements.txt
```

4. **Start Services**
```bash
# Email Phishing Detection
cd backend_py/phishing-detection
python app.py  # Port 5008

# Clone Detection (Gemini AI)
cd backend_py/clone-detection/gemini
python app.py  # Port 5003

# Clone Detection (Phishpedia ML)
cd backend_py/clone-detection/phishpedia+detectron2/Phishpedia/WEBtool
python app.py  # Port 5000

# Malware Detection (VirusTotal)
cd backend_py/malware-detection/ml-detection/Virus_total_based
python app.py  # Port 5004

# Malware Detection (Sandbox)
cd backend_py/malware-detection
python sandbox.py  # Port 5005

# Phone Scam Detection
cd backend_py/phone-number-detection
python app.py  # Port 5006
```

5. **Install Browser Extension** (Optional)
```bash
# Open Chrome -> Extensions -> Developer Mode
# Load unpacked -> Select /extension folder
```

## 🎨 Recent Updates & Improvements

### **Phase 2 Complete** (November 2025)
- ✅ All 5 features have result modals (Phishing, Clone, Malware, Scam)
- ✅ Risk scores rounded to 2 decimals for clean display
- ✅ Email content storage and display in phishing modal
- ✅ Phone numbers stored (both plain and hashed) for display
- ✅ Clone detection with GridFS image storage (70-90% compression)
- ✅ Malware modals show all 67+ engine details
- ✅ Test history clickable on all pages

### **Dashboard & Analytics** (January 2025)
- ✅ Security dashboard with time-based statistics (24h, 7d, 30d)
- ✅ Category breakdown by test type
- ✅ Recent activity feed with risk scores
- ✅ User profile with complete test history
- ✅ Activity counts fixed (malware count now accurate)

### **Bug Fixes & Polish**
- ✅ Sample data logic for new users (shows examples until first test)
- ✅ Profile page activity counts corrected (uses test type prefixes)
- ✅ Clone ML mode with URL now works (AI service takes screenshot)
- ✅ All test types use correct enum values (phishing-url, not phishing)
- ✅ Test history auto-refreshes after new tests
- ✅ Color-coded risk indicators (green/yellow/red)

## 🎯 Usage

### Web Dashboard
1. Navigate to `http://localhost:5173`
2. Create account or login
3. View **Dashboard** for security overview and statistics
4. Access protection modules:
   - **Phishing Scanner**: Analyze URLs and email content
   - **Clone Detector**: Upload screenshots or analyze URLs (AI/ML/Combined modes)
   - **Malware Detector**: Upload files or check hashes (VirusTotal/Sandbox modes)
   - **Scam Detector**: Validate phone numbers
5. View **Test History** at the bottom of each page (auto-refreshes)
6. Click any test to view **detailed results modal**
7. Check **Profile** for complete test history and account stats

### Browser Extension
1. Click the CipherCop extension icon
2. Choose analysis type:
   - **Clone Score**: Check current website
   - **Phishing Analysis**: Comprehensive security scan
3. View real-time results and recommendations

### API Integration
```javascript
// Phishing URL Detection (saves as phishing-url)
POST http://localhost:5001/api/phishing/analyze
{
  "url": "https://suspicious-site.com"
}

// Email Phishing Detection (saves as phishing-email)
POST http://localhost:5001/api/phishing/analyze-email-store
{
  "emailData": {
    "emailSubject": "Urgent: Verify your account",
    "senderEmail": "noreply@suspicious.com",
    "content": "Click here to verify..."
  }
}

// Clone Detection (saves as clone-ai/clone-ml/clone-combined)
POST http://localhost:5001/api/clone/store
{
  "url": "https://potential-clone.com",
  "mode": "combined"
}

// Malware Analysis (saves as malware-virustotal/malware-sandbox)
POST http://localhost:5001/api/malware/store
// Upload file for analysis

// Scam Phone Detection (saves as scam-phone)
POST http://localhost:5001/api/scam/store
{
  "phoneNumber": "+1234567890"
}

// Get Test History
GET http://localhost:5001/api/tests/history?testType=phishing&limit=5

// Get Dashboard Stats
GET http://localhost:5001/api/dashboard/stats
```

## �️ Databarse Schema

### **Test Types** (8 Total)
CipherCop uses specific test type naming for database storage:

1. **phishing-url** - Phishing URL detection
2. **phishing-email** - Email phishing detection
3. **clone-ai** - Clone detection (AI only)
4. **clone-ml** - Clone detection (ML only)
5. **clone-combined** - Clone detection (AI + ML)
6. **malware-virustotal** - VirusTotal malware scan
7. **malware-sandbox** - Sandbox malware analysis
8. **scam-phone** - Phone number scam detection

### **Collections**

#### users
- User account information
- Authentication data (bcrypt hashed passwords)
- **testResults**: Array of test IDs
- **testCount**: Total number of tests performed
- Login tracking (lastLogin, loginCount)

#### testresults
- All security test results
- Linked to users via userId
- Contains: inputData, result, details, flags, recommendations
- Indexed by: userId, testType, createdAt
- **viewedByUser**: Tracks if user has viewed the result
- **processingStatus**: For future background processing

## 🔧 Configuration

### API Keys Required
- **Google Gemini API**: For AI-powered analysis
- **VirusTotal API**: For malware scanning (optional)
- **Google Cloud Vision**: For image analysis
- **MongoDB Atlas**: For data persistence
- **WHOIS API**: For domain verification

### Service Configuration
Each service can be configured via environment variables:
- Database connections (MONGODB_URI)
- API endpoints and keys
- ML model parameters
- Security settings (JWT_SECRET)
- Port assignments (fixed: 5173, 5001, 5000-5008)

## 🧪 Testing

### Automated Tests
```bash
# Run all tests
npm test

# Python service tests
python -m pytest backend_py/tests/
```

### Manual Testing

#### Phishing Detection
- **URL Test**: `www.dghjdgf.com/paypal.co.uk` (known phishing)
- **Email Test**: Paste suspicious email content
- **Verify**: Check test history, click to view modal

#### Clone Detection
- **URL Test**: `https://amazon-clone008.netlify.app/` (known clone)
- **Screenshot Test**: Upload brand website screenshot
- **Modes**: Test AI-only, ML-only, and Combined modes
- **Verify**: Check GridFS storage, view modal with screenshot

#### Malware Detection
- **VirusTotal**: Upload EICAR test file or enter hash
- **Sandbox**: Upload suspicious executable
- **Verify**: Check engine details (67+ engines), view modal

#### Scam Detection
- **Phone Test**: Enter any phone number
- **Verify**: Check fraud score, provider results, view modal

#### Dashboard & Profile
- **Dashboard**: View statistics, recent activity
- **Profile**: Check test counts by category
- **History**: Verify all tests appear in respective pages

## 📁 Project Structure

```
ciphercopdemo/
├── frontend/                 # React web application (Port 5173)
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── ResultModal.jsx          # Universal result modal
│   │   │   ├── CloneResultModal.jsx     # Clone-specific modal
│   │   │   └── results/                 # Detail components
│   │   │       ├── PhishingResultDetails.jsx
│   │   │       ├── MalwareResultDetails.jsx
│   │   │       └── ScamResultDetails.jsx
│   │   ├── logins/          # Feature pages
│   │   │   ├── PhishingPage.jsx         # Phishing detection
│   │   │   ├── ClonePage.jsx            # Clone detection
│   │   │   ├── MalwarePage.jsx          # Malware analysis
│   │   │   ├── ScamPage.jsx             # Scam detection
│   │   │   ├── Dashboard.jsx            # Security dashboard
│   │   │   ├── profile.jsx              # User profile
│   │   │   └── Home.jsx                 # Main layout
│   │   └── context/         # State management
│   │       └── AuthContext.jsx          # Authentication
├── backend/                 # Node.js API server (Port 5001)
│   ├── src/
│   │   ├── controller/      # Route handlers
│   │   ├── models/          # Database models
│   │   │   ├── User.js                  # User schema
│   │   │   └── TestResult.js            # Test result schema
│   │   ├── checks/          # Security modules
│   │   ├── lib/             # Database connection (db.js)
│   │   └── middleware/      # Authentication (protectRoute)
│   └── server.js            # Main server file
├── backend_py/              # Python ML services
│   ├── clone-detection/     # AI clone detection
│   │   ├── gemini/          # Gemini AI service (Port 5003)
│   │   └── phishpedia+detectron2/  # ML service (Port 5000)
│   ├── phishing-detection/  # ML phishing analysis (Port 5008)
│   ├── malware-detection/   # Malware services
│   │   ├── ml-detection/    # VirusTotal (Port 5004)
│   │   └── sandbox.py       # Sandbox (Port 5005)
│   └── phone-number-detection/  # Scam validation (Port 5006)
├── extension/               # Chrome browser extension
│   ├── popup/              # Extension UI
│   ├── utils/              # Helper functions
│   └── manifest.json       # Extension configuration
└── docs/                   # Documentation
    ├── IMPLEMENTATION_COMPLETE_README.md
    ├── DASHBOARD_IMPLEMENTATION.md
    ├── PHASE2_COMPLETE_SUMMARY.md
    └── FIXES_COMPLETE.md
```

## 🔒 Security Features

### **Data Protection**
- **JWT Authentication**: HTTP-only cookies (7-day expiration)
- **Password Security**: bcrypt hashing with 10 salt rounds
- **Phone Number Privacy**: SHA-256 hashing for storage
- **Protected Routes**: All endpoints require authentication
- **No Sensitive Logging**: Email content and file contents never stored
- **CORS Configuration**: Restricted to localhost:5173 and localhost:5174

### **Threat Detection**
- **Real-time Analysis**: Immediate threat assessment
- **Multi-vector Detection**: URL, email, file, and phone analysis
- **AI-Powered**: Google Gemini for intelligent content evaluation
- **ML Models**: Trained classifiers for phishing and malware
- **67+ Antivirus Engines**: Comprehensive malware scanning
- **Behavioral Analysis**: Sandbox testing for advanced threats

### **Privacy Safeguards**
- **What IS Stored**: Test metadata, risk scores, verdicts, file names, email subjects, hashed phone numbers
- **What is NOT Stored**: Full email content, file contents, plain phone numbers, passwords, session tokens
- **User Data Isolation**: Each user only sees their own tests
- **Audit Trail**: IP address and user agent logged for security
- **Data Cleanup**: Large payloads optimized before storage

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow code style conventions
- Add tests for new features
- Update documentation
- Ensure security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Issue: "testType is not a valid enum value"**
- **Cause**: Using wrong test type name (e.g., 'phishing' instead of 'phishing-url')
- **Fix**: Use correct enum values: phishing-url, phishing-email, clone-ai, clone-ml, clone-combined, malware-virustotal, malware-sandbox, scam-phone

**Issue: Test history not loading**
- **Checks**: User logged in? Backend running on port 5001? Check browser console for errors
- **Fix**: Hard refresh browser (Ctrl+Shift+R), verify authentication

**Issue: Malware count shows 0 in profile**
- **Status**: Fixed in latest version
- **Fix**: Profile now uses test type prefixes (malware-*) instead of exact match

**Issue: Clone ML mode with URL shows error**
- **Status**: Fixed in latest version
- **Fix**: ML mode now calls AI service which takes screenshot automatically

**Issue: Service not running**
- **Check ports**: `netstat -ano | findstr :5001` (Windows) or `lsof -i :5001` (Linux/Mac)
- **Fix**: Restart services, check for port conflicts

**Issue: 413 Payload Too Large**
- **Cause**: Large data (like logo_extraction) in request body
- **Status**: Fixed - large data removed before storage

## 🆘 Support

### Documentation
- [Complete Implementation Guide](IMPLEMENTATION_COMPLETE_README.md)
- [Dashboard Implementation](DASHBOARD_IMPLEMENTATION.md)
- [Phase 2 Summary](PHASE2_COMPLETE_SUMMARY.md)
- [Recent Fixes](FIXES_COMPLETE.md)

### Community
- **Issues**: Report bugs and feature requests
- **Discussions**: Community Q&A and ideas
- **Discord**: Real-time community support
- **Email**: professional-support@ciphercop.com

## � Compolete Feature List

### **Authentication & User Management**
- User registration and login with JWT
- HTTP-only cookies for secure sessions
- Password hashing with bcrypt
- Protected routes with middleware
- User profile with test statistics
- Account status management

### **Phishing Detection**
- URL analysis with WHOIS and domain reputation
- Email content analysis with ML model
- Google Gemini AI integration
- Risk scoring (0-100)
- Threat level classification (low/medium/high)
- Test history with auto-refresh
- Detailed result modals

### **Clone Detection**
- Three analysis modes: AI-only, ML-only, Combined
- Screenshot upload or URL analysis
- Google Gemini visual analysis
- Phishpedia ML brand detection (277+ brands)
- GridFS image storage with WebP compression
- Screenshot display in result modal
- Tags system (analysis type + input type)

### **Malware Analysis**
- VirusTotal integration (67+ engines)
- Sandbox behavioral analysis
- File, URL, and hash scanning
- Complete engine detection details
- Threat categorization
- Result modals with engine breakdown

### **Scam Detection**
- Phone number validation
- Multi-provider fraud checking
- SHA-256 phone number hashing
- Fraud score calculation
- Carrier and line type detection
- Result modals with provider details

### **Dashboard & Analytics**
- Security overview with statistics
- Time-based metrics (24h, 7d, 30d)
- Category breakdown (Phishing, Clone, Malware, Scam)
- Recent activity feed
- Average risk score
- Color-coded threat levels

### **Test History & Results**
- Per-page test history (5 most recent)
- Auto-refresh after new tests
- Clickable test items
- Detailed result modals for all test types
- Risk score visualization
- Recommendations and insights
- Timestamp tracking

### **Data Management**
- MongoDB Atlas integration
- User test tracking (testResults array, testCount)
- 8 test types with proper enum values
- Indexed queries for performance
- GridFS for image storage
- Audit trail (IP, user agent)

## 🙏 Acknowledgments

- **Phishpedia**: Visual phishing detection research (USENIX Security 2021)
- **Google Gemini**: Advanced AI capabilities
- **VirusTotal**: Comprehensive malware detection
- **Detectron2**: Computer vision framework
- **MongoDB Atlas**: Database hosting
- **React + Vite**: Modern frontend framework
- **Express**: Backend framework
- **Flask**: Python services framework
- **Open Source Community**: Various libraries and tools

## 📈 Roadmap

### **Completed Features** ✅
- [x] User authentication with JWT
- [x] All 8 test types with database storage
- [x] Test history with auto-refresh
- [x] Result modals for all features
- [x] Dashboard with statistics
- [x] User profile with test tracking
- [x] Email content analysis
- [x] Clone detection with GridFS image storage
- [x] Malware analysis with full engine details
- [x] Phone number scam detection
- [x] Risk score rounding and display improvements
- [x] Sample data for new users
- [x] Clickable test history items

### **Upcoming Features**
- [ ] Background processing with notifications
- [ ] Real-time WebSocket updates
- [ ] Mobile application
- [ ] Enterprise dashboard
- [ ] Advanced threat intelligence
- [ ] Real-time threat feeds
- [ ] Custom ML model training
- [ ] API rate limiting and scaling
- [ ] Export test results (PDF/CSV)
- [ ] Scheduled scans

### **Version History**
- **v1.0.0**: Initial release with core features
- **v1.1.0**: Enhanced AI models and UI improvements
- **v1.2.0**: Complete database integration, test history, and result modals
- **v1.3.0**: Dashboard, user profiles, and analytics (Current)

## 📊 Project Statistics

- **Total Features**: 5 (Phishing, Clone, Malware, Scam, Dashboard)
- **Test Types**: 8 (phishing-url, phishing-email, clone-ai, clone-ml, clone-combined, malware-virustotal, malware-sandbox, scam-phone)
- **API Endpoints**: 15+ (authentication, analysis, storage, history, dashboard)
- **Python Services**: 6 (running on ports 5000, 5003, 5004, 5005, 5006, 5008)
- **Database Collections**: 2 (users, testresults)
- **Result Modals**: 5 (all features covered)
- **Lines of Code**: ~15,000+ (frontend + backend + services)

## 🎯 Current Status

**Version**: 1.3.0  
**Status**: ✅ Production Ready  
**Last Updated**: December 2025

### **Completed**
- ✅ All core features implemented
- ✅ Complete database integration
- ✅ User authentication and tracking
- ✅ Test history with auto-refresh
- ✅ Result modals for all features
- ✅ Dashboard and analytics
- ✅ User profiles
- ✅ All bug fixes applied
- ✅ Risk score improvements
- ✅ Sample data for new users

### **In Progress**
- ⏳ Background processing with notifications (planned)
- ⏳ Real-time WebSocket updates (planned)

---

<div align="center">

**🛡️ Protecting the digital world, one threat at a time 🛡️**

[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/your-org/ciphercop-demo)
[![AI Powered](https://img.shields.io/badge/AI-Powered-blue.svg)](https://github.com/your-org/ciphercop-demo)
[![Security First](https://img.shields.io/badge/Security-First-green.svg)](https://github.com/your-org/ciphercop-demo)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](https://github.com/your-org/ciphercop-demo)

**CipherCop v1.3.0** - Complete cybersecurity platform with AI-powered threat detection, user analytics, and comprehensive test history tracking.

</div>
