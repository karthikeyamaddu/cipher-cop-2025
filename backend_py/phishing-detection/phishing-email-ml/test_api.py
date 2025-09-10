import requests
import json

# Test the ML API
url = "http://127.0.0.1:5008/predict"
data = {
    "email_text": "Your account has been compromised. Click here immediately to secure it!"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
