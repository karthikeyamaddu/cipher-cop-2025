# 🛡️ CipherCop - Phishpedia Clone Detection v1

<div align="center">

![Protected Brands](https://img.shields.io/badge/Protected_Brands-277-green?style=flat-square)
![Detection Method](https://img.shields.io/badge/Method-Consistency_Based-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Debugged_&_Working-success?style=flat-square)

</div>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-web-interface">Web Interface</a> •
  <a href="#-testing">Testing</a> •
  <a href="#-improvements">Improvements</a>
</p>

## 📋 **Project Overview**

This is a **debugged and enhanced version** of Phishpedia - a hybrid deep learning system for visual phishing detection. Based on the USENIX Security 2021 paper, this implementation uses a consistency-based approach rather than traditional classification to identify phishing websites.

### 🔍 **How It Works**
1. **Logo Detection**: Uses Faster R-CNN (Detectron2) to detect logos in website screenshots
2. **Brand Matching**: Employs a Siamese network to match detected logos against 277 protected brands  
3. **Domain Verification**: Checks consistency between detected brand and actual domain
4. **Decision**: Reports phishing if domain doesn't match the detected brand's legitimate domains

## ✨ **Key Features**

- 🎯 **Visual Explanation**: Shows exactly which brand logo was detected and why it's suspicious
- 🚫 **No Training Bias**: Not trained on phishing datasets, avoiding distribution shift issues
- 🔍 **277 Protected Brands**: Comprehensive database of major brands and their legitimate domains
- 🌐 **Multiple Interfaces**: Command-line, web application, and browser extension
- 📊 **Detailed Logging**: Enhanced debug output for transparency and testing

## 🚀 **Quick Start**

### Prerequisites
- Python 3.8+
- Virtual environment (recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/karthikeyamaddu/cipher-cop.git
   cd cipher-cop
   ```

2. **Set up virtual environment**
   ```bash
   python -m venv phishpedia_env
   phishpedia_env\Scripts\activate  # Windows
   # source phishpedia_env/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   pip install --no-build-isolation git+https://github.com/facebookresearch/detectron2.git
   ```

4. **Download model files**
   ```bash
   # Windows
   setup.bat
   
   # Linux/Mac
   chmod +x setup.sh
   ./setup.sh
   ```

### Basic Usage

```bash
# Test with sample data
python phishpedia.py --folder datasets/test_sites

# Force reprocessing (bypass cache)
python phishpedia.py --folder datasets/test_sites --force

# Disable caching entirely
python phishpedia.py --folder datasets/test_sites --no-cache
```

## 🌐 **Web Interface**

Launch the web application for interactive testing:

```bash
cd WEBtool
python app.py
```

Then open `http://localhost:5000` in your browser.

### Web Features
- 📤 **Upload Screenshots**: Test with your own website images
- 🔗 **URL Input**: Enter suspicious URLs for analysis
- 👁️ **Visual Results**: See detected logos with bounding boxes
- 🎯 **Brand Management**: Add/remove brands from the database
- 📊 **Real-time Analysis**: Get instant phishing detection results

## 🧪 **Testing**

### Test Data Format
```
test_site_folder/
├── info.txt     # Contains the URL (single line)
├── shot.png     # Website screenshot
└── html.txt     # Optional: HTML content
```

### Example Test Results
```
================================================================================
🔍 PHISHPEDIA ANALYSIS STARTING
📄 URL: https://fake-amazon-login.com
🖼️  Screenshot: test_screenshot.png
================================================================================
🔍 STAGE 1: Running logo detection...
✅ STAGE 1 RESULT: Found 2 logo(s) in 0.123s
🔍 STAGE 2: Running brand matching and domain verification...
[DEBUG] Top 3 similarity scores:
[DEBUG] Brand: Amazon, Similarity Score: 0.9251
✅ STAGE 2 RESULT: Matched to brand "Amazon" with confidence 0.9251
🎯 BRAND DOMAINS: ['amazon.com', 'amazon.se', 'amazon.fr']
⚠️  DOMAIN INCONSISTENCY DETECTED!
⚖️  FINAL DECISION: PHISHING (domain mismatch)
================================================================================
```

## 🔧 **Improvements Made (v1)**

### 🐛 **Critical Bugs Fixed**
- ✅ **Re-enabled domain consistency logic** (was disabled for debugging)
- ✅ **Fixed conflicting similarity thresholds** (0.5 vs 0.87 vs 0.8)
- ✅ **Added proper error handling** for malformed input data
- ✅ **Fixed directory filtering** (no more .DS_Store crashes)

### 🚀 **Enhancements Added**
- ✅ **Enhanced logging** with detailed stage-by-stage output
- ✅ **Cache control options** (--force, --no-cache flags)
- ✅ **Input validation** with clear error messages
- ✅ **Improved web interface** with better error handling

### 📊 **Testing Improvements**
- ✅ **Created realistic test cases** with proper phishing scenarios
- ✅ **Added visual feedback** in detection results
- ✅ **Comprehensive debug output** for transparency

## 📁 **Project Structure**

```
cipher-cop/
├── models/                     # Model files (download separately)
│   ├── rcnn_bet365.pth        # Logo detection model
│   ├── resnetv2_rgb_new.pth.tar # Brand matching model
│   ├── expand_targetlist/      # 277 brand logo database
│   └── domain_map.pkl         # Brand-to-domain mapping
├── WEBtool/                   # Web application
│   ├── app.py                 # Main Flask app
│   ├── templates/             # HTML templates
│   └── static/                # CSS, JS, images
├── datasets/                  # Test data
│   └── test_sites/           # Sample test cases
├── phishpedia.py             # Main CLI script
├── logo_recog.py             # Logo detection module
├── logo_matching.py          # Brand matching module
├── configs.py                # Configuration loader
└── configs.yaml              # System configuration
```

## ⚙️ **Configuration**

Key settings in `configs.yaml`:
```yaml
ELE_MODEL:
  DETECT_THRE: 0.05           # Logo detection threshold (low = more sensitive)

SIAMESE_MODEL:
  MATCH_THRE: 0.87            # Brand matching threshold (high = more precise)
  NUM_CLASSES: 277            # Number of protected brands
```

## 🎯 **Performance Notes**

- **Logo Detection**: ~4-5 seconds per image
- **Brand Matching**: ~0.1-0.4 seconds per logo
- **Memory Usage**: ~2GB (loads all brand embeddings)
- **Accuracy**: High precision, conservative approach (few false positives)

## 🔬 **Research Context**

Based on the USENIX Security 2021 paper:
- **Innovation**: First consistency-based phishing detector
- **Dataset**: 30K phishing benchmark with visual annotations
- **Real-world Impact**: Discovered 1,704 phishing sites (1,133 zero-days)

## 📝 **Original Citation**

```bibtex
@inproceedings{lin2021phishpedia,
  title={Phishpedia: A Hybrid Deep Learning Based Approach to Visually Identify Phishing Webpages},
  author={Lin, Yun and Liu, Ruofan and Divakaran, Dinil Mon and Ng, Jun Yang and Chan, Qing Zhou and Lu, Yiwen and Si, Yuxuan and Zhang, Fan and Dong, Jin Song},
  booktitle={30th USENIX Security Symposium (USENIX Security 21)},
  year={2021}
}
```

## 🤝 **Contributing**

This is a debugged and enhanced version. Key improvements welcome:
- Additional brand logos and domains
- Performance optimizations
- UI/UX improvements
- Additional test cases

## 📞 **Support**

For issues with this debugged version, please open a GitHub issue with:
- Detailed error description
- System information
- Sample input data (if applicable)

---

**Note**: This is an enhanced version of the original Phishpedia with critical bugs fixed and usability improvements. The core research and methodology remain unchanged from the original USENIX Security 2021 paper.
