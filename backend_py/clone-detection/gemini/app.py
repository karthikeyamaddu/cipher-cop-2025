from __future__ import annotations
import os
import time
import hashlib
import json
import re
import requests
from pathlib import Path
from typing import Optional, Tuple
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from config_loader import AppConfig
from utils.net import guard_url, UrlError
from utils.screenshot import take_screenshot
from utils.text import extract_text_snippet
from detectors.heuristics import url_risk, brand_mismatch_score
from detectors.vision_signals import analyze_image
from detectors.gemini_mm import judge_with_image, enhanced_gemini_analysis

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

# Explicitly set the Google credentials path
credentials_path = ROOT / "cipher-cop-2025-5ecb70da4b00.json"
if credentials_path.exists():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(credentials_path)

app = Flask(__name__)
# Configure CORS to allow requests from the frontend
CORS(app, 
     origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"], 
     methods=["GET", "POST", "OPTIONS"], 
     allow_headers=["Content-Type", "Authorization", "Accept"],
     supports_credentials=True)

CFG = AppConfig(ROOT)

# Debug: Print loaded configuration
print(f"[DEBUG] Loaded {len(CFG.brands)} brands from config: {[b['name'] for b in CFG.brands]}")

OUT_DIR = ROOT / "_artifacts"
OUT_DIR.mkdir(exist_ok=True)

# -------------------------
# ML Service Integration
# -------------------------
def call_ml_service(screenshot_path: Path, url: str) -> dict:
    """
    Call the ML service (Phishpedia) for clone detection analysis.
    Returns ML analysis results or error info.
    """
    ml_service_url = "http://localhost:5000"
    
    try:
        # Step 1: Upload screenshot to ML service
        print(f"[ML] Uploading screenshot to Phishpedia...")
        
        with open(screenshot_path, 'rb') as f:
            files = {'image': f}
            upload_response = requests.post(
                f"{ml_service_url}/upload",
                files=files,
                timeout=30
            )
        
        if upload_response.status_code != 200:
            raise Exception(f"Upload failed: {upload_response.status_code}")
        
        upload_data = upload_response.json()
        if not upload_data.get("success"):
            raise Exception(f"Upload failed: {upload_data.get('error', 'Unknown error')}")
        
        image_url = upload_data.get("imageUrl")
        print(f"[ML] Running Phishpedia detection...")
        
        # Step 2: Call detect endpoint with URL and uploaded image
        detect_payload = {
            "url": url,
            "imageUrl": image_url
        }
        
        detect_response = requests.post(
            f"{ml_service_url}/detect",
            json=detect_payload,
            timeout=60  # ML analysis can take longer
        )
        
        if detect_response.status_code != 200:
            raise Exception(f"Detection failed: {detect_response.status_code}")
        
        ml_results = detect_response.json()
        
        # Debug: Print what we actually received from ML service
        # print(f"[ML] Raw ML response: {ml_results}")
        print(f"[ML] matched_brand field: {ml_results.get('matched_brand')}")
        print(f"[ML] pred_target field: {ml_results.get('pred_target')}")
        print(f"[ML] brand field: {ml_results.get('brand')}")
        
        # Clean up the verbose logo_extraction from output to avoid spam
        if 'logo_extraction' in ml_results and len(str(ml_results['logo_extraction'])) > 100:
            ml_results['logo_extraction'] = f"[Base64 image data - {len(str(ml_results['logo_extraction']))} chars]"
        
        extracted_brand = ml_results.get("matched_brand") or ml_results.get("pred_target") or ml_results.get("brand") or "unknown"
        print(f"[ML] Phishpedia result: {ml_results.get('result', 'Unknown')} (confidence: {ml_results.get('confidence', 0):.2f}) (brand: {extracted_brand})")
        
        # Step 3: Clean up uploaded file (optional)
        try:
            cleanup_payload = {"imageUrl": image_url}
            requests.post(f"{ml_service_url}/clear_upload", json=cleanup_payload, timeout=10)
        except:
            pass  # Cleanup failure is not critical
        
        return {
            "status": "success",
            "result": ml_results.get("result", "Unknown"),
            "matched_brand": ml_results.get("matched_brand") or ml_results.get("pred_target") or ml_results.get("brand") or "unknown",
            "confidence": ml_results.get("confidence", 0.0),
            "correct_domain": ml_results.get("correct_domain", "unknown"),
            "detection_time": ml_results.get("detection_time", "0.00"),
            "logo_extraction": ml_results.get("logo_extraction", ""),
            "full_results": ml_results
        }
        
    except requests.exceptions.ConnectionError:
        return {
            "status": "error",
            "error": "ML service not available (port 5000)",
            "result": "Unknown",
            "matched_brand": "unknown",
            "confidence": 0.0
        }
    except requests.exceptions.Timeout:
        return {
            "status": "error", 
            "error": "ML service timeout",
            "result": "Unknown",
            "matched_brand": "unknown",
            "confidence": 0.0
        }
    except Exception as e:
        return {
            "status": "error",
            "error": f"ML service error: {str(e)}",
            "result": "Unknown", 
            "matched_brand": "unknown",
            "confidence": 0.0
        }

