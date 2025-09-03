# 🛡️ Phishpedia: Visual Phishing Detection System

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Research Paper](https://img.shields.io/badge/paper-USENIX%20Security%202021-red.svg)](https://www.usenix.org/conference/usenixsecurity21)

A hybrid deep learning system for visual phishing detection using a two-stage pipeline: **logo detection** followed by **brand matching**. This system prioritizes interpretability and robustness over traditional classification approaches.

## 🎯 **How It Works**

Phishpedia uses a **consistency-based approach** rather than training on phishing datasets, making it more robust against new attack patterns:

1. **🔍 Stage 1 - Logo Detection**: Uses Detectron2 (Faster R-CNN) to detect brand logos in webpage screenshots
2. **🎯 Stage 2 - Brand Matching**: Uses a Siamese network (ResNet backbone) to match detected logos against 277 protected brands
3. **⚖️ Domain Verification**: Compares the webpage's domain against the detected brand's legitimate domains
4. **🚨 Decision**: Reports phishing if domain doesn't match the detected brand's legitimate domains

## ✨ **Key Features**

- 🎯 **Visual Explanation**: Shows exactly which brand logo was detected and why it's suspicious
- 🚫 **No Training Bias**: Not trained on phishing datasets, avoiding distribution shift issues
- 🔍 **277 Protected Brands**: Comprehensive database of major brands and their legitimate domains
- 🌐 **Multiple Interfaces**: Command-line, web application, and browser extension
- 📊 **Detailed Logging**: Enhanced debug output for transparency and testing
- ⚡ **Real-time Detection**: Optimized for both batch processing and real-time web interfaces

## 🏗️ **Architecture Overview**

```
Phishpedia/                 # Main project directory
├── phishpedia.py          # CLI entry point
├── configs.py             # Configuration management
├── configs.yaml           # Runtime parameters and model paths
├── logo_recog.py          # Stage 1: Logo detection (Detectron2)
├── logo_matching.py       # Stage 2: Brand matching (Siamese network)
├── models.py              # Neural network architectures
├── utils.py               # Shared utilities and image processing
├── models/                # Model weights and brand database
│   ├── rcnn_bet365.pth           # Detectron2 model weights
│   ├── resnetv2_rgb_new.pth.tar  # Siamese network weights
│   ├── domain_map.pkl            # Brand-to-domain mappings
│   └── expand_targetlist/        # 277 brand reference images
├── datasets/              # Test data (info.txt + shot.png format)
├── WEBtool/              # Flask web interface
└── Plugin_for_Chrome/    # Browser extension

detectron2/               # External dependency (do not modify)
```

## 🚀 **Quick Start**

### Prerequisites
- **Python 3.8+**
- **Git**
- **Virtual environment** (recommended)
- **GPU support** (optional but recommended for faster processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/karthikeyamaddu/cipher-cop-2025.git
   cd cipher-cop-2025
   ```

2. **Set up with Pixi (Recommended)**
   ```bash
   # Install Pixi package manager
   # Visit: https://docs.astral.sh/uv/getting-started/installation/
   
   # Install dependencies
   pixi install
   
   # Run setup script
   setup.bat          # Windows
   # chmod +x setup.sh && ./setup.sh  # Linux/macOS
   
   # Test installation
   pixi run python test_installation.py
   ```

3. **Alternative: Manual Setup**
   ```bash
   # Create virtual environment
   python -m venv phishpedia_env
   phishpedia_env\Scripts\activate  # Windows
   # source phishpedia_env/bin/activate  # Linux/Mac
   
   # Install dependencies
   pip install -r requirements.txt
   pip install --no-build-isolation git+https://github.com/facebookresearch/detectron2.git
   
   # Test installation
   python test_installation.py
   ```

## 📖 **Usage**

### Command Line Interface

**Basic Usage:**
```bash
# Activate environment (if using manual setup)
phishpedia_env\Scripts\activate

# Run on test dataset
pixi run python phishpedia.py --folder datasets/test_sites
# OR: python phishpedia.py --folder datasets/test_sites

# Run with cache control
pixi run python phishpedia.py --folder datasets/test_sites --force
pixi run python phishpedia.py --folder datasets/test_sites --no-cache
```

**Expected Output:**
```
================================================================================
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

### Web Application

1. **Start the web server:**
   ```bash
   cd WEBtool
   pixi run python app.py
   # OR: python app.py
   ```

2. **Open browser:** Navigate to `http://localhost:5000`

3. **Use the interface:**
   - Enter a URL in the URL field
   - Upload a webpage screenshot
   - Click "Start Detection!"
   - View detailed results with visual explanations

### Browser Extension

1. **Navigate to:** `Plugin_for_Chrome/`
2. **Follow the setup instructions** in the Chrome extension directory
3. **Real-time phishing detection** while browsing

## 📁 **Test Data Format**

Organize test data as follows:
```
datasets/test_sites/
├── site1/
│   ├── info.txt     # Contains the URL
│   └── shot.png     # Screenshot of the webpage
├── site2/
│   ├── info.txt
│   └── shot.png
└── ...
```

**Example `info.txt`:**
```
https://fake-paypal-login.com
```

## ⚙️ **Configuration**

### Main Configuration (`configs.yaml`)

```yaml
ELE_MODEL: # Logo detection model
  CFG_PATH: models/faster_rcnn.yaml
  WEIGHTS_PATH: models/rcnn_bet365.pth
  DETECT_THRE: 0.05                    # Detection threshold

SIAMESE_MODEL: # Brand matching model
  NUM_CLASSES: 277                     # Number of protected brands
  MATCH_THRE: 0.87                     # Matching threshold
  WEIGHTS_PATH: models/resnetv2_rgb_new.pth.tar
  TARGETLIST_PATH: models/expand_targetlist.zip
  DOMAIN_MAP_PATH: models/domain_map.pkl
```

### Key Parameters

- **`DETECT_THRE`**: Logo detection confidence threshold (0.05 = detect more logos)
- **`MATCH_THRE`**: Brand matching threshold (0.87 = high confidence required)
- **`NUM_CLASSES`**: Fixed at 277 (number of protected brands)

## 🔧 **Development**

### Technology Stack

- **Python 3.8+**: Primary language with type hints
- **PyTorch**: Deep learning framework
- **Detectron2**: Logo detection backbone (Faster R-CNN)
- **OpenCV**: Image processing
- **Flask**: Web interface
- **Pixi**: Package management (recommended)

### Key Dependencies

- **numpy==1.23.0**: PINNED VERSION (compatibility requirement)
- **torch, torchvision**: GPU acceleration when available
- **detectron2**: Install via pip, not conda
- **opencv-python**: Use headless version for production

### Development Guidelines

1. **Use Pixi exclusively** - don't mix with pip/conda
2. **Test changes** with `test_installation.py` before committing
3. **Maintain GPU/CPU compatibility** in all torch operations
4. **Never edit model files** (`.pth`, `.tar`, `.pkl`) - these are pre-trained weights
5. **Follow existing import patterns** and module structure

### Running Tests

```bash
# Test installation and dependencies
pixi run python test_installation.py

# Test specific components
pixi run python -c "from logo_recog import *; print('Logo detection OK')"
pixi run python -c "from logo_matching import *; print('Brand matching OK')"
```

## 📊 **Model Information**

### Stage 1: Logo Detection
- **Architecture**: Faster R-CNN with ResNet backbone
- **Framework**: Detectron2
- **Input**: Webpage screenshots (any size)
- **Output**: Bounding boxes of detected logos
- **Model File**: `models/rcnn_bet365.pth`

### Stage 2: Brand Matching
- **Architecture**: Siamese Network with ResNet backbone
- **Framework**: PyTorch
- **Input**: Cropped logo images
- **Output**: Brand similarity scores (0-1)
- **Model File**: `models/resnetv2_rgb_new.pth.tar`

### Brand Database
- **277 Protected Brands**: Major companies across various industries
- **Reference Images**: Multiple logo variations per brand
- **Domain Mappings**: Legitimate domains for each brand
- **Cache Files**: `LOGO_FEATS.npy`, `LOGO_FILES.npy` for faster processing

## 🐛 **Troubleshooting**

### Common Issues

1. **Import Errors**
   ```bash
   # Reinstall detectron2
   pip uninstall detectron2
   pip install --no-build-isolation git+https://github.com/facebookresearch/detectron2.git
   ```

2. **Model Files Missing**
   ```bash
   # Re-run setup script
   setup.bat  # Windows
   # ./setup.sh  # Linux/macOS
   ```

3. **GPU Issues**
   ```bash
   # Check CUDA availability
   python -c "import torch; print(torch.cuda.is_available())"
   ```

4. **Memory Issues**
   - Reduce batch size in processing
   - Use CPU-only mode if GPU memory is insufficient
   - Process images individually instead of batches

### Debug Mode

Enable detailed logging by modifying the detection threshold or adding debug flags:
```bash
pixi run python phishpedia.py --folder datasets/test_sites --debug
```

## 📈 **Performance**

- **Real-time Detection**: ~1-3 seconds per webpage
- **Batch Processing**: Optimized for large datasets
- **Memory Usage**: ~2GB GPU memory (recommended)
- **CPU Fallback**: Available when GPU is not accessible

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the development guidelines
4. Test thoroughly with `test_installation.py`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 **Research Paper**

This implementation is based on the research paper:
**"Phishpedia: A Hybrid Deep Learning Based Approach to Visually Identify Phishing Webpages"**
*USENIX Security Symposium 2021*

## 📞 **Support**

For issues with this implementation:
1. Check the [troubleshooting section](#-troubleshooting)
2. Run `test_installation.py` to verify setup
3. Open a GitHub issue with:
   - Detailed error description
   - System information
   - Sample input data (if applicable)

## 🙏 **Acknowledgments**

- Original Phishpedia research team
- Facebook Research (Detectron2)
- PyTorch community
- All contributors to this enhanced implementation

---

**Note**: This is an enhanced version of the original Phishpedia with critical bugs fixed, improved usability, and comprehensive documentation. The core research methodology remains unchanged from the original USENIX Security 2021 paper.