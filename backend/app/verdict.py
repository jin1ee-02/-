"""Public role debate with bounded rounds and deterministic stability checks."""

import json
import math
import os
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import HTTPException

from app.prompts import DEBATE_PROMPT, JUDGE_PROMPT, PROMPT_VERSION
from app.provider import ModelOutputError
from app.schemas import DebateEntry, DebateOutput, JudgeOutput, VerdictResult

ROLES = {
    "prosecutor": "A의 관점에서 불만과 주장을 공정하게 대변하세요. B의 타당한 지적은 인정하세요.",
    "defense": "B의 관점에서 상황과 주장을 공정하게 대변하세요. A의 타당한 지적은 인정하세요.",
    "factcheck": "양쪽 주장과 대화 내부 근거를 대조하고 주장/확인된 대화/누락 정보를 구별하세요.",
}


def score_vector(judgment):
    return [getattr(side, key) for side in [judgment.plaintiff, judgment.defendant] for key in ["logic", "emotionControl", "evidence"]]


def validate_judge(judgment, mode):
    if any(not math.isfinite(value) or not 0 <= value <= 100 for value in score_vector(judgment)):
        raise ModelOutputError("판결 점수 범위가 유효하지 않습니다.")
    for side in [judgment.plaintiff, judgment.defendant]:
        if any(not value.strip() or len(value) > 300 for value in [side.strength, side.improvement]):
            raise ModelOutputError("판결 항목 설명이 유효하지 않습니다.")
    if any(not value.strip() or len(value) > 700 for value in [judgment.summary, judgment.recommendation]) or len(judgment.humor) > 300:
        raise ModelOutputError("판결 설명이 유효하지 않습니다.")
    if mode == "UFC":
        judgment.humor = ""
    return judgment


def run_debate(request, snapshot, provider, appeals=None, parent_id=None):
    appeals = appeals or []
    log = []
    previous = None
    max_rounds = max(1, min(3, int(os.getenv("VERDICT_MAX_ROUNDS", "3"))))
    stable_delta = float(os.getenv("VERDICT_STABILITY_DELTA", "5"))
    base = {"messages": snapshot["messages"], "relationship": snapshot["relationship"], "context": request.context, "mode": request.mode, "conflictTemperature": snapshot["temperature"], "appeals": appeals}
    for round_number in range(1, max_rounds + 1):
        payload = {**base, "previous_public_opinions": [entry.model_dump() for entry in log[-4:]]}
        def role_call(role):
            result = provider.structured(DEBATE_PROMPT + "\n역할: " + ROLES[role], payload, DebateOutput, 900)
            if not result.text.strip() or len(result.text) > 700 or len(result.evidence_indices) > 10 or len(set(result.evidence_indices)) != len(result.evidence_indices) or any(index < 0 or index >= len(snapshot["messages"]) for index in result.evidence_indices):
                raise ModelOutputError("공개 토론 의견 또는 근거 번호가 유효하지 않습니다.")
            return DebateEntry(role=role, round=round_number, text=result.text, evidenceIndices=result.evidence_indices)
        with ThreadPoolExecutor(max_workers=3) as pool:
            entries = list(pool.map(role_call, ROLES))
        log.extend(entries)
        judgment = validate_judge(provider.structured(JUDGE_PROMPT, {**base, "opinions": [entry.model_dump() for entry in entries], "previous_judgment": previous.model_dump() if previous else None}, JudgeOutput, 2000), request.mode)
        log.append(DebateEntry(role="judge", round=round_number, text=judgment.summary))
        stable = previous is not None and not judgment.unresolved and not previous.unresolved and max(abs(a-b) for a,b in zip(score_vector(previous), score_vector(judgment))) <= stable_delta
        if stable:
            break
        previous = judgment
    return VerdictResult(**judgment.model_dump(), verdictId=str(uuid.uuid4()), mode=request.mode, debateLog=log, rounds=round_number, stopReason="stable" if stable else "max_rounds", parentVerdictId=parent_id, snapshotVersion=snapshot["version"], provider=f"openai/{provider.model}", promptVersion=PROMPT_VERSION)


def create_verdict(request, authorization, store, provider):
    subject = store.authorize(request.room_id, authorization)
    if subject != request.requester:
        raise HTTPException(403, "요청 화자와 참가 토큰이 일치하지 않습니다.")
    existing = store.verdict_by_request(request.room_id, request.request_id)
    if existing:
        if existing["parent_id"] or json.loads(existing["snapshot"])["request"] != request.model_dump():
            raise HTTPException(409, "같은 요청 ID를 다른 판결에 사용할 수 없습니다.")
        return VerdictResult.model_validate_json(existing["result"])
    state = store.state(request.room_id, subject)
    messages = [{"speaker": m["speaker"], "text": m["text"]} for m in state["messages"][-10:]]
    if set(m["speaker"] for m in messages) != {"A", "B"}:
        raise HTTPException(422, "양쪽의 메시지가 한 개 이상 필요합니다.")
    # Reject stale client snapshot rather than silently analyze a different conversation.
    if messages != [m.model_dump() for m in request.recent_messages] or request.relationship != state["relationship"]:
        raise HTTPException(409, "대화가 바뀌었어요. 채팅으로 돌아가 최신 대화를 확인해주세요.")
    snapshot = {"messages": messages, "relationship": state["relationship"], "temperature": state["temperature"], "version": state["version"], "request": request.model_dump()}
    result = run_debate(request, snapshot, provider)
    store.save_verdict(request, snapshot, result, [])
    return result


def appeal_verdict(verdict_id, request, authorization, store, provider):
    from app.schemas import VerdictInput
    parent = store.verdict(verdict_id)
    subject = store.authorize(parent["room_id"], authorization)
    existing = store.verdict_by_request(parent["room_id"], request.request_id)
    if existing:
        previous_appeals = json.loads(existing["appeals"])
        if existing["parent_id"] != verdict_id or not previous_appeals or previous_appeals[-1] != {"speaker": subject, "text": request.text}:
            raise HTTPException(409, "같은 요청 ID를 다른 반론에 사용할 수 없습니다.")
        return VerdictResult.model_validate_json(existing["result"])
    snapshot = json.loads(parent["snapshot"])
    original = VerdictInput.model_validate(snapshot["request"])
    original.request_id = request.request_id
    appeals = json.loads(parent["appeals"])
    if len(appeals) >= 3:
        raise HTTPException(409, "반론은 같은 판결 흐름에서 최대 3회 가능합니다. 새 판결을 요청해주세요.")
    appeals.append({"speaker": subject, "text": request.text})
    result = run_debate(original, snapshot, provider, appeals, verdict_id)
    store.save_verdict(original, snapshot, result, appeals)
    return result
