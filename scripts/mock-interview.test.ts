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
  waitlistPromotionText,
  slotMonthDayHour,
  heldCount,
  validateForm,
  validateExtraRequest,
  extraRequestPurgeAt,
  EMPTY_WISH,
  extraRequestFrom,
  toggleSlot,
  toggleValue,
  validateWish,
  payUnitKey,
  OTHER_CHOICE,
  wishDateOf,
  wishTimeOf,
  waitlistPosition,
  isGated,
  publicSlots,
  findActiveDuplicate,
  docsDeadlineExample,
  msUntilOpen,
  checkLinkSearch,
  statusLabel,
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
for (let i = 1; i <= 6; i += 1) rows.push(newBookingRow(rows, `r${i}`, '2026-12-13', '16:00', open + i * 1000));
assert.deepEqual(rows.map((r) => r.status), ['입금 대기', '입금 대기', '입금 대기', '입금 대기', '대기', '대기']);
assert.equal(rows[0].payDeadline, open + 1000 + HOUR);
assert.equal(waitlistPosition(rows, 'r5'), 1);
assert.equal(waitlistPosition(rows, 'r6'), 2);
let s = summarize(rows, open).find((x) => x.date === '2026-12-13' && x.time === '16:00')!;
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
assert.equal(MI_CONFIG.promotedPayWindowMs, 8 * HOUR, '대기 승격 입금 기한은 8시간');
assert.equal(rows[4].payDeadline, later + 8 * HOUR, '승격 시각부터 새 8시간');
assert.equal(rows[4].promotedFrom, 1);
assert.equal(rows[5].promotedFrom, 2);
assert.match(rows[4].log.join('\n'), /대기 1번에서 입금 대기로 승격/);
assert.equal(rows[4].holdStartedAt, later);
assert.equal(rows[5].status, MI_STATUS.pending, '대기 2번도 승격(빈자리 2개: 확인 필요 줄은 자리를 잡지 않음)');
assert.equal(summarize(rows, later).find((x) => x.date === '2026-12-13' && x.time === '16:00')!.left, 0);
// 승격된 학생도 새 기한 + 10분이 지나면 자동 취소
assert.equal(sweep(rows, later + 8 * HOUR + GRACE - 1)[4].status, MI_STATUS.pending, '8시간 + 10분 안에는 그대로');
let promoted = sweep(rows, later + 8 * HOUR + GRACE + 1);
assert.equal(promoted[4].status, MI_STATUS.cancelled);
assert.equal(promoted[4].promotedFrom, undefined, '승격 표시는 그 정리에서만');
// 미입금 취소 뒤 입금 확정 → 확인 필요(자동 예약 없음)
rows[3] = { ...rows[3], paidChecked: true };
rows = sweep(rows, later + 60000);
assert.equal(rows[3].status, MI_STATUS.check);
assert.match(rows[3].checkReason!, /미입금 취소 뒤 입금 확정/);
assert.equal(heldCount(rows, '2026-12-13', '16:00'), 4, '확인 필요 줄은 자리를 잡지 않음');
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

