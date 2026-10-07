"""Deterministic scoring and temperature update, separate from the LLM."""

from app.schemas import FeatureScores


def conflict_score(features: FeatureScores) -> float:
    """Heuristic 0-100 score. Weights are MVP defaults, not calibrated probabilities."""
    h = features.hostility / 4
    s = features.sarcasm / 4
    b = features.blame / 4
    r = features.repair / 4
    up = max(features.escalation_delta, 0) / 2
    down = max(-features.escalation_delta, 0) / 2
    score = 100 * (0.35 * h + 0.25 * s + 0.25 * b + 0.15 * up - 0.25 * r - 0.10 * down)
    return round(max(0.0, min(100.0, score)), 1)


def update_temperature(previous: float, raw_conflict: float, alpha: float = 0.3) -> float:
    return round((1 - alpha) * previous + alpha * raw_conflict, 1)


def rewrite_threshold(temperature: float) -> int:
    if temperature < 40:
        return 70
    if temperature < 60:
        return 60
    if temperature < 80:
        return 45
    return 30


def draft_decision(features: FeatureScores, risk: float, temperature: float) -> str:
    if features.confidence <= 1:
        return "low_confidence"
    return "rewrite_suggested" if risk >= rewrite_threshold(temperature) else "below_threshold"


LEVEL_ADVICE = ["차분하게 원하는 점을 이야기해보세요.", "불편했던 점을 구체적으로 정리해보세요.", "잠깐 쉬면서 원하는 점을 정리해보세요.", "답장을 잠시 미루고 충분히 쉬어보세요.", "대화를 잠시 멈추고 진정한 뒤 이어가보세요."]
RELATIONSHIP_OFFSET = {"직장 동료": -10, "연인": -5, "룸메이트": -5, "친구": 0}


def cooldown_level(relationship: str | None, sensitivity: float) -> int:
    """Thermometer level that opens the cooldown notice (PDF p11: per-relationship sensitivity)."""
    level = 3 + (1 if sensitivity < 0.4 else 0) - (1 if sensitivity > 0.6 and RELATIONSHIP_OFFSET.get(relationship, 0) < 0 else 0)
    return max(2, min(5, level))


def thermometer(messages: list[dict], speaker: str, relationship: str | None, sensitivity: float) -> dict:
    """Thermometer for one speaker from the Light results already stored with each message: no extra model call."""
    own = [m["result"]["data"]["features"] for m in messages[-10:] if m["speaker"] == speaker]
    own = [f for f in own if f.get("emotion") is not None]
    base = {"subject": speaker, "contextCount": len(messages[-10:]), "cooldownLevel": cooldown_level(relationship, sensitivity)}
    if not own:
        return {**base, "status": "insufficient_context", "level": None, "trend": None, "confidence": None, "provider": "core-state", "recommendation": "메시지가 아직 없어 감정을 판단할 수 없어요."}
    current = own[-1]
    provider = current.get("model_version") or "core-state"
    if current["confidence"] <= 1:
        return {**base, "status": "uncertain", "level": None, "trend": None, "confidence": current["confidence"] / 4, "provider": provider, "recommendation": "표현과 문맥이 애매해 감정 단계를 보류했어요."}
    change = current["emotion"] - own[-2]["emotion"] if len(own) > 1 else None
    trend = None if change is None else "up" if change >= 1 else "down" if change <= -1 else "flat"
    level = current["emotion"] + 1
    return {**base, "status": "ok", "level": level, "trend": trend, "confidence": current["confidence"] / 4, "provider": provider, "recommendation": LEVEL_ADVICE[level - 1]}
