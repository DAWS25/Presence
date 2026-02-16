import pytest
from presence_edge_auth.app import handler


def _make_cf_event(uri, method="GET"):
    """Build a minimal CloudFront origin-request event."""
    return {
        "Records": [
            {
                "cf": {
                    "config": {
                        "distributionId": "EXAMPLE",
                        "eventType": "origin-request",
                    },
                    "request": {
                        "uri": uri,
                        "method": method,
                        "headers": {
                            "host": [{"key": "Host", "value": "example.com"}],
                        },
                        "querystring": "",
                    },
                }
            }
        ]
    }


class TestEdgeHandler:
    def test_edge_auth_path_returns_hello(self):
        event = _make_cf_event("/edge/auth/test")
        result = handler(event, None)

        assert result["status"] == "200"
        assert result["body"] == "hello edge"
        assert result["headers"]["content-type"][0]["value"] == "text/plain"

    def test_edge_auth_root_returns_hello(self):
        event = _make_cf_event("/edge/auth/")
        result = handler(event, None)

        assert result["status"] == "200"
        assert result["body"] == "hello edge"

    def test_non_edge_path_forwards_request(self):
        event = _make_cf_event("/other/page")
        result = handler(event, None)

        # Should return the original request object (forward to origin)
        assert "status" not in result
        assert result["uri"] == "/other/page"
        assert result["method"] == "GET"

    def test_root_path_forwards_request(self):
        event = _make_cf_event("/")
        result = handler(event, None)

        assert "status" not in result
        assert result["uri"] == "/"
