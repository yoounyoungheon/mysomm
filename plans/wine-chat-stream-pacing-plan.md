# `/wine/chat` 스트림 표시 속도 분리 계획

- 기준: `web/GUIDE.md`, MCP `data-flow-layering`, `rcc-rendering`
- API: `api/mysom-wine-pairing.md`의 pairing/chat SSE
- 시안: `designs/enhanced_design_3_1.png`, `enhanced_design_3_2.png` 및 제공한 포트폴리오의 버퍼 기반 표시 흐름

## 구현 범위

현재 화면 구성과 shared UI는 유지한다. Server page와 BFF는 그대로 두고 Client controller에서 수신과 표시를 분리한다. 최초 추천, 재추천, 일반 채팅에 동일한 표시 큐를 사용한다. 버퍼는 요청별 객체로 소유하며 전역 캐시나 Zustand에 저장하지 않는다.

1. SSE 수신은 기다리지 않고 액션을 큐에 적재한다.
2. 40ms마다 최대 3개 Unicode code point를 소비한다. frame 경계를 넘어 같은 필드의 텍스트를 합쳐 서버 chunk 크기에 표시량이 종속되지 않도록 한다.
3. JSON 확정과 완료 액션은 앞선 텍스트 뒤에 처리한다. JSON만 오거나 텍스트 뒤에 추가 내용이 오면 최종 값의 미표시 suffix도 점진적으로 표시한다. 서버가 앞선 텍스트를 정정하면 최종 JSON을 권위값으로 적용한다.
4. 네트워크 완료 후에도 큐가 남아 있으면 streaming 상태를 유지한다. 오류는 큐를 폐기하고 즉시 표시한다. Abort/unmount는 타이머·대기 작업을 정리한다.

버퍼가 비어 있으면 표시를 멈추며 데이터를 만들지 않는다. 브라우저의 타이머 지연과 느린 네트워크 때문에 실제 표시 간격을 절대적으로 보장하지 않는다.

## 검증과 문서

fake timer 테스트로 일괄 수신·분할 수신의 동일 표시량, Unicode, JSON-only, 여러 카드 순서, 완료 지연, 취소·오류 정리를 검증한다. 기존 reducer 테스트와 타입 검사를 실행한다. Storybook에 빠른 일괄 응답 사례를 추가하고 `docs/wine-chat.md`에 정책을 기록한다.
