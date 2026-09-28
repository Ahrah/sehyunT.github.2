# SEO 개선 및 정적 페이지 생성 가이드

## 변경 사항 요약

이 PR은 사이트의 SEO를 크게 개선하고 검색 엔진 크롤링을 가능하게 합니다.

### 주요 개선 사항

1. **정적 페이지 생성 (SSG)**
   - 빌드 시 Firestore에서 공개 리소스를 읽어 각 게시물마다 정적 HTML 페이지 생성
   - 비밀번호로 보호된 게시물은 제외 (보안 유지)

2. **향상된 메타 태그 및 구조화 데이터**
   - `index.html`에 완전한 메타 태그 추가 (제목, 설명, 키워드)
   - Open Graph 및 Twitter Card 메타 태그
   - JSON-LD 구조화 데이터 (Organization, Person, ProfessionalService)
   - 대표 이름 "조세연" 및 사업명 "입시는세연쌤" 포함

3. **sitemap.xml 및 robots.txt**
   - 모든 공개 페이지가 포함된 자동 생성 사이트맵
   - 검색 엔진 크롤링을 허용하는 robots.txt

4. **초기 HTML 콘텐츠**
   - `<noscript>` 태그 내 실제 텍스트 콘텐츠로 SEO 개선
   - JavaScript 비활성화 시에도 기본 정보 표시

## 작동 방식

### 빌드 프로세스

1. `npm run build` 실행 시:
   - Vite가 React 앱을 먼저 빌드
   - 빌드 후 `scripts/generate-static-pages.ts` 자동 실행
   
2. 정적 페이지 생성 스크립트:
   - Firebase Web SDK를 사용하여 Firestore의 `resources` 컬렉션 읽기 (공개 읽기 권한 필요)
   - 비밀번호로 보호된 게시물(`locked: true`)은 **완전히 제외**
   - 각 공개 리소스마다 `/dist/resources/{resourceId}.html` 생성
   - `/dist/sitemap.xml` 및 `/dist/robots.txt` 생성

### 보안

- **비밀번호 보호 게시물**: `locked: true`인 모든 리소스는 정적 페이지 생성에서 **완전히 제외**됩니다
- 게시물 본문(`content`), 파일 URL, 파일 이름 등 민감한 정보는 절대 노출되지 않습니다
- 정적 페이지에는 제목과 설명만 포함되며, 실제 콘텐츠는 SPA에서만 비밀번호 입력 후 접근 가능

## 필수 설정

### GitHub Secrets

다음 Secrets를 GitHub 저장소에 설정해야 합니다 (Settings → Secrets and variables → Actions):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
GEMINI_API_KEY (기존)
```

### Firestore 보안 규칙

정적 페이지 생성이 작동하려면 Firestore의 `resources` 컬렉션에 대한 **공개 읽기 권한**이 필요합니다:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /resources/{document=**} {
      allow read: if true;  // 공개 읽기 허용
      allow write: if request.auth != null;  // 인증된 사용자만 쓰기 가능
    }
  }
}
```

**중요**: 비밀번호로 보호된 게시물의 경우, `locked: true` 필드가 설정되어 있고 실제 콘텐츠는 암호화된 `lockCipher` 필드에만 저장되므로, 공개 읽기 권한이 있어도 콘텐츠를 읽을 수 없습니다.

## 새 게시물 반영

### 자동 방법 (권장)

새 리소스를 Firestore에 추가한 후:

1. **GitHub Actions 트리거**: 
   - 저장소의 Actions 탭으로 이동
   - "Deploy static content to Pages" 워크플로우 선택
   - "Run workflow" 클릭 (수동 트리거)

2. **자동 스케줄** (선택사항):
   - `.github/workflows/deploy.yml`에 스케줄 추가:
   ```yaml
   on:
     schedule:
       - cron: '0 0 * * *'  # 매일 자정 (UTC)
   ```

### 수동 방법

로컬에서 빌드하고 푸시:

```bash
npm run build
git add dist/
git commit -m "Update static pages"
git push
```

## 검증

### 배포 후 확인 사항

1. **sitemap 및 robots.txt**:
   ```bash
   curl https://sehyunt.re.kr/sitemap.xml
   curl https://sehyunt.re.kr/robots.txt
   ```

2. **메타 태그 확인**:
   ```bash
   curl -s https://sehyunt.re.kr/ | grep -i "meta name"
   ```

3. **구조화 데이터 확인**:
   - Google의 Rich Results Test: https://search.google.com/test/rich-results
   - URL 입력: https://sehyunt.re.kr/

4. **리소스 페이지 확인**:
   ```bash
   curl -s https://sehyunt.re.kr/resources/{resourceId}.html | grep -i "조세연"
   ```

5. **비밀번호 보호 게시물 제외 확인**:
   - sitemap.xml에 잠긴 게시물이 포함되지 않았는지 확인
   - `/dist/resources/` 디렉토리에 잠긴 게시물의 HTML 파일이 없는지 확인

### Google Search Console 설정

1. [Google Search Console](https://search.google.com/search-console) 로그인
2. 속성 추가: `sehyunt.re.kr`
3. 소유권 확인 (DNS 또는 HTML 파일)
4. Sitemaps → 새 사이트맵 추가: `https://sehyunt.re.kr/sitemap.xml`

## 문제 해결

### 빌드 실패

**오류**: `Cannot find module 'firebase-admin'`
- **해결**: `npm install` 실행하여 의존성 설치

**오류**: `Failed to fetch resources from Firestore`
- **해결**: Firestore 보안 규칙 확인 (위 참조)

### 정적 페이지가 생성되지 않음

1. 빌드 로그 확인:
   ```bash
   npm run build
   ```
   
2. 스크립트 직접 실행:
   ```bash
   npm run generate-static
   ```

3. Firebase 설정 확인:
   - `firebase-applet-config.json` 파일이 존재하는지 확인
   - 환경 변수가 올바르게 설정되었는지 확인

### 잠긴 게시물이 노출됨

이는 절대 발생하지 않아야 합니다. 만약 발생한다면:

1. Firestore에서 해당 게시물의 `locked` 필드가 `true`로 설정되었는지 확인
2. 빌드 로그에서 "locked resources" 카운트 확인
3. `scripts/generate-static-pages.ts` 스크립트 검토

## 추가 개선 사항 (선택사항)

### 1. 자동 재배포 트리거

Firebase Functions를 사용하여 새 리소스 추가 시 자동으로 GitHub Actions 트리거:

```javascript
// Firebase Functions
exports.triggerRebuild = functions.firestore
  .document('resources/{resourceId}')
  .onCreate((snap, context) => {
    // GitHub Actions API 호출
  });
```

### 2. CDN 캐싱

GitHub Pages는 기본적으로 CDN을 사용하지만, 추가 최적화를 위해:
- Cloudflare 등의 CDN 사용
- 캐시 헤더 최적화

### 3. 이미지 최적화

- `logo-pic.png` 및 기타 이미지를 WebP 형식으로 변환
- 반응형 이미지 사용

## 라이선스 및 연락처

- **사업명**: 입시는세연쌤
- **대표**: 조세연
- **사업자등록번호**: 612-69-00756
- **이메일**: consultantsyssam@gmail.com
