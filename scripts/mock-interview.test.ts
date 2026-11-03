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
  payGraceEnd,
  isUnpaidCancel,
  heldCount,
  validateForm,
  validateExtraRequest,
  extraRequestPurgeAt,
  EMPTY_EXTRA_REQUEST,
  OTHER_CHOICE,
  wishDateOf,
  wishTimeOf,
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
for (let i = 1; i <= 6; i += 1) rows.push(newBookingRow(rows, `r${i}`, '2026-12-12', '16:00', open + i * 1000));
assert.deepEqual(rows.map((r) => r.status), ['입금 대기', '입금 대기', '입금 대기', '입금 대기', '대기', '대기']);
assert.equal(rows[0].payDeadline, open + 1000 + HOUR);
assert.equal(waitlistPosition(rows, 'r5'), 1);
assert.equal(waitlistPosition(rows, 'r6'), 2);
let s = summarize(rows, open).find((x) => x.date === '2026-12-12' && x.time === '16:00')!;
assert.equal(s.left, 0);
assert.equal(s.waitlist, 2);
// 다른 타임은 영향 없음
assert.equal(initialStatusFor(rows, '2026-12-12', '17:00'), MI_STATUS.pending);

/* ---- 입금 기한 + 10분까지는 자리 유지 ---- */
const GRACE = MI_CONFIG.payGraceMs;
assert.equal(GRACE, 10 * 60000);
const later = open + 2 * HOUR;
let inGrace = sweep(rows, rows[0].payDeadline! + 9 * 60000);
assert.equal(inGrace[0].status, MI_STATUS.pending, '기한 + 10분 안에는 자동 취소하지 않음');
inGrace = sweep(rows, payGraceEnd(rows[0].payDeadline!));
assert.equal(inGrace[0].status, MI_STATUS.pending, '기한 + 10분 정각도 아직 유지');

/* ---- 기한 안 입금 → 확정, 10분 안 입금 → 확정, 10분 뒤 입금 → 확인 필요, 미입금 → 자동 취소 + 대기 승격 ---- */
rows[0] = { ...rows[0], paidChecked: true, paidAt: open + 30 * 60000 };
rows[1] = { ...rows[1], paidChecked: true, paidAt: rows[1].payDeadline! + 9 * 60000 };
rows[2] = { ...rows[2], paidChecked: true, paidAt: rows[2].payDeadline! + 11 * 60000 };
rows = sweep(rows, later);
assert.equal(rows[0].status, MI_STATUS.confirmed);
assert.equal(rows[1].status, MI_STATUS.confirmed, '기한 + 10분 안 입금은 제때 입금');
assert.equal(rows[2].status, MI_STATUS.check, '기한 + 10분 뒤 입금은 확인 필요');
assert.match(rows[2].checkReason!, /\+ 10분 뒤 입금/);
assert.equal(rows[3].status, MI_STATUS.cancelled, '입금 확정 없이 기한 + 10분이 지나면 자동 취소');
assert.match(rows[3].cancelReason, /^미입금\(입금 기한 .* \+ 10분 지남\)$/);
assert.ok(isUnpaidCancel(rows[3].cancelReason));
assert.match(rows[3].log.join('\n'), /취소: 미입금/);
assert.equal(rows[4].status, MI_STATUS.pending, '대기 1번 승격');
assert.equal(rows[4].payDeadline, later + HOUR, '승격 시각부터 새 1시간');
assert.equal(rows[4].holdStartedAt, later);
assert.equal(rows[5].status, MI_STATUS.pending, '대기 2번도 승격(빈자리 2개: 확인 필요 줄은 자리를 잡지 않음)');
assert.equal(summarize(rows, later)[0].left, 0);
// 승격된 학생도 새 기한 + 10분이 지나면 자동 취소
let promoted = sweep(rows, later + HOUR + GRACE + 1);
assert.equal(promoted[4].status, MI_STATUS.cancelled);
// 미입금 취소 뒤 입금 확정 → 확인 필요(자동 예약 없음)
rows[3] = { ...rows[3], paidChecked: true };
rows = sweep(rows, later + 60000);
assert.equal(rows[3].status, MI_STATUS.check);
assert.match(rows[3].checkReason!, /미입금 취소 뒤 입금 확정/);
assert.equal(heldCount(rows, '2026-12-12', '16:00'), 4, '확인 필요 줄은 자리를 잡지 않음');
// 입금 시각 없이 기한 + 10분 뒤에 입금 확정 체크 → 확인 필요
let lateCheck: MiRow[] = [newBookingRow([], 'l1', '2026-12-13', '18:00', open)];
lateCheck[0] = { ...lateCheck[0], paidChecked: true };
lateCheck = sweep(lateCheck, payGraceEnd(lateCheck[0].payDeadline!) + 1);
assert.equal(lateCheck[0].status, MI_STATUS.check);
// '미입금' 체크(손으로)는 기한이 지나면 10분을 기다리지 않고 바로 취소
let manualUnpaid: MiRow[] = [newBookingRow([], 'u1', '2026-12-13', '18:00', open)];
manualUnpaid[0] = { ...manualUnpaid[0], unpaidChecked: true };
manualUnpaid = sweep(manualUnpaid, manualUnpaid[0].payDeadline! + 60000);
assert.equal(manualUnpaid[0].status, MI_STATUS.cancelled);
assert.equal(manualUnpaid[0].cancelReason, '미입금(미입금 체크)');

