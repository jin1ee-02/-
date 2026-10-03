# KU래쪄용 — 프론트엔드 핸드오프 문서

> 이 문서는 Claude Code에 넘기기 위한 작업 명세다. 출처는 팀 발표자료(W3 리마인드와 계획)이며,
> 자료에 없는 내용은 모두 `[제안]` 또는 `[미정]`으로 표시했다. `[미정]` 항목은 팀 합의 전까지 임의로 확정하지 말 것.

---

## 0. 한 줄 요약

1:1 텍스트 채팅 앱에 AI 갈등 완화 기능 3개(언어 순화 / 감정 온도계 / 다툼 판결)를 붙인다.
프론트엔드는 채팅 UI와 세 기능의 결과 표시 UI를 담당한다. AI 응답은 백엔드(FastAPI)가 내려준다.

## 1. 팀과 역할

| 파트 | 담당 |
|---|---|
| 프론트엔드 | 이동현, 지상준 |
| AI 모델 개발 | 이재진, 김정훈, 김세영 |
| 백엔드 | 자료에 명시 없음 `[미정]` |

## 2. 기술 스택

| 영역 | 자료 기재 | 상태 |
|---|---|---|
| 프론트엔드 | React Native / Kotlin | `[미정]` 슬라이드마다 다름 (한 장은 RN만, 한 장은 RN/Kotlin 병기) |
| 백엔드 | FastAPI + PostgreSQL | 확정 |
| AI | GPT API + LangGraph | 확정 (로컬 모델 병행 여부는 논의 중) |

`[제안]` React Native + TypeScript(Expo)로 진행. 근거: 기술 구현 계획 슬라이드에 RN만 기재되어 있고, 프론트 2인이 Android/iOS를 따로 짤 여력이 없음. 팀 확인 필요.

## 3. 시스템 구조 (프론트엔드 관점)

```
[채팅 입력]
   │  최근 N턴 메시지 + 관계 정보 + 민감도 설정
   ▼
[Core State]  화자별 입장 / 감정 궤적 / 쟁점 / 사실관계  (3기능이 공유)
   │
   ├── Light 경로 (매 메시지, 자동, LLM 1회)
   │      출력: emotion(1~5), toxic(true/false), alternatives[3개]
   │      → 감정 온도계, 언어 순화
   │
   └── Heavy 경로 (버튼 클릭 시, 온디맨드)
          멀티에이전트 토론: 검사 / 변호사 / 팩트체크 / 판사
          Adaptive stopping으로 라운드 조기 종료
          → 판결 카드
```

프론트가 알아야 할 핵심: Light는 지연이 짧아야 하고(전송 직전에 동작), Heavy는 수 초~수십 초 걸릴 수 있으므로 로딩 UI가 필요하다.

## 4. 화면 목록

| 화면 | 내용 | 비고 |
|---|---|---|
| 채팅 목록 | 대화방 리스트 | |
| 채팅방 | 메시지 리스트, 입력창, 기능 토글, 판결 요청 버튼 | 핵심 화면 |
| 채팅방 설정 | 관계 유형, 언어 순화 ON/OFF, 온도계 ON/OFF, 민감도 | 대화방 단위 |
| 판결 결과 상세 | 판결 카드 + 토론 과정 로그 + 반론 | 07 대응전략 반영 |
| 로그인/회원가입 | | `[미정]` 자료에 없음 |

## 5. 기능별 UI 명세

### 5-1. 언어 순화 모드
- 대화방 헤더에 ON/OFF 토글.
- 동작: 사용자가 전송 버튼을 누름 → Light 분석 호출 → `toxic == true`이면 전송을 보류하고 패널 표시.
- 패널 구성 (슬라이드 목업 기준):
  - 제목: "언어 순화 — 공격적 표현 감지"
  - 감지된 표현 (원문)
  - 대안 표현 목록 (선택 시 해당 문장으로 전송)
  - "그대로 보내기" (원문 전송)
