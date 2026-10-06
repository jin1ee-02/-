# KU래쪄용 MVP 프론트엔드

Expo SDK 57, React Native, TypeScript, Expo Router를 사용합니다. [빠른 시작](../docs/MVP-빠른시작.md), [상세 구현과 방법론](../docs/MVP-구현-방법론.md)을 현재 구현의 기준으로 읽으세요.

npm ci 후 frontend/.env에 API_URL을 지정하고 API_MODE=ai, FEATURE_MODE=api로 실행합니다. npm run web의 기본 포트는 8081입니다. 실제 휴대폰에서는 PC LAN 주소를 사용합니다.

실제 모드는 방 생성·초대 참가·서버 저장·2초 동기화를 사용합니다. AsyncStorage로 참가 세션을 복원합니다. 화자는 참가 토큰으로 고정되며 시연 컨트롤의 A/B 전환은 실제 방에서 사용할 수 없습니다. 순화·온도계·상대 반응을 각각 켜거나 끌 수 있고 저장된 판결도 다시 볼 수 있습니다.

useDraftReview는 600ms 뒤 필요 여부만 확인하고 대안 열기·전송 시도에서 생성합니다. useReactionPreview는 750ms 뒤 예상 반응을 확인하며 입력 revision과 취소로 늦은 결과를 처리합니다. 서버 실패는 오류로 표시하며 mock 결과로 대체하지 않습니다.

API_MODE=local와 FEATURE_MODE=mock는 기존 발표용 흐름입니다. 모든 mock 결과는 예시로 표시됩니다. SDK 호환 AsyncStorage 2.2.0을 추가했습니다.

frontend/AGENTS.md의 필수 타입·린트 검사는 수행했습니다. 별도 테스트, 웹 export와 모바일 실행은 이번 변경에서 수행하지 않았습니다.
