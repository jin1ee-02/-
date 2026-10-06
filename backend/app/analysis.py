"""Separate classification from generation, with explicit uncertainty states."""

import os

from fastapi import HTTPException

from app.jev import get_jev
from app.provider import get_provider
from app.runtime import analysis_cache
from app.schemas import EmotionResult, ReactionResult


def get_analyzer():
    mode = os.getenv("ANALYSIS_PROVIDER", "openai")
    if mode == "jev":
        return get_jev()
    if mode == "openai":
        return get_provider()
    raise HTTPException(503, "ANALYSIS_PROVIDER는 jev 또는 openai여야 합니다.")


def analyzer_name(provider):
    return f"{os.getenv('ANALYSIS_PROVIDER', 'openai')}/{provider.model}"


def emotion_result(request, provider):
    count = len(request.recent_messages)
    if not any(t.speaker == request.speaker for t in request.recent_messages):
        return EmotionResult(subject=request.speaker, status="insufficient_context", level=None, trend=None, recommendation="나의 메시지가 아직 없어 감정을 판단할 수 없어요.", contextCount=count, confidence=None, provider=analyzer_name(provider))
    current, previous, confidence, model = analysis_cache.call(["emotion-v1", analyzer_name(provider), request.model_dump()], lambda: provider.emotion(request))
    if confidence < 0.55:
        return EmotionResult(subject=request.speaker, status="uncertain", level=None, trend=None, recommendation="표현과 문맥이 애매해 감정 단계를 보류했어요.", contextCount=count, confidence=confidence, provider=model)
    level = min(5, int(current + 0.5) + 1)
    has_previous = sum(t.speaker == request.speaker for t in request.recent_messages) >= 2
    trend = None if not has_previous or previous is None else "up" if current - previous >= 0.5 else "down" if current - previous <= -0.5 else "flat"
    advice = ["차분하게 원하는 점을 이야기해보세요.", "불편했던 점을 구체적으로 정리해보세요.", "잠깐 쉬면서 원하는 점을 정리해보세요.", "답장을 잠시 미루고 충분히 쉬어보세요.", "대화를 잠시 멈추고 진정한 뒤 이어가보세요."]
    return EmotionResult(subject=request.speaker, status="ok", level=level, trend=trend, recommendation=advice[level-1], contextCount=count, confidence=confidence, provider=model)


def reaction_result(request, provider):
    if request.speaker == request.recipient:
        raise HTTPException(422, "보내는 사람과 받는 사람은 달라야 합니다.")
    name, probabilities, intensity, confidence, model = analysis_cache.call(["reaction-v1", analyzer_name(provider), request.model_dump(exclude={"draft_revision", "previous_temperature"})], lambda: provider.reaction(request))
    uncertain = confidence < 0.55
    return ReactionResult(status="uncertain" if uncertain else "ok", recipient=request.recipient, draft_revision=request.draft_revision, emotion=None if uncertain else name, probabilities=probabilities, intensity=None if uncertain else intensity, confidence=confidence, explanation="예상 반응이 애매해 표시를 보류했어요." if uncertain else "이 표현을 받으면 상대가 이런 감정을 느낄 수 있어요. 실제 감정과 다를 수 있습니다.", provider=model)
