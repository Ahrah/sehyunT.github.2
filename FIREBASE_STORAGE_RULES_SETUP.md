# Firebase Storage Rules 설정 가이드

## 개요

Article 이미지 첨부 기능을 위한 Firebase Storage 보안 규칙 설정 가이드입니다.

## Storage Rules 요구사항

### 읽기 (Read)
- **공개 접근**: 누구나 업로드된 이미지를 볼 수 있어야 함
- 게시된 Article의 이미지를 모든 사용자가 열람 가능

### 쓰기 (Write)
- **관리자 전용**: 오직 `ahrah0365@gmail.com` 계정만 이미지 업로드 가능
- 다른 인증된 사용자도 업로드 불가
- 무단 이미지 업로드 방지

## 파일 구조

```
.
├── firestore.rules       # Firestore 데이터베이스 규칙 (기존)
├── storage.rules         # Storage 규칙 (신규 추가)
└── firebase.json         # Firebase 프로젝트 설정 (신규 추가)
```

## storage.rules 내용

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Resources images (Article 이미지)
    match /resources/images/{imageId} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.auth.token.email == 'ahrah0365@gmail.com';
    }
    
    // Gallery images (향후 사용)
    match /gallery/{imageId} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.auth.token.email == 'ahrah0365@gmail.com';
    }
    
    // 기타 경로는 모두 차단
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## 배포 방법

### 방법 1: Firebase CLI (권장)

#### 1. Firebase CLI 설치 (미설치 시)
```bash
npm install -g firebase-tools
```

#### 2. Firebase 로그인
```bash
firebase login
```

#### 3. 프로젝트 초기화 (처음 한 번만)
```bash
firebase init

# 선택:
# - Firestore
# - Storage
# - Hosting (선택 사항)

# 기존 파일 사용:
# - firestore.rules
# - storage.rules
```

#### 4. Storage Rules 배포
```bash
# Storage 규칙만 배포
firebase deploy --only storage

# 또는 Firestore + Storage 규칙 함께 배포
firebase deploy --only firestore,storage
```

#### 5. 배포 확인
```bash
firebase deploy --only storage --dry-run
```

### 방법 2: Firebase Console (수동)

Firebase Console을 통해 수동으로 설정할 수도 있습니다.

#### 1. Firebase Console 접속
https://console.firebase.google.com/

#### 2. 프로젝트 선택
sehyunt.re.kr 프로젝트 선택

#### 3. Storage → Rules 이동
- 왼쪽 메뉴에서 **Storage** 클릭
- 상단 탭에서 **Rules** 클릭

#### 4. 규칙 편집
기존 규칙을 삭제하고 `storage.rules` 파일의 내용을 복사-붙여넣기

#### 5. 게시 (Publish)
우측 상단 **Publish** 버튼 클릭

## 규칙 테스트

### 1. 읽기 테스트 (공개 접근)
브라우저에서 아무 이미지 URL 접근:
```
https://firebasestorage.googleapis.com/.../resources%2Fimages%2F...
```
→ 이미지가 표시되어야 함 (로그인 불필요)

### 2. 쓰기 테스트 (관리자만)

#### 관리자 계정 (ahrah0365@gmail.com)
1. http://sehyunt.re.kr 로그인
2. Resources → Add Resource
3. Article 타입 선택
4. 이미지 업로드
→ **성공해야 함**

#### 다른 계정
1. 다른 이메일로 로그인 (또는 비로그인)
2. 동일한 작업 시도
→ **실패해야 함** (권한 없음)

## Firebase Console에서 확인

### Storage 사용량 확인
1. Firebase Console → Storage
2. **Usage** 탭 확인
3. 사용 중인 용량 및 파일 수 확인

### 업로드된 파일 확인
1. Firebase Console → Storage → **Files** 탭
2. `resources/images/` 경로 확인
3. 업로드된 이미지 파일 목록 확인

