# 세연쌤 (SehyunT) 입시 컨설팅 웹사이트

> Premium Admissions Strategy & Self-Directed Learning Lab

## 🎯 프로젝트 개요

세연쌤 (조세연 대표)의 외고·자사고·국제고 입시 및 대입 학생부종합전형 전문 컨설팅 사이트입니다.

- **라이브 사이트**: http://sehyunt.re.kr/
- **브랜드명**: 세연쌤 (공식 영문명: SehyunT)
- **대표**: 조세연

## 🛠️ 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4
- **Animation**: Motion (Framer Motion)
- **Backend**: Firebase
  - Authentication (관리자 인증)
  - Firestore (콘텐츠 저장)
  - Storage (파일 업로드)
- **Deployment**: GitHub Pages

## 📂 주요 섹션

1. **Hero & About** - 소개 및 철학
2. **Programs** - 컨설팅 프로그램 (진로/코칭/입시/생기부)
3. **Gallery** - 활동 사진 갤러리
4. **Resources** - 전략 가이드 및 칼럼 (`#materials`)
5. **Contact** - 상담 신청 및 연락처

## 🚀 시작하기

### 설치
```bash
npm install
```

### 개발 서버
```bash
npm run dev
```
http://localhost:3000 에서 확인

### 빌드
```bash
npm run build
```

### 프리뷰
```bash
npm run preview
```

## 👨‍💼 관리자 기능

### 관리자 로그인
- **인증 방식**: Firebase Authentication
- **관리자 계정**: `ahrah0365@gmail.com`
- **로그인 위치**: 사이트 우측 상단 "Login" 버튼

### 콘텐츠 관리

#### 1. Gallery (활동 갤러리)
- 행사/수업 사진 업로드
- 이미지 URL 또는 파일 직접 업로드
- 제목, 설명, 날짜 추가

#### 2. Resources (전략 자료실)
- **파일 자료**: PDF, Excel, Word, HWP 등
- **온라인 기사/칼럼**: Article 타입으로 작성

### 새 칼럼 작성하기

1. 관리자 로그인
2. Resources 섹션 (`#resources`) 이동
3. "Add Resource" 버튼 클릭
4. **확장자 구분**: "Article (온라인 기사)" 선택
5. 제목, 본문 입력 (포맷팅 태그 사용 가능)
6. "Add to Library" 버튼 클릭

**포맷팅 태그:**
- `[H]소제목[/H]` → 볼드 + 큰 글씨
- `[HIGHLIGHT]강조 텍스트[/HIGHLIGHT]` → 파란색 강조

**자세한 내용**: `ADMIN_WORKFLOW.md` 참조

## 📝 초기 데이터 추가

최초 배포 시 초기 기사를 추가하려면:

```bash
node add-guide-article.js
```

또는 관리자 UI에서 직접 입력 (권장)

## 🔐 환경 설정

### Firebase 설정
Firebase 설정은 `firebase-applet-config.json`에 저장되어 있습니다.

환경 변수로 오버라이드 가능:
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 관리자 계정 변경
`src/App.tsx`와 `src/components/ResourcesSection.tsx`에서 `ADMIN_EMAIL` 상수를 변경하세요.

## 📦 배포

GitHub Pages 자동 배포:
```bash
git push origin main
```

## 📚 문서

- **`ADMIN_WORKFLOW.md`** - 관리자 워크플로우 상세 가이드
- **`ADMIN_GUIDE_FOR_ARTICLE.md`** - 초기 기사 등록 가이드

## 🎨 디자인 시스템

### 브랜드 컬러
- **Primary**: `#0a0a0a` (brand-text)
- **Accent**: `#e63946` (brand-accent)
- **Background**: `#f5f5f0` (brand-bg)
- **Secondary**: `#e8e8e0` (brand-secondary)

### 타이포그래피
- 헤드라인: 볼드, 큰 사이즈, 타이트한 자간
- 본문: 가독성 중심, 충분한 행간
- 대문자 + 넓은 자간으로 강조

## 📄 라이선스

© 2023 SEHYUNT. ALL RIGHTS RESERVED.

## 📞 문의

- **이메일**: consultantsyssam@gmail.com
- **인스타그램**: @consultant.sy
- **공식 블로그**: https://blog.naver.com/ahrahsehyun
- **전략 블로그**: https://sehyunt-study.tistory.com/
