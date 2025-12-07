# 🔐 Google Cloud Setup Guide for CipherCop

## Overview

Your CipherCop application uses **2 Google Cloud services** across multiple features. This guide will help you set up a new Google Cloud account and enable the required services.

---

## 📋 Required Google Cloud Services

### 1. **Google Cloud Vision API** 
**Used By**: Clone Detection Service  
**File**: `backend_py/clone-detection/gemini/detectors/vision_signals.py`  
**Purpose**: 
- Logo detection in screenshots
- OCR (text extraction from images)
- Object detection
- Web entity detection
- Brand identification

**Features Enabled**:
- Logo Detection
- Document Text Detection (OCR)
- Object Localization
- Web Detection
- Label Detection
- Safe Search Detection

---

### 2. **Google Gemini AI API** (Generative AI)
**Used By**: 
- Clone Detection Service (`backend_py/clone-detection/gemini/`)
- Phone Scam Detection (`backend_py/phone-number-detection/gemini_analyzer.py`)
- Phishing URL Detection (`backend/src/checks/phishing.js`)

**Purpose**:
- AI-powered threat analysis
- Brand impersonation detection
- Scam pattern recognition
- Risk assessment and recommendations

**Model Used**: `gemini-1.5-flash` (fast, cost-effective)

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept terms and conditions
4. Set up billing (required even for free tier)
   - You get **$300 free credits** for 90 days
   - Vision API: 1,000 requests/month free
   - Gemini API: Free tier available

---

### Step 2: Create a New Project

1. Click **"Select a project"** at the top
2. Click **"New Project"**
3. Enter project details:
   - **Project Name**: `ciphercop-2025` (or your choice)
   - **Organization**: Leave as default
4. Click **"Create"**
5. Wait for project creation (takes ~30 seconds)
6. Select your new project from the dropdown

---

### Step 3: Enable Required APIs

#### 3.1 Enable Cloud Vision API

