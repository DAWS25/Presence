"""HTTP adapter for invoking Lambda@Edge locally via sam local start-lambda.

Receives HTTP requests, wraps them in CloudFront origin-request events,
invokes the Lambda function, and returns the response as HTTP.
"""

import base64
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import boto3

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

LAMBDA_ENDPOINT = "http://localhost:3343"
FUNCTION_NAME = "EdgeFunction"
ADAPTER_PORT = 3344

lambda_client = boto3.client(
    "lambda",
    endpoint_url=LAMBDA_ENDPOINT,
    region_name="us-east-1",
    aws_access_key_id="local",
    aws_secret_access_key="local",
)


def _build_cf_event(method, path, headers, querystring="", body=None):
    """Build a CloudFront origin-request event from HTTP request data."""
    cf_headers = {}
    for key, value in headers.items():
        lower_key = key.lower()
        cf_headers[lower_key] = [{"key": key, "value": value}]

    request = {
        "uri": path,
        "method": method,
        "headers": cf_headers,
        "querystring": querystring,
    }

    if body is not None:
        request["body"] = {
            "inputTruncated": False,
            "action": "read-only",
            "encoding": "base64",
            "data": base64.b64encode(body).decode("ascii"),
        }

    return {
        "Records": [
            {
                "cf": {
                    "config": {
                        "distributionId": "LOCAL",
                        "eventType": "origin-request",
                    },
                    "request": request,
                }
            }
        ]
    }


class EdgeAdapterHandler(BaseHTTPRequestHandler):
    def _handle(self):
        parsed = urlparse(self.path)
        querystring = parsed.query

        body = None
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            body = self.rfile.read(content_length)

        cf_event = _build_cf_event(
            method=self.command,
            path=parsed.path,
            headers=dict(self.headers),
            querystring=querystring,
            body=body,
        )

        try:
            resp = lambda_client.invoke(
                FunctionName=FUNCTION_NAME,
                Payload=json.dumps(cf_event),
            )
            result = json.loads(resp["Payload"].read())
        except Exception as e:
            logger.error("Lambda invocation failed: %s", e)
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(f"Lambda invocation error: {e}".encode())
            return

        if "status" in result:
            # Lambda returned a response (intercepted)
            self.send_response(int(result["status"]))
            for _key, vals in result.get("headers", {}).items():
                for entry in vals:
                    self.send_header(entry["key"], entry["value"])
            self.end_headers()
            body = result.get("body", "")
            self.wfile.write(body.encode() if isinstance(body, str) else body)
        elif "uri" in result:
            # Lambda forwarded the request (passthrough)
            self.send_response(204)
            self.send_header("X-Edge-Passthrough", "true")
            self.send_header("X-Edge-URI", result["uri"])
            self.end_headers()
        else:
            logger.warning("Unexpected Lambda response: %s", result)
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Unexpected Lambda response")

    def log_message(self, format, *args):
        logger.info("%s %s", self.address_string(), format % args)

    do_GET = _handle
    do_POST = _handle
    do_PUT = _handle
    do_PATCH = _handle
    do_DELETE = _handle
    do_HEAD = _handle
    do_OPTIONS = _handle


def main():
    server = HTTPServer(("0.0.0.0", ADAPTER_PORT), EdgeAdapterHandler)
    logger.info(
        "Edge adapter listening on port %d -> Lambda at %s",
        ADAPTER_PORT,
        LAMBDA_ENDPOINT,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
