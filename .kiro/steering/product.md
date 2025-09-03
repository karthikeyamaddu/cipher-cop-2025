---
inclusion: always
---

# Phishpedia Product Guidelines

Phishpedia is a hybrid deep learning system for visual phishing detection using a two-stage pipeline: logo detection followed by brand matching. The system prioritizes interpretability and robustness over traditional classification approaches.

## Core Architecture Principles

- **Two-stage pipeline**: Always maintain separation between logo detection (Stage 1) and brand matching (Stage 2)
- **Consistency-based detection**: Focus on visual brand consistency rather than training on phishing datasets
- **Interpretable results**: Every phishing decision must include visual explanation through brand identification
- **Threshold-based classification**: Use configurable confidence thresholds for both detection stages

## Input/Output Specifications

- **Required inputs**: URL string and webpage screenshot (PNG format)
- **Expected outputs**: Binary classification (Phish/Benign) + target brand identification
- **Test data format**: Folders containing `info.txt` (URL) and `shot.png` (screenshot)

## Supported Interfaces

- **CLI**: Primary interface via `phishpedia.py --folder <path>`
- **Web GUI**: Flask-based interface in `WEBtool/` directory
- **Chrome Extension**: Browser integration in `Plugin_for_Chrome/`

## Brand Database Standards

- Supports exactly 277 protected brands in `models/expand_targetlist/`
- Each brand folder contains reference logo images
- Brand matching uses pre-computed feature vectors (LOGO_FEATS.npy)
- Domain mappings stored in `domain_map.pkl`

## Performance Requirements

- Real-time detection capability for web interfaces
- Batch processing support for research/analysis
- Configurable confidence thresholds via `configs.yaml`
- Results logging with timestamps for audit trails

## Research Context

USENIX Security 2021 publication - maintain academic rigor in implementations and ensure reproducibility of results.