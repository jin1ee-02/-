# 채팅 갈등 중재 모델 MVP — 백엔드

기존 Python 파일은 모두 이 `backend/` 폴더로 이동했습니다. 아래 설치·실행·검증 명령은 `backend/` 안에서 실행합니다. 프론트엔드 실행과 전체 폴더 구조는 [루트 문서](../README.md), 임시 API 연결은 [연결 명세](../docs/api-integration.md)를 참고하세요.

백엔드 팀원은 [전달 메시지와 현재 상태 요약](docs/team-handoff.md)부터 읽으세요. [백엔드 구현 인계와 협의 가이드](../docs/backend-implementation-handoff.md)에 기능별 작업과 사용 방법, [Jev 도입 검토](docs/jev-integration-proposal.md)에 모델 역할과 호환·평가 작업이 있습니다. Jev는 아직 적용하지 않은 후보입니다. [Codex와 Claude Code용 구현 요청문](../docs/backend-agent-prompt.md)에 단계별 구현·검증 요청이 있고, `../docs/examples/`에 API 호출용 JSON이 있습니다.

참조 대화의 **대화 전체 갈등 온도 + 전송 전 언어 순화**를 독립적으로 시험하는 FastAPI 서비스입니다. 현재 사용자 개인의 감정 1~5 분석과는 다릅니다. 프론트 UI는 `../frontend/`에 준비되어 있지만 백엔드의 감정 API, 채팅 저장소, 다툼판결·반론은 아직 구현되지 않았습니다.

## 참조 대화 요약

- 전체 구상은 대화 문맥과 갈등 온도를 `Core State`로 공유하고, 실시간 경로(온도계·언어 순화)와 요청 시 실행하는 다툼 판결 경로를 나누는 것입니다.
- 갈등 분석은 욕설이나 부정적 감정만 세지 않습니다. 비난, 문맥상 비꼼, 상대 인격에 대한 일반화, 대화 차단, 사과와 타협이 **상대의 방어·반격에 미칠 가능성**을 봅니다.
- 첫 모델은 자체 학습 데이터 없이 **0~4점 rubric + 한국어 few-shot + 구조화 출력**으로 만듭니다. LLM은 발화별 신호를 판정하고, 온도 갱신과 개입 기준은 코드가 처리합니다.
- 순화는 원래 불만이나 요청을 유지한 채 공격적인 표현을 낮추는 제안입니다. 향후 실제 사용자 평가 데이터로 채점 기준과 가중치를 조정할 수 있습니다.

## 동작 방식

```text
최근 최대 10개 메시지 + 현재 메시지
    → OpenAI 구조화 출력: hostility / sarcasm / blame / repair (각 0~4),
                         escalation_delta (-2~2), confidence (0~4)
    → 코드에서 raw conflict (0~100) 계산
    ├─ 전송된 메시지: EWMA로 온도 갱신
    └─ 전송 전 초안: 현재 온도별 기준과 비교 → 필요할 때만 순화 문장 제안
```

`frustration`과 `disagreement`는 강한 감정이나 이견 자체를 공격으로 오판할 수 있어 첫 버전의 위험도 공식에서 제외했습니다. LLM은 **현재 메시지의 신호만** 평가하고, 이전 온도는 모델에 보내지 않습니다. 이전 온도와 최근 메시지는 API 호출자가 보관하고 다음 요청에 넘깁니다. 초안 분석은 온도를 갱신하지 않으며, 순화 문장은 자동 전송하지 않습니다.

## 설치와 실행

Python 3.11 이상이 필요합니다. `.venv`와 `.env`는 Git에 포함되지 않으므로 새로 클론한 환경에서 따로 준비하세요.

### macOS / Linux

프로젝트 폴더에서 다음 명령으로 가상환경과 실행 의존성을 준비합니다.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
[ -f .env ] || cp .env.example .env
```

`.env`의 `OPENAI_API_KEY`를 실제 키로 바꾼 뒤 실행합니다.

```bash
.venv/bin/python -m uvicorn app.main:app --reload
```

### Windows (PowerShell)

Windows에서는 `uv`로 다음 순서대로 설치할 수 있습니다.

```powershell
uv venv --python 3.12
uv pip install --python .venv\Scripts\python.exe -r requirements.txt
Copy-Item .env.example .env
```

`.env`의 `OPENAI_API_KEY`를 실제 키로 바꾸세요. `OPENAI_MODEL` 기본값은 `gpt-4o-mini`이며 필요하면 바꿀 수 있습니다. 다음 명령으로 실행합니다.

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

문서는 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs), 상태 확인은 `/health`입니다. 키가 없는 경우 상태 확인은 되지만 분석 요청은 503을 반환합니다.

중간 발표를 위한 `/v1/demo/messages`는 같은 메시지 입력 형식을 검증한 뒤 `status: received`와 수신 입력을 반환합니다. 이 경로는 API 키 없이 동작하고 AI 호출·온도 갱신·저장은 하지 않습니다.

Expo 웹 기본 주소인 `http://localhost:8081`과 `http://127.0.0.1:8081`의 요청을 CORS로 허용합니다. 다른 프론트 주소는 `.env`의 `CORS_ORIGINS`에 쉼표로 지정하고 서버를 재시작하세요. 환경변수 파일은 실행 위치와 관계없이 `backend/.env`에서 읽습니다.

