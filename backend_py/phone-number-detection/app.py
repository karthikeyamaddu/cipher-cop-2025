import os
import json
from flask import Flask, request, jsonify, send_from_directory, render_template_string
from flask_cors import CORS
from dotenv import load_dotenv
from utils import normalize_e164, sha256_hex
import providers
from scoring import score_result, enhanced_score_analysis
from gemini_analyzer import analyze_with_gemini

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, static_folder="static", static_url_path="")

# Enable CORS for all routes to allow frontend communication
CORS(app)

# In-memory report store (e164_hash -> list of report reasons)
REPORTS = {}

@app.route("/", methods=["GET"])
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/lookup", methods=["POST"])
def lookup():
    data = request.get_json() or {}
    phone = data.get("phone")
    region_hint = data.get("region_hint")
    selected_services = data.get("selected_services", {})  # New: service selection
    
    print(f"=== PHONE LOOKUP DEBUG ===")
    print(f"Input phone: {phone}")
    print(f"Selected services: {selected_services}")
    
    e164, err = normalize_e164(phone, region_hint)
    print(f"Normalized E164: {e164}, Error: {err}")
    
    if not e164:
        return jsonify({"error": f"Invalid number ({err})"}), 400
    
    # Call provider adapters (synchronous)
    signals = {}
    
    print(f"\n=== CALLING PROVIDERS ===")
    # IPQS - only if selected
    if selected_services.get("ipqs", True):
        try:
            print("Calling IPQS...")
            ipqs = providers.ipqs_lookup(e164)
            print(f"IPQS result: {'✅ Success' if ipqs and 'fraud_score' in ipqs else '❌ Failed or No Data'}")
        except Exception as e:
            print(f"IPQS error: {str(e)}")
            ipqs = {"raw": {"error": str(e)}}
    else:
        print("⏭️ IPQS skipped")
        ipqs = None
    
    # Twilio - only if selected
    if selected_services.get("twilio", True):
        try:
            print("Calling Twilio...")
            tw = providers.twilio_lookup(e164)
            print(f"Twilio result: {'✅ Success' if tw and 'line_type' in tw else '❌ Failed or No Data'}")
        except Exception as e:
            print(f"Twilio error: {str(e)}")
            tw = {"raw": {"error": str(e)}}
    else:
        print("⏭️ Twilio skipped")
        tw = None
    
    # Telesign API1 - only if selected
    if selected_services.get("telesign_api1", True):
        try:
            print("Calling Telesign API1...")
            ts1 = providers.telesign_api1(e164)
            print(f"Telesign API1 result: {'✅ Success' if ts1 and 'risk_level' in ts1 else '❌ Failed or No Data'}")
        except Exception as e:
            print(f"Telesign API1 error: {str(e)}")
            ts1 = {"raw": {"error": str(e)}}
    else:
        print("⏭️ Telesign API1 skipped")
        ts1 = None

    # Telesign API2 - only if selected
    if selected_services.get("telesign_api2", True):
        try:
            print("Calling Telesign API2...")
            ts2 = providers.telesign_api2(e164)
            print(f"Telesign API2 result: {'✅ Success' if ts2 and 'risk_level' in ts2 else '❌ Failed or No Data'}")
        except Exception as e:
            print(f"Telesign API2 error: {str(e)}")
            ts2 = {"raw": {"error": str(e)}}
    else:
        print("⏭️ Telesign API2 skipped")
        ts2 = None
    
    # Numverify - only if selected
    if selected_services.get("numverify", True):
        try:
            print("Calling Numverify...")
            nv = providers.numverify_lookup(e164)
            print(f"Numverify result: {'✅ Success' if nv and 'line_type' in nv else '❌ Failed or No Data'}")
        except Exception as e:
            print(f"Numverify error: {str(e)}")
            nv = {"raw": {"error": str(e)}}
    else:
        print("⏭️ Numverify skipped")
        nv = None
    
    # Scam Databases - only if selected
    if selected_services.get("scam_databases", True):
        try:
            print("Checking scam databases...")
            scam_db = providers.check_scam_databases(e164)
            print(f"Scam database result: {'✅ Checked' if scam_db else '❌ Failed'}")
        except Exception as e:
            print(f"Scam database error: {str(e)}")
            scam_db = {"raw": {"error": str(e)}}
    else:
        print("⏭️ Scam databases skipped")
        scam_db = None
    
    if ipqs:
        signals["ipqs"] = ipqs
    if tw:
        signals["twilio"] = tw
    if ts1:
        signals["telesign_api1"] = ts1
    if ts2:
        signals["telesign_api2"] = ts2
    if nv:
        signals["numverify"] = nv
    if scam_db:
        signals["scam_databases"] = scam_db
    
    # Calculate reports_count by checking REPORTS in-memory
    ehash = sha256_hex(e164)
    reports_list = REPORTS.get(ehash, [])
    reports_count = len(reports_list)
    
    print(f"\n=== SCORING ===")
    print(f"Reports count: {reports_count}")
    
    # Traditional scoring
    score, verdict, reasons = score_result(signals, reports_count)
    
    # Enhanced scoring analysis
    enhanced_analysis = enhanced_score_analysis(signals, reports_count)
    
    # Gemini AI analysis (if enabled)
    ai_analysis = None
    ai_error = None
    
    # Only run AI analysis if we have some signals to analyze
    if signals:
        try:
            print("Running Gemini AI analysis...")
            ai_analysis = analyze_with_gemini(e164, signals, reports_count)
            print(f"Gemini AI result: {'✅ Success' if ai_analysis else '❌ Failed'}")
        except Exception as e:
            print(f"Gemini AI error: {str(e)}")
            ai_error = str(e)
    
    print(f"Final score: {score}")
    print(f"Final verdict: {verdict}")
    print(f"Final reasons: {reasons}")
    print(f"Enhanced score: {enhanced_analysis.get('score', 'N/A')}")
    print(f"Enhanced verdict: {enhanced_analysis.get('verdict', 'N/A')}")
    if ai_analysis:
        print(f"AI verdict: {ai_analysis.get('verdict', 'N/A')}")
        print(f"AI confidence: {ai_analysis.get('confidence', 'N/A')}")
    
    response = {
        "e164": e164,
        # Traditional scoring
        "score": score,
        "verdict": verdict,
        "reasons": reasons,
        # Enhanced scoring
        "enhanced_analysis": enhanced_analysis,
        # AI analysis
        "ai_analysis": ai_analysis,
        "ai_error": ai_error,
        # Raw signals
        "signals": signals,
        "debug_info": {
            "api_keys_status": {
                "IPQS_KEY": "SET" if os.getenv('IPQS_KEY') else "NOT SET",
                "TWILIO_SID": "SET" if os.getenv('TWILIO_SID') else "NOT SET", 
                "TWILIO_TOKEN": "SET" if os.getenv('TWILIO_TOKEN') else "NOT SET",
                "TELESIGN_CUSTOMER_ID": "SET" if os.getenv('TELESIGN_CUSTOMER_ID') else "NOT SET",
                "TELESIGN_API_KEY": "SET" if os.getenv('TELESIGN_API_KEY') else "NOT SET",
                "NUMVERIFY_KEY": "SET" if os.getenv('NUMVERIFY_KEY') else "NOT SET",
                "GEMINI_API_KEY": "SET" if os.getenv('GEMINI_API_KEY') else "NOT SET"
            },
            "provider_responses": signals,  # This will show the complete provider data with raw responses
            "reports_count": reports_count
        },
        # do not include raw e164 in logs/storage beyond this response; callers may receive it.
    }
    
    print(f"\n=== RESPONSE ===")
    print(f"Response: {response}")
    print(f"=== END DEBUG ===\n")
    
    return jsonify(response)

