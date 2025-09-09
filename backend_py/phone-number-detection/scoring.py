from typing import Dict, Any, List

def enhanced_score_analysis(signals: Dict[str, Dict[str, Any]], reports_count: int = 0) -> Dict[str, Any]:
    """
    Enhanced comprehensive scam scoring with detailed analysis
    
    Returns:
        Dictionary with score, verdict, reasons, risk_factors, and confidence
    """
    risk_score = 0
    reasons = []
    risk_factors = []
    confidence_factors = []
    
    # === FRAUD SCORE ANALYSIS (Max 50 points) ===
    ipqs = signals.get("ipqs", {})
    if ipqs:
        fraud_score = ipqs.get("fraud_score", 0)
        
        if fraud_score >= 90:
            risk_score += 50
            reasons.append(f"Critical IPQS fraud score ({fraud_score}/100)")
            risk_factors.append("critical_fraud_score")
        elif fraud_score >= 75:
            risk_score += 40
            reasons.append(f"High IPQS fraud score ({fraud_score}/100)")
            risk_factors.append("high_fraud_score")
        elif fraud_score >= 50:
            risk_score += 25
            reasons.append(f"Elevated IPQS fraud score ({fraud_score}/100)")
            risk_factors.append("elevated_fraud_score")
        elif fraud_score >= 25:
            risk_score += 10
            reasons.append(f"Moderate fraud indicators ({fraud_score}/100)")
            risk_factors.append("moderate_fraud_indicators")
        else:
            confidence_factors.append(f"Clean fraud score ({fraud_score}/100)")
        
        # Recent abuse patterns
        if ipqs.get("recent_abuse") is True:
            risk_score += 20
            reasons.append("Recent abusive activity flagged")
            risk_factors.append("recent_abuse")
        
        # Spammer/risky flags
        if ipqs.get("spammer") is True:
            risk_score += 25
            reasons.append("Flagged as known spammer")
            risk_factors.append("known_spammer")
        
        if ipqs.get("risky") is True:
            risk_score += 15
            reasons.append("Flagged as risky number")
            risk_factors.append("risky_flagged")
        
        # Data breach exposure
        if ipqs.get("raw", {}).get("leaked") is True:
            risk_score += 12
            reasons.append("Number exposed in data breaches")
            risk_factors.append("data_breach_exposure")
        
        # Line activity status
        ipqs_raw = ipqs.get("raw", {})
        if ipqs_raw.get("active") is False:
            risk_score += 15
            reasons.append("Inactive number (IPQS)")
            risk_factors.append("inactive_number")
        elif ipqs.get("active_status", "").lower() in ["inactive", "disconnected"]:
            risk_score += 15
            reasons.append("Disconnected line")
            risk_factors.append("disconnected_line")
    
    # === SPAM DATABASE ANALYSIS (Max 40 points) ===
    scam_db = signals.get("scam_databases", {})
    if scam_db:
        if scam_db.get("raw", {}).get("in_spam_database") is True:
            spam_reports = scam_db.get("scam_reports", 0)
            if spam_reports >= 100:
                risk_score += 40
                reasons.append(f"Confirmed scam - {spam_reports} reports")
                risk_factors.append("confirmed_scam_database")
            elif spam_reports >= 50:
                risk_score += 30
                reasons.append(f"High spam reports ({spam_reports})")
                risk_factors.append("high_spam_reports")
            elif spam_reports >= 20:
                risk_score += 20
                reasons.append(f"Multiple spam reports ({spam_reports})")
                risk_factors.append("multiple_spam_reports")
            else:
                risk_score += 10
                reasons.append("Found in spam databases")
                risk_factors.append("spam_database_match")
        else:
            confidence_factors.append("No spam database entries")
    
    # === TELESIGN SECURITY ANALYSIS (Max 35 points) ===
    telesign_apis = [signals.get("telesign_api1"), signals.get("telesign_api2"), signals.get("telesign")]
    telesign_analyzed = False
    
    for ts_data in telesign_apis:
        if ts_data and not telesign_analyzed:
            telesign_analyzed = True
            
            # Risk level assessment
            risk_level = ts_data.get("risk_level", "").lower()
            if risk_level == "high":
                risk_score += 30
                reasons.append("Telesign high risk assessment")
                risk_factors.append("telesign_high_risk")
            elif risk_level == "medium":
                risk_score += 15
                reasons.append("Telesign medium risk assessment")
                risk_factors.append("telesign_medium_risk")
            
            # Blocking status
            if ts_data.get("blocked") is True:
                risk_score += 35
                block_reason = ts_data.get("block_reason", "Unknown")
                reasons.append(f"Blocked by Telesign: {block_reason}")
                risk_factors.append("blocked_by_telesign")
            
            # Data breach indicators
            if ts_data.get("breached") is True:
                risk_score += 18
                breach_date = ts_data.get("breach_date", "")
                reasons.append(f"Number breached{f' on {breach_date}' if breach_date else ''}")
                risk_factors.append("data_breach_detected")
            
            # SIM swap risk
            if ts_data.get("sim_swap_risk") == "1":
                risk_score += 20
                reasons.append("SIM swap risk detected")
                risk_factors.append("sim_swap_risk")
            
            # Number recycling/deactivation
            if ts_data.get("recycled") == "recycled":
                risk_score += 12
                reasons.append("Recycled phone number")
                risk_factors.append("recycled_number")
    
    # === LINE TYPE ANALYSIS (Max 20 points) ===
    line_types = []
    carriers = []
    
    # Collect line types from all providers
    for provider_name, provider_data in signals.items():
        if provider_data:
            lt = provider_data.get("line_type")
            if lt:
                line_types.append((provider_name, lt.lower()))
            
            # Collect carrier info
            carrier = provider_data.get("carrier")
            if not carrier and provider_name == "twilio":
                carrier = provider_data.get("raw", {}).get("line_type_intelligence", {}).get("carrier_name")
            if carrier:
                carriers.append((provider_name, carrier))
    
    # Analyze line types
    for provider, line_type in line_types:
        if line_type in ["voip"]:
            risk_score += 15
            reasons.append(f"VOIP number detected ({provider})")
            risk_factors.append("voip_line_type")
            break
        elif line_type in ["tollfree", "toll_free"]:
            risk_score += 12
            reasons.append(f"Toll-free number ({provider})")
            risk_factors.append("tollfree_line_type")
            break
        elif line_type == "premium":
            risk_score += 20
            reasons.append(f"Premium rate number ({provider})")
            risk_factors.append("premium_line_type")
            break
        elif line_type in ["prepaid"]:
            risk_score += 8
            reasons.append(f"Prepaid number ({provider})")
            risk_factors.append("prepaid_line_type")
            break
    
    # === CARRIER CONSISTENCY ANALYSIS (Max 15 points) ===
    if len(carriers) > 1:
        carrier_names = [c[1].lower().strip() for c in carriers if c[1]]
        unique_carriers = set(carrier_names)
        
        if len(unique_carriers) > 1:
            # Check for significant mismatches (not just formatting differences)
            significant_mismatch = False
            for i, c1 in enumerate(carrier_names):
                for c2 in carrier_names[i+1:]:
                    # Simple similarity check - if carriers are completely different
                    if not any(word in c2 for word in c1.split()[:2]) and not any(word in c1 for word in c2.split()[:2]):
                        significant_mismatch = True
                        break
                if significant_mismatch:
                    break
            
            if significant_mismatch:
                risk_score += 15
                reasons.append("Carrier mismatch between providers")
                risk_factors.append("carrier_mismatch")
                
    # === USER REPORTS ANALYSIS (Max 25 points) ===
    if reports_count >= 50:
        risk_score += 25
        reasons.append(f"Extensive user reports ({reports_count})")
        risk_factors.append("extensive_user_reports")
    elif reports_count >= 20:
        risk_score += 20
        reasons.append(f"Many user reports ({reports_count})")
        risk_factors.append("many_user_reports")
    elif reports_count >= 10:
        risk_score += 15
        reasons.append(f"Multiple user reports ({reports_count})")
        risk_factors.append("multiple_user_reports")
    elif reports_count >= 3:
        risk_score += 10
        reasons.append(f"Several user reports ({reports_count})")
        risk_factors.append("several_user_reports")
    elif reports_count > 0:
        risk_score += 5
        reasons.append(f"Some user reports ({reports_count})")
        risk_factors.append("some_user_reports")
    else:
        confidence_factors.append("No user reports")
    
    # === TWILIO ADVANCED SIGNALS (Max 15 points) ===
    twilio = signals.get("twilio", {})
    if twilio:
        twilio_raw = twilio.get("raw", {})
        
        # SIM swap detection
        sim_swap = twilio_raw.get("sim_swap", {})
        if sim_swap:
            swapped_period = sim_swap.get("swapped_period")
            if swapped_period == "24h":
                risk_score += 15
                reasons.append("Recent SIM swap (24h)")
                risk_factors.append("recent_sim_swap")
            elif swapped_period == "7d":
                risk_score += 10
                reasons.append("SIM swap in last 7 days")
                risk_factors.append("sim_swap_7d")
        
        # SMS pumping risk
        sms_pumping = twilio_raw.get("sms_pumping_risk")
        if sms_pumping == "high":
            risk_score += 12
            reasons.append("High SMS pumping risk")
            risk_factors.append("sms_pumping_high")
        elif sms_pumping == "medium":
            risk_score += 6
            reasons.append("Medium SMS pumping risk")
            risk_factors.append("sms_pumping_medium")
        
        # Phone quality score
        quality_score = twilio_raw.get("phone_number_quality_score")
        if isinstance(quality_score, (int, float)) and quality_score < 30:
            risk_score += 8
            reasons.append(f"Low quality score ({quality_score}/100)")
            risk_factors.append("low_quality_score")
    
    # === FINAL SCORING ===
    # Cap the score at 100
    risk_score = min(risk_score, 100)
    
    # Calculate confidence based on number of indicators
    total_signals = len([s for s in signals.values() if s])
    confidence = min(0.95, 0.5 + (total_signals * 0.1) + (len(risk_factors) * 0.05))
    
    # Determine verdict
    if risk_score >= 85:
        verdict = "Confirmed Scam"
    elif risk_score >= 70:
        verdict = "Likely Scam"
    elif risk_score >= 40:
        verdict = "Suspicious"
    elif risk_score >= 15:
        verdict = "Caution Advised"
    else:
        verdict = "Appears Safe"
    
    return {
        "score": risk_score,
        "verdict": verdict,
        "confidence": round(confidence, 2),
        "reasons": reasons,
        "risk_factors": risk_factors,
        "confidence_factors": confidence_factors,
        "total_signals": total_signals
    }

