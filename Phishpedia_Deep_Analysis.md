# Phishpedia Deep Technical Analysis

## Executive Summary

Phishpedia is a hybrid deep learning system for visual phishing detection published at USENIX Security 2021. It uses a two-stage pipeline combining logo detection (Detectron2) and brand matching (Siamese network) to identify phishing websites through visual consistency analysis rather than traditional classification.

## System Architecture

### Core Pipeline
1. **Stage 1: Logo Detection** - Faster R-CNN (Detectron2) detects logos in screenshots
2. **Stage 2: Brand Matching** - Siamese network matches detected logos against 277 protected brands
3. **Domain Consistency Check** - Compares detected brand with actual domain to identify inconsistencies

### Key Components

#### 1. Logo Recognition Module (`logo_recog.py`)
- **Model**: Faster R-CNN with ResNet backbone
- **Framework**: Detectron2
- **Input**: Website screenshot (PNG/JPEG)
- **Output**: Bounding boxes of detected logos
- **Configuration**: `models/faster_rcnn.yaml`
- **Weights**: `models/rcnn_bet365.pth`
- **Threshold**: 0.05 (very low to catch subtle logos)

#### 2. Logo Matching Module (`logo_matching.py`)
- **Model**: BiT-M-R50x1 (Big Transfer ResNet-50)
- **Architecture**: Siamese network for similarity learning
- **Input**: Cropped logo regions from Stage 1
- **Output**: Brand prediction with confidence score
- **Weights**: `models/resnetv2_rgb_new.pth.tar`
- **Threshold**: 0.87 (high threshold for precision)
- **Features**: 2048-dimensional L2-normalized embeddings

#### 3. Brand Database
- **Size**: 277 protected brands
- **Location**: `models/expand_targetlist/`
- **Structure**: One folder per brand containing reference logos
- **Caching**: Pre-computed embeddings stored in `LOGO_FEATS.npy` and `LOGO_FILES.npy`
- **Domain Mapping**: `models/domain_map.pkl` maps brands to legitimate domains

## Technical Implementation Details

### Configuration System (`configs.py`, `configs.yaml`)
```yaml
ELE_MODEL: # Logo detection
  CFG_PATH: models/faster_rcnn.yaml
  WEIGHTS_PATH: models/rcnn_bet365.pth
  DETECT_THRE: 0.05

SIAMESE_MODEL: # Brand matching
  NUM_CLASSES: 277
  MATCH_THRE: 0.87
  WEIGHTS_PATH: models/resnetv2_rgb_new.pth.tar
  TARGETLIST_PATH: models/expand_targetlist.zip
  DOMAIN_MAP_PATH: models/domain_map.pkl
```

### Data Flow
1. **Input**: URL + Screenshot (required format: `shot.png` + `info.txt`)
2. **Logo Detection**: Detectron2 processes screenshot → bounding boxes
3. **Logo Extraction**: Crop detected regions from screenshot
4. **Feature Extraction**: Siamese network → 2048D embeddings
5. **Similarity Matching**: Cosine similarity against cached brand embeddings
6. **Domain Verification**: Check domain consistency
7. **Output**: Phish/Benign classification + target brand

### Key Algorithms

#### Similarity Computation
- **Method**: Cosine similarity (dot product of L2-normalized vectors)
- **Optimization**: Chunked processing for memory efficiency
- **Top-K**: Considers top 3 matches for robustness

#### Resolution Alignment
- **Purpose**: Handle scale differences between detected and reference logos
- **Method**: Resize both images to minimum common resolution
- **Fallback**: If initial similarity < threshold, retry with aligned resolution

#### Aspect Ratio Check
- **Purpose**: Prevent false positives from geometrically different logos
- **Threshold**: Aspect ratio deviation must be < 10x factor
- **Implementation**: `max(ratio1, ratio2) / min(ratio1, ratio2) <= 10.0`

## Current Issues and Debugging Insights

### 1. Domain Consistency Logic (CRITICAL ISSUE)
**Problem**: The domain consistency check is currently DISABLED in the code:
```python
# --- DISABLED FOR DEBUGGING ---
# if extracted_domain in matched_domain:
#     matched_target, matched_domain = None, None  # Clear if domains are consistent
```

**Impact**: System will classify legitimate sites as phishing if they contain their own logos
**Root Cause**: Debugging code left in production

### 2. Similarity Threshold Issues
**Current Behavior**: 
- Uses 0.87 threshold (very high)
- Falls back to 0.8 for resolution-aligned matching
- Has experimental logic: "If all top 3 similarity scores > 0.5, classify as phishing"

