import secrets
from base64 import b32encode


def generate_id() -> str:
    """
    Generate a short unique ID in the style of Google Meet meetings.
    
    Returns: A string like "abc-defg-hij"
    """
    # Generate 9 random bytes (72 bits of entropy)
    random_bytes = secrets.token_bytes(9)
    
    # Encode as base32 (removes padding, only alphanumeric + hyphens)
    encoded = b32encode(random_bytes).decode().rstrip("=").lower()
    
    # Format into groups: "abc-defg-hij"
    # Split into groups of 3 characters with hyphens
    parts = [encoded[i : i + 3] for i in range(0, len(encoded), 3)]
    return "-".join(parts)
