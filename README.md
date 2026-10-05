# KU래쪄용 — 졸업 프로젝트

1:1 채팅에 언어 순화, 감정 온도계, 다툼판결을 연결하는 프로젝트입니다. 중간 발표용으로 세 기능의 프론트 UI와 예시 결과를 준비했습니다. 백엔드 입력 전달·기존 AI 분석 연결도 별도 모드로 유지합니다.

## 폴더 구조

```text
GraduateProject/
├── backend/              # 기존 FastAPI·OpenAI 코드, Python 가상환경, 테스트
│   ├── app/
│   ├── tests/
│   ├── scripts/
│   ├── examples/
│   ├── docs/             # 팀 전달 요약과 Jev 도입 검토
│   ├── .env.example
│   └── requirements*.txt
├── frontend/             # React Native + TypeScript + Expo
│   ├── src/app/          # Expo Router 경로
│   ├── src/screens/      # 채팅 목록·채팅방·설정·다툼판결
│   ├── src/components/   # 메시지·공통 UI
│   ├── src/api/          # 서버 호출 (API 합의 후 변경할 위치)
│   ├── src/state/        # 실행 중 유지되는 대화 상태
│   ├── src/types/        # 현재 백엔드 요청·응답 타입
│   └── src/mocks/        # 세 기능의 프론트 시연 데이터
└── docs/
    ├── frontend-handoff.md # 전달받은 핸드오프 원문 (미정 사항 포함)
    ├── api-integration.md  # 현재 연결 방식과 후속 합의 항목
    ├── frontend-features-api.md # 세 기능 화면 흐름·API 제안·연결 작업
    ├── backend-implementation-handoff.md # 백엔드 팀원용 구현·협의·사용 가이드
    ├── backend-agent-prompt.md # Codex/Claude Code에 복사할 구현 요청문
    └── examples/          # 기능별 API 호출용 JSON 5개
```

백엔드 팀원은 [전달 메시지와 현재 상태 요약](backend/docs/team-handoff.md), [구현 인계와 협의 가이드](docs/backend-implementation-handoff.md)를 먼저 읽고, 모델 후보는 [Jev 도입 검토](backend/docs/jev-integration-proposal.md)를 참고하세요. Jev는 아직 적용되지 않았습니다. 코딩 에이전트에는 [복사용 구현 요청문](docs/backend-agent-prompt.md)을 전달하세요. 현재 구현과 미구현 API, 협의할 정책, 단계별 작업, 설치·시연·검증 방법이 정리되어 있습니다.

2026년 10월 5일 추가한 [Jev 상대 반응 미리보기 설계](backend/docs/jev-recipient-preview-proposal.md)는 입력 중인 초안으로 수신자의 예상 감정 8종과 강도를 표시하고, 순화 대안 비교에 연결하는 제안입니다. 기존 나의 감정 온도계와 별도 기능이며 아직 API·UI·3D 표정은 구현되지 않았습니다.

## 실행 (macOS / Linux)

서로 다른 터미널에서 각각 실행합니다. Python 3.11 이상과 Expo SDK 57이 지원하는 Node.js 22.13 이상이 필요합니다.

### 터미널 1 — 백엔드

```bash
cd ~/GraduateProject/backend
```

새로 클론한 환경에서는 먼저 설치합니다. 현재 작업 환경에는 `backend/.venv`가 준비되어 있습니다.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
[ -f .env ] || cp .env.example .env
```

서버 실행:

```bash
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

API 문서: <http://127.0.0.1:8000/docs>

### 터미널 2 — 프론트엔드

```bash
cd ~/GraduateProject/frontend
npm ci
[ -f .env ] || cp .env.example .env
npm run web
```

브라우저: <http://localhost:8081>

`npm start`로 Expo 개발 서버를 시작한 뒤 모바일 기기에서도 확인할 수 있습니다. 실제 휴대폰에서는 `127.0.0.1`이 휴대폰 자신을 가리킵니다. 같은 네트워크의 Mac 주소를 `frontend/.env`에 `EXPO_PUBLIC_API_URL=http://<Mac의 LAN IP>:8000`으로 지정하고, 백엔드는 `--host 0.0.0.0`을 붙여 실행하세요. Android 에뮬레이터에서는 호스트 연결 주소로 `http://10.0.2.2:8000`을 사용합니다.

## 중간 발표용 모드

