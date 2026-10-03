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
