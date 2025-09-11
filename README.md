# 🛡️ CipherCop - AI-Powered Cybersecurity Platform

![CipherCop Banner](https://img.shields.io/badge/CipherCop-Cybersecurity_Platform-blue?style=for-the-badge&logo=shield)

A comprehensive, AI-powered cybersecurity platform that provides real-time protection against phishing attacks, malware threats, website clones, and phone scams. CipherCop combines cutting-edge machine learning models, computer vision, and advanced AI to deliver enterprise-grade security solutions.

## 🚀 Key Features

### 🎯 **AI-Powered Phishing Detection**
- **97.4% Accuracy**: Advanced Gradient Boosting Classifier
- **Real-time URL Analysis**: Domain reputation and WHOIS verification
- **Google Gemini Integration**: Intelligent content analysis
- **Multi-Feature Extraction**: 30+ security indicators

### 🔍 **Advanced Clone Detection**
- **Dual AI System**: Google Gemini + Phishpedia ML models
- **Computer Vision**: Detectron2-powered visual analysis
- **Brand Recognition**: 277+ protected brand database
- **Screenshot Comparison**: Real-time visual similarity detection

### 🦠 **Comprehensive Malware Analysis**
- **VirusTotal Integration**: 60+ antivirus engines
- **Multi-Format Support**: Files, URLs, hashes, and batch analysis
- **ML-Based Detection**: Custom trained malware classifier
- **Behavioral Analysis**: Advanced threat categorization

### 📱 **Phone Scam Detection**
- **Multi-Provider Integration**: Comprehensive scam database
- **AI Analysis**: Google Gemini-powered content evaluation
- **Real-time Validation**: Instant phone number verification
- **Risk Scoring**: Detailed fraud assessment

### 🌐 **Browser Extension**
- **Real-time Protection**: Passive background monitoring
- **Clean Interface**: Professional, non-intrusive design
- **Instant Alerts**: Real-time threat notifications
- **Privacy-Focused**: No external data storage

## 🏗️ Architecture

### **Frontend**
- **React + Vite**: Modern, responsive web interface
- **Tailwind CSS**: Professional UI design
- **Real-time Dashboard**: Live threat monitoring
- **User Authentication**: Secure login system

### **Backend Services**

#### **Node.js API Server** (Port 5001)
- Authentication and user management
- MongoDB integration
- RESTful API endpoints
- JWT token-based security

#### **Python ML Services**
- **Phishing Detection** (Port 5002): ML-based URL analysis
- **Malware Analysis** (Port 5004): VirusTotal API integration
- **Clone Detection** (Ports 5000/5003): Dual AI analysis system
- **Phone Scam Detection** (Port 5005): Multi-provider validation

#### **Browser Extension**
- Chrome extension with Manifest V3
- Real-time website analysis
- Background protection
- Integrated API communication

## 📊 Performance Metrics

| Component | Accuracy/Performance | Technology |
|-----------|---------------------|------------|
| Phishing Detection | 97.4% | Gradient Boosting + Gemini AI |
| Clone Detection | 95%+ | Phishpedia + Computer Vision |
| Malware Scanning | 60+ Engines | VirusTotal API |
| Response Time | <0.5s average | Optimized ML Pipeline |

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
# Clone Detection (Gemini)
cd backend_py/clone-detection/gemini
python app.py  # Port 5003

# Clone Detection (Phishpedia)
cd ../phishpedia+detectron2/Phishpedia/WEBtool
python app.py  # Port 5000

# Phishing Detection
cd ../../phishing-detection/phishing-url-ml
python app.py  # Port 5002

# Malware Detection
cd ../../malware-detection/ml-detection/ML_based_detectionn
python app.py  # Port 5004

# Phone Scam Detection
cd ../../phone-number-detection
python app.py  # Port 5005
```

5. **Install Browser Extension**
```bash
# Open Chrome -> Extensions -> Developer Mode
# Load unpacked -> Select /extension folder
```

## 🎯 Usage

### Web Dashboard
1. Navigate to `http://localhost:5173`
2. Create account or login
3. Access protection modules:
   - **Phishing Scanner**: Analyze URLs and email content
   - **Malware Detector**: Upload files for analysis
   - **Clone Checker**: Verify website authenticity
   - **Scam Detector**: Validate phone numbers

### Browser Extension
1. Click the CipherCop extension icon
2. Choose analysis type:
   - **Clone Score**: Check current website
   - **Phishing Analysis**: Comprehensive security scan
3. View real-time results and recommendations

### API Integration
```javascript
// Phishing Detection
POST http://localhost:5001/api/phishing/analyze
{
  "url": "https://suspicious-site.com"
}

// Clone Detection
POST http://localhost:5003/analyze
{
  "url": "https://potential-clone.com"
}

// Malware Analysis
POST http://localhost:5004/analyze
// Upload file for analysis
```

## 🔧 Configuration

### API Keys Required
- **Google Gemini API**: For AI-powered analysis
- **VirusTotal API**: For malware scanning
- **Google Cloud Vision**: For image analysis
- **MongoDB**: For data persistence

### Service Configuration
Each service can be configured via environment variables:
- Database connections
- API endpoints
- ML model parameters
- Security settings

## 🧪 Testing

### Automated Tests
```bash
# Run all tests
npm test

# Python service tests
python -m pytest backend_py/tests/
```

### Manual Testing
- Test phishing URLs with known samples
- Upload malware test files (EICAR test)
- Verify clone detection with brand websites
- Test phone number validation

## 📁 Project Structure

```
ciphercopdemo/
├── frontend/                 # React web application
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── logins/          # Authentication pages
│   │   └── context/         # State management
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controller/      # Route handlers
│   │   ├── models/          # Database models
│   │   └── checks/          # Security modules
├── backend_py/              # Python ML services
│   ├── clone-detection/     # AI clone detection
│   ├── phishing-detection/  # ML phishing analysis
│   ├── malware-detection/   # VirusTotal integration
│   └── phone-number-detection/ # Scam validation
├── extension/               # Chrome browser extension
│   ├── popup/              # Extension UI
│   ├── utils/              # Helper functions
│   └── manifest.json       # Extension configuration
└── docs/                   # Documentation
```

## 🔒 Security Features

### **Data Protection**
- JWT-based authentication
- Encrypted API communications
- No sensitive data logging
- GDPR-compliant privacy

### **Threat Detection**
- Real-time analysis pipeline
- Multi-vector threat assessment
- Behavioral pattern recognition
- Zero-day threat identification

### **Privacy Safeguards**
- Local data processing
- No external data sharing
- Anonymized analytics
- User consent management

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

## 🆘 Support

### Documentation
- [Installation Guide](docs/installation.md)
- [API Documentation](docs/api.md)
- [Configuration Guide](docs/configuration.md)
- [Troubleshooting](docs/troubleshooting.md)

### Community
- **Issues**: Report bugs and feature requests
- **Discussions**: Community Q&A and ideas
- **Discord**: Real-time community support
- **Email**: professional-support@ciphercop.com

## 🙏 Acknowledgments

- **Phishpedia**: Visual phishing detection research (USENIX Security 2021)
- **Google Gemini**: Advanced AI capabilities
- **VirusTotal**: Comprehensive malware detection
- **Detectron2**: Computer vision framework
- **Open Source Community**: Various libraries and tools

## 📈 Roadmap

### **Upcoming Features**
- [ ] Mobile application
- [ ] Enterprise dashboard
- [ ] Advanced threat intelligence
- [ ] Real-time threat feeds
- [ ] Custom ML model training
- [ ] API rate limiting and scaling

### **Version History**
- **v1.0.0**: Initial release with core features
- **v1.1.0**: Enhanced AI models and UI improvements
- **v1.2.0**: Browser extension and API optimizations

---

<div align="center">

**🛡️ Protecting the digital world, one threat at a time 🛡️**

[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/your-org/ciphercop-demo)
[![AI Powered](https://img.shields.io/badge/AI-Powered-blue.svg)](https://github.com/your-org/ciphercop-demo)
[![Security First](https://img.shields.io/badge/Security-First-green.svg)](https://github.com/your-org/ciphercop-demo)

</div>