**Potential Issues**:
- Threshold too high → false negatives
- Experimental logic conflicts with main threshold
- No clear precedence between different threshold checks

### 3. Model File Dependencies
**Required Files**:
- `rcnn_bet365.pth` (1.2GB) - Detectron2 weights
- `resnetv2_rgb_new.pth.tar` (200MB) - Siamese network weights
- `expand_targetlist.zip` (500MB) - Brand logo database
- `domain_map.pkl` - Brand-to-domain mapping
- `faster_rcnn.yaml` - Detectron2 configuration

**Setup Issues**:
- Complex download process via Google Drive
- Extraction and flattening of nested directories
- Platform-specific setup scripts (bash/batch)

### 4. Input Data Format Constraints
**Expected Structure**:
```
test_site_folder/
├── info.txt     # Contains URL (single line)
├── shot.png     # Website screenshot
└── html.txt     # Optional HTML content
```

**Current Test Data Issues**:
- Empty `info.txt` and `html.txt` files in test dataset
- No validation of input format
- Silent failures on malformed input

### 5. Performance and Memory Issues
**Logo Database**:
- 277 brands × multiple logos per brand = ~2000+ reference images
- All embeddings loaded into memory (2048 × 2000+ floats)
- No lazy loading or indexing optimization

**Processing Pipeline**:
- No batch processing support
- Sequential processing of multiple logos per image
- Heavy I/O for image loading and cropping

## Environment and Dependencies

### Package Management
- **Primary**: Pixi (modern Python package manager)
- **Fallback**: pip requirements.txt
- **Channels**: conda-forge + PyPI

### Critical Dependencies
```toml
python = ">=3.8"
numpy = "1.23.0"  # Pinned version (compatibility issue)
torch = ">=1.9.0"
torchvision = ">=0.10.0"
Pillow = "8.4.0"  # Pinned version
opencv-python = "*"
detectron2 = "git+https://github.com/facebookresearch/detectron2.git"
```

### Platform Support
- **Supported**: Linux, macOS, Windows
- **GPU**: CUDA support (falls back to CPU)
- **Architecture**: x86_64, ARM64 (Apple Silicon)

## Interfaces and Usage

### 1. Command Line Interface
```bash
pixi run python phishpedia.py --folder <test_folder>
```
**Outpuion.able operatr relig fod addressinat neecal bugs theveral critihas sentation emmpl current i the bias, butraining setding t avois andlanationvisual expproviding ction by detehishing n pancement ificant adv a signim represents
This systeero-days
 z133ng sites, 1,phishi04 real ,7overed 1iscmpact**: Dworld Iors
**Real-detected nce-bassting referexiutperforms etion**: O**Evaluatations
l annowith visuahmark ishing bencph0K t**: 3*Datase detector
*shinged) phion-baslassificati (vs cbasedonsistency-st cation**: Fir21
**Innovy 20Securit USENIX **:ationublic**Ptext

arch Cons

## Resetimization op processingchg and bat cachinmplement Ince**:forman
5. **Per degradatioracefulnd gs ar message erromproveng**: IError Handlicking
4. **format chesive input rehen*: Add compValidation*
3. **Input on treecisio single deintogic hold lres thlidatent**: ConsoManagemeld  **Thresho
2.t logickliselist/blachit proper wmplement**: Iicin LogDomaxes
1. **mmended Fi
### Reco
linesing pipe in procesleneckstify bott**: Idenancee performofilage
5. **Pr stach pipelinetput for e ouosed verb**: Adebug logging*Enable d. *es
4er test case prop**: Creatood datath known g. **Test wivalid
3re  and astfiles exil required  Check aliles**: model ffy
2. **Veripy`ation.all_inst: Run `testion**atall inst
1. **Testsnostic Stepag
### Diest files
mpty tpulate e** - potatest dar with prope*Test . *andling
4ror h ererrop - add pata format**te input dlida*Vadence
3. *prece clear ish* - establconflicts*old reshimilarity th*Fix s
2. *r logicth prope** wiy checknsistencin coenable domae-ress
1. **Rssues to Adde Iediat# Immrategy

##Debugging St

## b servicel weocath les wicat communielyation**: Likmunic**Comction
- l-time detereaion for  extens**: Browserpe)
- **Tyome/`r_Chr_fogin`Plu (sione ExtenChrom## 3. 

#t)lhosca00 (lo: 50
- **Port**management, brand hot uploadscreensL input, UR*: ures*- **Featsk
work**: Flarame- **FBtool/`)
e (`WEb Interfac. We`

### 2_results.txto `{date}written tults est**: R