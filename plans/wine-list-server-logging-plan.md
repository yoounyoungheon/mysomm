# `/wine/list` 서버 로깅

추가 요청: 공통 PageHeader에 home navigation을 확장해 상단에 홈 아이콘과 `/` 링크를 제공한다. 와인 선택 스냅샷 저장 후 다음 단계는 router.replace로 이동한다. 기존 RSC page와 공통 UI를 유지하며 홈 링크와 성공/비활성 CTA를 Storybook으로 검증한다.

api/mysom-ocr.md 및 MCP bff-api-gateway 기준으로 extract-wine-menu BFF에 공통 server-only 로깅을 적용한다. 인증·입력 검증 결과·이미지 개수/총 바이트·백엔드 요청/응답·응답 검증·카탈로그 제외 플래그·결과 개수 및 HTTP 상태를 기록한다. 파일명·파일 내용·세션 ID·와인명·내부 URL은 제외한다. API·UI 계약은 유지한다. 공통 helper 단위 테스트와 타입·Lint 및 로컬 BFF 확인으로 검증한다.
