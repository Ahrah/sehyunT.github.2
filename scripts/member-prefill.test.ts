import assert from 'node:assert/strict';
import {
  EMPTY_MEMBER_PROFILE,
  type PrefillMap,
  applyMemberPrefill,
  formatMemberPhone,
  hasStoredLogin,
  loadMemberProfile,
  profileFromUserDoc,
} from '../src/lib/memberPrefill';
import { EMPTY_FORM, type MiForm } from '../src/lib/mockInterview';

const MAP: PrefillMap<MiForm> = { name: 'studentName', phone: 'phone' };
const profile = { name: '김가짜', phone: '010-1234-5678', email: 'fake@example.com' };

// 빈 칸은 채웁니다.
{
  const f = applyMemberPrefill(EMPTY_FORM, profile, MAP);
  assert.equal(f.studentName, '김가짜');
  assert.equal(f.phone, '010-1234-5678');
  assert.equal(EMPTY_FORM.studentName, '', '원래 객체는 바꾸지 않음');
  assert.equal((f as Record<string, unknown>).email, undefined, '매핑에 없는 칸은 만들지 않음');
}

// 이미 적은 값은 덮어쓰지 않습니다.
{
  const typed = { ...EMPTY_FORM, studentName: '박직접', phone: '' };
  const f = applyMemberPrefill(typed, profile, MAP);
  assert.equal(f.studentName, '박직접');
  assert.equal(f.phone, '010-1234-5678');
  const both = { ...EMPTY_FORM, studentName: '박직접', phone: '010-9999-0000' };
  assert.equal(applyMemberPrefill(both, profile, MAP), both, '바뀐 것 없으면 같은 객체');
}

// 사용자가 손댄 칸(지운 칸 포함)은 비어 있어도 다시 채우지 않습니다.
{
  const f = applyMemberPrefill(EMPTY_FORM, profile, MAP, new Set<keyof MiForm>(['studentName']));
  assert.equal(f.studentName, '');
  assert.equal(f.phone, '010-1234-5678');
}

// 공백만 있는 칸은 빈 칸으로 봅니다.
assert.equal(applyMemberPrefill({ ...EMPTY_FORM, studentName: '  ' }, profile, MAP).studentName, '김가짜');

// 프로필이 없거나 값이 비면 그대로입니다.
assert.equal(applyMemberPrefill(EMPTY_FORM, null, MAP), EMPTY_FORM);
assert.equal(applyMemberPrefill(EMPTY_FORM, undefined, MAP), EMPTY_FORM);
assert.equal(applyMemberPrefill(EMPTY_FORM, EMPTY_MEMBER_PROFILE, MAP), EMPTY_FORM);
assert.equal(applyMemberPrefill(EMPTY_FORM, { name: '', phone: '01011112222', email: '' }, MAP).studentName, '');

// Firestore 문서 → 프로필
assert.deepEqual(profileFromUserDoc({ childName: ' 김가짜 ', phone: '01012345678', email: 'a@b.c' }, null), {
  name: '김가짜',
  phone: '010-1234-5678',
  email: 'a@b.c',
});
assert.deepEqual(profileFromUserDoc(null, { displayName: '홍길동', email: 'h@x.y' }), { name: '홍길동', phone: '', email: 'h@x.y' }, '문서 없음');
assert.deepEqual(profileFromUserDoc(undefined, null), EMPTY_MEMBER_PROFILE, '문서·로그인 정보 모두 없음');
assert.deepEqual(profileFromUserDoc({ childName: 3, phone: null }, null), EMPTY_MEMBER_PROFILE, '이상한 값은 무시');
assert.equal(formatMemberPhone('010 9876 5432'), '010-9876-5432');
assert.equal(formatMemberPhone('02-123-4567'), '02-123-4567');

// 로그인 흔적이 없으면 Firebase 를 부르지 않고 null 입니다.
assert.equal(await hasStoredLogin(), false, 'window 없음');
assert.equal(await loadMemberProfile(), null);

function fakeStorage(keys: string[]): Storage {
  return {
    get length() {
      return keys.length;
    },
    key: (i: number) => keys[i] ?? null,
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
  } as Storage;
}
const g = globalThis as Record<string, unknown>;
g.window = { localStorage: fakeStorage(['mi-saved']), sessionStorage: fakeStorage([]), setTimeout };
assert.equal(await hasStoredLogin(), false, '로그인 키 없음, indexedDB 없음');
g.window = { localStorage: fakeStorage(['firebase:authUser:KEY:[DEFAULT]']), sessionStorage: fakeStorage([]), setTimeout };
assert.equal(await hasStoredLogin(), true, 'localStorage 로그인 키');
delete g.window;

console.log('✅ member prefill tests passed');