/* ---- 기한 전 '미입금' 표시는 무시 ---- */
let early: MiRow[] = [newBookingRow([], 'e1', '2026-12-13', '16:00', open)];
early[0] = { ...early[0], unpaidChecked: true };
early = sweep(early, open + 10 * 60000);
assert.equal(early[0].status, MI_STATUS.pending);

/* ---- 서류: 7일 전 23:59 까지, 없으면 확정 취소 + 대기 승격 ---- */
assert.equal(formatShortKst(baseDocsDeadline('2026-12-12')), '12/5(토) 23:59');
let docs: MiRow[] = [];
for (let i = 1; i <= 5; i += 1) docs.push(newBookingRow(docs, `d${i}`, '2026-12-19', '18:00', open + i));
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
docs = sweep(docs, afterDocs + 60000);
assert.equal(docs.filter((r) => r.cancelReason === '서류 미제출' && r.status === MI_STATUS.cancelled).length, 3, '서류 미제출 취소(입금 확정 있음)는 확인 필요로 바꾸지 않음');
assert.equal(docsDeadlineFor('2026-12-19', open), baseDocsDeadline('2026-12-19'));

/* ---- 면접 24시간 전에는 승격하지 않음 ---- */
let close: MiRow[] = [];
for (let i = 1; i <= 5; i += 1) close.push(newBookingRow(close, `c${i}`, '2026-12-20', '16:00', open + i));
close[0] = { ...close[0], unpaidChecked: true };
close = sweep(close, T('2026-12-19T16:30:00'));
assert.equal(close[0].status, MI_STATUS.cancelled);
assert.equal(close[4].status, MI_STATUS.waitlist);

