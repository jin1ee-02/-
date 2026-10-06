# KU래쪄용 MVP 백엔드

FastAPI의 분석 API, TypeSafe JEV 평가, OpenAI 생성, SQLite 대화방·판결 저장을 구현합니다. 최신 전체 계약과 프롬프트는 [MVP 구현과 방법론](../docs/MVP-구현-방법론.md), 실행은 [빠른 시작](../docs/MVP-빠른시작.md)을 읽으세요.

분석 provider는 ANALYSIS_PROVIDER=jev 또는 openai로 선택합니다. JEV는 TypeSafe 직접 API를 사용하며 TYPESAFE_API_KEY가 필요합니다. 대안 3개 생성과 역할별 판결은 OPENAI_API_KEY를 사용합니다. 모델 키는 backend/.env에서만 읽습니다.

서버는 uvicorn app.main:app --port 8000 --workers 1로 실행합니다. API 문서는 /docs, 상태는 /health, 설정 완료 여부는 /v1/config입니다. DB 기본 위치는 backend/data/mvp.sqlite3이고 실행 위치와 관계없이 backend 기준으로 해석합니다.

app/main.py는 계약·권한·라우트, app/analysis.py와 app/scoring.py는 결과 변환, app/jev.py와 app/provider.py는 모델 연결, app/verdict.py는 토론·반론, app/store.py는 저장을 담당합니다. 실제 평가 스크립트는 설정된 분석 provider를 사용하며 반복 측정에서 캐시를 끕니다.

기존 docs의 JEV 문서는 도입 전 검토 기록입니다. 감정·순화·상대 반응·판결·반론의 실제 경로는 현재 구현했습니다. 테스트와 모델 호출은 이번 변경에서 실행하지 않았습니다. 기존 테스트 계약을 갱신하고 tests/test_mvp.py에 권한·중복·저장·불확실 상태·조기 종료의 회귀 사례를 준비했습니다.
