# `/wine/keywords` 서버 로깅

추가 요청: 상단을 공통 PageHeader의 홈 이동으로 바꾸고 선택 스냅샷 저장 후 `/wine/chat` 이동은 router.replace로 수행한다. Query·API·입력 정책은 변경하지 않는다.

api/mysom-wine-pairing.md 및 MCP bff-api-gateway 기준으로 recommend-menu BFF와 Entity 서버 helper에 요청별 로그를 적용한다. 인증·입력 검증·선택 개수·백엔드 요청/상태·DTO 매핑 완료/오류·결과 개수·처리 시간을 기록한다. 세션·선택 ID·메뉴명·원문 오류는 기록하지 않는다. UI 및 API 계약은 유지하고 공통 로거 테스트·타입·Lint로 검증한다.
