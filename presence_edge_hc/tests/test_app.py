import json
from unittest.mock import patch
from presence_edge_hc.app import handler


def _make_cf_event(uri, method="GET", host="example.com"):
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
                            "host": [{"key": "Host", "value": host}],
                        },
                        "querystring": "",
                    },
                }
            }
        ]
    }


class TestEdgeHcHandler:
    # ---- /edge/hc/live ----

    def test_live_returns_ok(self):
        event = _make_cf_event("/edge/hc/live")
        result = handler(event, None)

        assert result["status"] == "200"
        body = json.loads(result["body"])
        assert body["health_status"] == "LIVE"

    # ---- /edge/hc/ready ----

    @patch("presence_edge_hc.app._fetch_origin_health")
    def test_hc_returns_ok_when_origin_healthy(self, mock_fetch):
        mock_fetch.return_value = {
            "health_status": "OK",
            "database": "OK",
            "version": "test",
        }
        event = _make_cf_event("/edge/hc/ready")
        result = handler(event, None)

        assert result["status"] == "200"
        body = json.loads(result["body"])
        assert body["health_status"] == "READY"
        assert body["edge"]["health_status"] == "OK"
        assert body["fn"]["health_status"] == "OK"

    @patch("presence_edge_hc.app._fetch_origin_health")
    def test_hc_returns_error_when_origin_unhealthy(self, mock_fetch):
        mock_fetch.return_value = {
            "health_status": "DEGRADED",
            "database": "ERROR",
        }
        event = _make_cf_event("/edge/hc/ready")
        result = handler(event, None)

        assert result["status"] == "500"
        body = json.loads(result["body"])
        assert body["health_status"] == "ERROR"
        assert body["edge"]["health_status"] == "OK"
        assert body["fn"]["health_status"] == "DEGRADED"

    @patch("presence_edge_hc.app._fetch_origin_health")
    def test_hc_returns_error_when_origin_errors(self, mock_fetch):
        mock_fetch.return_value = {"error": "connection refused"}
        event = _make_cf_event("/edge/hc/ready")
        result = handler(event, None)

        assert result["status"] == "500"
        body = json.loads(result["body"])
        assert body["health_status"] == "ERROR"
        assert body["fn"]["error"] == "connection refused"

    def test_non_hc_path_returns_400(self):
        event = _make_cf_event("/other/page")
        result = handler(event, None)

        assert result["status"] == "400"
        body = json.loads(result["body"])
        assert body["error"] == "not found"

    def test_root_path_returns_400(self):
        event = _make_cf_event("/")
        result = handler(event, None)

        assert result["status"] == "400"
