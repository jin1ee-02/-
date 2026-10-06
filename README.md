# KU래쪄용 갈등 중재 MVP

2인 대화에 언어 순화, 나의 감정 온도계, JEV 상대 반응 미리보기, 다툼판결과 반론을 연결합니다. Expo SDK 57과 FastAPI를 유지하고 SQLite로 대화와 판결을 저장합니다.

[빠른 시작](docs/MVP-빠른시작.md)에서 설치와 API 키 설정을 확인하세요. [상세 구현과 방법론](docs/MVP-구현-방법론.md)은 아키텍처, 데이터 모델, 파이프라인, 점수 수식, 프롬프트 원문, JEV 기준, 초기 기획 PDF 반영 상태와 평가 설계를 설명합니다.

## 실행

Python 3.11 이상, Node.js 22.13 이상이 필요합니다. Windows에서는 프로젝트 루트에서 실행하세요.

```powershell
.\scripts\setup.ps1 -MvpMode
```

backend/.env에 OPENAI_API_KEY와 TYPESAFE_API_KEY를 입력합니다. 기본 예제의 ANALYSIS_PROVIDER=jev는 JEV 분석과 OpenAI 생성을 사용합니다. OpenAI만 사용하려면 ANALYSIS_PROVIDER=openai로 선택하세요. 키는 프론트에 넣지 않습니다.

두 터미널에서 각각 실행합니다.

```powershell
.\scripts\start-backend.ps1
.\scripts\start-frontend.ps1
```

프론트 http://localhost:8081, API 문서 http://127.0.0.1:8000/docs. 프론트 모드는 EXPO_PUBLIC_API_MODE=ai, EXPO_PUBLIC_FEATURE_MODE=api입니다. 기존 .env가 있으면 setup의 -MvpMode 옵션으로 두 모드를 변경합니다.

## 구현한 흐름

- A가 방을 만들고 B가 1회용 초대 코드로 참가합니다. 방 토큰으로 화자를 확인합니다.
- 메시지와 갈등 온도를 함께 저장하고 2초 간격으로 두 기기를 동기화합니다.
- 초안 분석은 전송하거나 온도를 바꾸지 않습니다. 필요할 때 3개 대안을 생성하고 사용자가 선택합니다.
- 온도계는 본인의 표현된 분노·긴장을 평가하고 문맥 부족과 불확실 상태를 구별합니다.
- JEV는 상대의 예상 감정 8종과 전체 반응 강도를 평가하며 선택한 대안과 비교할 수 있습니다.
- 판결은 실제 역할별 호출과 최대 3라운드 토론을 수행하고 안정되면 종료합니다. 결과·원래 대화·반론을 저장합니다.

## 저장과 범위

DB는 backend/data/mvp.sqlite3, 참가 세션은 기기 AsyncStorage에 저장됩니다. 단일 서버의 workers 1 구성이며 계정 로그인·WebSocket·운영 배포는 별도 범위입니다. PostgreSQL·LangGraph·3D 얼굴의 확장 지점은 상세 문서에 있습니다.

기존 시연은 API_MODE=local 또는 receipt, FEATURE_MODE=mock로 명시적으로 선택할 수 있습니다. API 실패를 mock 성공으로 대체하지 않습니다. backend/docs와 기존 handoff 문서의 제안은 작성 당시 기록이며 최신 구현은 새 MVP 문서를 기준으로 확인하세요.

## 확인 상태

2026년 10월 6일 git pull --ff-only 결과 원격 main과 로컬 HEAD는 8212567로 동일했습니다. 이번 구현은 로컬 변경이며 push하지 않았습니다. 프론트 TypeScript 및 ESLint 검사만 수행했고 저장된 선호에 따라 별도 테스트, 실제 모델 호출, 백엔드 실행과 앱 빌드는 실행하지 않았습니다. 기능 회귀 사례는 backend/tests/test_mvp.py에 준비했습니다.
