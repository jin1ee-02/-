"""Stateless FastAPI surface for sent-message and draft analysis."""

from typing import Annotated
import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAIError
from pydantic import ValidationError

from app.provider import ModelOutputError, OpenAIProvider, get_provider
from app.schemas import ConversationInput, DraftInput, DraftResult, MessageResult, ReceiptResult
from app.scoring import conflict_score, draft_decision, rewrite_threshold, update_temperature

app = FastAPI(title="채팅 갈등 중재 모델 MVP", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081"
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
Provider = Annotated[OpenAIProvider, Depends(get_provider)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/demo/messages", response_model=ReceiptResult)
def receive_demo_message(request: ConversationInput) -> ReceiptResult:
    """Echo validated input for the presentation; no AI call or persistence."""
    return ReceiptResult(status="received", received=request)


def _provider_failure(error: Exception) -> HTTPException:
    return HTTPException(status_code=502, detail="AI 요청 또는 구조화 결과 검증에 실패했습니다. 모델 설정과 API 연결을 확인하세요.")


@app.post("/v1/messages/analyze", response_model=MessageResult)
def analyze_message(request: ConversationInput, provider: Provider) -> MessageResult:
    """Analyze a sent message and return the updated temperature; caller persists it."""
    try:
        features = provider.analyze(request)
    except (OpenAIError, ModelOutputError, ValidationError) as error:
        raise _provider_failure(error) from error
    raw = conflict_score(features)
    return MessageResult(
        features=features,
        raw_conflict=raw,
        previous_temperature=request.previous_temperature,
        temperature=update_temperature(request.previous_temperature, raw),
    )


@app.post("/v1/drafts/analyze", response_model=DraftResult)
def analyze_draft(request: DraftInput, provider: Provider) -> DraftResult:
    """Analyze an unsent draft without changing the conversation temperature."""
    try:
        features = provider.analyze(request)
        risk = conflict_score(features)
        decision = draft_decision(features, risk, request.previous_temperature)
        rewritten = provider.rewrite(request) if decision == "rewrite_suggested" and request.suggest_rewrite else None
    except (OpenAIError, ModelOutputError, ValidationError) as error:
        raise _provider_failure(error) from error
    return DraftResult(
        features=features,
        draft_risk=risk,
        current_temperature=request.previous_temperature,
        threshold=rewrite_threshold(request.previous_temperature),
        decision=decision,
        rewritten_text=rewritten,
    )