# === SPAM DATABASE CRUD ENDPOINTS ===

@app.route("/spam-database", methods=["GET"])
def get_spam_database():
    """Get all numbers in spam database"""
    spam_numbers = providers.get_all_spam_numbers()
    return jsonify({
        "status": "success",
        "count": len(spam_numbers),
        "numbers": spam_numbers
    })

@app.route("/spam-database", methods=["POST"])
def add_spam_number():
    """Add a number to spam database"""
    data = request.get_json() or {}
    phone = data.get("phone")
    category = data.get("category", "spam")
    description = data.get("description", "")
    confidence = data.get("confidence", 50)
    
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400
    
    success = providers.add_spam_number(phone, category, description, confidence)
    
    if success:
        return jsonify({
            "status": "success",
            "message": f"Added {phone} to spam database"
        })
    else:
        return jsonify({"error": "Failed to add number"}), 500

@app.route("/spam-database/<phone>", methods=["PUT"])  
def update_spam_number(phone):
    """Update existing spam number"""
    data = request.get_json() or {}
    category = data.get("category")
    description = data.get("description")
    confidence = data.get("confidence")
    
    success = providers.update_spam_number(phone, category, description, confidence)
    
    if success:
        return jsonify({
            "status": "success",
            "message": f"Updated {phone} in spam database"
        })
    else:
        return jsonify({"error": "Number not found in database"}), 404

@app.route("/spam-database/<phone>", methods=["DELETE"])
def delete_spam_number(phone):
    """Delete a number from spam database"""
    success = providers.delete_spam_number(phone)
    
    if success:
        return jsonify({
            "status": "success", 
            "message": f"Deleted {phone} from spam database"
        })
    else:
        return jsonify({"error": "Number not found in database"}), 404

@app.route("/report", methods=["POST"])
def report():
    data = request.get_json() or {}
    phone = data.get("phone")
    reason = data.get("reason") or "user_report"
    region_hint = data.get("region_hint")
    
    e164, err = normalize_e164(phone, region_hint)
    if not e164:
        return jsonify({"error": f"Invalid number ({err})"}), 400
    
    ehash = sha256_hex(e164)
    # store minimal info
    REPORTS.setdefault(ehash, []).append({"reason": reason})
    
    return jsonify({"status": "ok", "message": "Reported (in-memory)"})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5006))
    print("=" * 60)
    print("Phone Number Scam Detection API")
    print("=" * 60)
    print(f"Server starting on port {port}...")
    print(f"Access the API at: http://localhost:{port}")
    print(f"Lookup endpoint: http://localhost:{port}/lookup")
    print(f"Health check: http://localhost:{port}/health")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=port, debug=(os.getenv("FLASK_ENV") == "development"))
