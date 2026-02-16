from presence_edge_auth.auth import google_callback
from presence_edge_auth.response import cf_response


def handler(event, context):
    request = event["Records"][0]["cf"]["request"]
    uri = request.get("uri", "")
    method = request.get("method", "GET")

    if uri == "/edge/auth/google/callback" and method == "POST":
        return google_callback(request)

    if uri.startswith("/edge/auth/"):
        return cf_response(200, "hello edge")

    return request
