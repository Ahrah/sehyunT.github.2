import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEMBER_CSV_HEADERS, formatKstMinute, memberCsvRows, optInLabel, sortOptedIn, toCsv, toMillis } from '../src/lib/adminMembers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ts = (iso: string) => ({ toDate: () => new Date(iso), toMillis: () => Date.parse(iso) });

// 시각: Firestore Timestamp·Date·숫자·문자열·null
assert.equal(formatKstMinute(ts('2026-11-02T15:05:00Z')), '2026-11-03 00:05');
assert.equal(formatKstMinute(new Date('2026-11-03T01:00:00Z')), '2026-11-03 10:00');
assert.equal(formatKstMinute({ seconds: 0 }), '1970-01-01 09:00');
assert.equal(formatKstMinute(null), '');
assert.equal(toMillis('엉뚱한 값'), null);

// 동의 표시: true 만 동의
assert.equal(optInLabel({ emailWeeklyOptIn: true }), '동의');
assert.equal(optInLabel({ emailWeeklyOptIn: false }), '미동의');
assert.equal(optInLabel({}), '미동의');

// 동의자만, 동의 시각 최근 순(없으면 가입일)
const list = [
  { childName: 'A', emailWeeklyOptIn: true, emailWeeklyOptInAt: ts('2026-10-01T00:00:00Z'), createdAt: ts('2026-10-01T00:00:00Z') },
  { childName: 'B', emailWeeklyOptIn: false, createdAt: ts('2026-11-01T00:00:00Z') },
  { childName: 'C', emailWeeklyOptIn: true, emailWeeklyOptInAt: ts('2026-11-02T00:00:00Z'), createdAt: ts('2026-09-01T00:00:00Z') },
  { childName: 'D', emailWeeklyOptIn: true, emailWeeklyOptInAt: null, createdAt: ts('2026-10-15T00:00:00Z') },
];
assert.deepEqual(sortOptedIn(list).map((u) => u.childName), ['C', 'D', 'A']);

// CSV: 새 칸 두 개가 맨 끝, 동의하지 않은 회원은 동의 시각 비움
assert.deepEqual(MEMBER_CSV_HEADERS.slice(-2), ['새 글 알림 동의', '동의 시각']);
const rows = memberCsvRows(list);
assert.equal(rows[0].length, MEMBER_CSV_HEADERS.length);
assert.deepEqual(rows[0].slice(-2), ['동의', '2026-10-01 09:00']);
assert.deepEqual(rows[1].slice(-2), ['미동의', '']);
assert.deepEqual(rows[3].slice(-2), ['동의', '']);
assert.equal(rows[0][0], '4');

// CSV 문자열: BOM, 따옴표, 수식 막기
const csv = toCsv(['이름', '메모'], [['홍"길동', '=HYPERLINK("x")']]);
assert.ok(csv.startsWith('\uFEFF"이름","메모"\n'));
assert.ok(csv.includes('"홍""길동"'));
assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));

// 관리자 화면: 동의자 보기는 50명 제한 없이 where 로 전체를 읽고, 목록은 더 보기로 이어서 읽습니다.
const src = fs.readFileSync(path.join(__dirname, '../src/components/AdminDashboard.tsx'), 'utf-8');
assert.ok(src.includes("where('emailWeeklyOptIn', '==', true)"), '동의자 전체 조회');
assert.ok(!/where\('emailWeeklyOptIn'[^)]*\)\s*,\s*orderBy/.test(src), '복합 색인이 필요한 where+orderBy 를 쓰지 않음');
assert.ok(src.includes('startAfter'), '전체 목록 더 보기');
assert.ok(src.includes('동의한 회원만 보기'));
assert.ok(src.includes('새 글 알림 동의'));
console.log('✅ admin email opt-in column/filter/CSV tests passed');
