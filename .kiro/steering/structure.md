---
inclusion: always
---

# Project Structure & Development Guidelines

## Architecture Patterns

- **Two-stage pipeline**: Always maintain separation between logo detection (`logo_recog.py`) and brand matching (`logo_matching.py`)
- **Configuration-driven**: Use `configs.yaml` for all model paths, thresholds, and runtime parameters
- **Modular design**: Keep utility functions in `utils.py`, model definitions in `models.py`
- **Caching strategy**: Leverage `.npy` files for pre-computed features to avoid redundant processing

## Key File Responsibilities

- **phishpedia.py**: CLI entry point - handles argument parsing and orchestrates the detection pipeline
- **configs.py**: Configuration management - loads YAML configs and initializes model paths
- **logo_recog.py**: Stage 1 detection - wraps Detectron2 for logo bounding box detection
- **logo_matching.py**: Stage 2 matching - implements Siamese network for brand identification
- **utils.py**: Shared utilities - image processing, file I/O, and helper functions
- **models.py**: Neural network architectures and model loading logic

## Directory Structure Rules

```
Phishpedia/                 # Main project - all core logic here
├── models/                 # Model weights and brand database - never modify directly
├── datasets/              # Test data - follow info.txt + shot.png pattern
├── WEBtool/               # Flask web interface - separate from core logic
└── Plugin_for_Chrome/     # Browser extension - independent component

detectron2/                # External dependency - do not modify
```

## Development Conventions

- **Model files**: Never edit `.pth`, `.tar`, or `.pkl` files - these are pre-trained weights
- **Brand database**: The 277 brands in `models/expand_targetlist/` are fixed - additions require retraining
- **Input validation**: Always check for `info.txt` and `shot.png` in test folders
- **Error handling**: Gracefully handle missing models, corrupted images, and network failures
- **Logging**: Use consistent logging patterns for debugging and result tracking

## File Naming Patterns

- **Test data**: `test_site_N/` folders with `info.txt` (URL) and `shot.png` (screenshot)
- **Results**: `YYYYMMDD_results.txt` format for output files
- **Cache files**: `LOGO_FEATS.npy` and `LOGO_FILES.npy` for feature caching
- **Configs**: Use `.yaml` for configuration, `.py` for code-based configs

## Integration Points

- **Detectron2**: Interface through `logo_recog.py` - abstract away Detectron2 specifics
- **PyTorch**: Model loading and inference in `logo_matching.py` and `models.py`
- **OpenCV**: Image processing utilities in `utils.py`
- **Flask**: Web interface in `WEBtool/` - keep separate from core detection logic