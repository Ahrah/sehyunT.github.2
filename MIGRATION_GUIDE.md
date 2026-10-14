# 공지 항목을 회원 전용으로 설정하기

## 자동 마이그레이션 (권장)

Firebase service account key가 있는 경우:

```bash
# 환경 변수 설정
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# 마이그레이션 실행
npx tsx scripts/migrate-notices-to-members-only.ts
```

이 스크립트는:
- `pinned: true`인 모든 공지 항목을 찾습니다
- 각 항목에 `membersOnly: true` 설정
- 본문 내용을 `resourceBodies` 컬렉션으로 이동

## 수동 설정 (Firebase Admin 권한 필요)

1. 관리자(ahrah0365@gmail.com)로 로그인
2. Resources 섹션에서 다음 두 공지 찾기:
   - "[2026년] 세연쌤 학종 생기부 관리 컨설팅, 비용과 관리 범위 FAQ"
   - "[2026년] 세연쌤 외고·국제고·자사고 자소서·면접 컨설팅, 비용과 진행 방식 FAQ"
3. 각 항목의 수정(Edit) 버튼 클릭
4. **'회원 전용 (로그인 필수)'** 체크박스 선택
5. 저장

## 영향을 받는 공지

현재 사이트의 두 공지 항목:

1. **ID**: `2rH6jfosr4bEMNFDEOHf`
   - 제목: "[2026년] 세연쌤 학종 생기부 관리 컨설팅, 비용과 관리 범위 FAQ"
   - 카테고리: 대입

2. **ID**: `VYDKTGZbmQ3ItIWOeHiF`
   - 제목: "[2026년] 세연쌤 외고·국제고·자사고 자소서·면접 컨설팅, 비용과 진행 방식 FAQ"
   - 카테고리: 고입

## 결과

설정 후:
- 로그아웃 사용자: 제목과 '회원 전용' badge만 표시, 클릭 시 로그인 안내
- 로그인 사용자: 전체 내용 접근 가능
- 본문은 `resourceBodies` 컬렉션에 안전하게 저장
