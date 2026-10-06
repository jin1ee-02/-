> 2026년 10월 6일: 이 문서는 구현 전 제안과 인계 기록입니다. 최신 API, JEV 연동, 저장·판결·반론과 실행 방법은 [MVP 구현과 방법론](MVP-구현-방법론.md) 및 현재 코드를 기준으로 확인하세요.

# 중간 발표용 API 연결

이 문서는 현재 실행 골격을 위한 임시 연결 명세입니다. 첨부 핸드오프의 API 제안을 팀 최종 계약으로 확정하지 않습니다.

백엔드 구현을 시작하려면 [팀원용 구현 인계와 협의 가이드](backend-implementation-handoff.md)와 [코딩 에이전트용 요청문](backend-agent-prompt.md)을 함께 확인하세요.

## 데이터 흐름

```text
Expo 앱 / 브라우저
  → src/api/client.ts
      ├─ local: 프론트에서 즉시 메시지 추가 (서버 호출 없음)
      └─ receipt / ai: HTTP POST + JSON → FastAPI (8000)
          ├─ receipt: 검증한 입력을 반환 (AI 호출 없음)
          └─ ai: 기존 OpenAI 분석 호출 → 점수·온도 반환
          → 응답 성공 후 프론트 채팅에 메시지 추가
```

Expo 개발 서버(8081)는 앱 코드를 제공하고, FastAPI 서버(8000)는 API를 제공합니다. Python이 프론트 개발 서버를 호출하는 구조가 아닙니다. 두 기기 사이의 채팅 전달은 현재 구현에 포함되지 않습니다.

## 공통 입력 (현재 백엔드 기준)

```json
{
  "recent_messages": [{ "speaker": "A", "text": "오늘 청소하기로 했잖아." }],
  "speaker": "B",
  "text": "오늘 바빴어. 내일 하면 안 될까?",
  "relationship": "친구",
  "previous_temperature": 0
}
```

- `recent_messages`: 이번 분석 대상 메시지를 제외한 직전 최대 10개 발화
- `speaker`, `text`: 현재 입력 (공백 입력 금지, text 최대 2000자)
- `relationship`, `summary`: 선택 문맥 (프론트는 현재 관계만 전달)
- `previous_temperature`: 이전의 대화 전체 갈등 온도 0~100 (프론트 로컬 상태에서 보관)
- `roomId`, `senderId`, `sensitivity` 등은 현재 API가 받지 않습니다. 정의되지 않은 필드는 422로 거절합니다.

## 입력 전달 시연 — POST /v1/demo/messages

응답:

```json
{
  "status": "received",
  "received": {
    "recent_messages": [{ "speaker": "A", "text": "오늘 청소하기로 했잖아." }],
    "speaker": "B",
    "text": "오늘 바빴어. 내일 하면 안 될까?",
    "relationship": "친구",
    "summary": null,
    "previous_temperature": 0
  }
}
```

입력을 수신·검증했음을 보여주는 API입니다. OpenAI, 감정 추론, 온도 갱신, 채팅 저장을 실행하지 않습니다. 발표용 입력 전달 확인으로만 사용합니다.

## 실제 AI — POST /v1/messages/analyze

같은 입력을 기존 모델 API에 전달합니다. 응답 필드는 `features`, `raw_conflict`, `previous_temperature`, `temperature`입니다. `features`에는 hostility/sarcasm/blame/repair/confidence와 escalation_delta, rationale이 있습니다.

프론트는 응답 온도를 저장해 다음 메시지의 `previous_temperature`로 전달합니다. 현재 값은 대화 전체의 갈등 온도이며, 화자별 감정이나 심리 확률이 아닙니다. 실제 모델 요청마다 비용이 발생합니다.

## 전송 전 순화 — POST /v1/drafts/analyze (기존 API)

공통 입력 + `suggest_rewrite`를 받습니다. 응답은 `features`, `draft_risk`, `current_temperature`, `threshold`, `decision`, `rewritten_text`입니다. `rewritten_text`는 현재 최대 한 문장이며 null일 수 있습니다.

프론트의 순화 화면은 초안 분석 → 사용자가 원문/순화문 선택 → 최종 전송으로 연결되어 있습니다. `EXPO_PUBLIC_FEATURE_MODE=api`일 때 이 API의 단일 `rewritten_text`를 대안 배열로 변환합니다. 민감도는 현재 API에 보내지 않습니다. 최종 전송은 `EXPO_PUBLIC_API_MODE`에 따릅니다. 현재 백엔드 구현에서는 필요한 경우 순화를 위해 추가 LLM 호출이 발생합니다. 핸드오프의 Light 단일 호출 설계와는 다릅니다.

기본 기능 모드는 `mock`이므로 세 기능의 예시만 표시합니다. 새 감정·판결 API는 아직 없습니다. 화면 동작, 엔드포인트 제안, 요청·응답 예시는 [프론트 기능/API 문서](frontend-features-api.md)를 확인하세요.

## 연결과 실패

- `GET /health`는 서버 연결만 확인합니다. AI 키 유효성을 확인하지 않습니다.
- 기본 CORS 허용 주소는 `http://localhost:8081`, `http://127.0.0.1:8081`입니다. 다른 웹 주소는 `backend/.env`의 `CORS_ORIGINS`에 쉼표로 추가하고 서버를 재시작합니다.
- 모바일 앱은 브라우저 CORS의 적용 대상이 아니지만, 실제 기기에서 접근 가능한 백엔드 주소를 지정해야 합니다.
- 422: 입력 오류, 503: AI 키 미설정, 502: AI 호출/결과 검증 실패
- 프론트는 오류를 보여주고 입력을 유지합니다. 자동으로 원문을 전송하지 않습니다. 이는 이 연결 골격의 임시 동작이며 최종 순화 실패 정책은 팀 합의가 필요합니다.

## AI 파트와 다음에 합의할 항목

| 주제 | 현재 코드 | 핸드오프 제안 / 결정할 사항 |
|---|---|---|
| Light 경로 | messages/drafts 두 API | 통합 `/analyze`, 한 번의 LLM 호출 여부 |
| 감정 형식 | 대화 전체 온도 0~100 | 현재 사용자(나)의 1~5 상태와 추세, 별도 API |
| 순화 | decision + 순화문 최대 1개 | toxic + alternatives 2~3개 |
| 관계·민감도 | 관계를 모델 문맥으로 전달 | 민감도 값 범위와 실제 계산 |
| 문맥 보관 | 최근 10개와 온도를 프론트가 보관 | 서버 Core State, 방 ID, DB |
| 판결 | API 없음 | `/verdict`, 진행 상태, 로그, 반론 |
| 실시간 채팅 | 앱 내부 A/B 시뮬레이션 | WebSocket 등 전송 방식·담당자 |
| 계정 | 없음 | 인증·사용자 ID |

팀에서 최종 계약을 정하면 기존 API는 `frontend/src/api/client.ts`·`src/types/api.ts`, 세 기능은 `src/api/features.ts`·`src/types/features.ts`에서 화면 형식으로 변환합니다.
