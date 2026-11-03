# sehyunt-admin-api

관리자 화면(Admin Control)에 구글 애널리틱스(GA4) 방문 숫자를 보여 주는 작은 Vercel 함수입니다.
실제 사이트(sehyunt.re.kr)는 GitHub Pages 정적 사이트라서, GA4 Data API 호출은 이 함수가 대신 합니다.

- 주소: `GET /api/ga-stats`
- 관리자만 응답합니다. Firebase 로그인 ID 토큰(`Authorization: Bearer …`)을 구글 공개키로 검증하고,
  이메일이 `ADMIN_EMAIL`(기본 ahrah0365@gmail.com)과 같을 때만 숫자를 줍니다. Firestore 규칙의 isAdmin()과 같은 기준입니다.
- CORS는 sehyunt.re.kr, www.sehyunt.re.kr, sehyunt-preview.vercel.app만 허용합니다(`ALLOWED_ORIGINS`로 바꿀 수 있습니다).
- GA 응답은 함수 인스턴스마다 5분 동안 캐시합니다.
- GA 설정이 없으면 `{"status":"not_configured"}`를 돌려주고, 화면은 '연결 전'으로 보입니다.

## 환경 변수 (Vercel 프로젝트 sehyunt-admin-api, Production)

| 이름 | 내용 |
| --- | --- |
| `GA4_PROPERTY_ID` | GA4 속성 ID(숫자만). 측정 ID `G-BTG5X3NHL5`와 다릅니다. |
| `GA4_SA_KEY_JSON` | 이 API 전용 서비스 계정 키 JSON 전체. 다른 서비스 키를 다시 쓰지 않습니다. Sensitive로 넣습니다. |
| `FIREBASE_PROJECT_ID` | 선택. 기본 gen-lang-client-0337316086 |
| `ADMIN_EMAIL` | 선택. 기본 ahrah0365@gmail.com |
| `ALLOWED_ORIGINS` | 선택. 쉼표로 구분 |

## 배포

Vercel 프로젝트 Root Directory를 `admin-api`로 두고 배포합니다. 빌드 단계는 없습니다.
테스트는 저장소 루트에서 `npm test`(scripts/admin-ga-stats.test.ts)로 돌립니다.
