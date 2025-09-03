---
inclusion: always
---

# Technology Stack & Development Standards

## Core Technologies

- **Python 3.8+**: Primary language - use type hints and follow PEP 8
- **PyTorch**: Deep learning framework - prefer torch.jit for model optimization
- **Detectron2**: Logo detection backbone - do not modify core library
- **OpenCV**: Image processing - use cv2 namespace consistently
- **Flask**: Web interface - keep separate from core detection logic

## Critical Dependencies

- **numpy==1.23.0**: PINNED VERSION - do not upgrade (compatibility requirement)
- **torch, torchvision**: GPU acceleration when available
- **detectron2**: Install via pip, not conda
- **opencv-python**: Use headless version for production

## Package Management Rules

**Use Pixi exclusively** - do not mix with pip/conda:
- All dependencies in `pixi.toml`
- Use `pixi run` prefix for all Python commands
- Cross-platform compatibility required (Windows/Linux/macOS)

## Setup Commands (Platform-Specific)

**Windows:**
```cmd
pixi install
setup.bat
pixi run python test_installation.py
```

**Linux/macOS:**
```bash
pixi install
chmod +x setup.sh && ./setup.sh
pixi run python test_installation.py
```

## Model Architecture Constraints

- **Stage 1 (Detectron2)**: Faster R-CNN - do not modify architecture
- **Stage 2 (Siamese)**: ResNet backbone - maintain feature dimension compatibility
- **Configuration**: All parameters via `configs.yaml` - no hardcoded values
- **Model files**: Never edit .pth/.tar files - these are pre-trained weights

## Development Standards

- Use `pixi run python` for all script execution
- Test changes with `test_installation.py` before committing
- Maintain GPU/CPU compatibility in all torch operations
- Follow existing import patterns and module structure