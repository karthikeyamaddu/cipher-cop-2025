"""List available Generative AI models using the configured GEMINI_API_KEY.

Usage (Windows cmd):
    set GEMINI_API_KEY=your_key_here
    python list_models.py

This script calls the v1beta ListModels endpoint and prints model ids and supported
methods to help pick a model that supports generateContent / text generation.
"""
import os
import sys
import requests
import json


def main():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not set. Set the env var and retry.")
        sys.exit(1)

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        resp = requests.get(url, timeout=15)
    except Exception as e:
        print(f"Request failed: {e}")
        sys.exit(2)

    if resp.status_code != 200:
        print(f"ListModels failed: status={resp.status_code}\n{resp.text}")
        sys.exit(3)

    data = resp.json()
    models = data.get("models") or data.get("model" ) or []
    if not models:
        print("No models returned in ListModels response:")
        print(json.dumps(data, indent=2))
        return

    print(f"Found {len(models)} models:\n")
    for m in models:
        model_id = m.get("name") or m.get("id") or m.get("modelId")
        description = m.get("displayName") or m.get("description")
        methods = m.get("supportedMethods") or m.get("method") or m.get("capabilities")
        print("Model ID:", model_id)
        if description:
            print("  Description:", description)
        if isinstance(methods, (list, tuple)):
            print("  Supported methods:")
            for mm in methods:
                print("   -", mm)
        else:
            if methods:
                print("  Supported methods:", methods)
        print()


if __name__ == '__main__':
    main()
