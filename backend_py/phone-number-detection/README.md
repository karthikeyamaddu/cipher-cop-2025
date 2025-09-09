# Phone Scam Lookup (Flask)

## Overview
A minimal Flask app that normalizes a phone number, calls several provider 
adapters (IPQualityScore, Twilio, Telesign, Numverify) if API keys are provided, 
computes a risk score and verdict, and returns JSON. Includes a simple static 
HTML frontend for demo.

## Files
- `app.py` - Flask app and endpoints
- `providers.py` - provider adapter functions
- `scoring.py` - scoring logic and evidence aggregation
- `utils.py` - normalization and helpers
- `static/index.html` - minimal frontend
- `requirements.txt` - Python dependencies

## Environment variables
Set these optionally (you can run without keys; adapters will gracefully return 
empty signals):

```
IPQS_KEY=
TWILIO_SID=
TWILIO_TOKEN=
TELESIGN_CUSTOMER_ID=
TELESIGN_API_KEY=
NUMVERIFY_KEY=
FLASK_ENV=development
```

## Run locally
1. Create a virtualenv & install requirements:
```bash
python -m venv venv
source venv/bin/activate # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. Run the app:
```bash
python app.py
```

3. Open the frontend: http://localhost:5000/

## Notes
- No database or redis yet. Reports are stored in-memory (process memory) until 
restart.
- To integrate DB/Redis later, adapters and storage points are marked in 
comments.
- Do not send production traffic without adding rate-limiting, caching, and 
auth.