1. Go to [Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
2. Make sure your project is selected at the top
3. Click **"Enable"**
4. Wait for activation (~1 minute)

**Or use search**:
1. Click hamburger menu (☰) → **APIs & Services** → **Library**
2. Search for **"Cloud Vision API"**
3. Click on it → Click **"Enable"**

---

#### 3.2 Enable Generative AI API (Gemini)

1. Go to [Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)
2. Click **"Enable"**
3. Wait for activation

**Or use search**:
1. In API Library, search for **"Generative Language API"**
2. Click on it → Click **"Enable"**

---

### Step 4: Create Service Account (for Vision API)

Vision API requires a service account with JSON credentials.

1. Go to **IAM & Admin** → **Service Accounts**
   - Direct link: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click **"Create Service Account"**
3. Enter details:
   - **Service account name**: `ciphercop-vision`
   - **Description**: `Service account for CipherCop Vision API`
4. Click **"Create and Continue"**
5. Grant roles:
   - Select **"Cloud Vision AI Service Agent"**
   - Or select **"Owner"** for full access (easier for development)
6. Click **"Continue"** → **"Done"**

---

### Step 5: Create JSON Key File

1. In Service Accounts list, find your new service account
2. Click on the **email address** to open details
3. Go to **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"**
7. JSON file will download automatically
8. **IMPORTANT**: Rename the file to something memorable:
   - Example: `ciphercop-vision-credentials.json`
   - Or: `cipher-cop-2025-XXXXXXXX.json`

---

### Step 6: Get Gemini API Key

Gemini uses a simple API key (not service account).

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with the same Google account
3. Click **"Create API Key"**
4. Select your Google Cloud project (`ciphercop-2025`)
5. Click **"Create API key in existing project"**
6. Copy the API key (starts with `AIza...`)
7. **IMPORTANT**: Save this key securely - you can't see it again!

**Alternative Method**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **"Create Credentials"** → **"API Key"**
4. Copy the key
5. (Optional) Click **"Restrict Key"** to limit to Generative Language API only

---

## 📁 File Placement

### For Clone Detection Service

**Location**: `backend_py/clone-detection/gemini/`

1. Copy your JSON credentials file to:
   ```
   backend_py/clone-detection/gemini/cipher-cop-2025-XXXXXXXX.json
   ```

2. Update `.env` file in `backend_py/clone-detection/gemini/.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=cipher-cop-2025-XXXXXXXX.json
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

---

### For Phone Scam Detection Service

**Location**: `backend_py/phone-number-detection/`

Update `.env` file:
```env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### For Node.js Backend (Phishing Detection)

**Location**: `backend/`

Update `.env` file:
```env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## ✅ Verification Checklist

### Check APIs are Enabled

1. Go to [APIs & Services Dashboard](https://console.cloud.google.com/apis/dashboard)
2. Verify you see:
   - ✅ Cloud Vision API - Enabled
   - ✅ Generative Language API - Enabled

---

### Test Vision API

Run the test script:
```bash
cd backend_py/clone-detection/gemini
python test_vision.py
```

**Expected Output**:
```
Using service account: /path/to/cipher-cop-2025-XXXXXXXX.json
Vision client created OK
✓ Vision API is working!
```

---

### Test Gemini API

Run the test script:
```bash
cd backend_py/clone-detection/gemini
python test_gemini.py
```

**Expected Output**:
```
Gemini key found: True
✓ Gemini API is working!
Response: Hello! I'm Gemini...
```

---

## 💰 Cost Estimates (Free Tier)

### Cloud Vision API
- **Free Tier**: 1,000 requests/month
- **After Free Tier**: $1.50 per 1,000 requests
- **Your Usage**: ~100-500 requests/month (low)

### Gemini API
- **Free Tier**: 
  - 15 requests per minute
  - 1,500 requests per day
  - 1 million tokens per month
- **After Free Tier**: Pay-as-you-go pricing
- **Your Usage**: ~50-200 requests/day (within free tier)

**Total Monthly Cost**: $0 (within free tier limits)

---

## 🔒 Security Best Practices

### 1. Protect Your Credentials

**DO**:
- ✅ Add `*.json` to `.gitignore`
- ✅ Store credentials in `.env` files
- ✅ Use environment variables in production
- ✅ Restrict API keys to specific APIs

**DON'T**:
- ❌ Commit credentials to Git
- ❌ Share credentials publicly
- ❌ Use the same key across multiple projects
- ❌ Leave API keys unrestricted

---

### 2. Restrict API Keys

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check only:
     - ✅ Cloud Vision API
     - ✅ Generative Language API
4. Click **"Save"**

---

### 3. Set Up Quotas

1. Go to [Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. Filter by service: "Cloud Vision API"
3. Set daily limits to prevent unexpected charges
4. Recommended limits:
   - Vision API: 500 requests/day
   - Gemini API: 1,000 requests/day

---

## 🐛 Troubleshooting

### Error: "GOOGLE_APPLICATION_CREDENTIALS not set"

**Solution**:
1. Check `.env` file has the correct path
2. Verify JSON file exists at that path
3. Use absolute path if relative path fails:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/full/path/to/credentials.json
   ```

---

### Error: "Permission denied" or "403 Forbidden"

**Solution**:
1. Verify APIs are enabled in Cloud Console
2. Check service account has correct roles
3. Wait 5-10 minutes for permissions to propagate
4. Try regenerating the JSON key

---

### Error: "API key not valid"

**Solution**:
1. Verify API key is copied correctly (no spaces)
2. Check API key restrictions allow your APIs
3. Regenerate API key if needed
4. Verify billing is enabled on your project

---

### Error: "Quota exceeded"

**Solution**:
1. Check [Quotas page](https://console.cloud.google.com/iam-admin/quotas)
2. Wait for quota to reset (daily/monthly)
3. Request quota increase if needed
4. Consider upgrading to paid tier

---

## 📊 Monitoring Usage

### View API Usage

1. Go to [APIs Dashboard](https://console.cloud.google.com/apis/dashboard)
2. Click on **"Cloud Vision API"** or **"Generative Language API"**
3. View metrics:
   - Requests per day
   - Errors
   - Latency
   - Quota usage

---

### Set Up Billing Alerts

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Click **"Budgets & alerts"**
3. Click **"Create Budget"**
4. Set budget amount: $10/month (safe limit)
5. Set alert thresholds: 50%, 90%, 100%
6. Add your email for notifications

---

## 🔄 Migration from Old Account

If you're migrating from an old Google Cloud account:

1. **Export old credentials** (if needed):
   - Download JSON key from old service account
   - Copy Gemini API key

2. **Update all `.env` files**:
   ```bash
   # Find all .env files
   find . -name ".env" -type f
   
   # Update each one with new credentials
   ```

3. **Test each service**:
   - Clone detection: `cd backend_py/clone-detection/gemini && python test_vision.py`
   - Phone scam: `cd backend_py/phone-number-detection && python app.py`
   - Phishing: `cd backend && npm start`

4. **Verify in application**:
   - Test clone detection with screenshot
   - Test phone scam lookup
   - Test phishing URL analysis

---

## 📝 Summary

### What You Need:

1. ✅ **Google Cloud Project** created
2. ✅ **Cloud Vision API** enabled
3. ✅ **Generative Language API** enabled
4. ✅ **Service Account JSON** file downloaded
5. ✅ **Gemini API Key** copied
6. ✅ **Credentials placed** in correct directories
7. ✅ **`.env` files updated** with credentials

### Files to Update:

1. `backend_py/clone-detection/gemini/.env`
   - `GOOGLE_APPLICATION_CREDENTIALS`
   - `GEMINI_API_KEY`

2. `backend_py/phone-number-detection/.env`
   - `GEMINI_API_KEY`

3. `backend/.env`
   - `GEMINI_API_KEY`

---

## 🎯 Quick Start Commands

After setting up credentials:

```bash
# Test Vision API
cd backend_py/clone-detection/gemini
python test_vision.py

# Test Gemini API
python test_gemini.py

# Start all services
cd ../../..
# Use your existing start scripts
```

---

## 📞 Need Help?

- [Google Cloud Vision Docs](https://cloud.google.com/vision/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Google Cloud Support](https://cloud.google.com/support)

---

**Last Updated**: December 2025  
**Version**: 1.0