def classify_number(signals: dict, reports_count: int) -> dict:
    """
    Classify phone number as scam based on provider signals and user reports.
    
    Args:
        signals: Dictionary containing raw responses from IPQS, Telesign, ScamDB, NumVerify, and Twilio
        reports_count: Integer representing how many user reports exist for this number
    
    Returns:
        Dictionary with score (0-100), verdict, and reasons list
    """
    risk_score = 0
    reasons = []
    
    # Process IPQS response
    ipqs = signals.get("ipqs", {})
    if ipqs:
        fraud_score = ipqs.get("fraud_score", 0)
        if fraud_score >= 80:
            risk_score += 40
            reasons.append("High IPQS fraud score")
        elif fraud_score >= 50:
            risk_score += 20
            reasons.append("Elevated IPQS fraud score")
        
        if ipqs.get("recent_abuse") is True:
            risk_score += 15
            reasons.append("Recent abuse flagged by IPQS")
        
        active_status = ipqs.get("active_status", "").lower()
        if active_status in ["inactive", "disconnected"]:
            risk_score += 10
            reasons.append("Inactive/disconnected line")
    
    # Process Telesign response (check both API1 and API2)
    telesign_api1 = signals.get("telesign_api1", {})
    telesign_api2 = signals.get("telesign_api2", {})
    telesign = signals.get("telesign", {})  # fallback for old format
    
    # Check all Telesign responses
    for ts_name, ts_data in [("API1", telesign_api1), ("API2", telesign_api2), ("Legacy", telesign)]:
        if ts_data:
            risk_level = ts_data.get("risk_level", "").lower()
            if risk_level == "high":
                risk_score += 25
                reasons.append(f"Telesign {ts_name} high risk")
                break  # Only count highest risk once
            elif risk_level == "medium":
                risk_score += 10
                reasons.append(f"Telesign {ts_name} medium risk")
                break  # Only count highest risk once
    
    # Process ScamDB response
    scam_db = signals.get("scam_databases", {})
    if scam_db:
        if scam_db.get("in_spam_database") is True:
            risk_score += 30
            reasons.append("Number found in scam databases")
    
    # Process NumVerify/Twilio response for line type
    line_type = None
    
    # Check NumVerify first
    numverify = signals.get("numverify", {})
    if numverify:
        line_type = numverify.get("line_type", "").lower()
    
    # Check Twilio if NumVerify didn't provide line type
    if not line_type:
        twilio = signals.get("twilio", {})
        if twilio:
            line_type = twilio.get("line_type", "").lower()
    
    # Check for suspicious line types
    if line_type in ["voip", "tollfree", "premium"]:
        risk_score += 10
        reasons.append("Suspicious line type")
    
    # Process Reports
    if reports_count >= 3:
        risk_score += 15
        reasons.append("Multiple spam reports")
    elif reports_count in [1, 2]:
        risk_score += 5
        reasons.append("Some spam reports")
    
    # Cap final score at 100
    if risk_score > 100:
        risk_score = 100
    
    # Determine verdict based on score
    if risk_score >= 80:
        verdict = "Likely Scam"
    elif risk_score >= 50:
        verdict = "Suspicious"
    elif risk_score >= 25:
        verdict = "Unclear / Watch Out"
    else:
        verdict = "Appears Legitimate"
    
    return {
        "score": risk_score,
        "verdict": verdict,
        "reasons": reasons
    }

