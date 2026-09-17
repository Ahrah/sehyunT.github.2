# 관리자 워크플로우 가이드

## 🔐 관리자 인증 시스템

### 인증 방식
사이트는 **Firebase Authentication**을 사용합니다. 관리자 계정은 코드에서 지정됩니다:

```typescript
// src/App.tsx 및 src/components/ResourcesSection.tsx
const ADMIN_EMAIL = "ahrah0365@gmail.com";
```

### 관리자 로그인 방법
1. http://sehyunt.re.kr 접속
2. 우측 상단 "Login" 버튼 클릭
3. Firebase Auth 로그인 (이메일/소셜 로그인 등)
4. 관리자 이메일(`ahrah0365@gmail.com`)로 로그인 시 자동으로 관리자 권한 부여

**중요**: 관리자 이메일은 Firebase Console에서 미리 등록되어 있어야 합니다.

## ✍️ 새 칼럼/기사 작성하기

### 1단계: 관리자 UI 접근
1. 관리자 계정으로 로그인
2. 페이지를 아래로 스크롤하여 **Resources** 섹션으로 이동 (`#resources`)
3. 우측 상단의 **"Add Resource"** 버튼 클릭

### 2단계: 기사 정보 입력

#### 필수 입력 항목
- **자료 명칭**: 기사 제목 (예: `외고·자사고 입시 컨설팅, 이렇게 고르세요`)
- **확장자 구분**: **"Article (온라인 기사)"** 선택
- **기사 본문 내용**: 전체 본문 입력

#### 선택 입력 항목
- **자료 개요 및 구성 설명**: 기사 요약 (목록 카드에 표시됨)

### 3단계: 본문 포맷팅

본문 입력 시 다음 특수 태그를 사용하여 포맷팅할 수 있습니다:

#### 소제목 (볼드 + 큰 글씨)
```
[H]소제목 텍스트[/H]
```
- 볼드체로 표시
- 본문보다 2pt 이상 큰 글씨 (1.25rem)
- 위아래 여백 자동 추가

**예시:**
```
[H]1. 지원 학교 전문성[/H]
[H]세연쌤은 이 기준으로 이렇게 합니다[/H]
```

