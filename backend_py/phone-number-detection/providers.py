import os
import time
from typing import Dict, Any
import httpx
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Simple synchronous adapters using httpx (no external retry lib).
# Each adapter returns a normalized dict (may be empty) plus the raw response under 'raw'.

IPQS_KEY = os.getenv("IPQS_KEY")
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
TELESIGN_CUSTOMER_ID = os.getenv("TELESIGN_CUSTOMER_ID")
TELESIGN_API_KEY = os.getenv("TELESIGN_API_KEY")
NUMVERIFY_KEY = os.getenv("NUMVERIFY_KEY")

# Debug: Print what we loaded
print(f"[PROVIDERS INIT] Environment variables loaded:")
print(f"[PROVIDERS INIT] IPQS_KEY: {'SET' if IPQS_KEY else 'NOT SET'}")
print(f"[PROVIDERS INIT] TWILIO_SID: {'SET' if TWILIO_SID else 'NOT SET'}")
print(f"[PROVIDERS INIT] TWILIO_TOKEN: {'SET' if TWILIO_TOKEN else 'NOT SET'}")
print(f"[PROVIDERS INIT] TELESIGN_CUSTOMER_ID: {'SET' if TELESIGN_CUSTOMER_ID else 'NOT SET'}")
print(f"[PROVIDERS INIT] TELESIGN_API_KEY: {'SET' if TELESIGN_API_KEY else 'NOT SET'}")
print(f"[PROVIDERS INIT] NUMVERIFY_KEY: {'SET' if NUMVERIFY_KEY else 'NOT SET'}")

DEFAULT_TIMEOUT = 6.0

def _get(url: str, headers=None, params=None, auth=None) -> Dict[str, Any]:
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            r = client.get(url, headers=headers, params=params, auth=auth)
            
            if r.status_code >= 400:
                print(f"HTTP: Error {r.status_code} from {url}")
                return {"raw": {"status_code": r.status_code, "text": r.text}}
            
            try:
                json_response = r.json()
                print(f"HTTP: ✅ Success from {url}")
                return {"raw": json_response}
            except Exception as json_err:
                print(f"HTTP: JSON parsing error - {json_err}")
                return {"raw": {"error": f"JSON parsing failed: {json_err}", "text": r.text}}
                
    except Exception as e:
        print(f"HTTP: Request exception - {str(e)}")
        return {"raw": {"error": str(e)}}

def _post(url: str, headers=None, json_data=None, auth=None) -> Dict[str, Any]:
    """Helper for POST requests with JSON data"""
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            r = client.post(url, headers=headers, json=json_data, auth=auth)
            
            if r.status_code >= 400:
                print(f"HTTP POST: Error {r.status_code} from {url}")
                return {"raw": {"status_code": r.status_code, "text": r.text}}
            
            try:
                json_response = r.json()
                print(f"HTTP POST: ✅ Success from {url}")
                return {"raw": json_response}
            except Exception as json_err:
                print(f"HTTP POST: JSON parsing error - {json_err}")
                return {"raw": {"error": f"JSON parsing failed: {json_err}", "text": r.text}}
                
    except Exception as e:
        print(f"HTTP POST: Request exception - {str(e)}")
        return {"raw": {"error": str(e)}}

def ipqs_lookup(e164: str) -> Dict[str, Any]:
    """IPQualityScore phone lookup. Returns normalized fields if key present."""
    if not IPQS_KEY:
        print(f"IPQS: ❌ No API key configured")
        return {}
    
    url = f"https://ipqualityscore.com/api/json/phone/{IPQS_KEY}/{e164}"
    resp = _get(url)
    raw = resp.get("raw") or {}
    out = {"provider": "ipqs", "raw": raw}
    
    # safe extraction with defaults
    fraud_score = raw.get("fraud_score")
    if isinstance(fraud_score, (int, float)):
        out["fraud_score"] = int(fraud_score)
    
    if raw.get("recent_abuse") is True:
        out["recent_abuse"] = True
    
    status = raw.get("active_status") or raw.get("active") or raw.get("status")
    if status:
        out["active_status"] = status
    
    carrier = raw.get("carrier")
    if carrier:
        out["carrier"] = carrier
    
    return out