# -------------------------
# Cache system removed for fresh analysis every time
# -------------------------

# -------------------------
# Retry wrapper
# -------------------------
def with_retry(func, *args, retries=3, delay=3, **kwargs):
    last_exc = None
    for i in range(retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            last_exc = e
            if i < retries - 1:
                time.sleep(delay)
            else:
                raise last_exc

# -------------------------
# Helpers for Gemini parsing & explanation cleanup
# -------------------------
def extract_json_from_text(text: str) -> Optional[dict]:
    """
    Enhanced JSON extraction from Gemini responses with better parsing.
    Returns dict or None.
    """
    if not text:
        return None
    
    # Clean the text
    t = text.strip()
    
    # Remove code fences
    t = t.replace("```json", "").replace("```", "").strip()
    
    # Try multiple extraction methods
    methods = [
        # Method 1: Find complete JSON object (handle incomplete JSON)
        lambda x: json.loads(x[x.find("{"):x.rfind("}")+1]) if "{" in x and "}" in x else None,
        # Method 2: Try to complete incomplete JSON by adding closing brace
        lambda x: json.loads(x[x.find("{"):] + "}") if "{" in x and x.count("{") > x.count("}") else None,
        # Method 3: Try parsing entire cleaned text
        lambda x: json.loads(x),
        # Method 4: Extract from the first complete JSON-like structure
        lambda x: json.loads("{" + x.split("{", 1)[1].split("}", 1)[0] + "}") if "{" in x and "}" in x else None
    ]
    
    for method in methods:
        try:
            result = method(t)
            if result and isinstance(result, dict):
                return result
        except (json.JSONDecodeError, IndexError, ValueError):
            continue
    
    # Manual parsing fallback for Gemini's specific format
    try:
        # Look for likelihood and suspected_brand in the text
        result = {}
        
        # Extract likelihood
        if '"likelihood":' in t:
            likelihood_match = re.search(r'"likelihood":\s*(\d+)', t)
            if likelihood_match:
                result["likelihood"] = int(likelihood_match.group(1))
        
        # Extract suspected_brand
        if '"suspected_brand":' in t:
            brand_match = re.search(r'"suspected_brand":\s*"([^"]*)"', t)
            if brand_match:
                result["suspected_brand"] = brand_match.group(1)
        
        # Extract explanation
        if '"explanation":' in t:
            explanation_match = re.search(r'"explanation":\s*"([^"]*(?:\\.[^"]*)*)"', t)
            if explanation_match:
                result["explanation"] = explanation_match.group(1)
        
        if result:
            return result
            
    except Exception:
        pass
    
    return None

def clean_explanation_text(text: str, max_chars: int = 600) -> str:
    """
    Remove code fences and trim to the nearest sentence under max_chars.
    """
    if not text:
        return ""
    t = text.replace("```json", "").replace("```", "").strip()
    if len(t) <= max_chars:
        return t
    # try to cut at last sentence-ending punctuation before the limit
    cut = t[:max_chars]
    last_dot = max(cut.rfind("."), cut.rfind("!"), cut.rfind("?"))
    if last_dot > 0:
        return cut[:last_dot+1]
    # otherwise return the truncated slice
    return cut + "..."

# -------------------------
# Routes
# -------------------------
@app.get("/")
def index():
    return render_template("index.html")

@app.route("/test", methods=["POST"])
def test_endpoint():
    """Simple test endpoint to debug request issues"""
    try:
        return jsonify({
            "method": request.method,
            "content_type": request.content_type,
            "has_form": bool(request.form),
            "has_files": bool(request.files),
            "has_json": request.is_json,
            "form_data": dict(request.form) if request.form else {},
            "files": list(request.files.keys()) if request.files else [],
            "json_data": request.get_json(silent=True) if request.is_json else None,
            "raw_data": request.get_data(as_text=True)[:200] if request.get_data() else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analyze", methods=["OPTIONS"])
def analyze_options():
    """Handle preflight OPTIONS requests"""
    return "", 200

@app.route("/analyze", methods=["POST"])
def analyze():
    url = None
    image_bytes = None
    
    try:
        # Handle different content types
        if request.is_json:
            # JSON request
            json_data = request.get_json(silent=True) or {}
            url = json_data.get("url")
        else:
            # Form data request (multipart/form-data or application/x-www-form-urlencoded)
            url = request.form.get("url")
        
        # Check if this is a file upload (screenshot analysis)
        if request.files and "screenshot" in request.files:
            file = request.files["screenshot"]
            if file and file.filename:
                image_bytes = file.read()
    except Exception as e:
        print(f"[ERROR] Request parsing failed: {e}")
        return jsonify({"error": f"Request parsing failed: {str(e)}"}), 400
    
    # Debug logging
    print(f"[DEBUG] Request method: {request.method}")
    print(f"[DEBUG] Content-Type: {request.content_type}")
    print(f"[DEBUG] Raw form data: {dict(request.form)}")
    print(f"[DEBUG] Form keys: {list(request.form.keys())}")
    print(f"[DEBUG] Files: {list(request.files.keys()) if request.files else []}")
    print(f"[DEBUG] All form values: {[(k, v) for k, v in request.form.items()]}")
    print(f"[DEBUG] Extracted URL: '{url}'")
    print(f"[DEBUG] Has screenshot: {bool(image_bytes)}")

    # Validate that we have either URL or image_bytes
    if not url and not image_bytes:
        return jsonify({"error": "Either URL or screenshot file is required"}), 400

    print(f"[DEBUG] Analyzing URL: {url}")
    print(f"[DEBUG] Has uploaded screenshot: {image_bytes is not None}")

    title = ""
    html = ""
    text_snippet = ""

    if url:
        try:
            url = guard_url(url)  # Capture the normalized URL
            print(f"[DEBUG] Normalized URL: {url}")
        except UrlError as e:
            return jsonify({"error": f"URL blocked: {e}"}), 400

    # If we have a URL but no image, take a screenshot
    if url and not image_bytes:
        shot_path = OUT_DIR / "shot.png"
        try:
            print(f"[DEBUG] Taking screenshot of: {url}")
            # Use longer timeout for complex sites like Amazon
            timeout_ms = CFG.limits.get("nav_timeout_ms", 30000)  # Increased to 30 seconds
            title, html = take_screenshot(url, shot_path, timeout_ms)
            image_bytes = shot_path.read_bytes()
            print(f"[DEBUG] Screenshot captured successfully, size: {len(image_bytes)} bytes")
        except Exception as e:
            print(f"[ERROR] Screenshot failed: {e}")
            # For testing purposes, let's also try a simpler site to verify the setup works
            if "amazon.com" in url.lower():
                print("[DEBUG] Amazon failed, this is expected due to bot detection. The screenshot system is working.")
                return jsonify({
                    "error": f"Failed to fetch page: {e}",
                    "note": "Amazon and similar sites often block automated browsers. The screenshot system is working properly.",
                    "suggestion": "Try with a simpler website like 'example.com' or upload a screenshot instead."
                }), 502
            else:
                return jsonify({"error": f"Failed to fetch page: {e}"}), 502

    if html:
        text_snippet = extract_text_snippet(html, limit=3000)

    # Heuristics
    heur = url_risk(url or "", page_text=text_snippet)

    # Vision AI Analysis (Run First)
    vision = {"logos": [], "text": ""}
    vision_error = None
    if image_bytes:
        try:
            vision = analyze_image(image_bytes)
            print(f"[Vision AI] Analysis completed: {len(vision.get('logos', []))} brands detected")
        except Exception as e:
            vision_error = f"Vision analysis failed: {e}"
            vision = {"error": vision_error, "logos": [], "text": ""}
            print(f"[Vision AI] Error: {e}")

    # ML Service Integration (Phishpedia) - Run in parallel with AI analysis
    ml_results = {"status": "skipped", "result": "Unknown", "matched_brand": "unknown", "confidence": 0.0}
    
    # Call ML service if we have a screenshot and URL
    if image_bytes and url:
        # Use shot2.png (viewport) for ML analysis - it's smaller and better for detection
        shot2_path = OUT_DIR / "shot2.png"
        if shot2_path.exists():
            print("[AI+ML] Starting ML service analysis...")
            ml_results = call_ml_service(shot2_path, url)
        elif (OUT_DIR / "shot.png").exists():
            # Fallback to original shot.png
            print("[AI+ML] Using fallback screenshot for ML...")
            ml_results = call_ml_service(OUT_DIR / "shot.png", url)
        else:
            ml_results = {
                "status": "error",
                "error": "No screenshot available for ML analysis",
                "result": "Unknown",
                "matched_brand": "unknown", 
                "confidence": 0.0
            }
            print("[AI+ML] No screenshot found for ML analysis")

    # Brand detection (top logo from Vision)
    detected_brand = ""
    if vision.get("logos"):
        logos = sorted(vision["logos"], key=lambda x: x.get("score", 0), reverse=True)
        detected_brand = logos[0]["description"]
        print(f"Top detected brand from Vision: {detected_brand}")

    # Gemini Analysis (Run Second, with Vision results)
    gem = {"likelihood": 50, "suspected_brand": "", "explanation": ""}
    if image_bytes:
        try:
            print("Starting Gemini analysis with Vision AI results...")
            raw_gem = with_retry(
                judge_with_image,
                image_bytes=image_bytes,
                url=url or "",
                page_title=title,
                text_snippet=text_snippet,
                authorized_brands=CFG.brands,
                vision_results=vision,  # Pass Vision results to Gemini
                retries=2, delay=5
            )
            print(f"Gemini analysis completed: {raw_gem}")
            
            # raw_gem may already be a dict; if it's a string try to parse
            if isinstance(raw_gem, dict):
                gem = raw_gem.copy()
            else:
                # try to interpret as JSON string
                try:
                    gem = json.loads(raw_gem)
                except Exception:
                    gem = {"likelihood": 50, "suspected_brand": "", "explanation": str(raw_gem)}
        except Exception as e:
            gem = {"likelihood": 50, "suspected_brand": "", "explanation": f"Gemini analysis failed: {e}"}
            print(f"Gemini error: {e}")

    # Enhanced JSON parsing from Gemini explanation
    parsed = None
    if isinstance(gem.get("explanation"), str):
        parsed = extract_json_from_text(gem["explanation"])
        print(f"[DEBUG] Parsed JSON from Gemini: {parsed}")
    
    if parsed:
        # merge parsed values into gem - OVERRIDE the original values
        if "likelihood" in parsed:
            try:
                original_likelihood = gem.get("likelihood", 50)
                gem["likelihood"] = int(parsed["likelihood"])
                print(f"[DEBUG] Updated likelihood: {original_likelihood} → {gem['likelihood']}")
            except Exception as e:
                print(f"[DEBUG] Failed to parse likelihood: {e}")
        
        if "suspected_brand" in parsed:
            original_brand = gem.get("suspected_brand", "")
            gem["suspected_brand"] = parsed.get("suspected_brand") or ""
            print(f"[DEBUG] Updated suspected brand: '{original_brand}' → '{gem['suspected_brand']}'")
        
        # prefer parsed explanation field if present
        if "explanation" in parsed:
            gem["explanation"] = parsed.get("explanation", gem.get("explanation", ""))
    
    print(f"[DEBUG] Final Gemini results: likelihood={gem.get('likelihood')}, brand='{gem.get('suspected_brand')}')")

    # -------------------------
    # Brand mismatch scoring
    # -------------------------
    allowed_domains = []
    reg_domain = heur.get("registered_domain", "")
    brand_for_mismatch = ""

    # Prefer Gemini’s suspected brand if available, else fallback to vision
    if gem.get("suspected_brand"):
        brand_for_mismatch = gem["suspected_brand"]
    elif detected_brand:
        brand_for_mismatch = detected_brand  # <-- do not drop vision brand, always keep it

    # Lookup allowed domains for that brand (case-insensitive matching)
    if brand_for_mismatch:
        brand_lower = brand_for_mismatch.lower()
        for b in CFG.brands:
            brand_name_lower = b["name"].lower()
            # Extract base brand name (remove .com, .org etc)
            base_brand_name = brand_name_lower.split('.')[0]
            
            # Check multiple matching strategies
            matches = [
                brand_name_lower == brand_lower,  # Exact match
                brand_name_lower in brand_lower,  # Full name match
                brand_lower in brand_name_lower,  # Reverse match
                base_brand_name == brand_lower,   # Base name exact match
                base_brand_name in brand_lower,   # Base name match (amazon.com → amazon)
                brand_lower in base_brand_name,   # Reverse base match
                any(domain.split('.')[0].lower() == brand_lower for domain in b.get("domains", [])),  # Domain exact match
                any(domain.split('.')[0].lower() in brand_lower for domain in b.get("domains", []))  # Domain partial match
            ]
            
            if any(matches):
                allowed_domains = b.get("domains", [])
                print(f"[DEBUG] Found brand match: '{brand_for_mismatch}' → '{b['name']}' with domains {allowed_domains}")
                break
        else:
            print(f"[DEBUG] No brand match found for: '{brand_for_mismatch}'")

    # Score mismatch: if domain doesn’t belong to brand → high risk
    brand_score = brand_mismatch_score(
        brand_for_mismatch or "",
        brand_for_mismatch or "",
        reg_domain,
        allowed_domains
    )
    
    # If brand detected but not in our config, treat as suspicious
    if brand_for_mismatch and not allowed_domains:
        print(f"[DEBUG] Unknown brand '{brand_for_mismatch}' detected - applying suspicion penalty")
        brand_score = max(brand_score, 40)  # Apply moderate suspicion for unknown brands
    
    # Adjust Gemini likelihood for legitimate brand-domain matches
    adjusted_gemini_likelihood = gem.get("likelihood", 50)
    is_legitimate_match = False
    
    if brand_for_mismatch and reg_domain and reg_domain in allowed_domains:
        # This is a legitimate brand-domain match - reduce suspicion significantly
        adjusted_gemini_likelihood = max(5, adjusted_gemini_likelihood - 70)
        is_legitimate_match = True
        brand_score = 0  # No brand mismatch penalty for legitimate matches
        print(f"[DEBUG] Legitimate match detected - adjusted Gemini likelihood: {gem.get('likelihood')} → {adjusted_gemini_likelihood}")
    elif brand_for_mismatch and reg_domain and reg_domain not in allowed_domains:
        # Brand detected but domain doesn't match - high suspicion
        adjusted_gemini_likelihood = max(70, adjusted_gemini_likelihood)
        brand_score = max(brand_score, 80)  # High brand mismatch penalty
        print(f"[DEBUG] Brand-domain mismatch detected - high suspicion: brand={brand_for_mismatch}, domain={reg_domain}")
    elif brand_for_mismatch and not reg_domain:
        # Screenshot-only analysis with detected brand - moderate suspicion
        # We can't verify domain, so apply moderate penalty
        adjusted_gemini_likelihood = max(40, adjusted_gemini_likelihood - 20)
        if brand_score == 0:
            brand_score = 30  # Moderate penalty for screenshot-only brand detection
        print(f"[DEBUG] Screenshot-only with brand detection - moderate suspicion: {gem.get('likelihood')} → {adjusted_gemini_likelihood}")
        print(f"[DEBUG] Applied screenshot-only brand detection penalty: brand_score = {brand_score}")

    print(f"[DEBUG] Brand mismatch analysis:")
    print(f"  - Detected brand: {brand_for_mismatch}")
    print(f"  - Registered domain: {reg_domain}")
    print(f"  - Allowed domains: {allowed_domains}")
    print(f"  - Brand mismatch score: {brand_score}")
    print(f"  - Is legitimate match: {is_legitimate_match}")

    # -------------------------
    # Enhanced Gemini Analysis (NEW STAGE)
    # -------------------------
    enhanced_gem = {}
    if image_bytes:
        try:
            print("Starting Enhanced Gemini Analysis with all previous results...")
            
            # Prepare brand analysis data
            brand_analysis_data = {
                "detected_brand": brand_for_mismatch,
                "allowed_domains": allowed_domains,
                "is_legitimate_match": is_legitimate_match,
                "brand_score": brand_score
            }
            
            enhanced_gem = with_retry(
                enhanced_gemini_analysis,
                image_bytes=image_bytes,
                url=url or "",
                vision_results=vision,
                initial_gemini=gem,
                brand_analysis=brand_analysis_data,
                heuristic_results=heur,
                retries=2, delay=5
            )
            print(f"Enhanced Gemini analysis completed: {enhanced_gem}")
            
        except Exception as e:
            enhanced_gem = {
                "final_likelihood": gem.get("likelihood", 50),
                "confidence": 30,
                "primary_threat_indicators": [f"Enhanced analysis failed: {str(e)}"],
                "legitimacy_factors": [],
                "final_verdict": "SUSPICIOUS",
                "expert_explanation": f"Enhanced analysis error: {str(e)}"
            }
            print(f"Enhanced Gemini error: {e}")

    # -------------------------
    # Dynamic weights
    # -------------------------
    w = CFG.weights.copy()
    if vision.get("logos"):
        w["vision_brand"] = w.get("vision_brand", 0) + 0.1
    if text_snippet and len(text_snippet) > 1000:
        w["gemini"] = w.get("gemini", 0) + 0.1

    total = sum(w.values()) or 1.0
    w = {k: v / total for k, v in w.items()}

    # Use Enhanced Gemini score if available, otherwise fall back to adjusted likelihood
    final_gemini_score = adjusted_gemini_likelihood
    if enhanced_gem.get("final_likelihood") is not None:
        final_gemini_score = enhanced_gem["final_likelihood"]
        print(f"[DEBUG] Using Enhanced Gemini score: {final_gemini_score} (confidence: {enhanced_gem.get('confidence', 0)}%)")
    
    # Calculate individual components using enhanced score
    gemini_component = w.get("gemini", 0) * final_gemini_score
    vision_component = w.get("vision_brand", 0) * (brand_score or 0)
    heuristics_component = w.get("heuristics", 0) * (heur.get("risk", 0) or 0)
    
    final = gemini_component + vision_component + heuristics_component
    
    print(f"[DEBUG] Final scoring calculation:")
    print(f"  - Weights: {w}")
    print(f"  - Original Gemini likelihood: {gem.get('likelihood', 50)}")
    print(f"  - Adjusted Gemini likelihood: {adjusted_gemini_likelihood}")
    print(f"  - Enhanced Gemini likelihood: {final_gemini_score}")
    print(f"  - Brand score: {brand_score}")
    print(f"  - Heuristics risk: {heur.get('risk', 0)}")
    print(f"  - Gemini component: {gemini_component}")
    print(f"  - Vision component: {vision_component}")
    print(f"  - Heuristics component: {heuristics_component}")
    print(f"  - Final score: {final}")

    # Decision & advice
    th = CFG.thresholds
    if final >= th.get("clone", 60):
        decision = "clone"
        advice = "⚠️ Do NOT enter credentials or personal info."
    elif final >= th.get("suspicious", 30):
        decision = "suspicious"
        advice = "🟠 Be cautious — this site may be a clone. Double-check the domain."
    else:
        decision = "clean"
        advice = "🟢 Looks safe, but always verify before logging in."

    # Clean & trim explanation (prefer Gemini explanation)
    explanation_raw = gem.get("explanation") or ""
    explanation = clean_explanation_text(explanation_raw, max_chars=600)

    # Enhanced final response with all analysis stages
    result = {
        "url": url,
        "decision": decision,
        "score": round(final, 1),
        "advice": advice,
        "explanation": explanation,
        
        # Comprehensive analysis breakdown
        "analysis_stages": {
            "stage_a_vision": {
                "name": "Google Vision AI Analysis",
                "status": "completed" if vision.get("logos") is not None else "failed",
                "key_findings": {
                    "logos_detected": len(vision.get("logos", [])),
                    "top_brand": vision.get("logos", [{}])[0].get("description", "None") if vision.get("logos") else "None",
                    "text_extracted": bool(vision.get("text", "")),
                    "web_entities": len(vision.get("web_entities", [])),
                    "similar_images": len(vision.get("similar_images", [])),
                    "spoof_detection": vision.get("safe_search", {}).get("spoof", "UNKNOWN")
                },
                "full_results": {k: v for k, v in vision.items() if k != "error"}
            },
            
            "stage_b_gemini": {
                "name": "Initial Gemini AI Analysis", 
                "status": "completed" if gem.get("likelihood") is not None else "failed",
                "key_findings": {
                    "likelihood": gem.get("likelihood", 0),
                    "suspected_brand": gem.get("suspected_brand", ""),
                    "reasoning_preview": gem.get("explanation", "")[:200] + "..." if len(gem.get("explanation", "")) > 200 else gem.get("explanation", "")
                },
                "full_results": gem
            },
            
            "stage_c_enhanced_gemini": {
                "name": "Enhanced Gemini Analysis",
                "status": "completed" if enhanced_gem.get("final_likelihood") is not None else "failed",
                "key_findings": {
                    "final_likelihood": enhanced_gem.get("final_likelihood", 0),
                    "confidence": enhanced_gem.get("confidence", 0),
                    "final_verdict": enhanced_gem.get("final_verdict", "UNKNOWN"),
                    "threat_indicators": enhanced_gem.get("primary_threat_indicators", []),
                    "legitimacy_factors": enhanced_gem.get("legitimacy_factors", [])
                },
                "full_results": enhanced_gem
            },
            
            "stage_d_heuristics": {
                "name": "Heuristic Pattern Analysis",
                "status": "completed",
                "key_findings": {
                    "domain_risk": heur.get("risk", 0),
                    "registered_domain": heur.get("registered_domain", ""),
                    "suspicious_patterns": len(heur.get("signals", {})),
                    "pattern_details": list(heur.get("signals", {}).keys())
                },
                "full_results": heur
            },
            
            "stage_e_ml_phishpedia": {
                "name": "ML Analysis (Phishpedia)",
                "status": ml_results.get("status", "unknown"),
                "key_findings": {
                    "result": ml_results.get("result", "Unknown"),
                    "matched_brand": ml_results.get("matched_brand", "unknown"),
                    "confidence": ml_results.get("confidence", 0.0),
                    "correct_domain": ml_results.get("correct_domain", "unknown"),
                    "detection_time": ml_results.get("detection_time", "0.00"),
                    "has_logo_extraction": bool(ml_results.get("logo_extraction"))
                },
                "full_results": ml_results
            }
        },
        
        # Legacy signals structure (for backward compatibility)
        "signals": {
            "heuristics": heur,
            "vision": {k: v for k, v in vision.items() if k != "error"},
            "gemini": gem,
            "enhanced_gemini": enhanced_gem,
            "ml_phishpedia": ml_results,
            "brand_mismatch": {
                "brand": brand_for_mismatch,
                "allowed_domains": allowed_domains,
                "registered_domain": reg_domain,
                "score": brand_score,
            },
        },
        
        # Scoring breakdown
        "breakdown": {
            "gemini": round(w.get("gemini", 0) * final_gemini_score, 1),
            "vision_brand": round(w.get("vision_brand", 0) * (brand_score or 0), 1),
            "heuristics": round(w.get("heuristics", 0) * (heur.get("risk", 0) or 0), 1),
        },
        
        # Error tracking
        "errors": {
            k: v for k, v in {
                "vision": vision_error or vision.get("error"),
                "gemini": gem.get("error") if gem.get("error") else None,
                "enhanced_gemini": enhanced_gem.get("error") if enhanced_gem.get("error") else None,
                "ml_phishpedia": ml_results.get("error") if ml_results.get("error") else None
            }.items() if v
        }
    }

    # Return result (no caching for fresh analysis)
    return jsonify(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5003)), debug=True)