### 규칙 시뮬레이터
1. Firebase Console → Storage → **Rules** 탭
2. 하단 **Rules Playground** 클릭
3. 읽기/쓰기 시나리오 테스트

## 보안 참고사항

### 1. 이메일 기반 인증
```javascript
request.auth.token.email == 'ahrah0365@gmail.com'
```
- Firebase Authentication의 이메일 주소로 검증
- 이메일 변경 시 자동으로 접근 차단됨

### 2. 인증 필수
```javascript
request.auth != null
```
- 로그인하지 않은 사용자는 업로드 불가
- 관리자 계정도 반드시 로그인 필요

### 3. 경로별 규칙
```javascript
match /resources/images/{imageId}
```
- `/resources/images/` 경로만 허용
- 다른 경로로 업로드 시도 시 차단

### 4. 기본 차단
```javascript
match /{allPaths=**} {
  allow read, write: if false;
}
```
- 명시되지 않은 모든 경로는 차단
- 화이트리스트 방식으로 보안 강화

## 문제 해결

### 문제 1: 이미지 업로드 실패
**증상**: "권한이 없습니다" 에러

**원인**:
- Storage Rules가 배포되지 않음
- 관리자 이메일이 다름
- Firebase Authentication 미설정

**해결**:
1. Storage Rules 배포 확인
2. 로그인한 이메일 확인 (ahrah0365@gmail.com)
3. Firebase Console → Authentication에서 사용자 목록 확인

### 문제 2: 이미지가 표시되지 않음
**증상**: 업로드는 성공했으나 Article에서 이미지 표시 안 됨

**원인**:
- 읽기 규칙 미설정
- CORS 문제
- 잘못된 URL

**해결**:
1. Storage Rules에서 `allow read: if true;` 확인
2. Firebase Console → Storage → Files에서 파일 존재 확인
3. 브라우저 개발자 도구에서 네트워크 에러 확인

### 문제 3: 규칙 배포 실패
**증상**: `firebase deploy --only storage` 실패

**원인**:
- Firebase CLI 미설치
- 프로젝트 미초기화
- 잘못된 rules 문법

**해결**:
1. Firebase CLI 설치 확인
2. `firebase init` 실행
3. `storage.rules` 문법 검증

## 규칙 업데이트 시

Storage Rules를 수정한 후:

1. **로컬 테스트**
   ```bash
   firebase emulators:start --only storage
   ```

2. **Dry-run 배포**
   ```bash
   firebase deploy --only storage --dry-run
   ```

3. **실제 배포**
   ```bash
   firebase deploy --only storage
   ```

4. **확인**
   - Firebase Console에서 규칙 확인
   - 이미지 업로드/표시 테스트

## 참고 링크

- [Firebase Storage Security Rules 공식 문서](https://firebase.google.com/docs/storage/security)
- [Firebase CLI 공식 문서](https://firebase.google.com/docs/cli)
- [Storage Rules 예제](https://firebase.google.com/docs/storage/security/start)

## 요약

### 필수 작업
1. ✅ `storage.rules` 파일 생성 (이 PR로 추가됨)
2. ✅ `firebase.json` 파일 생성 (이 PR로 추가됨)
3. ⚠️ Storage Rules 배포 (Firebase CLI 또는 Console)

### 배포 후 테스트
1. ⚠️ 관리자 계정으로 이미지 업로드 성공 확인
2. ⚠️ 다른 계정으로 업로드 실패 확인 (보안 테스트)
3. ⚠️ 비로그인 상태에서 이미지 표시 확인 (공개 읽기)

### 유지보수
- Storage 사용량 주기적 확인 (무료 5GB)
- 불필요한 이미지 정리 (Firebase Console → Storage)
- 규칙 변경 시 반드시 배포

---

**작성일**: 2026-10-05
**관련 PR**: #13 (Article 이미지 첨부 기능), 이 PR (Storage Rules 설정)