def twilio_lookup(e164: str) -> Dict[str, Any]:
    """Twilio Lookup: line type intelligence & caller_name (US CNAM only).
    Requires TWILIO_SID and TWILIO_TOKEN.
    """
    if not (TWILIO_SID and TWILIO_TOKEN):
        print(f"Twilio: ❌ No credentials configured")
        return {}
    
    url = f"https://lookups.twilio.com/v2/PhoneNumbers/{e164}"
    params = {"Fields": "line_type_intelligence,caller_name"}
    auth = (TWILIO_SID, TWILIO_TOKEN)
    
    resp = _get(url, params=params, auth=auth)
    raw = resp.get("raw") or {}
    out = {"provider": "twilio", "raw": raw}
    
    if isinstance(raw, dict):
        # Twilio uses 'line_type_intelligence' key
        lti = raw.get("line_type_intelligence") or raw.get("line_type")
        if isinstance(lti, dict):
            out["line_type"] = lti.get("type") or lti.get("line_type")
        
        # caller_name may be present
        caller = raw.get("caller_name") or raw.get("callerName")
        if caller:
            out["caller_name"] = caller
    
    return out

def telesign_lookup(e164: str) -> Dict[str, Any]:
    """
    Combined Telesign API caller - tries API1 first, falls back to API2
    Uses the pre-encoded authorization header from user's curl examples
    """
    # Try API1 first
    result = telesign_api1(e164)
    if result and result.get("raw") and not result.get("raw", {}).get("status_code"):
        return result
    
    # If API1 fails, try API2
    print("Telesign API1 failed, trying API2...")
    result = telesign_api2(e164)
    return result

def telesign_api1(e164: str) -> Dict[str, Any]:
    """
    Telesign PhoneID API 1 - POST /v1/phoneid/{phone_number}
    Based on: curl --request POST --url https://rest-ww.telesign.com/v1/phoneid/9959511898
    """
    # Remove + from phone number for URL
    phone_number = e164.replace("+", "")
    
    # API1 endpoint with phone number in URL
    url = f"https://rest-ww.telesign.com/v1/phoneid/{phone_number}"
    
    # Headers with pre-encoded authorization
    headers = {
        'accept': 'application/json',
        'authorization': 'Basic NThFRDg2RjAtQUE2Ri00NzA3LTk4MUQtNDM0QUU4Q0M3ODc5OlN6Z1VTRmM5cW5OOXhscnhTdjFheEFrUGFlZlBOUmlJOWxhRENoRFRZQzEvdzQySWhIdFFHYXlsd3h3djhzdDFFdlZzQXMydkZVcThvd0FRRkI2VnRnPT0=',
        'content-type': 'application/json'
    }
    
    # Complex JSON payload from curl example
    json_data = {
        "account_lifecycle_event": "create",
        "external_id": "CustomExternalID7349",
        "originating_ip": "203.0.113.45",
        "addons": {
            "age_verify": {
                "age_threshold": 21
            },
            "contact_match": {
                "first_name": "string",
                "last_name": "string",
                "address": "string",
                "city": "string",
                "postal_code": "string",
                "state": "string",
                "country": "string"
            },
            "contact_plus": {
                "billing_postal_code": "95110"
            },
            "number_deactivation": {
                "carrier_name": "Verizon",
                "last_deactivated": "2016-04-05T00:00:00Z",
                "tracking_since": "2014-10-06T00:00:00Z",
                "status": {
                    "code": 2800,
                    "description": "Request successfully completed"
                },
                "recycled_since_last_verification": "not_recycled"
            },
            "porting_history": {
                "past_x_days": 10
            }
        },
        "consent": {
            "method": 1,
            "timestamp": "2018-05-05T00:00:00Z"
        }
    }
    
    print(f"Telesign API1: Calling {url}")
    
    resp = _post_with_headers(url, headers=headers, json_data=json_data)
    return _process_telesign_response(resp, "telesign_api1")

