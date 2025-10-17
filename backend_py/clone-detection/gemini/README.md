# CipherCop 2025 - Clone Detection System

A sophisticated phishing website detection system that combines Google's Gemini AI and Cloud Vision API to identify fraudulent websites attempting to impersonate legitimate brands.

## 🚀 Features

- **Multi-Modal Detection**: Combines text analysis, visual inspection, and heuristic checks
- **AI-Powered Analysis**: Uses Gemini 1.5 for intelligent content analysis
- **Visual Brand Recognition**: Google Cloud Vision API for logo and visual element detection
- **Real-time Screenshots**: Automated webpage capture using Playwright
- **Configurable Scoring**: Weighted scoring system with customizable thresholds
- **Brand Database**: Pre-configured legitimate brand domains and keywords
- **RESTful API**: Easy integration with web interface

## 🏗️ Architecture

The system uses a three-tier detection approach:

1. **Gemini AI Analysis** (40% weight): Analyzes webpage content for phishing indicators
2. **Vision Brand Detection** (40% weight): Identifies brand logos and visual elements
3. **Heuristic Checks** (20% weight): Domain analysis, keyword matching, and structural patterns

## 📋 Prerequisites

- Python 3.8+
- Google Cloud Project with Vision API enabled
- Gemini API key
- Chrome/Chromium browser (for Playwright)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/karthikeyamaddu/cipher-cop-2025.git
   cd cipher-cop-2025
   git checkout clone-detection-gemini
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Playwright browsers**
   ```bash
   playwright install chromium
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=AIzaSyANEa0anRX3Iqk9JajDRAHXuycnS3mT-no
   GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account.json
   PROJECT_ID=your_gcp_project_id
   LOCATION=us-central1
   ```

5. **Configure Google Cloud credentials**
   - Create a service account in Google Cloud Console
   - Download the JSON key file
   - Update the `GOOGLE_APPLICATION_CREDENTIALS` path in `.env`

## 🚀 Usage

### Start the Flask Application

```bash
python app.py
```

The application will start on `http://localhost:5000`

### API Endpoints

#### Analyze URL
```http
POST /analyze
Content-Type: application/json

{
    "url": "https://suspicious-website.com"
}
```

**Response:**
```json
{
    "url": "https://suspicious-website.com",
    "is_clone": true,
    "confidence": 85.5,
    "details": {
        "gemini_score": 90,
        "vision_score": 80,
        "heuristics_score": 75,
        "detected_brand": "Google",
        "risk_factors": ["Suspicious domain", "Fake login form"]
    }
}
```

### Web Interface

Navigate to `http://localhost:5000` to use the web interface for URL analysis.

## ⚙️ Configuration

### Detection Weights (`config/app.yaml`)
```yaml
weights:
  gemini: 0.4          # Gemini AI analysis weight
  vision_brand: 0.4    # Vision API brand detection weight
  heuristics: 0.2      # Heuristic checks weight

thresholds:
  clone: 60           # Score threshold for clone detection
  suspicious: 30      # Score threshold for suspicious sites

limits:
  max_html_chars: 20000      # Max HTML content to analyze
  screenshot_timeout_ms: 15000  # Screenshot capture timeout
  nav_timeout_ms: 15000        # Page navigation timeout
```

### Authorized Brands (`config/authorized_sites.yaml`)
```yaml
brands:
  - name: Google
    domains: ["google.com", "accounts.google.com"]
    keywords: ["Google", "Gmail", "Sign in"]
  
  - name: PayPal
    domains: ["paypal.com"]
    keywords: ["PayPal", "Log in", "Send & Request"]
```

## 🧪 Testing

### Test Gemini API Connection
```bash
python test_gemini.py
```

### Test Google Cloud Vision API
```bash
python test_vision.py
```

## 📁 Project Structure

```
cipher-cop-2025/
├── app.py                      # Main Flask application
├── config_loader.py            # Configuration management
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (create this)
├── config/
│   ├── app.yaml               # Application configuration
│   └── authorized_sites.yaml  # Legitimate brand definitions
├── detectors/
│   ├── gemini_mm.py           # Gemini AI detector
│   ├── vision_signals.py      # Google Vision detector
│   └── heuristics.py          # Heuristic analysis
├── utils/
│   ├── screenshot.py          # Screenshot capture utility
│   ├── net.py                 # Network utilities
│   └── text.py                # Text processing utilities
└── templates/
    └── index.html             # Web interface template
```

## 🔧 Components

### Detectors

- **Gemini Multimodal (`gemini_mm.py`)**: Uses Gemini 1.5 to analyze webpage content and screenshots for phishing indicators
- **Vision Signals (`vision_signals.py`)**: Leverages Google Cloud Vision API for brand logo detection and visual analysis
- **Heuristics (`heuristics.py`)**: Implements rule-based checks for domain patterns, keywords, and structural analysis

### Utilities

- **Screenshot (`screenshot.py`)**: Captures webpage screenshots using Playwright
- **Network (`net.py`)**: Handles URL validation and network requests
- **Text (`text.py`)**: Processes and cleans HTML content for analysis

## 🎯 Detection Methodology

1. **URL Validation**: Checks URL format and accessibility
2. **Content Extraction**: Captures HTML content and page screenshot
3. **Multi-Modal Analysis**:
   - Gemini AI analyzes text content and visual elements
   - Vision API detects brand logos and visual similarities
   - Heuristic rules check domain patterns and keywords
4. **Scoring**: Combines weighted scores from all detectors
5. **Classification**: Determines if site is legitimate, suspicious, or a clone

## 🔒 Security Considerations

- API keys are stored in environment variables
- Service account credentials use least-privilege access
- Input validation prevents malicious URL injection
- Rate limiting recommended for production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for advanced content analysis
- Google Cloud Vision API for visual recognition
- Playwright for reliable web automation
- Flask for the web framework

## 📞 Support

For support and questions, please open an issue in the GitHub repository.

---

**⚠️ Disclaimer**: This tool is for educational and security research purposes. Always ensure you have permission before analyzing websites.