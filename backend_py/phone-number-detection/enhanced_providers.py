"""
Enhanced providers with better scam detection APIs
"""
import os
import httpx
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

def _get(url, params=None, headers=None, timeout=10):
    """Helper for GET requests"""
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(url, params=params, headers=headers)
            return {"status_code": resp.status_code, "raw": resp.json() if resp.status_code == 200 else resp.text}
    except Exception as e:
        return {"status_code": 500, "raw": {"error": str(e)}}

# === BETTER SCAM DETECTION APIS ===

def truecaller_lookup(e164: str) -> Dict[str, Any]:
    """
    TrueCaller API - Best for spam/scam detection
    Requires TrueCaller Business API key
    """
    api_key = os.getenv('TRUECALLER_API_KEY')
    if not api_key:
        return {"provider": "truecaller", "error": "No API key"}
    
    url = "https://search5-noneu.truecaller.com/v2/search"
    headers = {"Authorization": f"Bearer {api_key}"}
    params = {"q": e164, "countryCode": "IN", "type": "4"}
    
    resp = _get(url, params=params, headers=headers)
    result = {"provider": "truecaller", "raw": resp.get("raw")}
    
    if resp.get("status_code") == 200:
        data = resp.get("raw", {})
        # Extract spam indicators
        if "data" in data:
            for item in data["data"]:
                if "spamInfo" in item:
                    result["spam_score"] = item["spamInfo"].get("spamScore", 0)
                    result["spam_type"] = item["spamInfo"].get("spamType")
                if "name" in item:
                    result["caller_name"] = item["name"]
                if "tags" in item:
                    result["tags"] = item["tags"]
    
    return result

def scammer_info_lookup(e164: str) -> Dict[str, Any]:
    """
    Scammer.info API - Community-driven scam database
    Free API with rate limits
    """
    # Remove + from E164
    phone = e164.replace("+", "")
    url = f"https://api.scammer.info/v1/check/{phone}"
    
    resp = _get(url)
    result = {"provider": "scammer_info", "raw": resp.get("raw")}
    
    if resp.get("status_code") == 200:
        data = resp.get("raw", {})
        if "is_scammer" in data:
            result["is_scammer"] = data["is_scammer"]
            result["confidence"] = data.get("confidence", 0)
            result["reports"] = data.get("reports", [])
    
    return result

def who_called_me_lookup(e164: str) -> Dict[str, Any]:
    """
    WhoCalledMe API - Another community database
    """
    phone = e164.replace("+", "").replace("-", "").replace(" ", "")
    url = f"https://whocalld.com/api/v1/lookup/{phone}"
    
    resp = _get(url)
    result = {"provider": "whocalledme", "raw": resp.get("raw")}
    
    if resp.get("status_code") == 200:
        data = resp.get("raw", {})
        if "spam_score" in data:
            result["spam_score"] = data["spam_score"]
            result["category"] = data.get("category")
            result["reports_count"] = data.get("reports_count", 0)
    
    return result

def phone_validator_lookup(e164: str) -> Dict[str, Any]:
    """
    PhoneValidator.com API - Better fraud detection
    """
    api_key = os.getenv('PHONEVALIDATOR_API_KEY')
    if not api_key:
        return {"provider": "phonevalidator", "error": "No API key"}
    
    url = "https://api.phonevalidator.com/api/v2/verify"
    params = {
        "api_key": api_key,
        "phone": e164,
        "format": "json"
    }
    
    resp = _get(url, params=params)
    result = {"provider": "phonevalidator", "raw": resp.get("raw")}
    
    if resp.get("status_code") == 200:
        data = resp.get("raw", {})
        result["risk_level"] = data.get("risk_level")
        result["is_disposable"] = data.get("is_disposable")
        result["fraud_score"] = data.get("fraud_score")
        result["line_type"] = data.get("line_type")
    
    return result

def hiya_lookup(e164: str) -> Dict[str, Any]:
    """
    Hiya API - Professional spam/scam detection
    Requires Hiya Business API
    """
    api_key = os.getenv('HIYA_API_KEY')
    if not api_key:
        return {"provider": "hiya", "error": "No API key"}
    
    url = "https://api.hiya.com/v1/lookup"
    headers = {"Authorization": f"Bearer {api_key}"}
    params = {"phone": e164}
    
    resp = _get(url, params=params, headers=headers)
    result = {"provider": "hiya", "raw": resp.get("raw")}
    
    if resp.get("status_code") == 200:
        data = resp.get("raw", {})
        result["reputation"] = data.get("reputation")
        result["category"] = data.get("category")
        result["risk_level"] = data.get("risk_level")
    
    return result

# === FREE DATABASES ===

def free_scam_databases_lookup(e164: str) -> Dict[str, Any]:
    """
    Check against multiple free scam databases
    """
    phone = e164.replace("+", "")
    results = {"provider": "free_databases", "databases": {}}
    
    # Check multiple free sources
    sources = [
        f"https://www.shouldianswer.com/phone-number/{phone}",
        f"https://www.whoscall.com/search/?phone={phone}",
        f"https://sync.whoscall.com/api/v1/query?phone={phone}",
    ]
    
    for i, url in enumerate(sources):
        try:
            resp = _get(url, timeout=5)
            results["databases"][f"source_{i+1}"] = resp
        except:
            results["databases"][f"source_{i+1}"] = {"error": "timeout"}
    
    return results

# === ENHANCED SCORING FOR SCAM DETECTION ===

def enhanced_scam_score(signals: Dict[str, Any]) -> tuple[int, str, list]:
    """
    Enhanced scoring focused on scam detection
    """
    score = 0
    evidence = []
    
    # Check TrueCaller data
    if "truecaller" in signals:
        tc = signals["truecaller"]
        spam_score = tc.get("spam_score", 0)
        if spam_score > 50:
            score += 70
            evidence.append(f"TrueCaller: High spam score ({spam_score})")
        elif spam_score > 20:
            score += 30
            evidence.append(f"TrueCaller: Moderate spam score ({spam_score})")
        
        if tc.get("spam_type"):
            score += 40
            evidence.append(f"TrueCaller: Flagged as {tc['spam_type']}")
    
    # Check Scammer.info
    if "scammer_info" in signals:
        si = signals["scammer_info"]
        if si.get("is_scammer"):
            score += 80
            confidence = si.get("confidence", 0)
            evidence.append(f"Scammer.info: Confirmed scammer (confidence: {confidence}%)")
    
    # Check PhoneValidator
    if "phonevalidator" in signals:
        pv = signals["phonevalidator"]
        fraud_score = pv.get("fraud_score", 0)
        if fraud_score > 70:
            score += 60
            evidence.append(f"PhoneValidator: High fraud risk ({fraud_score})")
        
        if pv.get("is_disposable"):
            score += 30
            evidence.append("PhoneValidator: Disposable/temporary number")
    
    # Determine verdict
    if score >= 70:
        verdict = "LIKELY SCAM"
    elif score >= 40:
        verdict = "SUSPICIOUS"
    elif score >= 20:
        verdict = "MODERATE RISK"
    else:
        verdict = "LOW RISK"
    
    return min(score, 100), verdict, evidence