- 강제 변환 금지. 항상 원문 전송 경로를 남긴다.
- 민감도는 사용자가 직접 조절 (설정 화면 슬라이더).
- `[미정]` 대안 개수: 본문은 3개, 목업은 2개 + 그대로 보내기.
- `[미정]` 분석 지연/실패 시 처리 (타임아웃 후 원문 전송 vs 재시도).

참고: 같은 개념의 선행 시스템인 LLMediator(Westermann et al., ICAIL 2023 Workshop on AI for Access to Justice)는 "SEND ORIGINAL / SEND REFORMULATED" 두 버튼으로 사용자가 최종 결정하는 구조다.

### 5-2. 감정 온도계
- 대화방 헤더에 "온도계 ON" 토글.
- 5단계 게이지: 평온 / 주의 / 경고 / 위험 / 폭발.
- 표시 항목 (목업 기준):
  - 분석 기준 표시 (예: "최근 대화 12턴")
  - 나의 감정 / 상대 감정 각각 단계 + 추세(상승 중 ↑ 등)
  - AI 추천 문구
- 단계가 '경고' 이상이면 쿨다운 알림 표시. 액션 버튼 3개:
  - "3분 뒤 답장하기"
  - "부드럽게 다시 말하기" (→ 언어 순화 대안 흐름으로 연결)
  - "그대로 보내기"
- 관계 유형(친구/연인/직장 동료 등)에 따라 민감도가 자동 조절됨 (계산은 백엔드, 프론트는 관계 값만 전달).
- `[미정]` 값 형식 불일치: 시스템 구조는 `emotion: 1~5` 정수, 목업은 "위험 78%" 같은 퍼센트. 정수 1~5 = 5단계로 매핑할지, 0~100 점수를 받을지 AI 파트와 합의 필요.
- `[미정]` Light 출력이 단일 emotion 값인데, UI는 나/상대 두 값을 표시함. 화자별 값을 받는 구조로 맞춰야 함.
- `[미정]` 상대방 감정을 내 화면에 보여주는 것에 대한 프라이버시 처리.

### 5-3. 다툼 판결 (WWE / UFC 모드)
- 대화방에 "판결 요청" 버튼. 한쪽이 누르면 직전 N턴을 수집해 Heavy 경로 호출.
- 로딩 UI 필수 (멀티에이전트 토론 라운드 수가 가변).
- 판결 카드 구성 (목업 기준):
  - 헤더: "다툼 판결 — WWE / UFC 모드"
  - 양측 카드: 나(원고) vs 상대(피고)
  - 항목별 점수 바: 논리력 / 감정조절 / 근거 (0~100)
  - 판정 결과 텍스트 (승패보다 양쪽 강·약점 위주)
  - 유머 멘트
- 판결 결과 상세 화면:
  - 토론 과정 로그 열람 (검사/변호사/팩트체크/판사 발언)
  - 판결 반론 기회 (반론 입력 → 재판결 요청)
- 부가 설명: LLM 자동 생성 또는 사용자가 직접 입력 (판결 요청 시 입력란 제공).
- `[미정]` 판결 결과를 상대방에게도 같은 채팅방에 노출하는지.
- `[미정]` WWE 모드와 UFC 모드의 연출 차이.
- `[미정]` 판결 시점 감정 온도 연동 표시 여부.

## 6. API 계약 초안 `[제안]`

AI/백엔드 파트와 합의 전 초안. 프론트는 이 타입으로 목(mock) 서버를 먼저 만들어 독립 개발한다.

