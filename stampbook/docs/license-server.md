# 라이선스 서버 함수 (api/license.js)

- 환경변수 `POLAR_ORGANIZATION_ID`, `POLAR_BENEFIT_ID`가 모두 있어야 켜집니다. 없으면 `{configured:false}`를 돌려주고 앱은 임시 오프라인 검사로 동작합니다.
- 활성화: 앱 → `POST /api/license {action:'activate', key}` → Polar `customer-portal/license-keys/activate`(+ 상태 `granted`, benefit ID 일치 확인) → `{ok, instanceId}`.
- 재확인: 서버 방식으로 활성화한 기기는 7일마다 `validate`. 서버가 명확히 "유효하지 않음"이라 답할 때만 Pro를 끕니다(통신 실패로는 끄지 않음).
- 키는 서버에 저장하거나 로그에 남기지 않습니다. 입력 형식 검사, 4KB 본문 제한, POST만 허용.
- Polar 라이선스 키 API 응답 형식은 공식 문서(https://polar.sh/docs/features/benefits/license-keys) 기준으로 작성했고, **실제 Polar 조직으로는 아직 호출해 보지 못했습니다.** 단위 테스트는 가짜 응답으로 한 것입니다. 첫 실제 구매로 반드시 확인하세요.