#### 강조 텍스트 (accent 색상)
```
[HIGHLIGHT]강조할 중요한 내용[/HIGHLIGHT]
```
- 진한 파란색(#1a4f8b) 텍스트
- 볼드체로 표시
- 독자의 시선을 집중시키는 핵심 메시지에 사용

**예시:**
```
학교마다 전형·면접·서류 성격이 다르고, 유명 업체보다 [HIGHLIGHT]우리 아이가 지원할 학교에 맞는 준비가 결과를 가릅니다[/HIGHLIGHT].
```

#### 일반 텍스트
태그 없이 작성한 텍스트는 일반 문단으로 표시됩니다.

### 4단계: 발행
- **"Add to Library"** 버튼 클릭
- 즉시 Firestore에 저장되고 사이트에 표시됨
- Resources 목록에서 **"ARTICLE"** 타입으로 표시
- 사용자는 **"Read Article"** 버튼으로 전문 확인 가능

## 📊 콘텐츠 저장 방식

### 사용 기술
- **데이터베이스**: Firebase Firestore
- **인증**: Firebase Authentication
- **파일 저장**: Firebase Storage (선택적, 파일 업로드용)

### 데이터 구조
```javascript
{
  title: "기사 제목",
  description: "기사 요약",
  fileType: "article",
  content: "전체 본문 (포맷팅 태그 포함)",
  fileUrl: "#",
  fileName: "article-title.article",
  storagePath: null,
  createdAt: Timestamp
}
```

### 장점
- ✅ 소스 코드 수정 없이 콘텐츠 추가
- ✅ 실시간 반영 (새로고침 시 즉시 표시)
- ✅ 관리자만 추가/삭제 가능
- ✅ GitHub Pages와 완벽 호환
- ✅ 무료 티어에서도 충분한 용량

## 🔧 환경 설정

### Firebase 설정
Firebase 설정은 `firebase-applet-config.json`에 저장되어 있습니다. 환경 변수로 오버라이드 가능:

```bash
# .env (선택적)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 관리자 계정 변경
관리자 이메일을 변경하려면:

1. `src/App.tsx` 파일 열기
2. `ADMIN_EMAIL` 상수 값 변경:
```typescript
const ADMIN_EMAIL = "new-admin@example.com";
```

3. `src/components/ResourcesSection.tsx` 파일 열기
4. 동일하게 변경:
```typescript
propIsAdmin !== undefined ? propIsAdmin : (auth.currentUser?.email === "new-admin@example.com")
```

5. Firebase Console에서 해당 이메일 계정 생성

## 📝 기사 작성 예시

### 입력 예시
```
자료 명칭: 외고·자사고 입시 컨설팅, 이렇게 고르세요

자료 개요: 외고·자사고·국제고 입시 컨설팅을 선택할 때 학부모가 먼저 확인해야 할 핵심 기준과 세연쌤의 차별화된 접근법을 소개합니다.

확장자 구분: Article (온라인 기사)

기사 본문 내용:
외고·국제고·자사고 입시는 일반 대입 컨설팅과 결이 다릅니다.
학교마다 전형·면접·서류 성격이 다르고, 유명 업체보다 [HIGHLIGHT]우리 아이가 지원할 학교에 맞는 준비가 결과를 가릅니다[/HIGHLIGHT].

[H]1. 지원 학교 전문성[/H]

외대부고·하나고 같은 전국 단위 자사고와, 경기외고·성남외고·동탄국제고 같은 광역·국제고는 준비 포인트가 다릅니다.

확인할 것:
- 목표 학교의 최근 모집요강·면접 방식을 설명하는지
- 어디든 통하는 합격 공식만 반복하지 않는지
```

### 표시 결과
- 일반 문단: 기본 본문 스타일
- `[H]1. 지원 학교 전문성[/H]` → **큰 볼드 소제목**
- `[HIGHLIGHT]...[/HIGHLIGHT]` → **파란색 강조 텍스트**

## 🗑️ 기사 수정/삭제

### 삭제 방법
1. 관리자 로그인
2. Resources 섹션에서 해당 기사 카드 찾기
3. 우측 휴지통 아이콘 클릭
4. 확인 후 영구 삭제

### 수정 방법
현재 UI에는 직접 수정 기능이 없습니다. 수정하려면:
1. 기존 기사 삭제
2. 수정된 내용으로 새로 등록

**향후 개선**: 편집 기능 추가 가능

## 📱 Gallery vs Resources 구분

### Gallery (활동 갤러리)
- **용도**: 행사/수업 사진 아카이브
- **형식**: 이미지 업로드
- **위치**: `#gallery` 섹션

### Resources (전략 자료실)
- **용도**: 전략 가이드, 다운로드 자료, **칼럼 기사**
- **형식**: PDF, Excel, **Article(온라인 기사)**
- **위치**: `#resources` / `#materials` 섹션

**중요**: 칼럼/기사는 반드시 Resources에만 등록하세요.

## 🚀 초기 기사 추가 (일회성)

최초 배포 시 "외고·자사고 입시 컨설팅, 이렇게 고르세요" 기사를 추가하려면:

### 방법 1: 스크립트 실행 (권장)
```bash
npm install  # Firebase SDK 설치
node add-guide-article.js
```

### 방법 2: 관리자 UI 사용
1. 관리자 로그인
2. `ADMIN_GUIDE_FOR_ARTICLE.md` 파일 내용 복사
3. 위 "새 칼럼/기사 작성하기" 절차 따라 입력

## ⚠️ 주의사항

### 보안
- ❌ 관리자 비밀번호를 저장소에 커밋하지 마세요
- ✅ Firebase Console에서만 관리자 계정 생성
- ✅ `.env` 파일은 `.gitignore`에 포함

### 콘텐츠
- ❌ 가짜 합격률 수치 삽입 금지
- ✅ 세연쌤 브랜드명 사용 (SehyunT는 영문명)
- ✅ 기존 디자인 톤앤매너 유지

### 기술
- Firestore 무료 티어 제한: 읽기 50,000/일, 쓰기 20,000/일
- 일반적인 사용에는 충분함
- 트래픽이 급증하면 Firebase 요금제 업그레이드 고려

## 💡 자주 묻는 질문

**Q: 소스 코드를 수정해야 하나요?**
A: 아니요. 관리자 UI에서만 작업하면 됩니다.

**Q: GitHub에 푸시해야 하나요?**
A: 아니요. Firestore에 저장되므로 즉시 반영됩니다.

**Q: 배포는 어떻게 하나요?**
A: GitHub Pages가 자동으로 빌드합니다. 기사 추가는 배포 없이 즉시 반영됩니다.

**Q: 기사 순서를 변경할 수 있나요?**
A: 최신 기사가 위에 표시됩니다 (작성일 기준 내림차순).

**Q: 이미지를 넣을 수 있나요?**
A: 현재는 텍스트만 지원합니다. 이미지는 Gallery 섹션을 사용하세요.
