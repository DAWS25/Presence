"""Authentication handlers for the edge module.

Decodes the request body and JWT payload from a CloudFront
Lambda@Edge event.
"""

import json
import base64

from presence_edge.response import cf_response


def _decode_body(request):
    """Extract and decode the request body from a CloudFront event."""
    body_data = request.get("body", {})
    if isinstance(body_data, dict):
        raw = body_data.get("data", "")
        encoding = body_data.get("encoding", "text")
        if encoding == "base64":
            return base64.b64decode(raw).decode("utf-8")
        return raw
    return str(body_data) if body_data else ""


def _decode_jwt_payload(token):
    """Base64url-decode the payload (middle) segment of a JWT."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT structure")
    payload_b64 = parts[1]
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64))


def google_callback(request):
    """Handle Google Sign-In credential callback.

    Decodes the Google JWT id_token from the request body and logs the
    user data.  Does not create a session yet.
    """
    try:
        body = _decode_body(request)
        payload = json.loads(body)
        credential = payload.get("credential", "")

        user_data = _decode_jwt_payload(credential)
        print(f"Google Sign-In user data: {json.dumps(user_data, indent=2)}")

        return cf_response(
            200,
            json.dumps({"status": "ok"}),
            content_type="application/json",
        )
    except Exception as e:
        print(f"Google callback error: {e}")
        return cf_response(
            400,
            json.dumps({"error": str(e)}),
            content_type="application/json",
        )
