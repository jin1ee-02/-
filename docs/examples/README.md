# API 본문 예시

파일은 요청 본문만 담습니다. 방 메시지·설정·판결·반론·판결 조회에는 `Authorization: Bearer 참가_토큰` 헤더가 필요합니다.

`room-create-request.json`으로 `/v1/rooms`를 호출해 roomId와 token을 얻습니다. 응답의 inviteCode는 다른 참가자가 `/v1/rooms/join`에 `{"invite_code":"코드"}`로 제출할 수 있습니다. 방 메시지는 실제 생성한 `/v1/rooms/{roomId}/messages`에 보냅니다.

판결 예시의 room_id는 실제 방 ID로 바꾸고 recent_messages는 서버에 저장된 최근 최대 10개 메시지와 똑같이 지정하세요. 예시 대화는 먼저 A/B의 참가 토큰으로 전송해야 합니다. context는 보충 주장입니다. requester는 토큰의 화자와 같아야 합니다.

request_id는 새로운 작업마다 새 값으로 바꾸고 같은 요청을 재시도할 때만 재사용합니다. 반론에는 저장된 판결 ID가 필요하며 경로는 `/v1/verdicts/{verdictId}/appeals`입니다.

reaction-request.json은 `/v1/reactions/preview`, draft-request.json은 `/v1/drafts/analyze`, emotion-request.json은 `/v1/emotions/analyze`에 사용합니다. 독립 분석 예시는 DB에 대화를 저장하지 않습니다.
