"""CloudFront origin-response Lambda@Edge function.

Injects Permissions-Policy and CORS headers required for Google FedCM
(Federated Credential Management) into every origin response.
"""

FEDCM_HEADERS = {
    "permissions-policy": {
        "key": "Permissions-Policy",
        "value": 'identity-credentials-get=(self "https://accounts.google.com")',
    },
    "cross-origin-opener-policy": {
        "key": "Cross-Origin-Opener-Policy",
        "value": "same-origin-allow-popups",
    },
    "cross-origin-resource-policy": {
        "key": "Cross-Origin-Resource-Policy",
        "value": "cross-origin",
    },
}


def handler(event, context):
    response = event["Records"][0]["cf"]["response"]
    headers = response.setdefault("headers", {})

    for header_name, header_entry in FEDCM_HEADERS.items():
        headers[header_name] = [header_entry]

    return response
