def handler(event, context):
    request = event["Records"][0]["cf"]["request"]
    uri = request.get("uri", "")

    if uri.startswith("/edge/"):
        return {
            "status": "200",
            "statusDescription": "OK",
            "headers": {
                "content-type": [{"key": "Content-Type", "value": "text/plain"}],
                "cache-control": [{"key": "Cache-Control", "value": "no-cache"}],
            },
            "body": "hello edge",
        }

    return request