def telesign_api2(e164: str) -> Dict[str, Any]:
    """
    Telesign PhoneID API 2 - POST /v1/phoneid
    Based on: curl --request POST --url https://rest-ww.telesign.com/v1/phoneid
    """
    # Remove + from phone number for JSON payload
    phone_number = e164.replace("+", "")
    
    # API2 endpoint (no phone number in URL)
    url = "https://rest-ww.telesign.com/v1/phoneid"
    
    # Headers with pre-encoded authorization
    headers = {
        'accept': 'application/json',
        'authorization': 'Basic NThFRDg2RjAtQUE2Ri00NzA3LTk4MUQtNDM0QUU4Q0M3ODc5OlN6Z1VTRmM5cW5OOXhscnhTdjFheEFrUGFlZlBOUmlJOWxhRENoRFRZQzEvdzQySWhIdFFHYXlsd3h3djhzdDFFdlZzQXMydkZVcThvd0FRRkI2VnRnPT0=',
        'content-type': 'application/json'
    }
    
    # Complex JSON payload with phone_number in body
    json_data = {
        "phone_number": phone_number,
        "account_lifecycle_event": "create",
        "external_id": "CustomExternalID7349",
        "originating_ip": "203.0.113.45",
        "addons": {
            "age_verify": {
                "age_threshold": 21
            },
            "contact": {
                "email": "jsmith@vero-finto.com"
            },
            "contact_match": {
                "first_name": "string",
                "last_name": "string",
                "address": "string",
                "city": "string",
                "postal_code": "string",
                "state": "string",
                "country": "string",
                "input_used": "email"
            },
            "contact_plus": {
                "billing_postal_code": "95110"
            },
            "number_deactivation": {
                "carrier_name": "Verizon",
                "last_deactivated": "2016-04-05T00:00:00Z",
                "tracking_since": "2014-10-06T00:00:00Z",
                "status": {
                    "code": 2800,
                    "description": "Request successfully completed"
                },
                "recycled_since_last_verification": "not_recycled"
            },
            "porting_history": {
                "past_x_days": 10
            }
        },
        "consent": {
            "method": 1,
            "timestamp": "2018-05-05T00:00:00Z"
        }
    }
    
    print(f"Telesign API2: Calling {url}")
    
    resp = _post_with_headers(url, headers=headers, json_data=json_data)
    return _process_telesign_response(resp, "telesign_api2")

def _process_telesign_response(resp: Dict[str, Any], api_name: str) -> Dict[str, Any]:
    """Process Telesign API response and extract fraud indicators"""
    raw = resp.get("raw") or {}
    out = {"provider": api_name, "raw": raw}
    
    # Extract useful information from Telesign response
    if isinstance(raw, dict) and not raw.get("status_code"):  # No HTTP error
        # Extract phone type and risk indicators
        phone_type = raw.get("phone_type", {})
        if phone_type:
            out["phone_type"] = phone_type.get("description", "").lower()
        
        # Extract blocklisting info (scam detection)
        blocklisting = raw.get("blocklisting", {})
        if blocklisting:
            out["blocked"] = blocklisting.get("blocked", False)
            out["block_reason"] = blocklisting.get("block_description", "")
        
        # Extract carrier info
        carrier = raw.get("carrier", {})
        if carrier:
            out["carrier"] = carrier.get("name", "")
        
        # Extract enhanced location info
        location = raw.get("location", {})
        if location:
            out["location"] = {
                "country": location.get("country", {}).get("name", ""),
                "state": location.get("state", ""),
                "city": location.get("city", ""),
                "coordinates": location.get("coordinates", {}),
                "zip": location.get("zip", ""),
                "county": location.get("county", "")
            }
        
        # Extract breach information (security risk)
        breach = raw.get("breached_number_check", {})
        if breach:
            out["breached"] = breach.get("phone_number_breached", False)
            if breach.get("phone_number_breached"):
                out["breach_date"] = breach.get("breach_date", "")
                out["breached_data"] = breach.get("breached_data", [])
        
        # Extract SIM swap info (fraud indicator)
        sim_swap = raw.get("sim_swap", {})
        if sim_swap:
            out["sim_swap_risk"] = sim_swap.get("risk_indicator", "0")
            out["sim_swap_date"] = sim_swap.get("swap_date", "")
        
        # Extract porting history (fraud indicator)
        porting = raw.get("porting_history", {})
        if porting:
            out["porting_count"] = porting.get("number_of_portings", "0")
            out["last_port_date"] = porting.get("port_date", "")
        
        # Extract subscriber status
        subscriber = raw.get("subscriber_status", {})
        if subscriber:
            out["account_status"] = subscriber.get("account_status", "")
            out["account_type"] = subscriber.get("account_type", "")
        
        # Extract number deactivation info
        deactivation = raw.get("number_deactivation", {})
        if deactivation:
            out["last_deactivated"] = deactivation.get("last_deactivated", "")
            out["recycled"] = deactivation.get("recycled_since_last_verification", "")
        
        # Extract age verification
        age_verify = raw.get("age_verify", {})
        if age_verify:
            out["age_verified"] = age_verify.get("age_verified", False)
        
        # Extract call status
        call_status = raw.get("active_call_status", {})
        if call_status:
            out["call_active"] = call_status.get("is_call_active", False)
        
        # Determine comprehensive risk level
        risk_score = 0
        
        # High risk factors
        if blocklisting.get("blocked"):
            risk_score += 60
        if breach.get("phone_number_breached"):
            risk_score += 40
        if sim_swap.get("risk_indicator") == "1":
            risk_score += 30
        
        # Medium risk factors
        if deactivation.get("recycled_since_last_verification") == "recycled":
            risk_score += 20
        porting_count = int(porting.get("number_of_portings", "0"))
        if porting_count > 2:
            risk_score += 15
        elif porting_count > 0:
            risk_score += 5
        
        # Account status risks
        if subscriber.get("account_status") != "active":
            risk_score += 10
        
        if risk_score >= 60:
            out["risk_level"] = "high"
        elif risk_score >= 30:
            out["risk_level"] = "medium"
        elif risk_score >= 10:
            out["risk_level"] = "low"
        else:
            out["risk_level"] = "minimal"
    
    return out

