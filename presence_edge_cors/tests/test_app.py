import pytest
from presence_edge_cors.app import handler, FEDCM_HEADERS


def _make_cf_origin_response(status="200", headers=None):
    """Build a minimal CloudFront origin-response event."""
    return {
        "Records": [
            {
                "cf": {
                    "config": {
                        "distributionId": "EXAMPLE",
                        "eventType": "origin-response",
                    },
                    "response": {
                        "status": status,
                        "statusDescription": "OK",
                        "headers": headers or {},
                    },
                }
            }
        ]
    }


class TestEdgeCorsHandler:
    def test_adds_fedcm_headers(self):
        event = _make_cf_origin_response()
        result = handler(event, None)

        for header_name, header_entry in FEDCM_HEADERS.items():
            assert header_name in result["headers"]
            assert result["headers"][header_name][0]["value"] == header_entry["value"]

    def test_preserves_existing_headers(self):
        event = _make_cf_origin_response(
            headers={
                "content-type": [{"key": "Content-Type", "value": "text/html"}],
            }
        )
        result = handler(event, None)

        assert result["headers"]["content-type"][0]["value"] == "text/html"
        assert "permissions-policy" in result["headers"]

    def test_returns_same_status(self):
        event = _make_cf_origin_response(status="404")
        result = handler(event, None)

        assert result["status"] == "404"
