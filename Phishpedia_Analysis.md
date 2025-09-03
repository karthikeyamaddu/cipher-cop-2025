# Phishpedia Deep Technical Analysis

## Executive Summary

Phishpedia is a hybrid deep learning system for visual phishing detection published at USENIX Security 2021. It uses a two-stage pipeline combining logo detection (Detectron2) and brand matching (Siamese network) to identify phishing websites through visual consistency analysis.

## System Architecture

### Core Pipeline
1. **Stage 1: Logo Detection** - Faster R-CNN detects logos in screenshots
2. **Stage 2: Brand Matching** - Siamese network matches logos against 277 brands
3. **Domain Consistency Check** - Compares detected brand with actual domain

### Key Components

#### Logo Recognition (`logo_recog.py`)
- **Model**: Faster R-CNN with ResNet backbone (Detectron2)
- **Input**: Website screenshot
- **Output**: Logo bounding boxes
- **Threshold**: 0.05 (very low to catch subtle logos)

#### Logo Matching (`logo_matching.py`)
- **Model**: BiT-M-R50x1 Siamese network
- **Input**: Cropped logo regions
- **Output**: Brand prediction with confidence
- **Threshold**: 0.87 (high for precision)
- **Features**: 2048D L2-normalized embeddings

#### Brand Database
- **Size**: 277 protected brands
- **Location**: `models/expand_targetlist/`
- **Caching**: Pre-computed embeddings in `.npy` files

## Critical Issues Found

### 1. Domain Consistency Logic DISABLED
**Problem**: The core domain verification is commented out:
```python
# --- DISABLED FOR DEBUGGING ---
# if extracted_domain in matched_domain:
#     matched_target, matched_domain = None, None
```
**Impact**: System classifies legitimate sites as phishing

### 2. Conflicting Similarity Thresholds
- Main threshold: 0.87
- Fallback threshold: 0.8
- Experimental: "All top 3 > 0.5 = phishing"
- No clear precedence between these rules

### 3. Empty Test Data
- Test files (`info.txt`, `html.txt`) are empty
- No input validation
- Silent failures on malformed data

### 4. Memory and Performance Issues
- All 2000+ logo embeddings loaded into memory
- No batch processing
- Sequential processing of multiple logos

## Technical Implementation

### Configuration (`configs.yaml`)
```yaml
ELE_MODEL:
  WEIGHTS_PATH: models/rcnn_bet365.pth
  DETECT_THRE: 0.05

SIAMESE_MODEL:
  NUM_CLASSES: 277
  MATCH_THRE: 0.87
  WEIGHTS_PATH: models/resnetv2_rgb_new.pth.tar
```

### Data Flow
1. Input: URL + Screenshot
2. Logo Detection: Detectron2 → bounding boxes
3. Logo Extraction: Crop regions
4. Feature Extraction: Siamese → embeddings
5. Similarity Matching: Cosine similarity
6. Domain Verification: Check consistency
7. Output: Classification + target brand

### Key Algorithms
- **Similarity**: Cosine similarity (dot product of L2-normalized vectors)
- **Resolution Alignment**: Resize to common resolution for retry
- **Aspect Ratio Check**: Prevent false positives (10x factor limit)

## Environment Setup

### Dependencies
- Python 3.8+
- PyTorch + TorchVision
- Detectron2 (from GitHub)
- OpenCV, Pillow, NumPy (pinned versions)
- Package manager: Pixi (preferred) or pip

### Model Files (Downloaded via setup scripts)
- `rcnn_bet365.pth` (1.2GB) - Logo detector weights
- `resnetv2_rgb_new.pth.tar` (200MB) - Siamese weights
- `expand_targetlist.zip` (500MB) - Brand database
- `domain_map.pkl` - Brand-to-domain mapping

## Usage Interfaces

### Command Line
```bash
pixi run python phishpedia.py --folder <test_folder>
```

### Web Interface
- Flask app in `WEBtool/`
- URL input + screenshot upload
- Brand database management

### Chrome Extension
- Real-time detection in browser
- Located in `Plugin_for_Chrome/`

## Debugging Strategy

### Immediate Fixes Needed
1. **Re-enable domain consistency check** with proper logic
2. **Fix threshold conflicts** - establish single decision tree
3. **Add input validation** and error handling
4. **Create proper test data** with valid URLs and screenshots

### Diagnostic Steps
1. Run `test_installation.py` to verify setup
2. Check all model files exist and are valid
3. Test with known good data
4. Enable debug logging for pipeline stages
5. Profile performance bottlenecks

### Root Cause Analysis
The system appears to be in a debugging state with critical production logic disabled. The domain consistency check is the core innovation that prevents false positives on legitimate sites, but it's currently commented out.

## Research Impact

- **Publication**: USENIX Security 2021
- **Innovation**: First consistency-based phishing detector
- **Dataset**: 30K phishing benchmark
- **Real-world**: Discovered 1,704 phishing sites (1,133 zero-days)

The system represents a significant advancement but needs the debugging code removed and proper testing to function reliably.