def _post_with_headers(url: str, headers=None, json_data=None) -> Dict[str, Any]:
    """Helper for POST requests with custom headers (no auth param)"""
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            r = client.post(url, headers=headers, json=json_data)
            
            if r.status_code >= 400:
                print(f"HTTP POST: Error {r.status_code} from {url}")
                return {"raw": {"status_code": r.status_code, "text": r.text}}
            
            try:
                json_response = r.json()
                print(f"HTTP POST: ✅ Success from {url}")
                return {"raw": json_response}
            except Exception as json_err:
                print(f"HTTP POST: JSON parsing error - {json_err}")
                return {"raw": {"error": f"JSON parsing failed: {json_err}", "text": r.text}}
                
    except Exception as e:
        print(f"HTTP POST: Request exception - {str(e)}")
        return {"raw": {"error": str(e)}}

# === SPAM DATABASE WITH CRUD OPERATIONS ===

# In-memory spam database (in production, use a real database)
SPAM_DATABASE = {
    "919999999999": {
        "phone": "919999999999",
        "e164": "+919999999999",
        "category": "telemarketing",
        "reports": 25,
        "last_reported": "2025-09-07",
        "description": "Persistent telemarketing calls",
        "confidence": 95
    },
    "918888888888": {
        "phone": "918888888888", 
        "e164": "+918888888888",
        "category": "scam",
        "reports": 50,
        "last_reported": "2025-09-06",
        "description": "Financial fraud/loan scam",
        "confidence": 98
    },
    "917777777777": {
        "phone": "917777777777",
        "e164": "+917777777777", 
        "category": "spam",
        "reports": 15,
        "last_reported": "2025-09-05",
        "description": "Automated spam calls",
        "confidence": 85
    },
    "12025551234": {
        "phone": "12025551234",
        "e164": "+12025551234",
        "category": "robocall",
        "reports": 30,
        "last_reported": "2025-09-07",
        "description": "Political robocalls",
        "confidence": 90
    },
    # High-risk scam examples for testing
    "18005551234": {
        "phone": "18005551234",
        "e164": "+18005551234",
        "category": "fraud",
        "reports": 127,
        "last_reported": "2025-09-07",
        "description": "IRS tax scam - claims you owe money",
        "confidence": 99
    },
    "15551234567": {
        "phone": "15551234567", 
        "e164": "+15551234567",
        "category": "tech_support_scam",
        "reports": 89,
        "last_reported": "2025-09-06",
        "description": "Fake Microsoft tech support claiming virus",
        "confidence": 97
    }
}

def get_all_spam_numbers():
    """Get all numbers in spam database"""
    return list(SPAM_DATABASE.values())

