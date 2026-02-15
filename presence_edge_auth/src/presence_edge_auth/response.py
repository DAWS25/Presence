"""Factory functions for building CloudFront Lambda@Edge responses."""


def cf_response(status, body, content_type="text/plain", headers=None):
    """Build a CloudFront-compatible response dict.

    Args:
        status: HTTP status code (int or str).
        body: Response body string.
        content_type: Content-Type header value.
        headers: Optional dict of extra headers {name: value}.

    Returns:
        A CloudFront Lambda@Edge response dict.
    """
    resp_headers = {
        "content-type": [{"key": "Content-Type", "value": content_type}],
        "cache-control": [{"key": "Cache-Control", "value": "no-cache"}],
    }
    if headers:
        for name, value in headers.items():
            resp_headers[name.lower()] = [{"key": name, "value": value}]

    return {
        "status": str(status),
        "statusDescription": "OK",
        "headers": resp_headers,
        "body": body,
    }
