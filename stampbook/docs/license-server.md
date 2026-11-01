# 라이선스 서버 함수 (api/license.js)

- 환경변수 `GUMROAD_PRODUCT_ID`가 있어야 켜집니다. 없으면 `{configured:false}`를 돌려주고 앱은 임시 오프라인 검사로 동작합니다.
- 활성화: 앱 → `POST /api/license {action:'activate', key}` → Gumroad `POST https://api.gumroad.com/v2/licenses/verify` (`product_id`, `license_key`, `increment_uses_count=false`) → 성공이고 환불·차지백이 아니면 `{ok, instanceId:''}`.
- 재확인: 서버 방식으로 켠 Pro는 7일마다 `validate`(같은 확인). 서버가 명확히 "유효하지 않음"이라 답할 때만 Pro를 끕니다(통신 실패로는 끄지 않음).
- 키는 서버에 저장하거나 로그에 남기지 않습니다. 입력 형식 검사, 4KB 본문 제한, POST만 허용.
- Gumroad 응답 형식은 공개 문서(https://gumroad.com/api)와 제 기억을 바탕으로 작성했고, **실제 Gumroad 상품으로는 아직 호출해 보지 못했습니다.** 단위 테스트는 가짜 응답으로 한 것입니다. 첫 테스트 구매로 반드시 확인하세요.
