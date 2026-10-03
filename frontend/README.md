# KU래쪄용 프론트엔드

React Native + TypeScript + Expo SDK 57의 중간 발표용 UI입니다. Expo Router로 채팅 목록(`/`), 채팅방(`/chat`), 설정(`/settings`), 다툼판결(`/verdict`)을 이동합니다.

## 개발 시작

```bash
npm ci
[ -f .env ] || cp .env.example .env
npm run web
```

브라우저에서 <http://localhost:8081/chat>을 엽니다. 기본 `local + mock` 모드는 백엔드 없이 동작합니다. 휴대폰 프레임 바깥 **관리자 · 시연 컨트롤**의 **예시 대화로 바꾸기**로 초안과 대화를 준비하고, 앱 안의 보내기/온도계/판결을 체험하세요. 예시 버튼은 기존 대화를 교체합니다.

## 웹 미리보기와 관리자 도구

웹 앱 화면은 iPhone 18 Pro Max용 440×956 레이아웃으로 표시합니다. 브라우저 크기에 맞춰 전체 프레임을 축소하며 관리자 패널의 **100%**로 원래 크기를 볼 수 있습니다. 넓은 창에서는 관리자 패널이 오른쪽에, 좁은 창에서는 프레임 아래에 놓입니다.

예시 불러오기, 순화 초안 넣기, 대화 초기화, A/B 입력 화자 전환, 서버 연결 확인은 관리자 패널에서 합니다. 사용자 화면에는 작은 기능 토글·판결 버튼·채팅 입력을 둡니다. 순화/쿨다운 패널도 휴대폰 프레임 안에 표시합니다. 관리자는 웹 시연용 UI이며 관리자 인증이나 권한 API가 구현된 것은 아닙니다.

`src/components/preview/device.ts`의 논리 크기와 상하 여백은 웹 레이아웃 미리보기 기준입니다. [Apple 사양](https://support.apple.com/en-us/148591)의 1320×2868 물리 해상도에 3배 배율을 가정해 440×956으로 설정했습니다. 상태 표시줄·Dynamic Island·상단 62/하단 34 여백은 미리보기 연출이며 실기기 측정값이 아닙니다. 실제 iOS/Android에서는 웹 프레임과 관리자 패널을 렌더링하지 않고 기기의 Safe Area와 키보드에 맞춥니다.

백엔드를 연결하려면 별도 터미널에서 실행합니다.

```bash
cd ../backend
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

`npm start`는 모바일용, `npm run web`은 브라우저용 Expo 개발 서버이며 포트는 8081입니다.

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://127.0.0.1:8000` | FastAPI 주소 |
| `EXPO_PUBLIC_API_MODE` | `local` | `local`: 로컬 채팅, `receipt`: 입력 수신 확인, `ai`: 메시지 AI 분석 |
| `EXPO_PUBLIC_FEATURE_MODE` | `mock` | `mock`: 세 기능 예시, `api`: 실제 기능 API 연결 |

`receipt`는 기존 `/v1/demo/messages`, `ai`는 `/v1/messages/analyze`를 호출합니다. 기능 모드 `api`는 순화의 `/v1/drafts/analyze`만 기존 서버에 있습니다. 나의 감정·판결·반론 API는 아직 없어 구현 전에는 실패합니다. 예시로 자동 대체하지 않습니다. 실제 AI 사용에는 백엔드의 `OPENAI_API_KEY`가 필요하며 호출 비용이 발생합니다.

`EXPO_PUBLIC_*` 값은 앱에 공개됩니다. 키는 백엔드에만 두고, 환경변수 변경 후 앱을 완전히 새로고침하세요. 실제 휴대폰은 같은 네트워크의 Mac IP를 사용합니다(예: `http://192.168.0.10:8000`). 이 경우 백엔드를 `--host 0.0.0.0`으로 실행합니다. Android 에뮬레이터는 `http://10.0.2.2:8000`을 사용합니다.

## 구현한 흐름

- **언어 순화 ON/OFF**: 나(A)의 초안 입력 후 확인, 필요 시 대안 최대 3개/원문/직접 수정 선택. 실패 시 입력 유지.
- **감정 온도계 ON/OFF**: 전송된 대화 기준 나(A)의 상태 1~5, 추세, 3분 쿨다운 제안. 타이머 종료 시 자동 전송 없음.
- **다툼판결**: 별도 화면에서 모드와 대화 확인 → 요청 → 진행 → 양쪽 점수/요약/공개 토론 로그 → 반론.
- **설정**: 관계·순화 민감도·기능 토글·서버 연결 확인.

예시 결과/진행 단계는 프론트 시연이며 실제 AI 분석이 아닙니다. 예시 판결은 고정 점수와 청소 상황 문구를 사용합니다. 채팅은 A/B 전환으로 시뮬레이션하며 다른 기기로 메시지를 전달하지 않습니다. 대화·설정·판결은 화면 이동 시 유지되고 새로고침 시 초기화됩니다.

## 작업 위치

- `src/screens/`, `src/components/features/`: 화면과 기능 UI
- `src/api/client.ts`, `src/types/api.ts`: 기존 API 연결
- `src/api/features.ts`, `src/types/features.ts`: 세 기능 API 어댑터와 임시 형식
- `src/hooks/useDraftReview.ts`: 초안 확인 디바운스·취소·캐시
- `src/state/ChatContext.tsx`: 대화·설정·나의 감정·판결 보관
- `src/components/preview/`: 웹 휴대폰 프레임·관리자 패널·팝업 표시 위치
- `src/mocks/features.ts`: 시연 대화/예시 결과

자세한 API 요청·응답 및 미구현/합의 항목은 [세 기능 API 문서](../docs/frontend-features-api.md), 현재 백엔드 연결은 [API 연결 문서](../docs/api-integration.md)에 기록했습니다.

백엔드 팀원에게는 [구현 인계와 협의 가이드](../docs/backend-implementation-handoff.md)와 [코딩 에이전트용 구현 요청문](../docs/backend-agent-prompt.md)을 전달하세요. 기능별 연결 순서와 실행·검증 예시도 포함되어 있습니다.

## 확인 명령

```bash
npm run typecheck
npm run lint
npm test
npm run build:web
```