/* ---- 신청서 검사 ---- */
const good: MiForm = {
  ...EMPTY_FORM,
  date: '2026-12-12',
  time: '16:00',
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
assert.ok(validateForm({ ...good, time: '11:00' }).length > 0, '11시는 예약 불가');
assert.ok(validateForm({ ...good, time: '10:00' }).length > 0, '예전 10시 없음');
assert.ok(validateForm({ ...good, depositor: '' }).length > 0);
assert.deepEqual([...MI_CONFIG.times], ['16:00', '17:00', '18:00']);
assert.ok(!('openRequestTime' in MI_CONFIG), '11시 열어주세요 설정은 없앰');
assert.match(MI_CONFIG.bankAccount, /카카오뱅크 3333-38-6269721/);

/* ---- 입금 확정 체크만으로 확정(기본: 손으로 확인) ---- */
let manual: MiRow[] = [newBookingRow([], 'm1', '2026-12-13', '17:00', open)];
manual[0] = { ...manual[0], paidChecked: true };
manual = sweep(manual, open + 5 * 60000);
assert.equal(manual[0].status, MI_STATUS.confirmed, '입금 시각 없이 입금 확정만 체크해도 확정');

/* ---- 추가 날짜·시간 오픈 신청 ---- */
const orGood = { ...EMPTY_EXTRA_REQUEST, date: '2026-12-12', time: '11:00', name: '홍길동', phone: '01012345678', consentPrivacy: true };
assert.deepEqual(validateExtraRequest(orGood), []);
assert.equal(validateExtraRequest({ ...orGood, consentPrivacy: false }).length, 1);
assert.equal(validateExtraRequest({ ...orGood, date: '2026-12-14' }).length, 1, '목록 밖 날짜는 직접 적기로만');
assert.equal(validateExtraRequest({ ...orGood, time: '' }).length, 1);
const orFree = { ...orGood, date: OTHER_CHOICE, dateText: ' 12/26(토) ', time: OTHER_CHOICE, timeText: '오전 아무 때나' };
assert.deepEqual(validateExtraRequest(orFree), []);
assert.equal(wishDateOf(orFree), '12/26(토)');
assert.equal(wishTimeOf(orFree), '오전 아무 때나');
assert.equal(validateExtraRequest({ ...orFree, dateText: '  ' }).length, 1);
assert.equal(validateExtraRequest({ ...orFree, timeText: '' }).length, 1);
assert.equal(validateExtraRequest({ ...orGood, under14: true }).length, 3, '만 14세 미만은 보호자 이름·연락처·동의');
assert.deepEqual(validateExtraRequest({ ...orGood, under14: true, guardianName: '홍부모', guardianPhone: '01099998888', guardianConsent: true }), []);
assert.equal(formatShortKst(extraRequestPurgeAt()), '12/20(일) 23:59');
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
  const st = gs.mi_initialStatus(gsRows, '2026-12-12', '16:00');
  gsRows.push({
    id: `g${i}`, appliedAt: open + i, kind: '예약', date: '2026-12-12', time: '16:00', status: st,
    payDeadline: st === '입금 대기' ? open + i + HOUR : null, holdStartedAt: null, docsDeadline: st === '입금 대기' ? baseDocsDeadline('2026-12-12') : null,
    paidChecked: false, paidAt: null, unpaidChecked: false, docsReceived: false, cancelReason: '', log: [],
  });
}
assert.deepEqual(gsRows.map((r) => r.status), ['입금 대기', '입금 대기', '입금 대기', '입금 대기', '대기', '대기']);
gsRows[0].paidChecked = true; gsRows[0].paidAt = open + 60000;
gsRows[1].paidChecked = true; gsRows[1].paidAt = gsRows[1].payDeadline + GRACE + 1;
gsRows[2].unpaidChecked = true;
gs.mi_sweep(gsRows, later);
assert.deepEqual(gsRows.map((r) => r.status), ['확정', '확인 필요', '취소', '취소', '입금 대기', '입금 대기']);
assert.equal(gsRows[1].justNeedsCheck, true, '확인 필요는 세연님 메일 대상');
assert.match(gsRows[3].cancelReason, /^미입금\(입금 기한/);
assert.equal(gsRows[4].justPromoted, true);
assert.equal(gs.ST.check, MI_STATUS.check);
assert.equal(gs.MI.PAY_GRACE_MS, MI_CONFIG.payGraceMs);
assert.equal(gs.COLS[gs.COLS.length - 1], '확인 필요 사유', '새 열은 맨 뒤');
// GS·TS sweep 일치(여러 경우)
{
  const base = (id: string, extra: Partial<MiRow>): MiRow => ({ ...newBookingRow([], id, '2026-12-19', '17:00', open), ...extra });
  const cases: Array<[Partial<MiRow>, number]> = [
    [{}, open + HOUR + GRACE],
    [{}, open + HOUR + GRACE + 1],
    [{ paidChecked: true }, open + HOUR + GRACE],
    [{ paidChecked: true }, open + HOUR + GRACE + 1],
    [{ paidChecked: true, paidAt: open + HOUR + GRACE }, open + 3 * HOUR],
    [{ paidChecked: true, paidAt: open + HOUR + GRACE + 1 }, open + 3 * HOUR],
    [{ paidAt: open + HOUR + GRACE + 1 }, open + HOUR + 5 * 60000],
    [{ unpaidChecked: true }, open + HOUR + 1],
    [{ unpaidChecked: true }, open + HOUR - 1],
    [{ status: MI_STATUS.cancelled, cancelReason: '미입금(미입금 체크)', paidChecked: true }, open + 3 * HOUR],
    [{ status: MI_STATUS.cancelled, cancelReason: '1시간 안에 입금하지 않음', paidAt: open + 2 * HOUR }, open + 3 * HOUR],
    [{ status: MI_STATUS.cancelled, cancelReason: '본인 취소', paidChecked: true }, open + 3 * HOUR],
  ];
  for (const [extra, now] of cases) {
    const ts = sweep([base('p', extra)], now)[0];
    const g = [{ ...base('p', extra) }] as any[];
    g[0].log = [...g[0].log];
    gs.mi_sweep(g, now);
    assert.deepEqual([g[0].status, g[0].cancelReason, g[0].checkReason || '', [...g[0].log]],
      [ts.status, ts.cancelReason, ts.checkReason || '', ts.log], `GS·TS sweep 일치 ${JSON.stringify(extra)} @${now}`);
  }
}
assert.equal(gsRows[4].payDeadline, later + HOUR);
assert.equal(gs.mi_summarize(gsRows, later)[0].left, 1, '확정 1 + 승격 2, 빈자리 1');
assert.deepEqual([...gs.mi_validate({ ...good, kind: '예약' })], []);
assert.equal(gs.mi_validate({ ...good, kind: '예약', consentVideo: false }).length, 1);
assert.deepEqual([...gs.MI.EXTRA_REQUEST_TIMES], [...MI_CONFIG.extraRequestTimes]);
assert.equal(gs.MI.EXTRA_REQUEST_KEEP_UNTIL, MI_CONFIG.extraRequestKeepUntil);
assert.equal(gs.MI.EXTRA_REQUEST_SHEET, '추가 오픈 신청');
assert.equal(gs.MI.EXTRA_REQUEST_PURPOSE, '대기·추가 타임 연락');
assert.equal(gs.MI.OPEN_REQUEST_TIME, undefined);
assert.equal(gs.MI.FEE, MI_CONFIG.fee);
assert.equal(gs.MI.AUTO_DEPOSIT_CHECK, false, '입금알림 자동 확인은 기본 꺼짐');
assert.equal(gs.mi_extraRequestPurgeAt(), extraRequestPurgeAt());
for (const f of [orGood, orFree, { ...orGood, date: '2026-12-14' }, { ...orFree, timeText: '' }, { ...orGood, under14: true }]) {
  assert.deepEqual([...gs.mi_validateExtraRequest(f)], validateExtraRequest(f), 'GS·TS 추가 오픈 검사 일치');
}
assert.equal(gs.mi_wishDateOf(orFree), wishDateOf(orFree));
assert.equal(gs.mi_wishTimeOf(orFree), wishTimeOf(orFree));
assert.deepEqual([...gs.EXTRA_REQ_COLS.slice(2, 6)], ['희망 날짜', '희망 시간', '이름', '연락처']);
assert.ok(gs.EXTRA_REQ_COLS.includes('보호자 동의') && gs.EXTRA_REQ_COLS.includes('보관 기한'));
// 입금 확정 체크만으로 확정
const gm: any[] = [{ id: 'x', appliedAt: open, kind: '예약', date: '2026-12-12', time: '16:00', status: '입금 대기', payDeadline: open + HOUR,
  holdStartedAt: open, docsDeadline: baseDocsDeadline('2026-12-12'), paidChecked: true, paidAt: null, unpaidChecked: false, docsReceived: false, cancelReason: '', log: [] }];
gs.mi_sweep(gm, open + 60000);
assert.equal(gm[0].status, '확정');
assert.equal(gm[0].justConfirmed, true);
// [입금알림] 파서(선택 기능)
const p1 = gs.mi_parseDepositMail('[카카오뱅크]\n입금 80,000원\n홍길동\n잔액 123,456원', 5);
assert.deepEqual({ ...p1 }, { amount: 80000, name: '홍길동', at: 5 });
const p2 = gs.mi_parseDepositMail('[카카오뱅크] 입금 80,000원 김 철수', 6);
assert.equal(p2.name, '김철수');
assert.equal(gs.mi_parseDepositMail('[카카오뱅크] 출금 80,000원 홍길동', 1), null);
const pend = [{ kind: '예약', status: '입금 대기', paidChecked: false, depositor: '홍길동', holdStartedAt: 0, id: 'a' },
  { kind: '예약', status: '입금 대기', paidChecked: false, depositor: '이영희', holdStartedAt: 0, id: 'b' }];
assert.equal(gs.mi_matchDeposit(pend, { amount: 80000, name: '홍길동', at: 10 }).id, 'a');
assert.equal(gs.mi_matchDeposit(pend, { amount: 70000, name: '홍길동', at: 10 }), null);
assert.equal(gs.mi_matchDeposit([...pend, { ...pend[0], id: 'c' }], { amount: 80000, name: '홍길동', at: 10 }), null, '2건이면 손으로');

console.log('✅ mock interview slot/waitlist/deadline tests passed');
