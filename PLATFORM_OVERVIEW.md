# CipherCop: AI-Powered Cybersecurity Platform

## 🏗️ **Architecture Overview**

### **Frontend (React + Vite)**
- **Framework**: React 19.1.1 with modern hooks
- **Build Tool**: Vite for fast development and production builds
- **Styling**: TailwindCSS with custom cybersecurity theme
- **UI Components**: Lucide React icons, Framer Motion animations
- **Routing**: React Router DOM for SPA navigation
- **State Management**: Context API for authentication

### **Backend Services**

#### **Node.js API Gateway (Port 5001)**
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with secure token management
- **Features**: User management, API routing, CORS handling

#### **Python ML Services**
1. **Phishing Detection** (Port 5002)
   - **Accuracy**: 97.4% with Gradient Boosting Classifier
   - **AI Integration**: Google Gemini for content analysis
   - **Model**: Trained on 8 different ML algorithms
   - **Features**: URL analysis, domain reputation, WHOIS verification

2. **Malware Analysis** (Port 5004)
   - **Integration**: VirusTotal API (60+ antivirus engines)
   - **Capabilities**: File, URL, hash, and XML batch analysis
   - **Features**: Multi-engine scanning, threat categorization

3. **Clone Detection** (Port 5000/5003)
   - **Dual AI**: Google Gemini + Phishpedia ML models
   - **Computer Vision**: Detectron2 for visual analysis
   - **Features**: Screenshot comparison, brand recognition

4. **Phone Scam Detection**
   - **APIs**: IPQS, Twilio, Telesign, Numverify
   - **Features**: Number validation, fraud scoring, community databases

### **Browser Extension**
- **Platform**: Chrome Extension (Manifest V3)
- **Features**: Real-time protection, screenshot capture, background monitoring
- **Integration**: Seamless communication with backend services

## 🛡️ **Security Features**

### **Real-time Protection**
- Instant threat detection and analysis
- Background monitoring for continuous security
- Real-time alerts and notifications

### **Machine Learning Models**
- **Phishing Detection**: 97.4% accuracy rate
- **Computer Vision**: Advanced image analysis for clone detection
- **Natural Language Processing**: Content analysis with Google Gemini AI

### **Multi-Vector Analysis**
- **URLs**: Domain reputation and content analysis
- **Files**: Multi-engine malware scanning
- **Images**: Visual similarity and brand recognition
- **Phone Numbers**: Fraud detection and validation

## 📊 **Performance Metrics**

- **ML Model Accuracy**: 97.4% (Phishing Detection)
- **Antivirus Engines**: 60+ integrated engines
- **AI Detection Modules**: 4 specialized modules
- **Response Time**: <0.5 seconds average

## 🔧 **Technical Stack**

### **Frontend Technologies**
```json
{
  "react": "^19.1.1",
  "vite": "^7.1.3",
  "tailwindcss": "^3.4.18",
  "framer-motion": "^11.18.6",
  "lucide-react": "^0.468.0",
  "react-router-dom": "^7.1.1"
}
```

### **Backend Technologies**
```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5"
}
```

### **Python Dependencies**
```python
# Core ML Libraries
scikit-learn
pandas
numpy
requests

# AI Integration
google-generativeai
detectron2
phishpedia

# Web Services
flask
flask-cors
```

## 🚀 **Deployment Architecture**

### **Service Ports**
- **Frontend**: Vite Dev Server
- **API Gateway**: Port 5001 (Node.js)
- **Phishing Detection**: Port 5002 (Python/Flask)
- **Clone Detection**: Port 5000/5003 (Python/Flask)
- **Malware Analysis**: Port 5004 (Python/Flask)
- **Phone Detection**: Port 5007 (Python/Flask)

### **Database**
- **Primary**: MongoDB for user data and logs
- **Caching**: In-memory caching for ML model results

## 📁 **Directory Structure**

```
ciphercopdemo/
├── frontend/                    # React frontend application
├── backend/                     # Node.js API gateway
├── backend_py/                  # Python ML services
│   ├── phishing-detection/      # Phishing analysis module
│   ├── malware-detection/       # Malware scanning module
│   ├── clone-detection/         # Website clone detection
│   └── phone-number-detection/  # Scam phone detection
├── extension/                   # Chrome extension
└── Documentation & Config Files
```

## 🔒 **Security Implementation**

### **Authentication Flow**
1. JWT-based token authentication
2. Secure password hashing (bcrypt)
3. Protected API routes
4. Session management

### **API Security**
- CORS configuration
- Rate limiting
- Input validation
- Error handling

### **Data Protection**
- Encrypted environment variables
- Secure API key management
- Database connection security

## 📈 **Future Enhancements**

### **Planned Features**
- Advanced threat intelligence integration
- Machine learning model improvements
- Real-time collaborative threat sharing
- Enterprise dashboard and analytics
- Mobile application development

### **Scalability Considerations**
- Microservices architecture ready
- Container deployment (Docker)
- Load balancing capabilities
- Cloud infrastructure support

---

**CipherCop** represents a comprehensive, production-ready cybersecurity platform that combines cutting-edge AI/ML technologies with practical threat detection and response capabilities.
