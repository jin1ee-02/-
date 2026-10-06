"""Request and response contracts for the model-only MVP."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ChatTurn(StrictModel):
    speaker: str = Field(min_length=1, max_length=40)
    text: str = Field(min_length=1, max_length=2000)

    @field_validator("speaker", "text")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("공백만 입력할 수 없습니다.")
        return value


class ConversationInput(StrictModel):
    recent_messages: list[ChatTurn] = Field(default_factory=list, max_length=10)
    speaker: str = Field(min_length=1, max_length=40)
    text: str = Field(min_length=1, max_length=2000)
    relationship: str | None = Field(default=None, max_length=100)
    summary: str | None = Field(default=None, max_length=1000)
    previous_temperature: float = Field(default=0, ge=0, le=100)

    @field_validator("speaker", "text")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("공백만 입력할 수 없습니다.")
        return value


class DraftInput(ConversationInput):
    suggest_rewrite: bool = True
    sensitivity: float = Field(default=0.5, ge=0, le=1)


class ReceiptResult(StrictModel):
    status: Literal["received"]
    received: ConversationInput


class ModelFeatures(StrictModel):
    """Simple schema sent to the LLM; score ranges are checked separately."""

    hostility: int
    sarcasm: int
    blame: int
    repair: int
    escalation_delta: int
    confidence: int
    rationale: str


class FeatureScores(ModelFeatures):
    hostility: int = Field(ge=0, le=4)
    sarcasm: int = Field(ge=0, le=4)
    blame: int = Field(ge=0, le=4)
    repair: int = Field(ge=0, le=4)
    escalation_delta: int = Field(ge=-2, le=2)
    confidence: int = Field(ge=0, le=4)
    rationale: str = Field(max_length=500)
    model_version: str | None = None


class RewriteOutput(StrictModel):
    rewritten_text: str


class MessageResult(StrictModel):
    features: FeatureScores
    raw_conflict: float
    previous_temperature: float
    temperature: float


class DraftResult(StrictModel):
    features: FeatureScores
    draft_risk: float
    current_temperature: float
    threshold: int
    decision: Literal["rewrite_suggested", "below_threshold", "low_confidence"]
    rewritten_text: str | None
    alternatives: list[str] = Field(default_factory=list, max_length=3)
    provider: str = "openai"


Speaker = Literal["A", "B"]
EmotionName = Literal["neutral", "happy", "sad", "angry", "surprised", "fear", "disgust", "contempt"]


class EmotionInput(StrictModel):
    speaker: Speaker
    relationship: str = Field(default="친구", max_length=100)
    recent_messages: list[ChatTurn] = Field(max_length=10)


class EmotionResult(StrictModel):
    subject: Speaker
    status: Literal["ok", "uncertain", "insufficient_context"]
    level: int | None = Field(ge=1, le=5)
    trend: Literal["up", "flat", "down"] | None
    recommendation: str
    contextCount: int
    confidence: float | None = Field(ge=0, le=1)
    provider: str


class ReactionInput(ConversationInput):
    speaker: Speaker
    recipient: Speaker
    draft_revision: str = Field(min_length=1, max_length=80)


class ReactionResult(StrictModel):
    status: Literal["ok", "uncertain", "insufficient_context"]
    recipient: Speaker
    draft_revision: str
    emotion: EmotionName | None
    probabilities: dict[str, float]
    intensity: float | None = Field(ge=0, le=1)
    confidence: float | None = Field(ge=0, le=1)
    explanation: str
    provider: str


# Simple schemas for generation; validate all model-controlled fields afterwards.
class AlternativesOutput(StrictModel):
    alternatives: list[str]


class EmotionOutput(StrictModel):
    current_score: float
    previous_score: float | None
    confidence: float


class ReactionOutput(StrictModel):
    emotion: EmotionName
    probabilities: list[float]  # fixed order matches EmotionName
    intensity: float
    confidence: float


class VerdictInput(StrictModel):
    room_id: str = Field(min_length=1, max_length=80)
    requester: Speaker
    mode: Literal["WWE", "UFC"]
    relationship: str = Field(max_length=100)
    recent_messages: list[ChatTurn] = Field(min_length=2, max_length=10)
    context: str = Field(default="", max_length=1000)
    request_id: str = Field(min_length=1, max_length=80)


class SideScore(StrictModel):
    logic: float
    emotionControl: float
    evidence: float
    strength: str
    improvement: str


class DebateOutput(StrictModel):
    text: str
    evidence_indices: list[int]


class JudgeOutput(StrictModel):
    plaintiff: SideScore  # always A, regardless of requester
    defendant: SideScore  # always B
    summary: str
    recommendation: str
    humor: str
    unresolved: bool


class DebateEntry(StrictModel):
    role: Literal["prosecutor", "defense", "factcheck", "judge"]
    round: int
    text: str
    evidenceIndices: list[int] = Field(default_factory=list)


class VerdictResult(JudgeOutput):
    verdictId: str
    mode: Literal["WWE", "UFC"]
    debateLog: list[DebateEntry]
    rounds: int
    stopReason: Literal["stable", "max_rounds"]
    parentVerdictId: str | None = None
    snapshotVersion: int
    provider: str
    promptVersion: str


class AppealInput(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    request_id: str = Field(min_length=1, max_length=80)

    @field_validator("text")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("공백만 입력할 수 없습니다.")
        return value.strip()


class RoomSettings(StrictModel):
    purifyEnabled: bool = True
    thermometerEnabled: bool = True
    reactionEnabled: bool = True
    sensitivity: float = Field(default=0.5, ge=0, le=1)


class RoomCreate(StrictModel):
    relationship: str = Field(default="친구", min_length=1, max_length=100)


class RoomJoin(StrictModel):
    invite_code: str = Field(min_length=10, max_length=100)


class RoomUpdate(RoomCreate):
    settings: RoomSettings


class SendInput(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    request_id: str = Field(min_length=1, max_length=80)

    @field_validator("text")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("공백만 입력할 수 없습니다.")
        return value.strip()
