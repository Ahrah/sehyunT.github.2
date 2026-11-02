import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  EMPTY_FORM,
  MI_CONFIG,
  MI_STATUS,
  type MiForm,
  type MiRow,
  baseDocsDeadline,
  docsDeadlineFor,
  formatDateLabel,
  formatShortKst,
  initialStatusFor,
  isOpen,
  newBookingRow,
  summarize,
  sweep,
  validateForm,
  waitlistPosition,
} from '../src/lib/mockInterview';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const T = (s: string) => Date.parse(`${s}+09:00`);
const HOUR = 3600000;

/* ---- 오픈 시각 ---- */
assert.equal(isOpen(T('2026-11-09T20:59:59')), false);
assert.equal(isOpen(T('2026-11-09T21:00:00')), true);
assert.equal(formatShortKst(T('2026-11-09T21:00:00')), '11/9(월) 21:00');
assert.equal(formatDateLabel('2026-12-12'), '12/12(토)');
assert.equal(formatDateLabel('2026-12-20'), '12/20(일)');

/* ---- 정원 4명, 5번째는 대기 ---- */
const open = T('2026-11-09T21:01:00');
let rows: MiRow[] = [];
for (let i = 1; i <= 6; i += 1) rows.push(newBookingRow(rows, `r${i}`, '2026-12-12', '10:00', open + i * 1000));
assert.deepEqual(rows.map((r) => r.status), ['입금 대기', '입금 대기', '입금 대기', '입금 대기', '대기', '대기']);
assert.equal(rows[0].payDeadline, open + 1000 + HOUR);
assert.equal(waitlistPosition(rows, 'r5'), 1);
assert.equal(waitlistPosition(rows, 'r6'), 2);
let s = summarize(rows, open).find((x) => x.date === '2026-12-12' && x.time === '10:00')!;
assert.equal(s.left, 0);
assert.equal(s.waitlist, 2);
// 다른 타임은 영향 없음
assert.equal(initialStatusFor(rows, '2026-12-12', '11:00'), MI_STATUS.pending);

/* ---- 기한이 지나도 세연님이 표시하기 전에는 취소하지 않음 ---- */
const later = open + 2 * HOUR;
rows = sweep(rows, later);
assert.equal(rows[0].status, MI_STATUS.pending, '미입금 표시 전에는 자리 유지');

/* ---- 기한 안 입금 → 확정, 기한 뒤 입금 → 취소, 미입금 표시 → 취소 + 대기 승격 ---- */
rows[0] = { ...rows[0], paidChecked: true, paidAt: open + 30 * 60000 };
rows[1] = { ...rows[1], paidChecked: true, paidAt: rows[1].payDeadline! + 60000 };
rows[2] = { ...rows[2], unpaidChecked: true };
rows = sweep(rows, later);
assert.equal(rows[0].status, MI_STATUS.confirmed);
assert.equal(rows[1].status, MI_STATUS.cancelled);
assert.match(rows[1].cancelReason, /기한 뒤 입금/);
assert.equal(rows[2].status, MI_STATUS.cancelled);
assert.equal(rows[4].status, MI_STATUS.pending, '대기 1번 승격');
assert.equal(rows[4].payDeadline, later + HOUR, '승격 시각부터 새 1시간');
assert.equal(rows[5].status, MI_STATUS.pending, '대기 2번도 승격(빈자리 2개)');
assert.equal(summarize(rows, later)[0].left, 0);

/* ---- 기한 전 '미입금' 표시는 무시 ---- */
let early: MiRow[] = [newBookingRow([], 'e1', '2026-12-13', '10:00', open)];
early[0] = { ...early[0], unpaidChecked: true };
early = sweep(early, open + 10 * 60000);
assert.equal(early[0].status, MI_STATUS.pending);

/* ---- 서류: 7일 전 23:59 까지, 없으면 확정 취소 + 대기 승격 ---- */
assert.equal(formatShortKst(baseDocsDeadline('2026-12-12')), '12/5(토) 23:59');
let docs: MiRow[] = [];
for (let i = 1; i <= 5; i += 1) docs.push(newBookingRow(docs, `d${i}`, '2026-12-19', '12:00', open + i));
docs = docs.map((r, i) => (i < 4 ? { ...r, paidChecked: true, paidAt: open + 10 * 60000 } : r));
docs[1] = { ...docs[1], docsReceived: true };
docs = sweep(docs, open + 20 * 60000);
assert.equal(docs.filter((r) => r.status === MI_STATUS.confirmed).length, 4);
const afterDocs = baseDocsDeadline('2026-12-19') + 1;
docs = sweep(docs, afterDocs);
assert.equal(docs[1].status, MI_STATUS.confirmed, '서류 받은 학생은 유지');
assert.equal(docs.filter((r) => r.cancelReason === '서류 미제출').length, 3);
assert.equal(docs[4].status, MI_STATUS.pending, '대기자 승격');
assert.equal(docs[4].docsDeadline, afterDocs + MI_CONFIG.docsGraceMs, '서류 기한이 지난 뒤 승격하면 24시간');
assert.equal(docsDeadlineFor('2026-12-19', open), baseDocsDeadline('2026-12-19'));

