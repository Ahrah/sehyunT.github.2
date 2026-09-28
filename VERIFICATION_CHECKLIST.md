# 배포 후 검증 체크리스트

이 문서는 PR이 main에 병합되어 배포된 후 SEO 개선 사항을 검증하는 단계별 가이드입니다.

## ✅ 1단계: 기본 파일 확인

### sitemap.xml 존재 여부
```bash
curl -I https://sehyunt.re.kr/sitemap.xml
```
**기대 결과**: HTTP 200 OK

### robots.txt 존재 여부
```bash
curl https://sehyunt.re.kr/robots.txt
```
**기대 결과**:
```
User-agent: *
Allow: /

Sitemap: https://sehyunt.re.kr/sitemap.xml
```

## ✅ 2단계: 메타 태그 검증

### 기본 메타 태그 확인
```bash
curl -s https://sehyunt.re.kr/ | grep -i "조세연"
```
**기대 결과**: 여러 줄에서 "조세연" 발견 (title, meta author, JSON-LD 등)

```bash
curl -s https://sehyunt.re.kr/ | grep -i "입시는세연쌤"
```
**기대 결과**: 여러 줄에서 "입시는세연쌤" 발견

### Open Graph 태그 확인
```bash
curl -s https://sehyunt.re.kr/ | grep "og:"
```
**기대 결과**: og:title, og:description, og:url, og:image 등 발견

### Twitter Card 확인
```bash
curl -s https://sehyunt.re.kr/ | grep "twitter:"
```
**기대 결과**: twitter:card, twitter:title, twitter:description 등 발견

## ✅ 3단계: 초기 HTML 콘텐츠 검증

### noscript 콘텐츠 확인
```bash
curl -s https://sehyunt.re.kr/ | grep -A20 "<noscript>"
```
**기대 결과**: 실제 텍스트 콘텐츠 (대표 조세연, 사업 소개, 주요 서비스 등) 발견

### HTML body에 실제 콘텐츠 존재
```bash
curl -s https://sehyunt.re.kr/ | grep -i "프리미엄 입시 전략"
```
**기대 결과**: 1개 이상의 결과

## ✅ 4단계: JSON-LD 구조화 데이터 검증

### JSON-LD 존재 확인
```bash
curl -s https://sehyunt.re.kr/ | grep -c "application/ld+json"
```
**기대 결과**: 1 (JSON-LD 블록 1개)

### 구조화 데이터 내용 확인
```bash
curl -s https://sehyunt.re.kr/ | sed -n '/<script type="application\/ld+json">/,/<\/script>/p' | grep "@type"
```
**기대 결과**: Organization, Person, WebSite, ProfessionalService 발견

### Google Rich Results Test (브라우저)
1. https://search.google.com/test/rich-results 접속
2. URL 입력: `https://sehyunt.re.kr/`
3. "Test URL" 클릭
**기대 결과**: Organization, Person 등의 구조화 데이터 인식

## ✅ 5단계: Resources 정적 페이지 확인

### sitemap에 리소스 URL 포함 여부
```bash
curl -s https://sehyunt.re.kr/sitemap.xml | grep "/resources/"
```
**기대 결과**: 공개 리소스가 있다면 URL 목록 표시

### 개별 리소스 페이지 접근 (예시)
```bash
# sitemap에서 리소스 ID를 확인한 후
curl -I https://sehyunt.re.kr/resources/{resourceId}.html
```
**기대 결과**: HTTP 200 OK (공개 리소스인 경우)

### 비밀번호 보호 게시물 제외 확인
```bash
curl -s https://sehyunt.re.kr/sitemap.xml
```
**수동 검증**: sitemap에 표시된 리소스 중 비밀번호로 보호된 게시물이 **없는지** 확인

## ✅ 6단계: Google Search Console 설정

### 1. 속성 추가
1. https://search.google.com/search-console 접속
2. "속성 추가" 클릭
3. "URL 접두어" 선택 → `https://sehyunt.re.kr` 입력

### 2. 소유권 확인
**방법 A: HTML 파일 업로드**
1. Google에서 제공하는 HTML 파일 다운로드
2. `public/` 폴더에 파일 추가
3. 커밋 및 푸시
4. 배포 완료 후 확인 버튼 클릭

**방법 B: DNS TXT 레코드**
1. Google에서 제공하는 TXT 레코드 복사
2. 도메인 DNS 설정에 TXT 레코드 추가
3. 확인 버튼 클릭

### 3. Sitemap 제출
1. Search Console → Sitemaps
2. "새 사이트맵 추가" 클릭
3. `sitemap.xml` 입력
4. "제출" 클릭

