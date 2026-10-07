# KU래쪄용 MVP 빠른 시작

AI 활용 방식은 [AI 활용 설명](AI-활용-설명.md), 저장·동기화·API 계약은 [MVP 구현과 방법론](MVP-구현-방법론.md)을 읽으세요.

## Windows 준비

Python 3.11 이상, Node.js 22.13 이상, npm이 필요합니다. 프로젝트 루트에서 실행하세요.

```powershell
.\scripts\setup.ps1 -MvpMode
```

기존 `.env`는 보존합니다. `-MvpMode`는 프론트 실행 모드 2개만 실제 API로 변경합니다. 테스트는 자동 실행하지 않습니다.

`backend/.env`:

```text
OPENAI_API_KEY=실제_OpenAI_키
OPENAI_MODEL=gpt-4o-mini
LLM_PROVIDER=auto
ANALYSIS_PROVIDER=auto
```

키를 넣지 않아도 실행됩니다. `auto`는 OpenAI 키가 있으면 실제 LLM, 없으면 오프라인 규칙을 고르고 화면에 출처를 표시합니다. 오프라인 규칙의 결과는 AI 판단이 아닙니다. TypeSafe JEV로 분석하려면 `ANALYSIS_PROVIDER=jev`와 `TYPESAFE_API_KEY`를 추가하세요. 키는 백엔드에만 넣으세요. 현재 선택된 provider는 `/v1/config`의 `llmProvider`, `offline`에서 확인합니다.

`frontend/.env`:

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_API_MODE=ai
EXPO_PUBLIC_FEATURE_MODE=api
```

두 터미널에서 각각 실행합니다.

```powershell
.\scripts\start-backend.ps1
```

```powershell
.\scripts\start-frontend.ps1
```

브라우저 `http://localhost:8081`, API 문서 `http://127.0.0.1:8000/docs`. API 키와 실행 모드를 바꾼 후 서버를 재시작하세요. `/v1/config`는 키 설정 여부를 반환하며 키 값은 반환하지 않습니다.

## macOS와 Linux 준비

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
[ -f .env ] || cp .env.example .env
# backend/.env에 두 API 키 입력
.venv/bin/python -m uvicorn app.main:app --port 8000 --workers 1
```

다른 터미널:

```bash
cd frontend
npm ci
[ -f .env ] || cp .env.example .env
# 기존 .env도 API_MODE=ai, FEATURE_MODE=api인지 확인
npm run web
```

## 두 참가자 사용

1. A가 대화방을 만들고 초대 코드를 확인합니다.
2. B가 다른 브라우저 저장소 또는 기기에서 코드로 참가합니다.
3. 양쪽이 메시지를 한 개 이상 전송합니다.
4. 초안을 입력해 순화 필요와 상대 예상 반응을 확인합니다.
5. 대안 열기 또는 보내기에서 3개 대안·원문·직접 수정을 선택합니다.
6. 감정 경고 또는 판결 기능을 열고 공개 의견과 반론을 확인합니다.
7. 저장된 판결에서 원래 대화를 기준으로 다시 결과를 읽을 수 있습니다.

같은 브라우저의 두 탭은 참가 저장소를 공유합니다. 별도 브라우저 또는 시크릿 창을 사용하세요. 휴대폰에서는 API_URL에 PC LAN 주소를 쓰고 `start-backend.ps1 -BindAddress 0.0.0.0`으로 실행합니다. 웹 LAN origin은 CORS_ORIGINS에도 추가합니다.

## 저장과 동기화

서버 DB는 `backend/data/mvp.sqlite3`입니다. 별도 PostgreSQL 설치 없이 파일에 대화·토큰 해시·판결을 저장합니다. 앱의 참가 토큰은 AsyncStorage에 유지합니다. DB와 기기 저장소가 유지돼야 재시작 후 복원됩니다. 최근 200개 메시지, 최근 20개 판결을 표시하며 온라인 동기화 간격은 2초입니다. 서버는 `--workers 1`로 실행하세요.

## 오류와 검증 상태

- 503: 분석 provider와 해당 키 또는 생성 키 확인.
- 429: 잠시 후 재시도. 이미 진행 중인 판결·전송을 기다리세요.
- 409: 대화가 바뀌었으면 최신 대화를 확인하고 새 판결 요청.
- 401/403: 참가 토큰과 선택한 방 확인.
- 연결 오류: 서버 실행, API_URL, LAN, CORS 확인.

백엔드 테스트 33개와 프론트 타입·린트·단위 테스트가 통과하고, 웹에서 두 참가자 흐름을 오프라인 규칙 모드로 구동해 확인했습니다. 실제 LLM 호출과 모바일 기기 실행은 아직 확인하지 않았습니다.
