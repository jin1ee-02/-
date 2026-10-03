# Codex와 Claude Code용 백엔드 구현 요청문

팀원이 저장소를 열고 아래 요청문을 코딩 에이전트에 붙여넣어 사용하세요. 프로젝트 루트는 `backend/`, `frontend/`, `docs/`가 있는 폴더입니다. 별도 다운로드나 이 문서 작성자의 로컬 경로가 필요하지 않습니다.

구현 전에 팀에서 이미 정한 API/DB/모델 정책이 있으면 요청문 뒤에 덧붙이세요. 단계별로 진행하려면 요청문 끝에 `이번에는 감정 API까지만 구현해줘`처럼 범위를 지정하세요. 아래 문구를 문서로 저장한 것만으로 작업이 실행되는 것은 아닙니다.

## 복사할 구현 요청문

```text
이 저장소의 KU래쪄용 프론트를 실제 AI 백엔드에 연결하려고 합니다.
현재 UI는 구현되어 있고 기본 local + mock 모드로 시연합니다.
기존 API를 보존하면서 나의 감정, 다툼판결, 반론 API를 구현해주세요.
순화 대안 배열과 민감도는 팀 합의가 있으면 확장하고, 없으면 기존 단일 대안 API부터 유지해주세요.

먼저 아래 자료와 실제 코드를 읽으세요.
- 적용되는 AGENTS.md
- backend/docs/team-handoff.md
- docs/backend-implementation-handoff.md
- backend/docs/jev-integration-proposal.md
- docs/frontend-features-api.md
- docs/api-integration.md
- backend/app/main.py, schemas.py, provider.py, prompts.py, scoring.py
- backend/tests/와 backend/requirements*.txt
- frontend/src/api/features.ts, client.ts
- frontend/src/types/features.ts, api.ts
- frontend/src/state/ChatContext.tsx
- frontend/src/hooks/useDraftReview.ts
- frontend/src/screens/VerdictScreen.tsx

자료의 추천안과 초기 구상을 최종 합의로 취급하지 마세요.
현재 코드와 다른 부분을 먼저 짚고, 기존 프론트 계약에 호환되는 경로부터 진행하세요.
팀이 지정한 정책이 없으면 미정 사항을 기록하고 호환 가능한 작업을 먼저 구현하세요.
응답 스키마를 깨거나 DB/비동기 구조 선택이 실제 연결을 막는 경우에만 필요한 결정을 질문하세요.

기능 요구사항:
1. 언어순화는 ON일 때 초안 분석 후 대안을 제안합니다.
   원문 전송/대안 선택은 사용자 결정이며 초안 분석이 메시지를 전송하거나 온도를 갱신하면 안 됩니다.
   기존 /v1/drafts/analyze와 suggest_rewrite=false, 저신뢰 decision을 보존하세요.
   확장 시 rewritten_text 호환, alternatives 배열, 선택 sensitivity 스키마와 어댑터를 함께 수정하세요.
2. 감정온도계는 진행된 대화에서 요청 speaker의 상태를 분석합니다.
   현재 프론트는 나=A로 고정하지만 백엔드 대상 사용자를 A로 하드코딩하지 마세요.
   대화 전체 temperature나 상대의 감정 점수를 나의 감정으로 반환하지 마세요.
   /v1/emotions/analyze는 subject, level 1~5, trend, recommendation, contextCount를 반환합니다.
3. 다툼판결은 버튼으로 요청할 때만 실행합니다.
   /v1/verdicts는 요청 스냅샷을 고정하고 verdictId, mode, 양쪽 SideScore,
   summary, recommendation, humor, 공개 debateLog를 반환합니다.
   현재 plaintiff=A, defendant=B 카드 매핑과 문서의 타입/범위를 유지하세요.
4. 반론은 /v1/verdicts/{verdictId}/appeals에 {text}만 보냅니다.
   서버가 ID로 원래 요청과 결과를 조회하고 반론을 추가해 같은 스냅샷으로 다시 분석해야 합니다.
   원래 결과와 판결 관계를 보존하고 없는 ID는 명확한 오류로 처리하세요.

구현 방법:
- 기존 GET /health, /v1/demo/messages, /v1/messages/analyze의 계약을 유지하세요.
- 모델 출력은 서버에서 검증하고 라우트, 모델 호출, 저장소를 테스트 가능한 형태로 분리하세요.
- Jev는 아직 적용하지 않은 후보입니다. 문서의 도입 제안을 확정된 모델 선택으로 취급하지 마세요.
  Jev를 채택한 경우 분석과 생성 provider를 분리하고, GPT 대안 문장·판결 설명 생성을 유지하세요.
  Jev 점수·확률·confidence와 현재 API 필드를 같은 의미로 간주하지 말고 변환·보류 정책을 검증하세요.
  Jev가 필요한 분석과 GPT가 필요한 기능의 키 의존성 및 모델 오류 처리를 분리하세요.
  모델 정책이 미정이면 기존 GPT 경로를 보존하고 감정 API와 비교 가능한 인터페이스부터 구현하세요.
- docs/examples/의 요청 JSON을 사용해 계약을 확인하세요.
- frontend/src/mocks/는 UI 예시입니다. 실제 API 실패를 예시 점수나 고정 대안으로 대체하지 마세요.
- 순화/감정/판결의 호출 시점을 구분하세요. Light 통합은 프론트 상태 변화까지 설계한 후 변경하세요.
- 현재 프론트는 판결 전체를 HTTP 응답으로 받습니다.
  202 + job_id나 다른 응답 형식이 필요하면 작업 조회/진행/취소와 프론트 수정까지 명시하세요.
- 판결 저장소의 재시작/uvicorn reload 동작, 반론 이력, 중복 재시도를 설명하세요.
- 실제 OpenAI·TypeSafe 키는 backend/.env에만 두고 키 값을 출력하거나 커밋하지 마세요.
- 모델 SDK/라이브러리를 변경한다면 설치 버전과 공식 문서를 확인하세요.
- 프론트 변경이 필요하면 타입/어댑터를 우선 수정하고 현재 UI 흐름을 유지하세요.
  Expo/React Native 변경은 frontend/AGENTS.md를 따르세요.

검증과 보고:
- backend에서 .venv/bin/python -m unittest discover -s tests -v를 실행하세요.
- 새 API의 입력/출력/모델 실패/문맥 부족/판결 ID 조회 테스트를 추가하세요.
  provider와 저장소를 대체한 테스트는 실제 키 없이 통과해야 합니다.
- 프론트를 수정하면 npm run typecheck, npm run lint, npm test, npm run build:web을 실행하세요.
- 실제 모델/브라우저/기기 검증을 하지 않았다면 했다고 보고하지 마세요.
- 자동으로 API 비용을 쓰는 평가를 실행하지 말고 별도 실행 방법을 제공하세요.
- 새 기능이 준비되기 전에는 기본 local + mock 시연 모드를 유지하세요.
- 완료 후 구현한 API, 설정/실행 방법, 실제 모델 호출 여부, 통과한 테스트,
  선택한 임시 정책, 협의가 남은 부분을 요약하고 관련 문서를 업데이트하세요.
```

## 팀 정책을 덧붙이는 예시

아래는 작성 형식 예시이며 합의된 정책이 아닙니다. 실제 선택 내용을 채워 요청문 끝에 붙이세요.

```text
이번 구현 범위:
모델 정책과 Jev 비교 평가 또는 채택 여부:
감정 단계와 낮은 신뢰도 처리 기준:
사용할 DB와 재시작 후 보관 정책:
감정 추세 계산 방식과 문맥 부족 처리:
WWE/UFC 모드 차이와 최대 실행시간/라운드 수:
순화 대안 개수와 민감도 정책:
현재 HTTP 결과 응답 유지 여부:
실제 모델 평가를 이번에 실행할지 여부:
```