## API 사용 예시

전송된 메시지의 온도를 갱신합니다.

```powershell
$body = @{
  relationship = '친구'
  summary = '청소 약속을 두고 의견이 엇갈림'
  recent_messages = @(
    @{ speaker = 'A'; text = '오늘 청소하기로 했잖아.' },
    @{ speaker = 'B'; text = '오늘 너무 바빴어. 내일 하면 안 될까?' }
  )
  speaker = 'A'
  text = '지난번에도 그렇게 말했잖아.'
  previous_temperature = 35
} | ConvertTo-Json -Depth 5

$result = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/v1/messages/analyze' `
  -ContentType 'application/json; charset=utf-8' -Body $body
$result | ConvertTo-Json -Depth 5
```

응답 예시의 `temperature`를 다음 전송 메시지의 `previous_temperature`로 넘기세요. 각 요청의 `recent_messages`에는 **이번에 분석할 메시지를 제외한** 직전 최대 10개 메시지를 넣습니다.

전송 전 초안의 위험도를 검사합니다.

```powershell
$draft = @{
  recent_messages = @(
    @{ speaker = 'A'; text = '오늘 청소하기로 했잖아.' },
    @{ speaker = 'B'; text = '오늘 너무 바빴어. 내일 하면 안 될까?' }
  )
  speaker = 'A'
  text = '그래 너는 맨날 그딴 식이지ㅋㅋ'
  previous_temperature = 55
  suggest_rewrite = $true
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/v1/drafts/analyze' `
  -ContentType 'application/json; charset=utf-8' -Body $draft | ConvertTo-Json -Depth 5
```

`decision`은 `rewrite_suggested`, `below_threshold`, `low_confidence` 중 하나입니다. `suggest_rewrite=false`로 호출하면 필요 여부만 판단하고 추가 LLM 호출은 하지 않습니다. 사용자가 제안을 선택해 실제로 전송했을 때만 `/v1/messages/analyze`를 호출하세요.

## 점수 계산 기준

모든 0~4 점수는 4로 나누어 정규화합니다. `up=max(escalation_delta,0)/2`, `down=max(-escalation_delta,0)/2`입니다.

```text
raw conflict = clamp(100 × (
    0.35 hostility + 0.25 sarcasm + 0.25 blame
  + 0.15 up - 0.25 repair - 0.10 down
), 0, 100)

new temperature = 0.7 × previous temperature + 0.3 × raw conflict
```

초안 위험도는 같은 `raw conflict` 공식을 씁니다. 순화 기준은 현재 온도 `0~39: 70`, `40~59: 60`, `60~79: 45`, `80~100: 30`입니다. `confidence <= 1`이면 순화 제안을 보류합니다. 이 가중치와 기준은 **실험용 휴리스틱**이며 검증된 확률이나 심리 진단 수치가 아닙니다.

## 검증

API와 계산 테스트는 키 없이 실행됩니다.

macOS / Linux:

```bash
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m unittest discover -s tests -v
```

Windows (PowerShell):

```powershell
uv pip install --python .venv\Scripts\python.exe -r requirements-dev.txt
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

키를 설정한 뒤 [평가 사례](examples/eval_cases.json)를 실제 모델에 적용할 수 있습니다. 반복 호출로 점수 흔들림(`spread`)도 확인합니다. 호출마다 API 비용이 발생합니다.

```powershell
.venv\Scripts\python.exe -m scripts.evaluate --repeats 3
```

사례에는 비꼼과 진짜 칭찬, 갈등 중 대화 차단, 친한 사이의 감탄, 사과 등을 넣었습니다. 기준 점수는 초기 앵커이며 실제 사용자 평가 데이터로 조정해야 합니다. 대화 내용은 모델 API로 전송됩니다. 이 서비스는 로컬 대화를 저장하지 않고 OpenAI 요청에는 `store=False`를 지정합니다.

구조화 출력 구현은 [OpenAI 공식 문서](https://developers.openai.com/api/docs/guides/structured-outputs)의 Python `responses.parse(..., text_format=...)` 사용법을 따릅니다.
