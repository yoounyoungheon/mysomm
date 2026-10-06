# `/wine/chat` 서버 로깅

추가 요청: 상단의 이전 단계 링크를 PageHeader home navigation으로 교체한다. 아이콘은 홈이고 목적지는 `/`이며 홈 이동도 replace한다. RSC 경계는 유지한다.

MCP bff-api-gateway 및 data-flow-layering 기준으로 pairing/chat BFF와 Entity 서버 API에 구조화 로그를 추가한다. API 계약은 api/mysom-wine-pairing.md를 유지한다. UI·RSC/RCC 경계·상태 관리는 변경하지 않는다.

공통 server-only 로그 helper가 요청별 UUID와 타임스탬프·경과 시간을 제공한다. 인증 통과·입력 검증·백엔드 요청/헤더 수신·응답 준비 및 오류를 기록한다. SSE는 바이트를 변경·파싱·전체 버퍼링하지 않고 소비 시 전달하며 종료·취소·오류와 총 chunk/byte 개수만 기록한다. 토큰·쿠키·세션 ID·메시지·메뉴명·응답 본문·원문 오류·내부 URL은 기록하지 않는다.

단위 테스트로 JSON 응답 불변·요청 ID 연결·오류 분류·민감값 미포함·SSE 바이트/취소 보존을 확인한다. 변경 파일 타입 검사 및 ESLint를 실행한다.
