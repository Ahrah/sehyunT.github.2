# SEO 개선 및 정적 페이지 생성 가이드

## 변경 사항 요약

이 PR은 사이트의 SEO를 크게 개선하고 검색 엔진 크롤링을 가능하게 합니다.

### 주요 개선 사항

1. **홈페이지 사전 렌더링 (Prerendering)**
   - 빌드 시 홈페이지의 주요 섹션을 정적 HTML로 생성
   - 초기 HTML에 실제 텍스트 콘텐츠 포함 (Philosophy, Programs, Contact 등)
   - React 하이드레이션으로 인터랙티브 기능 유지

2. **리소스 정적 페이지 생성 (SSG)**
   - 빌드 시 Firestore에서 공개 리소스를 읽어 각 게시물마다 정적 HTML 페이지 생성
   - 비밀번호로 보호된 게시물은 제외 (보안 유지)

3. **향상된 메타 태그 및 구조화 데이터**
   - `index.html`에 완전한 메타 태그 추가 (제목, 설명, 키워드)
   - Open Graph 및 Twitter Card 메타 태그
   - JSON-LD 구조화 데이터 (Organization, Person, ProfessionalService)
   - 대표 이름 "조세연" 및 사업명 "입시는세연쌤" 포함

4. **sitemap.xml 및 robots.txt**
   - 모든 공개 페이지가 포함된 자동 생성 사이트맵
   - 검색 엔진 크롤링을 허용하는 robots.txt

## 보안: 비밀번호 보호 게시물

### 현재 저장 방식
비밀번호로 보호된 게시물은 Firestore에 다음과 같이 저장됩니다:
- `locked: true` - 잠김 상태 표시
- `content: null` - 본문 내용 없음
- `fileUrl: ""` - 파일 URL 없음
- `fileName: ""` - 파일 이름 없음
- `lockCipher: "<encrypted>"` - 실제 데이터가 AES-GCM 암호화되어 저장
- `lockSalt`, `lockIv`, `lockIter` - 암호화 파라미터

**중요**: 실제 콘텐츠는 클라이언트 측에서만 복호화되며, 올바른 비밀번호 없이는 절대 읽을 수 없습니다.

### Firestore 보안 규칙
현재 규칙 (`firestore.rules`):
```javascript
match /resources/{itemId} {
  allow read: if true;  // 이미 공개 읽기
  allow create, update, delete: if isAdmin();
}
```

**이 규칙은 안전합니다** 왜냐하면:
1. 비밀번호 보호 게시물의 실제 콘텐츠는 `lockCipher` 필드에 암호화되어 있음
2. `content`, `fileUrl`, `fileName` 필드는 `null` 또는 빈 문자열
3. 빌드 스크립트는 `locked: true`인 문서를 필터링하여 정적 페이지 생성에서 제외

### 빌드 시 보안
정적 페이지 생성 스크립트는:
- `locked: true`인 모든 리소스를 **완전히 제외**
- sitemap.xml에 포함하지 않음
- 제목과 설명만 표시 (공개 메타데이터)

## 작동 방식

### 빌드 프로세스

1. `npm run build` 실행 시:
   - Vite가 React 앱을 먼저 빌드
   - `scripts/inject-prerendered-content.ts` 실행: 홈페이지 콘텐츠 주입
   - `scripts/generate-static-pages.ts` 실행: 리소스 정적 페이지 생성
   
2. 홈페이지 사전 렌더링:
   - 주요 섹션의 정적 HTML을 `index.html`의 `<div id="root">`에 주입
   - React 앱이 로드되면 기존 콘텐츠 위에 하이드레이션
   - 검색 엔진은 초기 HTML의 실제 텍스트를 크롤링

3. 리소스 정적 페이지 생성:
   - Firebase Web SDK를 사용하여 Firestore의 `resources` 컬렉션 읽기
   - 비밀번호로 보호된 게시물(`locked: true`)은 **완전히 제외**
   - 각 공개 리소스마다 `/dist/resources/{resourceId}.html` 생성
   - `/dist/sitemap.xml` 및 `/dist/robots.txt` 생성

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

이 Secrets는 GitHub Actions 워크플로우(`deploy.yml`)에서 정적 페이지 생성 시 Firestore 접근에 사용됩니다.

## 새 게시물 반영

### 자동 방법 (권장)

새 리소스를 Firestore에 추가한 후:

1. **GitHub Actions 수동 트리거**: 
   - 저장소의 Actions 탭으로 이동
   - "Deploy static content to Pages" 워크플로우 선택
   - "Run workflow" 클릭

2. **자동 스케줄** (선택사항):
   - `.github/workflows/deploy.yml`에 스케줄 추가:
   ```yaml
   on:
     schedule:
       - cron: '0 0 * * *'  # 매일 자정 (UTC)
   ```

## 검증

### 배포 후 확인 사항

1. **sitemap 및 robots.txt**:
   ```bash
   curl https://sehyunt.re.kr/sitemap.xml
   curl https://sehyunt.re.kr/robots.txt
   ```

2. **홈페이지 실제 콘텐츠 확인**:
   ```bash
   curl -s https://sehyunt.re.kr/ | grep "성적을 넘어"
   curl -s https://sehyunt.re.kr/ | grep "프리미엄 전략 컨설팅"
   ```

3. **메타 태그 확인**:
   ```bash
   curl -s https://sehyunt.re.kr/ | grep -i "조세연"
   curl -s https://sehyunt.re.kr/ | grep -i "입시는세연쌤"
   ```

4. **구조화 데이터 확인**:
   - Google의 Rich Results Test: https://search.google.com/test/rich-results
   - URL 입력: https://sehyunt.re.kr/

5. **비밀번호 보호 게시물 제외 확인**:
   ```bash
   # sitemap에 잠긴 게시물이 없는지 확인
   curl -s https://sehyunt.re.kr/sitemap.xml
   # dist/resources/ 디렉토리 확인 (로컬)
   ls dist/resources/
   ```

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
- **해결**: GitHub Secrets에 Firebase 환경 변수가 올바르게 설정되었는지 확인

### 정적 페이지가 생성되지 않음

1. 빌드 로그 확인:
   ```bash
   npm run build
   ```
   
2. 스크립트 직접 실행:
   ```bash
   npm run generate-static
   ```

### 홈페이지에 실제 콘텐츠가 없음

1. 빌드 후 `dist/index.html` 확인:
   ```bash
   grep "성적을 넘어" dist/index.html
   ```

2. 사전 렌더링 스크립트 직접 실행:
   ```bash
   npm run inject-content
   ```

## 기존 기능 유지

모든 기존 기능은 변경 없이 작동합니다:
- ✅ 비밀번호 보호 게시물
- ✅ 대입/고입 탭
- ✅ 관리자 폼
- ✅ 사용자 인증
- ✅ CNAME 및 SPA fallback (404.html)
