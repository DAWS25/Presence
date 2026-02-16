import json
import re


# Place IDs follow the adjective-adjective-place format (e.g. brave-sunny-beach)
_PLACE_ID_RE = re.compile(r"^[a-z]+-[a-z]+-[a-z]+$")


def _redirect(location):
    """Return a 302 redirect response."""
    return {
        "status": "302",
        "statusDescription": "Found",
        "headers": {
            "location": [{"key": "Location", "value": location}],
            "cache-control": [{"key": "Cache-Control", "value": "no-cache"}],
        },
    }


def _bad_request(message):
    """Return a 400 Bad Request response."""
    return {
        "status": "400",
        "statusDescription": "Bad Request",
        "headers": {
            "content-type": [{"key": "Content-Type", "value": "application/json"}],
        },
        "body": json.dumps({"error": message}),
    }


def handler(event, context):
    request = event["Records"][0]["cf"]["request"]
    uri = request.get("uri", "")

    # Strip trailing slash for consistent matching (but keep "/" as-is)
    parts = [p for p in uri.split("/") if p]

    # Zero path components: / → redirect to /fn/index
    if len(parts) == 0:
        return _redirect("/fn/index")

    # More than one path component: /a/b/... → 400
    if len(parts) > 1:
        return _bad_request("invalid path: too many components")

    # Exactly one path component: /{something}
    segment = parts[0]

    if _PLACE_ID_RE.match(segment.lower()):
        return _redirect(f"/fn/place/{segment}")

    return _bad_request(f"invalid path: '{segment}' is not a valid place id")