def add_spam_number(phone, category, description="", confidence=50):
    """Add a number to spam database"""
    from datetime import datetime
    clean_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
    
    SPAM_DATABASE[clean_phone] = {
        "phone": clean_phone,
        "e164": f"+{clean_phone}",
        "category": category,
        "reports": 1,
        "last_reported": datetime.now().strftime("%Y-%m-%d"),
        "description": description,
        "confidence": confidence
    }
    return True

def update_spam_number(phone, category=None, description=None, confidence=None):
    """Update existing spam number"""
    clean_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
    
    if clean_phone in SPAM_DATABASE:
        if category:
            SPAM_DATABASE[clean_phone]["category"] = category
        if description:
            SPAM_DATABASE[clean_phone]["description"] = description  
        if confidence:
            SPAM_DATABASE[clean_phone]["confidence"] = confidence
        
        from datetime import datetime
        SPAM_DATABASE[clean_phone]["last_reported"] = datetime.now().strftime("%Y-%m-%d")
        return True
    return False

def delete_spam_number(phone):
    """Delete a number from spam database"""
    clean_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
    
    if clean_phone in SPAM_DATABASE:
        del SPAM_DATABASE[clean_phone]
        return True
    return False

def check_scam_databases(e164: str) -> Dict[str, Any]:
    """
    Check spam database for known scam numbers with enhanced detection
    """
    phone = e164.replace("+", "").replace("-", "").replace(" ", "")
    
    result = {
        "provider": "scam_databases",
        "scam_reports": 0,
        "risk_indicators": [],
        "raw": {}
    }
    
    # Check against our spam database first
    if phone in SPAM_DATABASE:
        spam_entry = SPAM_DATABASE[phone]
        result["scam_reports"] = min(spam_entry["confidence"], 100)
        result["risk_indicators"].append(f"Found in spam database: {spam_entry['category']}")
        result["risk_indicators"].append(f"Description: {spam_entry['description']}")
        result["risk_indicators"].append(f"User reports: {spam_entry['reports']}")
        result["database_match"] = spam_entry
    
    # Pattern analysis for additional risk indicators
    scam_indicators = []
    
    # Pattern analysis for common scam numbers
    if len(phone) == 13 and phone.startswith("91"):  # Indian numbers
        # Common scam prefixes in India
        scam_prefixes = ["919999", "918888", "917777", "916666"]
        for prefix in scam_prefixes:
            if phone.startswith(prefix):
                scam_indicators.append(f"Suspicious prefix pattern: {prefix}")
                result["scam_reports"] += 20
    
    # Check for sequential numbers (often used by scammers)
    digits = phone[-10:]  # Last 10 digits
    sequential_count = 0
    for i in range(len(digits) - 2):
        if digits[i] == digits[i+1] == digits[i+2]:
            sequential_count += 1
    
    if sequential_count >= 2:
        scam_indicators.append("Suspicious sequential digit pattern")
        result["scam_reports"] += 15
    
    # Check for repeated digit patterns (robocallers)
    if any(char * 4 in phone for char in "0123456789"):  # 4 repeated digits
        scam_indicators.append("Repeated digit pattern often used by robocallers")
        result["scam_reports"] += 10
    
    # Add pattern-based indicators to existing database indicators
    result["risk_indicators"].extend(scam_indicators)
    
    result["raw"] = {
        "checked_patterns": True,
        "phone_analyzed": phone,
        "indicators_found": len(result["risk_indicators"]),
        "total_risk_score": result["scam_reports"],
        "database_entries": len(SPAM_DATABASE),
        "in_spam_database": phone in SPAM_DATABASE
    }
    
    return result


def numverify_lookup(e164: str) -> Dict[str, Any]:
    """Numverify simple lookup: primarily to get basic validity/carrier info if available."""
    if not NUMVERIFY_KEY:
        print(f"Numverify: ❌ No API key configured")
        return {}
    
    # numverify API usually accepts a 'number' param and an access_key; using E.164
    url = "http://apilayer.net/api/validate"
    params = {"access_key": NUMVERIFY_KEY, "number": e164}
    
    resp = _get(url, params=params)
    raw = resp.get("raw") or {}
    out = {"provider": "numverify", "raw": raw}
    
    if isinstance(raw, dict):
        line_type = raw.get("line_type") or raw.get("type")
        if line_type:
            out["line_type"] = line_type
        
        carrier = raw.get("carrier")
        if carrier:
            out["carrier"] = carrier
    
    return out