```ts
type Relation = 'friend' | 'partner' | 'coworker' | 'roommate' | 'other';
type EmotionLevel = 1 | 2 | 3 | 4 | 5; // 평온, 주의, 경고, 위험, 폭발

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: string; // ISO
}

interface RoomSettings {
  relation: Relation;
  purifyEnabled: boolean;
  thermometerEnabled: boolean;
  sensitivity: number; // 0~1 [미정]
}

// Light: POST /analyze  (전송 직전 호출)
interface AnalyzeRequest {
  roomId: string;
  draft: string;        // 보내려는 메시지
  recentTurns: number;  // N
}
interface AnalyzeResponse {
  emotion: { me: EmotionLevel; partner: EmotionLevel; trend?: 'up' | 'flat' | 'down' };
  toxic: boolean;
  alternatives: string[]; // 최대 3
  recommendation?: string;
}

// Heavy: POST /verdict
interface VerdictRequest {
  roomId: string;
  requesterId: string;
  context?: string; // 사용자 입력 부가 설명
}
interface SideScore { logic: number; emotionControl: number; evidence: number; }
interface VerdictResponse {
  verdictId: string;
  mode: 'WWE' | 'UFC';
  plaintiff: SideScore;   // 요청자
  defendant: SideScore;
  summary: string;
  humor: string;
  debateLog: { role: 'prosecutor' | 'defense' | 'factcheck' | 'judge'; round: number; text: string }[];
}

// 반론: POST /verdict/{verdictId}/appeal  { text: string }
```

## 7. 일정

| 구간 | 프론트엔드 | AI 모델 |
|---|---|---|
| ~ 중간 발표 | 채팅 입력 구현 + 전체 UI 설계 | Core State 정의, 턴별 갱신 파이프라인, 동작 검증 |
| ~ 기말 발표 | 결과 출력 구현 (감정 온도계, 언어 순화, 판결 카드) | Light(단일 LLM 1회), Heavy(멀티에이전트 토론) |

## 8. Claude Code 작업 순서

중간 발표까지:
1. 프로젝트 생성 (RN + TypeScript, `[미정]` 해소 후). 폴더 구조: `screens/`, `components/`, `api/`, `mocks/`, `types/`.
2. `types/`에 6절 타입 정의.
3. 채팅 목록 / 채팅방 / 채팅방 설정 화면 골격과 네비게이션.
4. 채팅방: 메시지 리스트, 입력창, 전송. 우선 로컬 상태 + 두 사용자 시뮬레이션(사용자 전환 토글)으로 동작.
5. 채팅방 헤더에 언어 순화 / 온도계 토글, 판결 요청 버튼 배치 (동작은 비워둠).
6. 세 기능의 UI 컴포넌트를 목 데이터로 정적 구현 (Figma/목업 대체용 시연 가능 수준).

기말 발표까지:
7. `api/` 레이어 작성. 환경변수로 mock ↔ 실서버 전환.
8. 언어 순화: 전송 인터셉트 → `/analyze` → 패널 → 선택 전송.
9. 감정 온도계: 메시지마다 갱신, '경고' 이상 시 쿨다운 알림 + 3개 액션.
10. 판결: 요청 → 로딩 → 판결 카드 → 상세(토론 로그, 반론).
11. 실시간 메시징 연동 `[미정]`.

## 9. 팀에 확인할 것 (미정 목록)

1. 프론트 스택: React Native 단독인지, Kotlin 병행인지
2. 실시간 메시지 전송 방식 (WebSocket 등) 및 백엔드 담당자
3. 인증/계정 유무
4. 감정 값 형식 (1~5 정수 vs 0~100), 화자별 값 제공 여부
5. 언어 순화 대안 개수 (2 vs 3), 분석 실패 시 처리
6. 판결 결과의 상대방 노출 여부, WWE/UFC 모드 차이
7. 민감도 값 범위와 설정 위치 (전역 vs 방별)
8. API 스펙 최종본 (6절 초안 기준으로 합의)

## 10. 자료 내 확인된 오류

- 언어 순화 슬라이드의 "실시간 처리" 카드 설명이 "맥락 기반 톤 분석" 카드 문구와 거의 동일함 (복붙 오류로 보임).
- 목차는 04 "제안하는 해결책 및 차별점"인데 본문 제목은 "서비스 컨텐츠". 07·09 번호도 중복 사용.
- LLMediator 출처 표기가 "[2024][ICAIL]"로 되어 있으나, 실제로는 ICAIL 2023 Workshop on AI for Access to Justice 발표 (2023-07, arXiv 2307.16732).