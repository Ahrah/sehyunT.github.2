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
  adminCancel,
  setExtraSlots,
  getExtraSlots,
  allSlots,
  isValidSlot,
  openNoticeText,
  openNoticeRecipients,
  wishDates,
  checkNewSlot,
  UNPAID_CANCEL_TEXT,
  CANCEL_INQUIRY,
  ADMIN_CANCEL_REASON,
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
// 세연님 11/3: 일반 타임은 앞선 신청자가 취소했을 때만 승격. '확인 필요'로 빈 자리는 올리지 않습니다.
assert.equal(rows[5].status, MI_STATUS.waitlist, "'확인 필요'로 빈 자리로는 승격하지 않음");
assert.equal(rows[5].promotedFrom, undefined);
assert.match(rows[4].log.join('\n'), /대기 1번에서 입금 대기로 승격/);
assert.equal(rows[4].holdStartedAt, later);
assert.equal(summarize(rows, later).find((x) => x.date === '2026-12-13' && x.time === '16:00')!.left, 1, '확인 필요 줄 자리는 비워 둠');
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
assert.equal(heldCount(rows, '2026-12-13', '16:00'), 3, '확인 필요 줄은 자리를 잡지 않음');
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
// 관리자 취소로 자리가 나서 서류 기한 뒤에 승격되면 서류 기한은 24시간
docs = adminCancel(docs, 'd1', afterDocs + 60000).rows;
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
assert.deepEqual([...gs.EXTRA_REQ_COLS.slice(-2)], ['모의면접 신청번호', '오픈 알림 기록'], '새 열은 맨 뒤');
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
assert.equal(gs.MI.AUTO_DEPOSIT_CHECK, true, '입금알림 자동 확인 켜짐 (2026-11-09 오픈)');
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
/* ---- 11/9 결정: 12/12 16:00 과 12/20 18:00 은 더 이상 waitlist-at-open 이 아닙니다 ---- */
{
  assert.deepEqual([...MI_CONFIG.waitlistAtOpen], [], '더 이상 waitlist-at-open 슬롯이 없습니다');
  const g: MiRow[] = [];
  assert.equal(isGated(g, '2026-12-12', '16:00'), false, '12/12 16:00 은 더 이상 gated 가 아닙니다');
  assert.equal(isGated(g, '2026-12-20', '18:00'), false, '12/20 18:00 은 더 이상 gated 가 아닙니다');
  assert.equal(isGated(g, '2026-12-12', '17:00'), false);
  g.push(newBookingRow(g, 'W1', '2026-12-12', '16:00', open + 1000));
  assert.equal(g[0].status, MI_STATUS.pending, '12/12 16:00 은 이제 일반 타임처럼 즉시 입금 대기');
  g.push(newBookingRow(g, 'W2', '2026-12-12', '16:00', open + 3000));
  g.push(newBookingRow(g, 'W3', '2026-12-12', '16:00', open + 4000));
  g.push(newBookingRow(g, 'W4', '2026-12-12', '16:00', open + 5000));
  assert.deepEqual(g.slice(0, 4).map((r) => r.status), [MI_STATUS.pending, MI_STATUS.pending, MI_STATUS.pending, MI_STATUS.pending], '정원 4명까지 입금 대기');
  g.push(newBookingRow(g, 'W5', '2026-12-12', '16:00', open + 6000));
  assert.equal(g[4].status, MI_STATUS.waitlist, '5번째는 대기');
  // GS 와 같음
  const gg = [] as any[];
  assert.equal(gs.mi_initialStatus([], '2026-12-12', '16:00'), MI_STATUS.pending, 'GS: 12/12 16:00 은 이제 입금 대기');
  assert.equal(gs.mi_initialStatus([], '2026-12-20', '18:00'), MI_STATUS.pending, 'GS: 12/20 18:00 은 이제 입금 대기');
  assert.equal(gs.mi_initialStatus([], '2026-12-20', '17:00'), MI_STATUS.pending);
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
  assert.equal(pub.find((x) => x.date === '2026-12-12' && x.time === '16:00')!.wait, false, '12/12 16:00 은 더 이상 waitlist-at-open 이 아님');
  assert.equal(pub.find((x) => x.date === '2026-12-20' && x.time === '18:00')!.wait, false, '12/20 18:00 은 더 이상 waitlist-at-open 이 아님');
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

/* ---- [문자발송] 메일(세연님 iPhone 단축어가 읽어 문자로 보냄, 11/3) ---- */
{
  const OPEN = T('2026-11-09T21:00:00');
  const NOW = T('2026-11-10T10:00:00');
  const row = (id: string, over: Record<string, unknown> = {}) => ({
    id, groupId: '', rowNumber: 2, appliedAt: OPEN + 1000, kind: '예약', date: '2026-12-12', time: '17:00',
    status: MI_STATUS.confirmed, payDeadline: OPEN + HOUR, holdStartedAt: OPEN, docsDeadline: null,
    paidChecked: true, paidAt: null, unpaidChecked: false, docsReceived: false,
    phone: '010-1234-5678', studentName: '홍길동', depositor: '홍길동', cancelReason: '', checkReason: '', log: [] as string[], changed: false,
    ...over,
  });
  const lines = (body: string) => body.split('\n');

  // 형식: 제목에 전화번호, 본문은 SMS 텍스트 그대로(줄바꿈 유지), 추가 내용 없음
  const m = gs.mi_smsMail(' 010-1234-5678 ', '첫 줄\n둘째 줄\n  셋째', ['신청번호: MI-1', '보낼 문자: 섞이면 안 됨']);
  assert.equal(m.subject, '[문자발송] 모의면접 01012345678', '제목에 전화번호 포함');
  assert.equal(m.body, '첫 줄\n둘째 줄\n  셋째', '본문은 SMS 텍스트 그대로, 줄바꿈 유지');
  assert.equal(lines(m.body)[0], '첫 줄');
  assert.equal(lines(m.body)[1], '둘째 줄');
  assert.equal(lines(m.body)[2], '  셋째', '공백도 유지');
  assert.equal(gs.mi_smsMail('02-123-4567', 'x', []), null, '휴대폰이 아니면 보내지 않음');
  assert.equal(gs.mi_smsMail('+82 10 1234 5678', 'x', []), null, '국가번호 형식은 받지 않음(신청서는 010 형식만 받음)');

  // 예약확정: 묶음 하나에 한 통, 다시 정리해도 다시 보내지 않음
  const rows: any[] = [
    row('MI-1', { groupId: 'G1', rowNumber: 2, date: '2026-12-13', time: '16:00' }),
    row('MI-2', { groupId: 'G1', rowNumber: 3, date: '2026-12-12', time: '17:00' }),
    row('MI-3', { rowNumber: 4, phone: '01099998888', studentName: '김철수', depositor: '김철수' }),
    row('MI-4', { rowNumber: 5, status: MI_STATUS.pending, paidChecked: false }),
    row('MI-0', { rowNumber: 6, appliedAt: OPEN - 1, phone: '01055556666' }),
  ];
  const q1 = gs.mi_smsQueue(rows, NOW);
  assert.equal(q1.length, 2, '묶음 G1 한 통 + MI-3 한 통(입금 대기·오픈 전 시험 줄 제외)');
  assert.deepEqual(JSON.parse(JSON.stringify(q1.map((q: any) => q.rows.map((r: any) => r.id)))), [['MI-1', 'MI-2'], ['MI-3']]);
  // 예약확정 문자는 여러 줄 형식, 본문은 SMS 텍스트만
  assert.equal(q1[0].mail.subject, '[문자발송] 모의면접 01012345678', '제목에 전화번호');
  const bodyLines = lines(q1[0].mail.body);
  assert.equal(bodyLines[0], '[입시는세연쌤] 12월 3:1 모의면접 예약 확정 안내');
  assert.equal(bodyLines[1], '홍길동 학생,');
  assert.equal(bodyLines[2], '12월 12일 17시, 12월 13일 16시 3:1 모의면접 예약이 확정되었습니다.');
  assert.equal(bodyLines[3], '');
  assert.equal(bodyLines[4], 'Q. 서류는 언제 보내나요?');
  assert.equal(bodyLines[5], `면접 1주 전까지 생기부·자소서를 ${gs.MI.OWNER_EMAIL}으로 보내주세요.`);
  assert.equal(bodyLines[6], '예: 12/12(토) 면접은 12/5(토) 밤 12시 전까지, 12/13(일) 면접은 12/6(일) 밤 12시 전까지 보내 주세요. 서류를 보내지 않으면');
  assert.equal(bodyLines[7], '면접은 진행 가능하나, 당일 지참한 자소서를 바탕으로 즉석 질문으로');
  assert.equal(bodyLines[8], '진행합니다.');
  assert.ok(!q1[0].mail.body.includes('시트 행') && !q1[0].mail.body.includes('신청번호'), '본문에 디버그 정보 없음');
  assert.equal(q1[1].mail.subject, '[문자발송] 모의면접 01099998888');
  assert.ok(rows.slice(0, 3).every((r) => r.changed && r.log.some((l: string) => l.includes('예약확정 문자 메일 보냄'))), '처리 기록 표시');
  assert.equal(rows[3].log.length + rows[4].log.length, 0);
  const sent: string[][] = [];
  gs.mi_sendSmsMails_(q1, (to: string, s: string, b: string) => sent.push([to, s, b]));
  assert.equal(sent.length, 2, '메일 두 통');
  assert.ok(sent.every(([to, s]) => to === gs.MI.OWNER_EMAIL && s.startsWith('[문자발송] 모의면접 010')), '제목에 전화번호 포함');
  assert.equal(gs.mi_smsQueue(rows, NOW + 300000).length, 0, '다시 정리해도 다시 보내지 않음');
  // 손으로 상태를 '확정'으로 바꾼 줄도 한 번 보냄
  rows[3].status = MI_STATUS.confirmed;
  const q2 = gs.mi_smsQueue(rows, NOW + 600000);
  assert.deepEqual(JSON.parse(JSON.stringify(q2.map((q: any) => q.rows.map((r: any) => r.id)))), [['MI-4']]);
  // 메일 실패 → 표시를 지워 다음 정리에 다시 보냄
  gs.mi_sendSmsMails_(q2, () => { throw new Error('quota'); });
  assert.ok(!rows[3].log.some((l: string) => l.includes('예약확정 문자 메일 보냄')), '실패하면 표시 지움');
  assert.equal(gs.mi_smsQueue(rows, NOW + 900000).length, 1, '다음 정리에 다시 보냄');
  // 번호가 이상하면 보내지 않고 한 번만 기록
  const bad: any[] = [row('MI-9', { phone: '0212345678' })];
  assert.equal(gs.mi_smsQueue(bad, NOW).length, 0);
  assert.equal(gs.mi_smsQueue(bad, NOW + 1).length, 0);
  assert.equal(bad[0].log.length, 1, '번호 확인 필요 기록은 한 번');

  // sweep 으로 확정된 묶음(세금 봇·세연님이 한 줄만 '입금 확정' 체크)도 한 통
  const sw: any[] = [
    row('MI-5', { groupId: 'G5', status: MI_STATUS.pending, paidChecked: true }),
    row('MI-6', { groupId: 'G5', status: MI_STATUS.pending, paidChecked: false, time: '18:00' }),
  ];
  gs.mi_sweep(sw, OPEN + 1000);
  assert.deepEqual(sw.map((r) => r.status), [MI_STATUS.confirmed, MI_STATUS.confirmed]);
  assert.equal(gs.mi_smsQueue(sw, OPEN + 1000).length, 1, '묶음 확정은 한 통');

  // 대기 승격: 올라간 줄마다 한 통, 승격 문구 그대로 한 줄
  // 정원 4명 확정 (SMS_SINCE 전에 신청), 대기 2명 추가
  const BEFORE_SMS = T('2026-11-09T20:00:00');  // SMS_SINCE 전
  const pw: any[] = [];
  for (let i = 1; i <= 4; i += 1) {
    pw.push(row(`F${i}`, { date: '2026-12-13', time: '17:00', status: MI_STATUS.confirmed, paidChecked: true, 
      phone: `01022220${i}${i}${i}`, depositor: `학생${i}`, appliedAt: BEFORE_SMS + i, 
      log: ['2026-11-09 20:00 입금 대기', '2026-11-09 20:10 확정'] }));
  }
  for (let i = 1; i <= 2; i += 1) {
    pw.push(row(`W${i}`, { date: '2026-12-13', time: '17:00', status: MI_STATUS.waitlist, paidChecked: false, payDeadline: null,
      holdStartedAt: null, phone: `0101111000${i}`, depositor: `대기${i}`, appliedAt: OPEN + 100 + i }));
  }
  // 앞의 두 줄을 관리자 취소로 처리하여 대기 1, 2번이 승격되게 함
  pw[0].status = MI_STATUS.cancelled;
  pw[0].cancelReason = gs.MI.ADMIN_CANCEL_REASON;
  pw[0].freedSeat = true;
  pw[1].status = MI_STATUS.cancelled;
  pw[1].cancelReason = gs.MI.ADMIN_CANCEL_REASON;
  pw[1].freedSeat = true;
  gs.mi_sweep(pw, T('2026-12-03T14:00:00'));
  const qp = gs.mi_smsQueue(pw, T('2026-12-03T14:00:00'));
  assert.equal(qp.length, 2, '승격 두 명, 두 통');
  assert.equal(qp[0].mail.subject, '[문자발송] 모의면접 01011110001', '제목에 전화번호');
  assert.equal(
    qp[0].mail.body,
    `[입시는세연쌤] 대기 1번 대기1 학생, 현재 12월 13일 17시 3:1 모의면접 신청 가능합니다. 8시간 이내(12월 3일 22:00까지)에 입금 완료해 주시면 예약이 확정됩니다. 입금 계좌: ${gs.MI.BANK_ACCOUNT}, 80,000원`,
    '본문은 SMS 텍스트만'
  );
  assert.ok(qp[1].mail.body.startsWith('[입시는세연쌤] 대기 2번 대기2 학생, 현재 12월 13일 17시'), '승격 문자 시작 확인');
  assert.ok(!qp[0].mail.body.includes('입금 기한'), '본문에 디버그 정보 없음');
  // 다른 알림 메일 제목에는 '[문자발송]'이 없음
  const subjects = code.match(/subject = '[^']*'/g) || [];
  assert.ok(subjects.length >= 3 && subjects.every((x) => !x.includes('문자발송')), "다른 알림 메일 제목에 '[문자발송]' 없음");
  assert.equal((code.match(/: '\[문자발송\] 모의면접'/g) || []).length, 1, '문자발송 제목은 MI.SMS_SUBJECT 한 곳');
  assert.ok(!code.includes("'[모의면접] 대기 승격, 문자 보내기 필요"), '옛 승격 제목 없음');
  console.log('✅ [문자발송] mail format/idempotency tests passed');
}

/* ---- 대기 승격 규칙 나눔·관리자 취소·미입금 취소 문자·타임 추가(세연님 11/3) ---- */
{
  const OPEN = T('2026-11-09T21:00:00');
  const clone = (x: unknown) => JSON.parse(JSON.stringify(x));
  const four = (date: string, time: string, n: number) => {
    let list: MiRow[] = [];
    for (let i = 1; i <= n; i += 1) list.push(newBookingRow(list, `${time}-${i}`, date, time, OPEN + i * 1000, `G${i}`));
    return list;
  };
  const gsCopy = (list: MiRow[]) => list.map((r) => ({ ...clone(r), phone: `0101234000${r.id.slice(-1)}`, studentName: `학생${r.id.slice(-1)}`,
    depositor: `학생${r.id.slice(-1)}`, rowNumber: 2, changed: false }));

  // 1) 일반 타임: 4명 확정 + 대기 2명. 자리가 비지 않으면(취소 없음) 아무도 올라가지 않음
  let n = four('2026-12-13', '17:00', 6).map((r, i) => (i < 4 ? { ...r, paidChecked: true, paidAt: OPEN + 5 * 60000 } : r));
  n = sweep(n, OPEN + 10 * 60000);
  assert.deepEqual(n.map((r) => r.status), ['확정', '확정', '확정', '확정', '대기', '대기']);
  // 시트에서 한 줄을 '확인 필요'로 바꿔도 승격 없음
  const checked = sweep(n.map((r, i) => (i === 0 ? { ...r, status: MI_STATUS.check } : r)), OPEN + 20 * 60000);
  assert.equal(checked[4].status, MI_STATUS.waitlist, "'확인 필요'로 빈 자리는 승격하지 않음");
  // 관리자 취소 → 대기 1번만 입금 대기(8시간 + 10분)
  const now1 = T('2026-11-20T10:00:00');
  const c1 = adminCancel(n, '17:00-2', now1);
  assert.equal(c1.ok, true);
  assert.equal(c1.rows[1].status, MI_STATUS.cancelled);
  assert.equal(c1.rows[1].cancelReason, ADMIN_CANCEL_REASON);
  assert.deepEqual(c1.promoted.map((r) => r.id), ['17:00-5']);
  assert.equal(c1.rows[4].payDeadline, now1 + 8 * HOUR);
  assert.equal(c1.rows[5].status, MI_STATUS.waitlist, '대기 2번은 그대로');
  assert.ok(c1.rows.every((r) => r.freedSeat === undefined), '표시는 저장하지 않음');
  // 두 번 눌러도 같음(멱등)
  const c2 = adminCancel(c1.rows, '17:00-2', now1 + 1000);
  assert.equal(c2.already, true);
  assert.deepEqual(clone(c2.rows), clone(c1.rows));
  assert.equal(adminCancel(c1.rows, 'nope', now1).ok, false);
  // 대기자를 관리자 취소하면 승격 없음
  const c3 = adminCancel(c1.rows, '17:00-6', now1 + 2000);
  assert.equal(c3.promoted.length, 0);
  // 승격된 학생이 8시간 + 10분 안에 입금하지 않으면 미입금 자동 취소 → 다음 대기가 올라감(이번엔 대기 없음)
  const late = sweep(c1.rows, now1 + 8 * HOUR + MI_CONFIG.payGraceMs + 1);
  assert.equal(late[4].status, MI_STATUS.cancelled);
  assert.equal(late[5].status, MI_STATUS.pending, '미입금 자동 취소도 승격 사유');
  assert.equal(late[5].promotedFrom, 1);

  // 2) 이제 12/12 16:00과 12/20 18:00은 일반 타임으로 동작: 정원까지는 바로 입금 대기
  let g = four('2026-12-12', '16:00', 1);
  assert.equal(g[0].status, MI_STATUS.pending, '12/12 16:00은 이제 일반 타임: 첫 신청도 입금 대기');
  g.push(newBookingRow(g, 'g2', '2026-12-12', '16:00', OPEN + 9000, 'G9'));
  assert.equal(g[1].status, MI_STATUS.pending, '두 번째도 입금 대기');
  g.push(newBookingRow(g, 'g3', '2026-12-12', '16:00', OPEN + 11000, 'G10'));
  g.push(newBookingRow(g, 'g4', '2026-12-12', '16:00', OPEN + 12000, 'G11'));
  assert.deepEqual(g.slice(0, 4).map((r) => r.status), [MI_STATUS.pending, MI_STATUS.pending, MI_STATUS.pending, MI_STATUS.pending], '정원 4명까지 입금 대기');
  g.push(newBookingRow(g, 'g5', '2026-12-12', '16:00', OPEN + 13000, 'G12'));
  assert.equal(g[4].status, MI_STATUS.waitlist, '5번째부터는 대기');

  // GS 와 같은 결과
  for (const [list, id, at] of [[n, '17:00-2', now1], [c1.rows, '17:00-6', now1 + 2000]] as const) {
    const ts = adminCancel(list, id, at).rows.map((r) => [r.id, r.status, r.payDeadline]);
    const gsRows2 = gsCopy([...list]);
    const res = gs.mi_adminCancel(gsRows2, id, at);
    assert.equal(res.ok, true);
    assert.deepEqual(clone(gsRows2.map((r: any) => [r.id, r.status, r.payDeadline])), clone(ts), `GS·TS 관리자 취소 일치 ${id}`);
  }
  {
    const gsRows3 = gsCopy([...c1.rows]);
    assert.equal(gs.mi_adminCancel(gsRows3, '17:00-2', now1).already, true, 'GS 도 멱등');
    const gsChecked = gsCopy(n.map((r, i) => (i === 0 ? { ...r, status: MI_STATUS.check } : r)));
    gs.mi_sweep(gsChecked, OPEN + 20 * 60000);
    assert.equal(gsChecked[4].status, MI_STATUS.waitlist, "GS: '확인 필요'로 빈 자리는 승격하지 않음");
  }
  // 관리자 취소 → 승격 [문자발송] 메일
  {
    const gsRows4 = gsCopy([...n]);
    gs.mi_adminCancel(gsRows4, '17:00-2', now1);
    const q = gs.mi_smsQueue(gsRows4, now1).filter((x: any) => x.kind !== 'confirmed');
    assert.deepEqual(clone(q.map((x: any) => x.kind)), ['promoted'], '승격 한 통(관리자 취소 문자는 없음)');
    assert.ok(q[0].mail.body.startsWith('[입시는세연쌤] 대기 1번 학생5 학생, 현재 12월 13일 17시'), '본문은 SMS 텍스트만');
  }

  // 3) 미입금 자동 취소 문자: 묶음마다 한 통, 다시 보내지 않음
  {
    const u = [
      { ...newBookingRow([], 'U1', '2026-12-19', '16:00', T('2026-11-10T10:00:00'), 'GU'), phone: '01055556666', studentName: '김학생', depositor: '김학생', rowNumber: 5, changed: false },
      { ...newBookingRow([], 'U2', '2026-12-19', '17:00', T('2026-11-10T10:00:00'), 'GU'), phone: '01055556666', studentName: '김학생', depositor: '김학생', rowNumber: 6, changed: false },
    ].map(clone);
    const at = T('2026-11-10T11:11:00');
    gs.mi_sweep(u, at);
    assert.deepEqual(u.map((r: any) => r.status), [MI_STATUS.cancelled, MI_STATUS.cancelled]);
    const q = gs.mi_smsQueue(u, at);
    assert.equal(q.length, 1, '묶음 한 통');
    assert.equal(q[0].kind, 'unpaid');
    assert.equal(q[0].mail.subject, '[문자발송] 모의면접 01055556666', '제목에 전화번호');
    assert.equal(q[0].mail.body, UNPAID_CANCEL_TEXT, '본문은 SMS 텍스트만');
    assert.equal(gs.MI.UNPAID_CANCEL_TEXT, UNPAID_CANCEL_TEXT);
    assert.ok(u.every((r: any) => r.log.some((l: string) => l.includes('미입금 취소 문자 메일 보냄'))));
    // 다음 정리(시트에서 다시 읽은 줄: justCancelled 없음)에는 보내지 않음
    const reread = clone(u).map((r: any) => ({ ...r, justCancelled: undefined }));
    gs.mi_sweep(reread, at + 300000);
    assert.equal(gs.mi_smsQueue(reread, at + 300000).length, 0);
    // 관리자 취소는 미입금 문자 없음
    const a = [clone({ ...newBookingRow([], 'A1', '2026-12-19', '16:00', T('2026-11-10T10:00:00')), phone: '01055556666', rowNumber: 2 })];
    gs.mi_adminCancel(a, 'A1', at);
    assert.equal(gs.mi_smsQueue(a, at).filter((x: any) => x.kind === 'unpaid').length, 0);
    // 실패하면 '직접 보내 주세요' 기록
    const u2 = [clone({ ...newBookingRow([], 'U3', '2026-12-19', '16:00', T('2026-11-10T10:00:00')), phone: '01077778888', rowNumber: 7, changed: false })];
    gs.mi_sweep(u2, at);
    gs.mi_sendSmsMails_(gs.mi_smsQueue(u2, at), () => { throw new Error('quota'); });
    assert.ok(u2[0].log.some((l: string) => l.includes('미입금 취소 문자 메일 실패(직접 보내 주세요)')));
  }

  // 4) 타임 추가: 정규 타임 + 추가 타임, 신청·요약·정리에 함께 쓰임
  {
    assert.deepEqual(getExtraSlots(), []);
    assert.equal(isValidSlot('2026-12-26', '15:00'), false);
    setExtraSlots(['2026-12-26 15:00', 'bad', '2026-12-26 15:00']);
    assert.deepEqual(getExtraSlots(), ['2026-12-26 15:00']);
    assert.equal(isValidSlot('2026-12-26', '15:00'), true);
    assert.deepEqual(allSlots().at(-1), { date: '2026-12-26', time: '15:00' });
    assert.ok(summarize([], OPEN).some((x) => x.date === '2026-12-26' && x.time === '15:00' && !x.wait));
    assert.deepEqual(validateForm({ ...EMPTY_FORM, slots: [{ date: '2026-12-26', time: '15:00' }], studentName: '홍', school: 'a', track: 'b',
      phone: '01012345678', consentPrivacy: true, consentVideo: true, consentPhoto: true }), []);
    gs.MI.EXTRA_SLOTS = ['2026-12-26 15:00'];
    assert.deepEqual(clone(gs.mi_allSlots().map((x: any) => `${x.date} ${x.time}`)), allSlots().map((x) => `${x.date} ${x.time}`), 'GS·TS 타임 목록 일치');
    assert.equal(gs.mi_isValidSlot('2026-12-26', '15:00'), true);
    gs.MI.EXTRA_SLOTS = [];
    setExtraSlots([]);

    assert.equal(checkNewSlot('2026-12-26', '15:00', OPEN), '');
    assert.equal(checkNewSlot('2026-12-12', '16:00', OPEN), '이미 있는 타임입니다.');
    assert.match(checkNewSlot('12/26', '15:00', OPEN), /형식/);
    assert.match(checkNewSlot('2026-12-26', '25:00', OPEN), /형식/);
    assert.match(checkNewSlot('2026-12-26', '15:00', T('2026-12-25T15:00:00')), /24시간/);
    for (const [d, t, now] of [['2026-12-26', '15:00', OPEN], ['2026-12-12', '16:00', OPEN], ['12/26', '15:00', OPEN]] as const) {
      assert.equal(gs.mi_checkNewSlot(d, t, now), checkNewSlot(d, t, now));
    }

    const text = openNoticeText('2026-12-26', '15:00');
    assert.equal(text, '[입시는세연쌤] 3:1 모의면접 추가 날짜(12월 26일 15시)가 열렸습니다. 신청 페이지에서 먼저 신청하신 순서대로 접수됩니다. sehyunt.re.kr/mock-interview');
    assert.equal(gs.mi_openNoticeText('2026-12-26', '15:00'), text);
    assert.deepEqual(wishDates('2026-12-19, 12/26 오후, 12월 27일, 1/3'), ['2026-12-19', '2026-12-26', '2026-12-27', '2027-01-03']);
    assert.deepEqual(clone(gs.mi_wishDates('2026-12-19, 12/26 오후, 12월 27일, 1/3')), wishDates('2026-12-19, 12/26 오후, 12월 27일, 1/3'));

    const reqs = [
      { rowNumber: 2, id: 'XR-1', at: OPEN + 1, name: '가', phone: '010-1111-2222', wishDate: '2026-12-19, 12/26', wishTime: '15:00', notified: '' },
      { rowNumber: 3, id: 'XR-2', at: OPEN + 2, name: '나', phone: '01033334444', wishDate: '2026-12-19', wishTime: '16:00', notified: '' },
      { rowNumber: 4, id: 'XR-3', at: OPEN + 3, name: '가', phone: '01011112222', wishDate: '12월 26일', wishTime: '17:00', notified: '' },
      { rowNumber: 5, id: 'XR-4', at: OPEN + 4, name: '다', phone: '01055556666', wishDate: '12/26', wishTime: '', notified: '2026-12-26 15:00 알림 메일 보냄(…)' },
    ];
    assert.deepEqual(openNoticeRecipients(reqs, '2026-12-26', 'date').map((q) => q.id), ['XR-1'], '날짜 맞는 사람, 연락처마다 한 명, 이미 받은 사람 제외');
    assert.deepEqual(openNoticeRecipients(reqs, '2026-12-26', 'all').map((q) => q.id), ['XR-1', 'XR-2']);
    const gq = gs.mi_openNoticeQueue(clone(reqs), '2026-12-26', '15:00', 'date', OPEN);
    assert.deepEqual(clone(gq.map((q: any) => q.request.id)), ['XR-1'], 'GS 도 같은 사람');
    assert.equal(gq[0].mail.subject, '[문자발송] 모의면접 01011112222', '제목에 전화번호');
    assert.equal(gq[0].mail.body, text, '본문은 SMS 텍스트만');
    const sent: string[] = [];
    const r1 = gs.mi_sendOpenNotices_(gq, (_to: string, _s: string, b: string) => sent.push(b));
    assert.equal(r1.sent, 1);
    assert.ok(gq[0].request.notified.startsWith('2026-12-26 15:00'));
    // 같은 날짜로 다시 열어도(같은 날짜 다른 시간 포함) 같은 사람에게 다시 보내지 않음
    const after = clone(reqs).map((q: any) => (q.id === 'XR-1' ? { ...q, notified: gq[0].request.notified } : q));
    assert.equal(gs.mi_openNoticeQueue(after, '2026-12-26', '16:00', 'date', OPEN).length, 0, '한 사람에 한 날짜 한 번');
    assert.equal(openNoticeRecipients(after, '2026-12-26', 'date').length, 0);
    // 실패하면 기록을 남기지 않음(다시 누르면 보냄)
    const gq2 = gs.mi_openNoticeQueue(clone(reqs), '2026-12-26', '15:00', 'all', OPEN);
    const r2 = gs.mi_sendOpenNotices_(gq2, () => { throw new Error('quota'); });
    assert.equal(r2.sent, 0);
    assert.equal(r2.failed.length, 2);
    assert.ok(gq2.every((q: any) => !q.request.notified));
  }

  // 관리자 키: 짧거나 비어 있으면 늘 거절
  assert.equal(gs.mi_adminKeyOk('', ''), false);
  assert.equal(gs.mi_adminKeyOk('short-key', 'short-key'), false);
  assert.equal(gs.mi_adminKeyOk('a'.repeat(24), 'a'.repeat(24)), true);
  assert.equal(gs.mi_adminKeyOk('a'.repeat(24), 'a'.repeat(23) + 'b'), false);
  // 관리자 목록에는 확인 키가 없음
  const ar = gs.mi_adminRows(gsCopy([...n]).map((r: any) => ({ ...r, token: 'secret-token' })));
  assert.ok(ar.every((r: any) => !('token' in r)));
  assert.equal(ar[4].waitlistPos, 1);

  // 화면 문구: 학생 직접 취소 없음, 카카오채널 문의 안내
  const page = fs.readFileSync(path.join(__dirname, '../src/pages/MockInterviewPage.tsx'), 'utf-8');
  assert.equal(CANCEL_INQUIRY, '신청 취소를 원하시면 카카오채널 입시는세연쌤으로 문의해 주세요.');
  assert.equal(gs.MI.CANCEL_INQUIRY, CANCEL_INQUIRY);
  assert.ok(page.includes('CANCEL_INQUIRY'), '신청완료 화면·안내에 취소 문의 문구');
  assert.ok(!page.includes('취소는 문자나 카카오채널로 알려 주세요'), '옛 취소 안내 없음');
  console.log('✅ waitlist split / admin cancel / unpaid SMS / extra slot tests passed');
}
