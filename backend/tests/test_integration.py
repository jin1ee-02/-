import unittest

from fastapi.testclient import TestClient

from app.main import app


class IntegrationTests(unittest.TestCase):
    def test_receipt_echoes_validated_context_without_ai(self):
        response = TestClient(app).post("/v1/demo/messages", json={
            "speaker": "B",
            "text": "내일 함께 정리하자.",
            "recent_messages": [{"speaker": "A", "text": "오늘 정리하기로 했잖아."}],
            "relationship": "친구",
            "previous_temperature": 35,
        })
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["status"], "received")
        self.assertEqual(result["received"]["speaker"], "B")
        self.assertEqual(result["received"]["recent_messages"][0]["speaker"], "A")
        self.assertEqual(result["received"]["previous_temperature"], 35)
        self.assertNotIn("temperature", result)

    def test_receipt_rejects_unagreed_contract_fields(self):
        response = TestClient(app).post("/v1/demo/messages", json={
            "speaker": "A", "text": "안녕", "roomId": "unagreed",
        })
        self.assertEqual(response.status_code, 422)

    def test_expo_web_preflight_allows_json_posts(self):
        response = TestClient(app).options("/v1/demo/messages", headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:8081")

    def test_other_web_origins_are_not_allowed(self):
        response = TestClient(app).options("/v1/demo/messages", headers={
            "Origin": "https://not-configured.example",
            "Access-Control-Request-Method": "POST",
        })
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)
