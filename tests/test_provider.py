import json
import unittest
from types import SimpleNamespace

from pydantic import ValidationError

from app.provider import OpenAIProvider
from app.schemas import ConversationInput, ModelFeatures


class FakeResponses:
    def __init__(self, parsed):
        self.parsed = parsed
        self.kwargs = None

    def parse(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(output_parsed=self.parsed)


class ProviderTests(unittest.TestCase):
    def test_temperature_is_not_sent_to_model(self):
        fake = FakeResponses(ModelFeatures(hostility=0, sarcasm=0, blame=0, repair=0,
                                           escalation_delta=0, confidence=3, rationale="중립"))
        provider = OpenAIProvider.__new__(OpenAIProvider)
        provider.client = SimpleNamespace(responses=fake)
        provider.model = "test-model"
        request = ConversationInput(speaker="A", text="안녕", previous_temperature=99)
        self.assertEqual(provider.analyze(request).hostility, 0)
        payload = json.loads(fake.kwargs["input"][1]["content"])
        self.assertNotIn("previous_temperature", payload)
        self.assertEqual(payload["target"], {"speaker": "A", "text": "안녕"})
        self.assertFalse(fake.kwargs["store"])

    def test_out_of_range_model_output_is_rejected(self):
        fake = FakeResponses(ModelFeatures(hostility=9, sarcasm=0, blame=0, repair=0,
                                           escalation_delta=0, confidence=3, rationale="잘못된 점수"))
        provider = OpenAIProvider.__new__(OpenAIProvider)
        provider.client = SimpleNamespace(responses=fake)
        provider.model = "test-model"
        with self.assertRaises(ValidationError):
            provider.analyze(ConversationInput(speaker="A", text="안녕"))


if __name__ == "__main__":
    unittest.main()
