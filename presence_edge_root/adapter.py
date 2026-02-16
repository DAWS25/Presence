"""HTTP adapter for invoking Lambda@Edge root redirect locally via sam local start-lambda.

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

LAMBDA_ENDPOINT = "http://localhost:17668"
FUNCTION_NAME = "EdgeRootFunction"
ADAPTER_PORT = 17669

lambda_client = boto3.client(
    "lambda",
    endpoint_url=LAMBDA_ENDPOINT,
    region_name="us-east-1",
    aws_access_key_id="local",
    aws_secret_access_key="local",
)


def _build_cf_event(method, uri, headers, body=None, query=""):
    """Build a CloudFront origin-request event from HTTP request parts."""
    cf_headers = {}
    for key, value in headers.items():
        cf_headers[key.lower()] = [{"key": key, "value": value}]

    request = {
        "method": method,
        "uri": uri,
        "querystring": query,
        "headers": cf_headers,
    }

    if body is not None:
        encoded = base64.b64encode(body).decode("utf-8")
        request["body"] = {
            "inputTruncated": False,
            "action": "read-only",
            "encoding": "base64",
            "data": encoded,
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


class Handler(BaseHTTPRequestHandler):
    """Translate HTTP to CloudFront event, invoke Lambda, return response."""

    def _handle(self):
        parsed = urlparse(self.path)
        uri = parsed.path
        query = parsed.query or ""

        headers = {k: v for k, v in self.headers.items()}
        body = None
        clen = int(self.headers.get("Content-Length", 0))
        if clen:
            body = self.rfile.read(clen)

        event = _build_cf_event(self.command, uri, headers, body, query)

        try:
            resp = lambda_client.invoke(
                FunctionName=FUNCTION_NAME,
                Payload=json.dumps(event),
            )
            result = json.loads(resp["Payload"].read())
        except Exception as exc:
            logger.error("Lambda invoke failed: %s", exc)
            self.send_response(502)
            self.end_headers()
            self.wfile.write(b"Lambda invoke error")
            return

        if "status" in result:
            status = int(result["status"])
            self.send_response(status)
            for hdr_list in result.get("headers", {}).values():
                for h in hdr_list:
                    self.send_header(h["key"], h["value"])
            self.end_headers()
            resp_body = result.get("body", "")
            self.wfile.write(resp_body.encode("utf-8") if isinstance(resp_body, str) else resp_body)
        else:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))

    do_GET = _handle
    do_POST = _handle
    do_PUT = _handle
    do_DELETE = _handle
    do_PATCH = _handle
    do_OPTIONS = _handle
    do_HEAD = _handle


def main():
    server = HTTPServer(("0.0.0.0", ADAPTER_PORT), Handler)
    logger.info("Edge Root adapter listening on :%s -> Lambda %s", ADAPTER_PORT, LAMBDA_ENDPOINT)
    server.serve_forever()


if __name__ == "__main__":
    main()
