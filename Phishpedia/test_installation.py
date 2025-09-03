#!/usr/bin/env python3
"""
Simple test script to check Phishpedia installation status
"""

def test_imports():
    """Test importing required modules"""
    print("Testing imports...")
    
    try:
        import numpy as np
        print("✓ NumPy imported successfully")
    except ImportError as e:
        print("✗ NumPy import failed:", e)
    
    try:
        import requests
        print("✓ Requests imported successfully")
    except ImportError as e:
        print("✗ Requests import failed:", e)
    
    try:
        import cv2
        print("✓ OpenCV imported successfully")
    except ImportError as e:
        print("✗ OpenCV import failed:", e)
    
    try:
        import torch
        print(f"✓ PyTorch imported successfully (version: {torch.__version__})")
    except ImportError as e:
        print("✗ PyTorch import failed:", e)
    
    try:
        import torchvision
        print(f"✓ TorchVision imported successfully (version: {torchvision.__version__})")
    except ImportError as e:
        print("✗ TorchVision import failed:", e)
    
    try:
        from detectron2 import model_zoo
        print("✓ Detectron2 imported successfully")
    except ImportError as e:
        print("✗ Detectron2 import failed:", e)

def test_model_files():
    """Test if model files exist"""
    import os
    print("\nTesting model files...")
    
    model_files = [
        "models/rcnn_bet365.pth",
        "models/faster_rcnn.yaml", 
        "models/resnetv2_rgb_new.pth.tar",
        "models/domain_map.pkl"
    ]
    
    for file_path in model_files:
        if os.path.exists(file_path):
            print(f"✓ {file_path} exists")
        else:
            print(f"✗ {file_path} missing")
    
    if os.path.exists("models/expand_targetlist"):
        print("✓ expand_targetlist directory exists")
    else:
        print("✗ expand_targetlist directory missing")

def test_configs():
    """Test loading configuration"""
    print("\nTesting configuration loading...")
    
    try:
        import yaml
        with open('configs.yaml', 'r') as f:
            config = yaml.safe_load(f)
        print("✓ Configuration file loaded successfully")
    except Exception as e:
        print("✗ Configuration loading failed:", e)

if __name__ == "__main__":
    test_imports()
    test_model_files()
    test_configs()
    print("\nTest complete!")