/* ---- 서류: 7일 전 23:59 까지. 서류가 없어도 확정은 그대로(세연님 11/3: 당일 즉석 질문으로 진행) ---- */
assert.equal(MI_CONFIG.cancelWithoutDocs, false);
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
assert.equal(docs.filter((r) => r.status === MI_STATUS.confirmed).length, 4, '서류가 없어도 취소하지 않음');
assert.equal(docs.filter((r) => r.cancelReason === '서류 미제출').length, 0);
assert.equal(docs[4].status, MI_STATUS.waitlist, '빈자리가 없으니 대기 그대로');
// 다른 사유로 자리가 나서 서류 기한 뒤에 승격되면 서류 기한은 24시간
docs[0] = { ...docs[0], status: MI_STATUS.cancelled, cancelReason: '본인 취소' };
docs = sweep(docs, afterDocs + 60000);
assert.equal(docs[4].status, MI_STATUS.pending, '대기자 승격');
assert.equal(docs[4].docsDeadline, afterDocs + 60000 + MI_CONFIG.docsGraceMs, '서류 기한이 지난 뒤 승격하면 24시간');
const docsForGs = docs.slice(1, 4).map((r) => ({ ...r, log: [...r.log] }));
const docsAfterForGs = afterDocs + 120000;
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
  slots: [{ date: '2026-12-13', time: '16:00' }],
  studentName: '홍길동',
  school: '○○외고',
  track: '일반전형',
  phone: '010-1234-5678',
  consentPrivacy: true,
  consentVideo: true,
  consentPhoto: true,
};
assert.deepEqual(validateForm(good), []);
assert.equal(validateForm({ ...good, consentPhoto: false }, true).length, 1);
assert.deepEqual(validateForm({ ...good, consentPhoto: false }, false), []);
assert.deepEqual(validateForm({ ...good, under14: true } as typeof good), [], '만 14세 미만 칸은 없앴습니다(값이 와도 무시)');
assert.ok(!('under14' in EMPTY_FORM) && !('guardianName' in EMPTY_FORM));
assert.ok(validateForm({ ...good, slots: [{ date: '2026-12-12', time: '11:00' }] }).length > 0, '11시는 예약 불가');
assert.ok(validateForm({ ...good, slots: [{ date: '2026-12-12', time: '10:00' }] }).length > 0, '예전 10시 없음');
// 여러 타임
const multi: MiForm = { ...good, slots: [{ date: '2026-12-13', time: '18:00' }, { date: '2026-12-13', time: '16:00' }] };
assert.deepEqual(validateForm(multi), []);
assert.equal(validateForm({ ...good, slots: [good.slots[0], good.slots[0]] }).length, 1, '같은 타임 두 번');
assert.equal(validateForm({ ...good, slots: [] }).length, 1, '타임도 추가 오픈 신청도 없음');
// 추가 오픈 신청만: 입금자명·영상·사진 동의는 받지 않음
const extraOnly: MiForm = { ...good, slots: [], extraDates: ['2026-12-19', OTHER_CHOICE], consentVideo: false, consentPhoto: false };
assert.deepEqual(validateForm(extraOnly), []);
assert.equal(validateForm({ ...extraOnly, consentPrivacy: false }).length, 1, '개인정보 동의는 늘 필요');
assert.equal(validateForm({ ...extraOnly, extraDates: ['2026-12-14'] }).length, 1, '목록 밖 날짜 값');
// 토글
assert.deepEqual(toggleSlot(toggleSlot([], '2026-12-13', '16:00'), '2026-12-12', '17:00'), [
  { date: '2026-12-13', time: '16:00' }, { date: '2026-12-12', time: '17:00' }]);
assert.deepEqual(toggleSlot([{ date: '2026-12-13', time: '16:00' }], '2026-12-13', '16:00'), [], '다시 누르면 선택 취소');
assert.deepEqual(toggleValue(toggleValue([], 'a'), 'a'), []);
assert.ok(!('date' in EMPTY_FORM) && !('time' in EMPTY_FORM), '신청서에 날짜·시간 칸 없음');
assert.deepEqual([...MI_CONFIG.times], ['16:00', '17:00', '18:00']);
assert.ok(!('openRequestTime' in MI_CONFIG), '11시 열어주세요 설정은 없앰');
assert.match(MI_CONFIG.bankAccount, /카카오뱅크 3333-38-6269721/);

/* ---- 입금 확정 체크만으로 확정(기본: 손으로 확인) ---- */
let manual: MiRow[] = [newBookingRow([], 'm1', '2026-12-13', '17:00', open)];
manual[0] = { ...manual[0], paidChecked: true };
manual = sweep(manual, open + 5 * 60000);
assert.equal(manual[0].status, MI_STATUS.confirmed, '입금 시각 없이 입금 확정만 체크해도 확정');