기본값은 `frontend/.env`의 `EXPO_PUBLIC_API_MODE=local`, `EXPO_PUBLIC_FEATURE_MODE=mock`입니다. 백엔드 없이 프론트만 실행해도 채팅과 세 기능을 체험할 수 있습니다. 모든 기능 결과에 **시연용 예시 · AI 분석 없음**을 표시합니다.

웹의 휴대폰 프레임 바깥 **관리자 · 시연 컨트롤**에서 **예시 대화로 바꾸기**를 누르면 청소 갈등 대화와 순화 대상 초안이 준비됩니다. 보내기 → 대안/원문 선택, 감정 온도계 → 쿨다운, 판결 → 결과/토론 로그/반론 순서로 확인하세요. 예시 불러오기는 현재 대화를 교체합니다. A/B 입력 화자와 서버 연결 확인도 바깥 패널에서 조작합니다.

웹 미리보기는 iPhone 18 Pro Max용 440×956 레이아웃을 창 크기에 맞춰 축소합니다. 관리자 패널의 **100%**로 원래 크기를 볼 수 있고, 좁은 창에서는 패널이 프레임 아래에 표시됩니다. 실제 모바일 앱에는 웹 프레임·관리자 패널이 없습니다.

백엔드 입력 전달 시연은 `EXPO_PUBLIC_API_MODE=receipt`로 바꿉니다.

- 실제 FastAPI `/v1/demo/messages`에 메시지, 화자, 최근 최대 10개 대화, 관계를 전달합니다.
- 백엔드는 입력을 검증하고 수신한 내용을 반환합니다. OpenAI 호출·DB 저장은 하지 않습니다.
- 응답을 받은 메시지만 화면에 추가합니다. 실패하면 입력을 유지하고 오류를 표시합니다.
- 사용자 A/B 전환은 같은 앱 안의 시뮬레이션입니다. 다른 기기와 실시간 채팅하는 기능은 아직 없습니다.

실제 AI 분석을 연결하려면 `backend/.env`의 `OPENAI_API_KEY`를 설정하고, `frontend/.env`에서 `EXPO_PUBLIC_API_MODE=ai`로 바꾼 뒤 앱을 완전히 새로고침하세요. 이 모드는 기존 `/v1/messages/analyze`를 호출하며 API 비용이 발생합니다. 키는 백엔드에만 둡니다.

## 현재 구현 범위와 API 합의

핸드오프 문서의 `/analyze`, `/verdict`, `emotion`, `toxic`, `alternatives` 형식은 제안이며 현재 백엔드와 다릅니다. 이번 골격은 실제 백엔드 형식을 별도 API 레이어에 격리했습니다. 현재의 0~100 갈등 온도를 화자별 감정 1~5로 임의 변환하지 않습니다.

프론트엔드에는 순화 ON/OFF·대안 선택, 나(A)의 5단계 온도계 ON/OFF·쿨다운, 별도 판결 화면·항목별 점수·공개 토론 로그·반론 UI가 있습니다. 실제 나의 감정 분석 및 다툼판결/반론 API, 인증, DB, 실시간 메시징은 아직 없습니다. 관계별 실제 민감도 계산과 WWE/UFC 정책도 합의가 필요합니다. 기본 시연 결과는 고정 예시/간단한 표현 감지이며 AI 추론이 아닙니다.

개발 중 웹/Expo 개발 서버와 Python API 서버는 각각 실행합니다. 프론트 앱이 API 서버로 HTTP/JSON 요청을 보냅니다. 모바일 앱 배포 후에는 앱이 서버에 직접 요청하며, Expo 개발 서버는 실행할 필요가 없습니다. 웹 배포는 정적 파일 호스팅이나 API 서버와 같은 도메인 구성도 가능합니다.

## 검증

```bash
cd backend
.venv/bin/python -m unittest discover -s tests -v
```

```bash
cd frontend
npm run typecheck
npm run lint
npm run build:web
```

자세한 연결 명세는 [API 연결 문서](docs/api-integration.md)와 [세 기능 API 문서](docs/frontend-features-api.md), 기존 점수·순화 구현 설명은 [백엔드 문서](backend/README.md), 프론트 작업 안내는 [프론트엔드 문서](frontend/README.md)에 있습니다.

공식 참고: [Expo 환경변수](https://docs.expo.dev/guides/environment-variables/), [Expo 웹 개발](https://docs.expo.dev/workflow/web/), [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/).
