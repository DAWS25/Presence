import json
import ssl
import urllib.request


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _json_response(status_code, body):
    """Build a CloudFront-compatible JSON response."""
    descriptions = {"200": "OK", "400": "Bad Request", "500": "Internal Server Error"}
    return {
        "status": str(status_code),
        "statusDescription": descriptions.get(str(status_code), "Error"),
        "headers": {
            "content-type": [{"key": "Content-Type", "value": "application/json"}],
            "cache-control": [{"key": "Cache-Control", "value": "no-cache"}],
        },
        "body": json.dumps(body),
    }


def _get_host(request):
    """Extract host from CloudFront request headers."""
    headers = request.get("headers", {})
    host_entries = headers.get("host", [])
    if host_entries:
        return host_entries[0].get("value", "")
    return ""


# ---------------------------------------------------------------------------
# Origin health fetch
# ---------------------------------------------------------------------------

def _fetch_origin_health(host):
    """Fetch origin healthcheck at /fn/__hc and return parsed JSON.

    The host header may include a port (e.g. example.com:10443).
    When running locally inside Docker (SAM), falls back to the proxy
    container reachable via devbox_net.
    """
    port = ""
    if ":" in host:
        _, port = host.rsplit(":", 1)

    targets = [host]
    if port:
        targets.append(f"proxy:{port}")
    else:
        targets.append("proxy")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    last_error = None
    for target in targets:
        try:
            url = f"https://{target}/fn/__hc"
            req = urllib.request.Request(url, method="GET")
            req.add_header("Host", host)
            with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
                if resp.status != 200:
                    last_error = Exception(f"origin returned {resp.status}")
                    continue
                body = resp.read().decode("utf-8")
                return json.loads(body)
        except Exception as e:
            last_error = e

    return {"error": str(last_error)}


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------

def _handle_live():
    """Liveness probe — confirms the edge function itself is running."""
    return _json_response(200, {"health_status": "LIVE"})


def _handle_ready(request):
    """Readiness probe — checks edge *and* origin health."""
    host = _get_host(request)
    fn_health = _fetch_origin_health(host) if host else {"error": "no host header"}

    has_error = "error" in fn_health
    fn_status = fn_health.get("health_status", "ERROR")
    edge_status = "OK"
    healthy = not has_error and fn_status == "OK" and edge_status == "OK"

    body = {
        "health_status": "READY" if healthy else "ERROR",
        "edge": {"health_status": edge_status},
        "fn": fn_health,
    }
    return _json_response(200 if healthy else 500, body)


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

_ROUTES = {
    "/edge/hc/live": lambda _req: _handle_live(),
    "/edge/hc/ready": _handle_ready,
}


def handler(event, context):
    request = event["Records"][0]["cf"]["request"]
    uri = request.get("uri", "")

    route = _ROUTES.get(uri)
    if route:
        return route(request)

    return _json_response(400, {"error": "not found"})
