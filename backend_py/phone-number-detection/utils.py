import hashlib
import phonenumbers

def normalize_e164(raw: str, region_hint: str | None = None):
    """Parse input phone and return (e164, error_code_or_none).
    error_code examples: 'parse_error', 'impossible_number', 'invalid_number'
    """
    raw = (raw or "").strip()
    if raw == "":
        return None, "empty"
    
    try:
        # Try parsing with explicit region first
        if region_hint:
            parsed = phonenumbers.parse(raw, region_hint.upper())
        else:
            # For US numbers starting with +1, try US as default region
            if raw.startswith("+1") or raw.startswith("1"):
                parsed = phonenumbers.parse(raw, "US")
            else:
                # allow automatic country detection from the string
                parsed = phonenumbers.parse(raw, None)
    except phonenumbers.NumberParseException as e:
        print(f"Phone parse error: {e}")
        return None, "parse_error"
    
    if not phonenumbers.is_possible_number(parsed):
        print(f"Phone not possible: {parsed}")
        return None, "impossible_number"
    
    if not phonenumbers.is_valid_number(parsed):
        print(f"Phone not valid: {parsed}")
        return None, "invalid_number"
    
    e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    return e164, None

def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