/* ---- 면접 24시간 전에는 승격하지 않음 ---- */
let close: MiRow[] = [];
for (let i = 1; i <= 5; i += 1) close.push(newBookingRow(close, `c${i}`, '2026-12-20', '10:00', open + i));
close[0] = { ...close[0], unpaidChecked: true };
close = sweep(close, T('2026-12-19T10:30:00'));
assert.equal(close[0].status, MI_STATUS.cancelled);
assert.equal(close[4].status, MI_STATUS.waitlist);

/* ---- 신청서 검사 ---- */
const good: MiForm = {
  ...EMPTY_FORM,
  date: '2026-12-12',
  time: '10:00',
  studentName: '홍길동',
  school: '○○외고',
  track: '일반전형',
  phone: '010-1234-5678',
  depositor: '홍길동',
  consentPrivacy: true,
  consentVideo: true,
  consentPhoto: true,
};
assert.deepEqual(validateForm(good), []);
assert.equal(validateForm({ ...good, consentPhoto: false }, true).length, 1);
assert.deepEqual(validateForm({ ...good, consentPhoto: false }, false), []);
assert.equal(validateForm({ ...good, under14: true }).length, 3);
assert.deepEqual(validateForm({ ...good, kind: '요청', date: '', time: '', depositor: '', requestText: '평일 수요일 19시' }), []);
assert.ok(validateForm({ ...good, time: '13:00' }).length > 0);
assert.equal(EMPTY_FORM.consentPrivacy || EMPTY_FORM.consentVideo || EMPTY_FORM.consentPhoto, false, '동의는 기본 해제');

/* ---- Apps Script(Code.gs)도 같은 규칙인지 ---- */
const code = fs.readFileSync(path.join(__dirname, '../apps-script/mock-interview/Code.gs'), 'utf-8');
const sandbox: { module: { exports: Record<string, any> } } = { module: { exports: {} } };
vm.runInNewContext(code, sandbox);
const gs = sandbox.module.exports;
assert.equal(gs.MI.OPEN_AT, MI_CONFIG.openAt);
assert.deepEqual([...gs.MI.DATES], [...MI_CONFIG.dates]);
assert.deepEqual([...gs.MI.TIMES], [...MI_CONFIG.times]);
assert.equal(gs.MI.CAPACITY, MI_CONFIG.capacity);
assert.equal(gs.MI.PHOTO_CONSENT_REQUIRED, MI_CONFIG.photoConsentRequired);
assert.equal(gs.mi_isOpen(T('2026-11-09T20:59:59')), false);
assert.equal(gs.mi_isOpen(T('2026-11-09T21:00:00')), true);
assert.equal(gs.mi_baseDocsDeadline('2026-12-12'), baseDocsDeadline('2026-12-12'));
assert.equal(gs.mi_toMs_('2026-11-09 21:30'), T('2026-11-09T21:30:00'));

const gsRows: any[] = [];
for (let i = 1; i <= 6; i += 1) {
  const st = gs.mi_initialStatus(gsRows, '2026-12-12', '10:00');
  gsRows.push({
    id: `g${i}`, appliedAt: open + i, kind: '예약', date: '2026-12-12', time: '10:00', status: st,
    payDeadline: st === '입금 대기' ? open + i + HOUR : null, holdStartedAt: null, docsDeadline: st === '입금 대기' ? baseDocsDeadline('2026-12-12') : null,
    paidChecked: false, paidAt: null, unpaidChecked: false, docsReceived: false, cancelReason: '', log: [],
  });
}
assert.deepEqual(gsRows.map((r) => r.status), ['입금 대기', '입금 대기', '입금 대기', '입금 대기', '대기', '대기']);
gsRows[0].paidChecked = true; gsRows[0].paidAt = open + 60000;
gsRows[1].paidChecked = true; gsRows[1].paidAt = gsRows[1].payDeadline + 1;
gsRows[2].unpaidChecked = true;
gs.mi_sweep(gsRows, later);
assert.deepEqual(gsRows.map((r) => r.status), ['확정', '취소', '취소', '입금 대기', '입금 대기', '입금 대기']);
assert.equal(gsRows[4].payDeadline, later + HOUR);
assert.equal(gs.mi_summarize(gsRows, later)[0].left, 0);
assert.deepEqual([...gs.mi_validate({ ...good, kind: '예약' })], []);
assert.equal(gs.mi_validate({ ...good, kind: '예약', consentVideo: false }).length, 1);

console.log('✅ mock interview slot/waitlist/deadline tests passed');
