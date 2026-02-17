import json
import os
import ssl
import urllib.request


def _get_host(request):
    """Extract host from CloudFront request headers."""
    headers = request.get("headers", {})
    host_entries = headers.get("host", [])
    if host_entries:
        return host_entries[0].get("value", "")
    return ""


def _fetch_origin_health(host):
    """Fetch origin healthcheck at /fn/__hc and return parsed JSON.

    The host header may include a port (e.g. example.com:10443).
    When running locally inside Docker (SAM), falls back to the proxy
    container reachable via devbox_net.
    """
    # Extract port from host if present
    port = ""
    if ":" in host:
        _, port = host.rsplit(":", 1)

    # Try the real host first; fall back to Docker container name for local dev
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


def handler(event, context):
    request = event["Records"][0]["cf"]["request"]
    uri = request.get("uri", "")

    if uri == "/edge/hc/ready":
        host = _get_host(request)
        fn_health = _fetch_origin_health(host) if host else {"error": "no host header"}

        has_error = "error" in fn_health
        fn_status = fn_health.get("health_status", "ERROR")
        edge_status = "OK"
        healthy = not has_error and fn_status == "OK" and edge_status == "OK"

        overall = "OK" if healthy else "ERROR"

        body = {
            "health_status": overall,
            "edge": {"health_status": edge_status},
            "fn": fn_health,
        }

        status_code = "200" if healthy else "500"

        return {
            "status": status_code,
            "statusDescription": "OK" if healthy else "Internal Server Error",
            "headers": {
                "content-type": [{"key": "Content-Type", "value": "application/json"}],
                "cache-control": [{"key": "Cache-Control", "value": "no-cache"}],
            },
            "body": json.dumps(body),
        }

    return {
        "status": "400",
        "statusDescription": "Bad Request",
        "headers": {
            "content-type": [{"key": "Content-Type", "value": "application/json"}],
        },
        "body": json.dumps({"error": "not found"}),
    }