def score_result(signals: Dict[str, Dict[str, Any]], reports_count: int = 0):
    """Compute a 0-100 score and verdict from normalized provider signals.
    signals: dict keyed by provider name (e.g., 'ipqs', 'twilio', 'telesign', 'numverify')
    reports_count: number of user reports we have in-memory (simple weighting for now)
    Returns: (score:int, verdict:str, reasons:List[str])
    """
    score = 0
    reasons: List[str] = []
    positive_indicators: List[str] = []
    
    # Check scam databases first (highest priority)
    scam_db = signals.get("scam_databases") or {}
    if scam_db:
        scam_reports = scam_db.get("scam_reports", 0)
        risk_indicators = scam_db.get("risk_indicators", [])
        
        if scam_reports > 50:
            score += 60
            reasons.append(f"High scam risk detected (score: {scam_reports})")
        elif scam_reports > 20:
            score += 30
            reasons.append(f"Moderate scam risk detected (score: {scam_reports})")
        elif scam_reports > 0:
            score += 10
            reasons.append(f"Minor risk indicators found (score: {scam_reports})")
        else:
            positive_indicators.append("No scam patterns detected in community databases")
        
        for indicator in risk_indicators:
            reasons.append(f"Risk factor: {indicator}")
    
    # A. Reputation APIs (max 60)
    ipqs = signals.get("ipqs") or {}
    if ipqs:
        fs = ipqs.get("fraud_score")
        if isinstance(fs, int):
            if fs == 0:
                positive_indicators.append("IPQS: Clean fraud score (0/100)")
            elif fs <= 25:
                score += fs // 5  # 1-5 points for low scores
                reasons.append(f"IPQS: Minor fraud indicators ({fs}/100)")
            elif fs <= 50:
                score += 10 + (fs - 25) // 3  # 10-18 points for medium scores
                reasons.append(f"IPQS: Moderate fraud score ({fs}/100)")
            else:
                score += 20 + min(40, fs - 50)  # 20-60 points for high scores
                reasons.append(f"IPQS: High fraud score ({fs}/100)")
        
        if ipqs.get("recent_abuse") is True:
            score += 15
            reasons.append("Recent abusive activity (IPQS)")
        elif ipqs.get("recent_abuse") is False:
            positive_indicators.append("IPQS: No recent abuse reported")
        
        if ipqs.get("risky") is True:
            score += 20
            reasons.append("Flagged as risky (IPQS)")
        elif ipqs.get("risky") is False:
            positive_indicators.append("IPQS: Not flagged as risky")
            
        if ipqs.get("spammer") is True:
            score += 25
            reasons.append("Known spammer (IPQS)")
        elif ipqs.get("spammer") is False:
            positive_indicators.append("IPQS: Not a known spammer")
        
        # Enhanced line type analysis
        raw_ipqs = ipqs.get("raw", {})
        ipqs_line_type = raw_ipqs.get("line_type", "").lower()
        if ipqs_line_type == "voip":
            score += 12
            reasons.append("VOIP number (higher scam risk)")
        elif raw_ipqs.get("VOIP") is True:
            score += 12
            reasons.append("VOIP number detected (IPQS)")
        elif ipqs_line_type in ["wireless", "mobile"]:
            positive_indicators.append(f"IPQS: Legitimate {ipqs_line_type} line")
        
        # Check if number is leaked in data breaches
        if raw_ipqs.get("leaked") is True:
            score += 8
            reasons.append("Number found in data breaches (IPQS)")
        
        # Check prepaid status (slightly higher risk)
        if raw_ipqs.get("prepaid") is True:
            score += 3
            reasons.append("Prepaid number (slight risk increase)")
        
        if ipqs.get("active_status") in ("inactive", "disconnected"):
            score += 15
            reasons.append("Inactive/disconnected number (IPQS)")
        elif ipqs.get("active_status") == "N/A" and raw_ipqs.get("active") is True:
            positive_indicators.append("IPQS: Active number")
        elif raw_ipqs.get("active") is False:
            score += 15
            reasons.append("Inactive number (IPQS)")
    
    # Enhanced Telesign analysis
    telesign = signals.get("telesign") or {}
    if telesign:
        raw = telesign.get("raw", {})
        if not raw.get("status_code"):  # No HTTP error
            rl = (telesign.get("risk_level") or "").lower()
            if rl == "high":
                score += 25
                reasons.append("Telesign: High risk assessment")
            elif rl == "medium":
                score += 12
                reasons.append("Telesign: Medium risk assessment")
            elif rl == "low":
                positive_indicators.append("Telesign: Low risk assessment")
            
            # Check if blocked
            if telesign.get("blocked") is True:
                score += 30
                block_reason = telesign.get("block_reason", "Unknown")
                reasons.append(f"Blocked by Telesign: {block_reason}")
            elif telesign.get("blocked") is False:
                positive_indicators.append("Telesign: Not blocked")
            
            # Check for data breaches
            if telesign.get("breached") is True:
                score += 10
                breach_date = telesign.get("breach_date", "")
                reasons.append(f"Number breached{f' on {breach_date}' if breach_date else ''} (Telesign)")
            
            # Check SIM swap risk
            sim_swap_risk = telesign.get("sim_swap_risk", "0")
            if sim_swap_risk == "1":
                score += 15
                reasons.append("SIM swap risk detected (Telesign)")
    
    # B. Enhanced Telephony signals (max 25)
    twilio = signals.get("twilio") or {}
    numverify = signals.get("numverify") or {}
    
    # Get line type from either provider
    line_type = twilio.get("line_type") or numverify.get("line_type")
    if line_type:
        lt = str(line_type).lower()
        if lt in {"voip", "toll_free"}:
            score += 15
            reasons.append(f"High-risk line type: {lt}")
        elif lt == "premium":
            score += 20
            reasons.append(f"Premium rate number (high scam risk)")
        elif lt in {"mobile", "fixed_line", "landline", "wireless"}:
            positive_indicators.append(f"Legitimate {lt} line type")
    
    # Check Twilio-specific risk indicators
    if twilio:
        twilio_raw = twilio.get("raw", {})
        
        # Check SIM swap risk
        sim_swap = twilio_raw.get("sim_swap")
        if sim_swap and sim_swap.get("swapped_period") == "24h":
            score += 20
            reasons.append("Recent SIM swap detected (Twilio)")
        elif sim_swap and sim_swap.get("swapped_period") == "7d":
            score += 10
            reasons.append("SIM swap in last 7 days (Twilio)")
        
        # Check SMS pumping risk
        sms_pumping = twilio_raw.get("sms_pumping_risk")
        if sms_pumping == "high":
            score += 15
            reasons.append("High SMS pumping risk (Twilio)")
        elif sms_pumping == "medium":
            score += 8
            reasons.append("Medium SMS pumping risk (Twilio)")
        
        # Check phone number quality score
        quality_score = twilio_raw.get("phone_number_quality_score")
        if isinstance(quality_score, (int, float)) and quality_score < 50:
            score += 10
            reasons.append(f"Low quality score: {quality_score}/100 (Twilio)")
    
    # Carrier information (positive indicator)
    carrier = (ipqs.get("carrier") or 
              twilio.get("raw", {}).get("line_type_intelligence", {}).get("carrier_name") or 
              telesign.get("carrier") or
              numverify.get("carrier"))
    if carrier:
        positive_indicators.append(f"Verified carrier: {carrier}")
    
    # Number validity (positive indicator)
    is_valid = (
        ipqs.get("raw", {}).get("valid") is True or
        twilio.get("raw", {}).get("valid") is True or
        numverify.get("raw", {}).get("valid") is True
    )
    if is_valid:
        positive_indicators.append("Number format validated by providers")
    
    # If any provider reports inactive/disconnected
    for provider_name, p in signals.items():
        if p and p.get("active_status") and str(p.get("active_status")).lower() in {"inactive", "disconnected", "dead"}:
            score += 12
            reasons.append(f"Inactive/disconnected ({provider_name})")
            break
    
    # C. Enhanced user reports scoring (max 20)
    if reports_count > 0:
        if reports_count <= 2:
            score += 3
            reasons.append(f"{reports_count} user report(s) - minor concern")
        elif reports_count <= 10:
            score += 8
            reasons.append(f"{reports_count} user report(s) - moderate concern")
        elif reports_count <= 50:
            score += 15
            reasons.append(f"{reports_count} user report(s) - high concern")
        else:
            score += 20
            reasons.append(f"{reports_count} user report(s) - very high concern")
    else:
        positive_indicators.append("No user reports of spam/scam")
    
    # D. Pattern-based risk detection (additional checks)
    phone_number = None
    for provider in signals.values():
        if provider and provider.get("raw", {}).get("formatted"):
            phone_number = provider["raw"]["formatted"]
            break
    
    if phone_number:
        # Check for suspicious patterns
        clean_number = phone_number.replace("+", "").replace("-", "").replace(" ", "")
        
        # Sequential digits (like 11111, 12345)
        if len(set(clean_number[-4:])) == 1:  # Last 4 digits same
            score += 5
            reasons.append("Suspicious pattern: repeated digits")
        
        # Check for common scam prefixes (example patterns)
        # This could be expanded with real scam number patterns
        
    # Clamp score
    if score < 0:
        score = 0
    if score > 100:
        score = 100
    
    # Enhanced verdict mapping with more granular levels
    if score >= 80:
        verdict = "Highly Likely Scam"
    elif score >= 60:
        verdict = "Likely Scam"
    elif score >= 40:
        verdict = "Suspicious Activity"
    elif score >= 25:
        verdict = "Caution Advised"
    elif score >= 10:
        verdict = "Low Risk"
    else:
        verdict = "Appears Legitimate"
    
    # Combine negative and positive indicators
    all_reasons = reasons + positive_indicators
    
    return int(score), verdict, all_reasons
