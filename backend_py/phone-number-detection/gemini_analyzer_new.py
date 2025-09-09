"""
Google Gemini AI integration for phone number scam analysis
"""
import os
import json
import google.generativeai as genai
from typing import Dict, Any, Optional

# Global model instance
_model = None

def _model_once():
    global _model
    if _model is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key: 
            raise RuntimeError("GEMINI_API_KEY not set")
        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel("gemini-1.5-flash")
    return _model

def analyze_with_gemini(phone_number: str, signals: Dict[str, Any], reports_count: int = 0) -> Optional[Dict[str, Any]]:
    """
    Send API responses to Gemini for AI-powered scam analysis
    
    Args:
        phone_number: The phone number being analyzed
        signals: Dictionary containing all API provider responses
        reports_count: Number of user reports for this number
        
    Returns:
        Dictionary with Gemini analysis or None if failed
    """
    try:
        # Get the model instance
        model = _model_once()
        
        # Prepare the prompt for Gemini
        prompt = _create_analysis_prompt(phone_number, signals, reports_count)
        
        # Generate response using the SDK
        response = model.generate_content(prompt)
        
        if response and response.text:
            try:
                # Clean up the response - sometimes Gemini adds markdown formatting
                content = response.text.strip()
                if content.startswith("```json"):
                    content = content.replace("```json", "").replace("```", "").strip()
                elif content.startswith("```"):
                    content = content.replace("```", "").strip()
                
                gemini_analysis = json.loads(content)
                
                # Validate required fields
                if all(key in gemini_analysis for key in ["verdict", "confidence"]):
                    # Add default values for optional fields
                    if "explanation" not in gemini_analysis:
                        gemini_analysis["explanation"] = "AI analysis completed"
                    if "patterns" not in gemini_analysis:
                        gemini_analysis["patterns"] = []
                    if "recommendations" not in gemini_analysis:
                        gemini_analysis["recommendations"] = []
                        
                    print(f"✅ Gemini analysis completed successfully: {gemini_analysis['verdict']} (confidence: {gemini_analysis['confidence']})")
                    return gemini_analysis
                else:
                    print(f"❌ Gemini response missing required fields: {gemini_analysis}")
                    return None
                    
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse Gemini JSON response: {e}")
                print(f"Raw content: {response.text}")
                return None
        else:
            print("❌ No response text from Gemini")
            return None
                
    except Exception as e:
        print(f"❌ Gemini API error: {str(e)}")
        return None

def _create_analysis_prompt(phone_number: str, signals: Dict[str, Any], reports_count: int = 0) -> str:
    """
    Create a structured prompt for Gemini to analyze phone number data
    """
    
    # Format API responses for better readability
    formatted_responses = {}
    for provider, data in signals.items():
        if data and isinstance(data, dict):
            # Extract key fields for analysis
            if provider == "ipqs":
                formatted_responses[provider] = {
                    "fraud_score": data.get("fraud_score"),
                    "recent_abuse": data.get("recent_abuse"),
                    "risky": data.get("risky"),
                    "spammer": data.get("spammer"),
                    "active": data.get("raw", {}).get("active"),
                    "line_type": data.get("raw", {}).get("line_type"),
                    "carrier": data.get("carrier"),
                    "leaked": data.get("raw", {}).get("leaked"),
                    "valid": data.get("raw", {}).get("valid")
                }
            elif provider.startswith("telesign"):
                formatted_responses[provider] = {
                    "risk_level": data.get("risk_level"),
                    "blocked": data.get("blocked"),
                    "phone_type": data.get("phone_type"),
                    "carrier": data.get("carrier"),
                    "breached": data.get("breached"),
                    "sim_swap_risk": data.get("sim_swap_risk"),
                    "location": data.get("location")
                }
            elif provider == "twilio":
                formatted_responses[provider] = {
                    "line_type": data.get("line_type"),
                    "valid": data.get("raw", {}).get("valid"),
                    "carrier": data.get("raw", {}).get("line_type_intelligence", {}).get("carrier_name"),
                    "caller_name": data.get("caller_name")
                }
            elif provider == "numverify":
                formatted_responses[provider] = {
                    "valid": data.get("raw", {}).get("valid"),
                    "line_type": data.get("line_type"),
                    "carrier": data.get("raw", {}).get("carrier"),
                    "location": data.get("raw", {}).get("country_name")
                }
            elif provider == "scam_databases":
                formatted_responses[provider] = {
                    "in_spam_database": data.get("raw", {}).get("in_spam_database"),
                    "scam_reports": data.get("scam_reports", 0),
                    "risk_indicators": data.get("risk_indicators", []),
                    "database_match": data.get("database_match")
                }
    
    # Add user reports information
    user_reports_info = f"\nUser Reports: {reports_count} spam/scam reports" if reports_count > 0 else "\nUser Reports: No user reports"
    
    prompt = f"""
You are an expert phone fraud analyst. Analyze the following phone number and API responses to determine if it's a scam.

Phone Number: {phone_number}
{user_reports_info}

API Response Data:
{json.dumps(formatted_responses, indent=2)}

Guidelines for Analysis:
1. IPQS fraud_score > 75 = high scam risk
2. Multiple spam reports in databases = significant risk
3. VOIP/toll-free numbers have higher scam potential
4. Recent abuse flags are strong indicators
5. Carrier mismatches between providers may indicate spoofing
6. Blocked/flagged by security providers = high risk
7. Data breaches + SIM swap risk = identity theft concern
8. Inactive/disconnected numbers used for scams
9. User reports count heavily toward scam classification

Based on this data, provide a JSON response with exactly this structure:

{{
  "verdict": "Safe|Suspicious|Likely Scam|Confirmed Scam",
  "confidence": 85,
  "explanation": "Detailed explanation of the analysis and reasoning",
  "patterns": [
    "Pattern 1 detected",
    "Pattern 2 found"
  ],
  "recommendations": [
    "Block this number",
    "Report to authorities"
  ]
}}

Verdict Guidelines:
- "Safe": Low risk, legitimate number
- "Suspicious": Some concerning indicators, proceed with caution  
- "Likely Scam": Multiple strong scam indicators
- "Confirmed Scam": Definitively identified as scam by multiple sources

Consider user reports heavily - even 1-2 reports add significant risk.
Respond ONLY with valid JSON. No additional text or markdown formatting.
"""
    
    return prompt

def get_gemini_status() -> Dict[str, Any]:
    """
    Check if Gemini API is properly configured
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    
    return {
        "service": "Google Gemini AI",
        "configured": bool(api_key and api_key != "YOUR_GEMINI_API_KEY_HERE"),
        "api_key_set": bool(api_key),
        "status": "ready" if api_key and api_key != "YOUR_GEMINI_API_KEY_HERE" else "not_configured"
    }
