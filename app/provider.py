"""OpenAI adapter. The rest of the pipeline does not depend on the SDK."""

import json
import os
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import HTTPException
from openai import OpenAI

from app.prompts import ANALYZE_PROMPT, REWRITE_PROMPT
from app.schemas import ConversationInput, FeatureScores, ModelFeatures, RewriteOutput

load_dotenv()


class ModelOutputError(Exception):
    """The model returned no usable structured answer."""


class OpenAIProvider:
    def __init__(self, api_key: str, model: str):
        self.client = OpenAI(api_key=api_key, timeout=30.0, max_retries=1)
        self.model = model

    @staticmethod
    def _payload(request: ConversationInput) -> str:
        # Delimit user text as JSON data; only the static system prompt is instructional.
        return json.dumps(
            {
                "relationship": request.relationship,
                "summary": request.summary,
                "recent_messages": [turn.model_dump() for turn in request.recent_messages],
                "target": {"speaker": request.speaker, "text": request.text},
            },
            ensure_ascii=False,
        )

    def analyze(self, request: ConversationInput) -> FeatureScores:
        response = self.client.responses.parse(
            model=self.model,
            input=[
                {"role": "system", "content": ANALYZE_PROMPT},
                {"role": "user", "content": self._payload(request)},
            ],
            text_format=ModelFeatures,
            max_output_tokens=300,
            store=False,
        )
        if response.output_parsed is None:
            raise ModelOutputError("갈등 분석 결과가 비어 있습니다.")
        return FeatureScores.model_validate(response.output_parsed.model_dump())

    def rewrite(self, request: ConversationInput) -> str:
        response = self.client.responses.parse(
            model=self.model,
            input=[
                {"role": "system", "content": REWRITE_PROMPT},
                {"role": "user", "content": self._payload(request)},
            ],
            text_format=RewriteOutput,
            max_output_tokens=250,
            store=False,
        )
        if response.output_parsed is None:
            raise ModelOutputError("순화 결과가 비어 있습니다.")
        rewritten = response.output_parsed.rewritten_text.strip()
        if not rewritten or len(rewritten) > 2000:
            raise ModelOutputError("순화 결과가 유효하지 않습니다.")
        return rewritten


@lru_cache(maxsize=1)
def get_provider() -> OpenAIProvider:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "your_api_key_here":
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
    return OpenAIProvider(api_key=api_key, model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
