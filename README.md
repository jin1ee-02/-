# KU래쪄용 갈등 중재 MVP

2인 대화에 언어 순화, 나의 감정 온도계, JEV 상대 반응 미리보기, 다툼판결과 반론을 연결합니다. Expo SDK 57과 FastAPI를 유지하고 SQLite로 대화와 판결을 저장합니다.

**AI를 어떻게 활용했는지는 [AI 활용 설명](docs/AI-활용-설명.md), 기획서의 논문·데이터를 어떻게 반영했는지는 [논문·소스코드 적용 검토](docs/논문-소스코드-적용-검토.md)에 정리했습니다.** [빠른 시작](docs/MVP-빠른시작.md)에서 설치와 API 키 설정을 확인하세요. [상세 구현과 방법론](docs/MVP-구현-방법론.md)은 아키텍처, 데이터 모델, 파이프라인, 점수 수식, 프롬프트 원문, JEV 기준, 초기 기획 PDF 반영 상태와 평가 설계를 설명합니다.

## 실행

Python 3.11 이상, Node.js 22.13 이상이 필요합니다. Windows에서는 프로젝트 루트에서 실행하세요.

```powershell
.\scripts\setup.ps1 -MvpMode
```

API 키가 없어도 바로 실행됩니다. 키가 없으면 백엔드는 오프라인 규칙(offline/rules-v1)으로 동작하고 화면에 "오프라인 규칙 기반 예시 · LLM 연결 전"이라고 표시합니다. 이 결과는 AI 판단이 아닙니다. backend/.env에 OPENAI_API_KEY를 넣고 백엔드를 재시작하면 실제 LLM으로 전환됩니다(LLM_PROVIDER=auto). TypeSafe JEV 분류 모델을 쓰려면 ANALYSIS_PROVIDER=jev와 TYPESAFE_API_KEY를 설정하세요. 키는 프론트에 넣지 않습니다.

두 터미널에서 각각 실행합니다.

```powershell
.\scripts\start-backend.ps1
.\scripts\start-frontend.ps1
```

프론트 http://localhost:8081, API 문서 http://127.0.0.1:8000/docs. 프론트 모드는 EXPO_PUBLIC_API_MODE=ai, EXPO_PUBLIC_FEATURE_MODE=api입니다. 기존 .env가 있으면 setup의 -MvpMode 옵션으로 두 모드를 변경합니다.

## 구현한 흐름

- A가 방을 만들고 B가 1회용 초대 코드로 참가합니다. 방 토큰으로 화자를 확인합니다.
- 메시지와 갈등 온도를 함께 저장하고 2초 간격으로 두 기기를 동기화합니다.
- Light 경로: 초안·메시지마다 LLM 1회 호출로 갈등 신호, 표현된 감정, 순화 대안 3개를 함께 받습니다. 초안 분석은 전송하거나 온도를 바꾸지 않습니다.
- 온도계는 저장된 Light 결과로 나와 상대의 표현된 분노·긴장을 추가 호출 없이 표시하고 문맥 부족과 불확실 상태를 구별합니다.
- JEV는 상대의 예상 감정 8종과 전체 반응 강도를 평가하며 선택한 대안과 비교할 수 있습니다.
- Heavy 경로: 판결 요청 시 대화를 Core State(쟁점·입장·사실관계·감정 궤적)로 정리한 뒤 검사·변호사·팩트체크가 최대 3라운드 토론하고 관점이 다른 심사위원 3명이 채점합니다. 각 에이전트는 전략을 먼저 세우고 발언하며, 심사위원단의 판단이 안정되면 조기 종료합니다. 결과·토론 과정·원래 대화·반론을 저장합니다.

## 저장과 범위

DB는 backend/data/mvp.sqlite3, 참가 세션은 기기 AsyncStorage에 저장됩니다. 단일 서버의 workers 1 구성이며 계정 로그인·WebSocket·운영 배포는 별도 범위입니다. PostgreSQL·LangGraph·3D 얼굴의 확장 지점은 상세 문서에 있습니다.

기존 시연은 API_MODE=local 또는 receipt, FEATURE_MODE=mock로 명시적으로 선택할 수 있습니다. API 실패를 mock 성공으로 대체하지 않습니다. backend/docs와 기존 handoff 문서의 제안은 작성 당시 기록이며 최신 구현은 새 MVP 문서를 기준으로 확인하세요.

## 확인 상태

2026년 10월 7일 기준 백엔드 테스트 33개, 프론트 TypeScript·ESLint·단위 테스트 5개가 통과합니다. 브라우저에서 두 참가자로 방 생성부터 순화, 온도계, 판결, 반론, 서버 재시작 후 복원까지 구동해 확인했습니다. 이 확인은 모두 오프라인 규칙 모드에서 했으며 **실제 LLM은 아직 호출하지 않았습니다.** 모델 품질·지연·비용은 키 연결 후 `python -m scripts.evaluate`와 `python -m scripts.evaluate_verdict --swap`으로 측정하세요.

```bash
cd backend
python -m unittest discover -s tests
```