/* ---- 추가 날짜·시간 오픈 신청(신청완료 화면에서 여러 개 고름) ---- */
const orGood = extraRequestFrom(extraOnly, { ...EMPTY_WISH, dates: ['2026-12-19', '2026-12-12'], times: ['11:00', '10:00'] }, 'MI-1');
assert.equal(orGood.name, '홍길동');
assert.equal(orGood.applicationId, 'MI-1');
assert.deepEqual(validateExtraRequest(orGood), []);
assert.equal(wishDateOf(orGood), '2026-12-12, 2026-12-19', '날짜 순');
assert.equal(wishTimeOf(orGood), '10:00, 11:00', '시간 순');
assert.equal(validateExtraRequest({ ...orGood, consentPrivacy: false }).length, 1);
assert.equal(validateExtraRequest({ ...orGood, dates: ['2026-12-14'] }).length, 1, '목록 밖 날짜는 직접 적기로만');
assert.equal(validateExtraRequest({ ...orGood, times: [] }).length, 1);
const orFree = { ...orGood, dates: [], dateText: ' 12/26(토) ', times: [], timeText: '오전 아무 때나' };
assert.deepEqual(validateExtraRequest(orFree), []);
assert.equal(wishDateOf(orFree), '12/26(토)');
assert.equal(wishTimeOf(orFree), '오전 아무 때나');
assert.equal(wishDateOf({ dates: ['2026-12-20'], dateText: '12/27' }), '2026-12-20, 12/27', '고른 날짜 + 직접 적기');
assert.equal(validateExtraRequest({ ...orFree, dateText: '  ' }).length, 1);
assert.equal(validateExtraRequest({ ...orFree, timeText: '' }).length, 1);
assert.deepEqual(validateWish(EMPTY_WISH), ['원하는 날짜를 하나 이상 고르거나 적어 주세요.', '원하는 시간을 하나 이상 고르거나 적어 주세요.']);
assert.deepEqual(validateExtraRequest({ ...orGood, under14: true, guardianName: '' } as typeof orGood), [], '보호자 칸 없음');