### 4. URL 검사 및 색인 생성 요청
1. Search Console → URL 검사
2. `https://sehyunt.re.kr/` 입력
3. "색인 생성 요청" 클릭
4. 공개 리소스 페이지도 동일하게 반복

## ✅ 7단계: 소셜 미디어 미리보기 테스트

### Facebook Debugger
1. https://developers.facebook.com/tools/debug/ 접속
2. URL 입력: `https://sehyunt.re.kr/`
3. "디버그" 클릭
**기대 결과**: 제목, 설명, 이미지 미리보기 표시

### Twitter Card Validator
1. https://cards-dev.twitter.com/validator 접속
2. URL 입력: `https://sehyunt.re.kr/`
3. "Preview card" 클릭
**기대 결과**: 제목, 설명 미리보기 표시

### LinkedIn Post Inspector
1. https://www.linkedin.com/post-inspector/ 접속
2. URL 입력: `https://sehyunt.re.kr/`
3. "검사" 클릭
**기대 결과**: 제목, 설명, 이미지 미리보기 표시

## ✅ 8단계: 기존 기능 작동 확인

### 사이트 접속 및 기본 동작
1. https://sehyunt.re.kr/ 접속
2. 페이지가 정상적으로 로드되는지 확인
3. 네비게이션 메뉴 작동 확인

### Resources 섹션
1. Resources 섹션으로 이동
2. 대입/고입 탭 전환 확인
3. 검색 기능 작동 확인
4. 공개 리소스 다운로드/열람 확인

### 비밀번호 보호 게시물
1. 잠긴 리소스 클릭
2. 비밀번호 입력 프롬프트 표시 확인
3. 올바른 비밀번호 입력 시 콘텐츠 표시 확인

### 관리자 기능 (관리자 계정으로)
1. 로그인
2. Admin Dashboard 접근 확인
3. 새 리소스 추가 기능 확인

## ✅ 9단계: 검색 엔진 색인 확인 (1-2주 후)

### Google 검색
```
site:sehyunt.re.kr
```
**기대 결과**: 홈페이지 및 공개 리소스 페이지가 검색 결과에 표시

### 대표 이름 검색
```
조세연 입시
```
**기대 결과**: sehyunt.re.kr이 검색 결과에 포함

### 사업명 검색
```
입시는세연쌤
```
**기대 결과**: sehyunt.re.kr이 최상위 결과로 표시

## ✅ 10단계: 성능 및 접근성 확인

### Google PageSpeed Insights
1. https://pagespeed.web.dev/ 접속
2. URL 입력: `https://sehyunt.re.kr/`
3. "분석" 클릭
**확인 사항**: SEO 점수가 90점 이상

### Lighthouse (Chrome DevTools)
1. Chrome에서 https://sehyunt.re.kr/ 접속
2. F12 (DevTools) → Lighthouse 탭
3. "Generate report" 클릭
**확인 사항**: SEO 카테고리 점수 90점 이상

## 🚨 문제 해결

### sitemap.xml이 404 오류
**원인**: 빌드 중 정적 페이지 생성 실패  
**해결**: GitHub Actions 로그 확인 → Firestore 접근 권한 확인

### 메타 태그가 보이지 않음
**원인**: 이전 캐시  
**해결**: 
```bash
curl -H "Cache-Control: no-cache" https://sehyunt.re.kr/ | grep "조세연"
```

### 리소스 페이지가 404 오류
**원인**: 빌드 시 Firestore 연결 실패  
**해결**: 
1. Firestore 보안 규칙 확인 (공개 읽기 허용)
2. GitHub Secrets에 Firebase 환경 변수 설정 확인

### 비밀번호 보호 게시물이 sitemap에 포함됨
**원인**: 버그 (발생하지 않아야 함)  
**해결**: 
1. 해당 리소스의 `locked` 필드가 `true`인지 Firestore에서 확인
2. 이슈 보고

## 📊 성공 지표

다음 지표들이 개선되면 SEO 작업이 성공한 것입니다:

- ✅ `site:sehyunt.re.kr` 검색 결과: 0건 → 5+ 건
- ✅ Google Search Console 노출 수: 증가
- ✅ Google Search Console 클릭 수: 증가
- ✅ 자연 검색 유입: 증가
- ✅ Rich Results 표시: Organization, Person 정보 표시

## 📝 참고 문서

- `SEO_DEPLOYMENT_GUIDE.md` - 상세 배포 가이드
- Google Search Console 고급 설정
- Schema.org 구조화 데이터 가이드
