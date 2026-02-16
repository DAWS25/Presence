import json
from presence_edge_root.app import handler


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


class TestEdgeRootHandler:
    def test_root_redirects_to_fn_index(self):
        event = _make_cf_event("/")
        result = handler(event, None)

        assert result["status"] == "302"
        location = result["headers"]["location"][0]["value"]
        assert location == "/fn/index"

    def test_place_id_redirects(self):
        event = _make_cf_event("/brave-sunny-beach")
        result = handler(event, None)

        assert result["status"] == "302"
        location = result["headers"]["location"][0]["value"]
        assert location == "/fn/place/brave-sunny-beach"

    def test_place_id_case_insensitive(self):
        event = _make_cf_event("/Brave-Sunny-Beach")
        result = handler(event, None)

        assert result["status"] == "302"
        location = result["headers"]["location"][0]["value"]
        assert location == "/fn/place/Brave-Sunny-Beach"

    def test_non_place_id_single_segment_returns_400(self):
        event = _make_cf_event("/notaplaceid")
        result = handler(event, None)

        assert result["status"] == "400"
        body = json.loads(result["body"])
        assert "not a valid place id" in body["error"]

    def test_multi_segment_path_returns_400(self):
        event = _make_cf_event("/some/nested/path")
        result = handler(event, None)

        assert result["status"] == "400"
        body = json.loads(result["body"])
        assert "too many components" in body["error"]

    def test_two_segment_path_returns_400(self):
        event = _make_cf_event("/a/b")
        result = handler(event, None)

        assert result["status"] == "400"
        body = json.loads(result["body"])
        assert "too many components" in body["error"]

    def test_single_word_returns_400(self):
        event = _make_cf_event("/hello")
        result = handler(event, None)

        assert result["status"] == "400"
        body = json.loads(result["body"])
        assert "not a valid place id" in body["error"]

    def test_two_word_hyphenated_returns_400(self):
        event = _make_cf_event("/brave-sunny")
        result = handler(event, None)

        assert result["status"] == "400"
        body = json.loads(result["body"])
        assert "not a valid place id" in body["error"]