/* ---- 묶음(한 번에 여러 타임): 한 번에 입금, 묶음 단위로 확정·취소 ---- */
{
  let g: MiRow[] = [];
  g.push(newBookingRow(g, 'G1-1', '2026-12-13', '16:00', open, 'G1'));
  g.push(newBookingRow(g, 'G1-2', '2026-12-12', '17:00', open, 'G1'));
  g.push(newBookingRow(g, 'S1', '2026-12-12', '18:00', open));
  assert.equal(payUnitKey(g[0]), payUnitKey(g[1]));
  assert.notEqual(payUnitKey(g[0]), payUnitKey(g[2]));
  const one = sweep(g.map((r, i) => (i === 1 ? { ...r, paidChecked: true, paidAt: open + 60000 } : r)), open + 2 * 60000);
  assert.deepEqual(one.map((r) => r.status), ['확정', '확정', '입금 대기'], '한 줄만 입금 확정해도 묶음 전체 확정');
  assert.equal(one[0].paidChecked, false, '다른 줄의 입금 확정 칸은 건드리지 않음');
  const late = sweep(g, open + HOUR + GRACE + 1);
  assert.deepEqual(late.map((r) => r.status), ['취소', '취소', '취소'], '묶음 전체 자동 취소');
  const lateCheck = sweep(g.map((r, i) => (i === 0 ? { ...r, paidAt: open + HOUR + GRACE + 1 } : r)), open + HOUR + GRACE + 2);
  assert.deepEqual(lateCheck.map((r) => r.status), ['확인 필요', '확인 필요', '취소']);
  // 대기 타임은 승격 때 새 기한을 받아 따로 묶임
  let w: MiRow[] = [];
  for (let i = 1; i <= 4; i += 1) w.push(newBookingRow(w, `f${i}`, '2026-12-13', '16:00', open));
  w.push(newBookingRow(w, 'G2-1', '2026-12-13', '16:00', open + 1, 'G2'));
  w.push(newBookingRow(w, 'G2-2', '2026-12-13', '17:00', open + 1, 'G2'));
  assert.deepEqual(w.slice(4).map((r) => r.status), ['대기', '입금 대기']);
  w = sweep(w.map((r) => (r.id === 'f1' ? { ...r, unpaidChecked: true } : r)), open + HOUR + 1);
  assert.equal(w[4].status, '입금 대기', '대기에서 승격');
  assert.notEqual(payUnitKey(w[4]), payUnitKey(w[5]), '승격 줄은 새 기한으로 따로 묶임');
}
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
  const st = gs.mi_initialStatus(gsRows, '2026-12-13', '16:00');
  gsRows.push({
    id: `g${i}`, appliedAt: open + i, kind: '예약', date: '2026-12-13', time: '16:00', status: st,
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
assert.deepEqual([...gs.COLS.slice(-3)], ['확인 필요 사유', '묶음 번호', '확인 키'], '새 열은 맨 뒤(확인 키가 마지막)');
assert.ok(gs.SCRIPT_OWNED.includes('확인 키'));
assert.equal(gs.EXTRA_REQ_COLS[gs.EXTRA_REQ_COLS.length - 1], '모의면접 신청번호');
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
assert.equal(gsRows[4].payDeadline, later + 8 * HOUR);
assert.equal(gs.MI.PROMOTED_PAY_WINDOW_MS, MI_CONFIG.promotedPayWindowMs);
assert.equal(gs.MI.CANCEL_WITHOUT_DOCS, MI_CONFIG.cancelWithoutDocs);
assert.equal(gs.mi_summarize(gsRows, later).find((x: any) => x.date === '2026-12-13' && x.time === '16:00').left, 1, '확정 1 + 승격 2, 빈자리 1');
for (const f of [good, multi, extraOnly, { ...good, slots: [] }, { ...good, consentVideo: false }, { ...good, slots: [good.slots[0], good.slots[0]] },
  { ...extraOnly, extraDates: ['2026-12-14'] }, { ...good, under14: true, guardianName: '' } as typeof good, { ...good, slots: [{ date: '2026-12-12', time: '11:00' }] }]) {
  assert.deepEqual([...gs.mi_validate(f)], validateForm(f), `GS·TS 신청서 검사 일치 ${JSON.stringify(f.slots)}`);
}
assert.deepEqual([...gs.MI.EXTRA_REQUEST_TIMES], [...MI_CONFIG.extraRequestTimes]);
assert.equal(gs.MI.EXTRA_REQUEST_KEEP_UNTIL, MI_CONFIG.extraRequestKeepUntil);
assert.equal(gs.MI.EXTRA_REQUEST_SHEET, '추가 오픈 신청');
assert.equal(gs.MI.EXTRA_REQUEST_PURPOSE, '대기·추가 타임 연락');
assert.equal(gs.MI.OPEN_REQUEST_TIME, undefined);
assert.equal(gs.MI.FEE, MI_CONFIG.fee);
assert.equal(gs.MI.AUTO_DEPOSIT_CHECK, false, '입금알림 자동 확인은 기본 꺼짐');
assert.equal(gs.mi_extraRequestPurgeAt(), extraRequestPurgeAt());
for (const f of [orGood, orFree, { ...orGood, dates: ['2026-12-14'] }, { ...orFree, timeText: '' }, { ...orGood, under14: true, guardianName: '' } as typeof orGood, { ...orGood, dates: [], times: [] }]) {
  assert.deepEqual([...gs.mi_validateExtraRequest(f)], validateExtraRequest(f), 'GS·TS 추가 오픈 검사 일치');
}
assert.equal(gs.mi_wishDateOf(orFree), wishDateOf(orFree));
assert.equal(gs.mi_wishTimeOf(orFree), wishTimeOf(orFree));
assert.equal(gs.mi_wishDateOf(orGood), wishDateOf(orGood));
assert.equal(gs.mi_wishTimeOf(orGood), wishTimeOf(orGood));
assert.deepEqual([...gs.EXTRA_REQ_COLS.slice(2, 6)], ['희망 날짜', '희망 시간', '이름', '연락처']);
assert.ok(gs.EXTRA_REQ_COLS.includes('보호자 동의') && gs.EXTRA_REQ_COLS.includes('보관 기한'));
// 입금 확정 체크만으로 확정
const gm: any[] = [{ id: 'x', appliedAt: open, kind: '예약', date: '2026-12-13', time: '16:00', status: '입금 대기', payDeadline: open + HOUR,
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
const pend = [{ kind: '예약', status: '입금 대기', paidChecked: false, depositor: '홍길동', holdStartedAt: 0, payDeadline: HOUR, id: 'a' },
  { kind: '예약', status: '입금 대기', paidChecked: false, depositor: '이영희', holdStartedAt: 0, payDeadline: HOUR, id: 'b' }];
assert.deepEqual([...gs.mi_matchDeposit(pend, { amount: 80000, name: '홍길동', at: 10 }).map((r: any) => r.id)], ['a']);
assert.equal(gs.mi_matchDeposit(pend, { amount: 70000, name: '홍길동', at: 10 }), null);
assert.equal(gs.mi_matchDeposit([...pend, { ...pend[0], id: 'c' }], { amount: 80000, name: '홍길동', at: 10 }), null, '2건이면 손으로');
const grp = [{ ...pend[0], id: 'G-1', groupId: 'G' }, { ...pend[0], id: 'G-2', groupId: 'G' }];
assert.deepEqual([...gs.mi_matchDeposit(grp, { amount: 160000, name: '홍길동', at: 10 }).map((r: any) => r.id)], ['G-1', 'G-2'], '묶음은 합계 금액');
assert.equal(gs.mi_matchDeposit(grp, { amount: 80000, name: '홍길동', at: 10 }), null, '묶음 일부 금액은 손으로');
// GS·TS 묶음 sweep 일치
{
  const mk = (): MiRow[] => {
    const g: MiRow[] = [];
    g.push(newBookingRow(g, 'G1-1', '2026-12-13', '16:00', open, 'G1'));
    g.push(newBookingRow(g, 'G1-2', '2026-12-12', '17:00', open, 'G1'));
    return g;
  };
  const variants: Array<[(g: MiRow[]) => MiRow[], number]> = [
    [(g) => g.map((r, i) => (i === 1 ? { ...r, paidChecked: true } : r)), open + 60000],
    [(g) => g, open + HOUR + GRACE + 1],
    [(g) => g.map((r, i) => (i === 0 ? { ...r, unpaidChecked: true } : r)), open + HOUR + 1],
    [(g) => g.map((r, i) => (i === 0 ? { ...r, paidChecked: true, paidAt: open + HOUR + GRACE + 5 } : r)), open + 3 * HOUR],
  ];
  for (const [fn, now] of variants) {
    const ts = sweep(fn(mk()), now);
    const g = fn(mk()).map((r) => ({ ...r, log: [...r.log] })) as any[];
    gs.mi_sweep(g, now);
    assert.deepEqual(JSON.parse(JSON.stringify(g.map((r) => [r.status, r.cancelReason, r.checkReason || '', [...r.log]]))),
      ts.map((r) => [r.status, r.cancelReason, r.checkReason || '', r.log]), `GS·TS 묶음 sweep 일치 @${now}`);
  }
}

/* ---- 11/3 결정: 오픈 때부터 대기인 타임, 숫자 숨김, 중복 신청, 확인 링크 ---- */
{
  assert.deepEqual([...MI_CONFIG.waitlistAtOpen], ['2026-12-12 16:00', '2026-12-20 18:00']);
  const g: MiRow[] = [];
  assert.equal(isGated(g, '2026-12-12', '16:00'), true);
  assert.equal(isGated(g, '2026-12-12', '17:00'), false);
  g.push(newBookingRow(g, 'W1', '2026-12-12', '16:00', open + 1000));
  assert.equal(g[0].status, MI_STATUS.waitlist, '오픈 때부터 대기 타임은 첫 신청도 대기');
  assert.equal(sweep(g, open + 2000)[0].status, MI_STATUS.waitlist, '1명일 때는 그대로 대기');
  g.push(newBookingRow(g, 'W2', '2026-12-12', '16:00', open + 3000));
  assert.equal(g[1].status, MI_STATUS.waitlist);
  assert.equal(isGated(g, '2026-12-12', '16:00'), false, '대기 2명이면 풀림');
  const rel = sweep(g, open + 4000);
  assert.deepEqual(rel.map((r) => r.status), [MI_STATUS.pending, MI_STATUS.pending], '2명 모두 입금 대기로 승격(신청 순서)');
  assert.equal(rel[0].payDeadline, open + 4000 + 8 * HOUR, '입금 8시간은 승격 시각부터');
  assert.deepEqual(rel.map((r) => r.promotedFrom), [1, 2], '대기 순번 기록');
  assert.equal(isGated(rel, '2026-12-12', '16:00'), false, '한 번 풀리면 다시 잠기지 않음');
  // GS 와 같음
  const gg = [newBookingRow([], 'W1', '2026-12-12', '16:00', open + 1000)].map((r) => ({ ...r, log: [...r.log] })) as any[];
  assert.equal(gs.mi_initialStatus([], '2026-12-12', '16:00'), MI_STATUS.waitlist);
  assert.equal(gs.mi_initialStatus([], '2026-12-20', '18:00'), MI_STATUS.waitlist);
  assert.equal(gs.mi_initialStatus([], '2026-12-20', '17:00'), MI_STATUS.pending);
  gg.push({ ...newBookingRow(gg, 'W2', '2026-12-12', '16:00', open + 3000), log: [] });
  gs.mi_sweep(gg, open + 4000);
  assert.deepEqual(JSON.parse(JSON.stringify(gg.map((r: any) => [r.status, r.payDeadline, r.promotedFrom]))), rel.map((r) => [r.status, r.payDeadline, r.promotedFrom]), 'GS·TS 대기 풀림 일치');
  // 승격 문자(세연님 11/3 문구)
  const text = waitlistPromotionText(1, '홍길동', '2026-12-12', '16:00', T('2026-12-03T22:00:00'));
  assert.equal(
    text,
    `대기 1번 홍길동 학생, 현재 12월 12일 16시 3:1 모의면접 신청 가능합니다. 8시간 이내(12월 3일 22:00까지)에 입금 완료해 주시면 예약이 확정됩니다. 입금 계좌: ${MI_CONFIG.bankAccount}, 80,000원`,
  );
  assert.equal(gs.mi_promotionText(1, '홍길동', '2026-12-12', '16:00', T('2026-12-03T22:00:00')), text, 'GS·TS 승격 문자 일치');
  assert.equal(slotMonthDayHour('2026-12-20', '18:30'), '12월 20일 18시 30분');
  // 홈페이지로는 숫자를 보내지 않음
  const pub = publicSlots(summarize([], open));
  assert.deepEqual(Object.keys(pub[0]).sort(), ['closed', 'date', 'time', 'wait']);
  assert.equal(pub.find((x) => x.date === '2026-12-12' && x.time === '16:00')!.wait, true);
  assert.equal(pub.find((x) => x.date === '2026-12-12' && x.time === '17:00')!.wait, false);
  assert.deepEqual(JSON.parse(JSON.stringify(gs.mi_publicSlots(gs.mi_summarize([], open)))), pub, 'GS·TS 공개 타임 일치');
  // 중복 신청
  const d = [
    { ...newBookingRow([], 'A-1', '2026-12-13', '16:00', open, 'A'), phone: '01012345678' },
    { ...newBookingRow([], 'B', '2026-12-13', '17:00', open), phone: '01099998888', status: MI_STATUS.cancelled },
  ];
  assert.equal(findActiveDuplicate(d, '010-1234-5678', [{ date: '2026-12-13', time: '16:00' }]), 'A');
  assert.equal(findActiveDuplicate(d, '010-1234-5678', [{ date: '2026-12-13', time: '17:00' }]), null);
  assert.equal(findActiveDuplicate(d, '010-9999-8888', [{ date: '2026-12-13', time: '17:00' }]), null, '취소된 줄은 중복 아님');
  for (const [ph, slot] of [['010-1234-5678', '16:00'], ['010-1234-5678', '17:00'], ['010-9999-8888', '17:00']] as const) {
    const sl = [{ date: '2026-12-13', time: slot }];
    assert.equal(gs.mi_findActiveDuplicate(JSON.parse(JSON.stringify(d)), ph, sl), findActiveDuplicate(d, ph, sl), `GS·TS 중복 일치 ${ph} ${slot}`);
  }
  assert.equal(gs.mi_sameName_('홍 길동', '홍길동'), true);
  assert.equal(gs.mi_sameName_('홍길동', '김철수'), false);
  assert.equal(gs.mi_sameName_('', ''), false);
  // 확인 키
  assert.equal(gs.mi_tokenOk({ token: 'abc123' }, 'abc123'), true);
  assert.equal(gs.mi_tokenOk({ token: 'abc123' }, 'abc124'), false);
  assert.equal(gs.mi_tokenOk({ token: '' }, ''), false, '키 없는 줄은 늘 거절');
  assert.equal(gs.mi_tokenOk({ token: 'abc123' }, undefined), false);
  assert.equal(checkLinkSearch('MI-1', 'ab'), '?check=MI-1&k=ab');
  // 서류 기한 예시(예약확정 문자)
  assert.equal(docsDeadlineExample('2026-12-12'), '12/12(토) 면접은 12/5(토) 밤 12시 전까지');
  assert.equal(gs.mi_docsExample('2026-12-12'), docsDeadlineExample('2026-12-12'));
  assert.equal(gs.mi_docsExample('2026-12-20'), docsDeadlineExample('2026-12-20'));
  // 오픈 시각
  assert.equal(msUntilOpen(T('2026-11-09T21:00:00') - 5000), 5000);
  assert.equal(msUntilOpen(T('2026-11-09T21:00:00')), 0);
  assert.equal(statusLabel(MI_STATUS.check), '확인 중');
  assert.equal(statusLabel(MI_STATUS.waitlist), '대기');
}

console.log('✅ mock interview slot/waitlist/deadline tests passed');

/* ---- GS 도 서류 미제출로 취소하지 않음 ---- */
{
  const gd = docsForGs as any[];
  gs.mi_sweep(gd, docsAfterForGs);
  assert.deepEqual(gd.map((r: any) => r.status), [MI_STATUS.confirmed, MI_STATUS.confirmed, MI_STATUS.confirmed], 'GS 서류 미제출 취소 없음');
}

/* ---- 신청완료 화면 문구: 환불 구간(빈틈 없음), 서류, 대기 안내(세연님 11/3) ---- */
{
  const page = fs.readFileSync(path.join(__dirname, '../src/pages/MockInterviewPage.tsx'), 'utf-8');
  for (const t of [
    '면접 10일 전까지: 전액 환불',
    '면접 9일 전 ~ 7일 전: ⅔ 환불',
    '면접 6일 전 ~ 5일 전: ⅓ 환불',
    '면접 4일 전부터, 노쇼: 환불 불가',
    '서류를 내지 않아도 면접은 그대로 진행합니다. 이때는 당일 즉석 질문으로 진행합니다.',
    '문자를 받은 때부터 ${PROMOTED_HOURS}시간 이내에 입금해 주세요.',
    "대기 신청이 ${n}명이 되면 대기 순서대로 입금 안내 문자를 보내 드립니다.",
  ]) assert.ok(page.includes(t), `화면 문구: ${t}`);
  for (const t of ['면접 7일 전: ⅔ 환불', '면접 5일 전 ⅓ 환불', '그 이후 및 노쇼', '1시간 이내에 입금하고']) assert.ok(!page.includes(t), `옛 문구 없음: ${t}`);
}
