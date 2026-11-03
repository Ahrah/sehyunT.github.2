import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  EBOOKS,
  EBOOK_CONFIG,
  EB_STATUS,
  EMPTY_EB_FORM,
  type EbForm,
  type EbRow,
  decideAction,
  depositorBase,
  formatKst,
  hasUnsetPrices,
  itemsTotal,
  matchDeposit,
  orderTotal,
  packAttachments,
  payDeadlineFor,
  pickDepositor,
  priceOf,
  validateOrder,
} from '../src/lib/ebooks';
import { buyerMail, orderReceivedMail } from '../src/lib/ebooksApi';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formatWonT = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원`;

/* ---- 책 목록 ---- */
assert.equal(EBOOKS.length, 9);
assert.equal(new Set(EBOOKS.map((b) => b.id)).size, 9);
/* ---- 가격(11/3 세연님 결정): 가이드 15,000원, 비교 자료집 79,000원(11/3 21:48 변경), 묶음 가격 없음 ---- */
assert.equal(hasUnsetPrices(), false, '9권 모두 가격이 있습니다');
assert.equal(priceOf(EBOOKS[0]), 79000, '비교 자료집 79,000원');
assert.ok(EBOOKS.filter((b) => b.id !== 'compare').every((b) => b.price === 15000), '학교별 가이드 15,000원');
assert.ok(!('bundlePrice' in EBOOK_CONFIG), '묶음 가격 설정이 없습니다');
assert.equal(orderTotal(['compare', 'gimpo']), 94000);
assert.equal(orderTotal(['nope']), null);
const ALL = EBOOKS.map((b) => b.id);
assert.equal(itemsTotal(ALL), 199000);
assert.equal(orderTotal(ALL), 199000, '9권을 모두 골라도 낱권 합계(묶음 할인 없음)');
assert.equal(orderTotal(ALL.slice(1)), 120000, '학교별 가이드 8권은 낱권 합계');
assert.equal(EBOOKS[0].pages, null, '비교 자료집은 분량이 바뀌는 중이라 쪽수를 보이지 않습니다');
const unpriced = EBOOKS.map((b) => (b.id === 'gimpo' ? { ...b, price: null } : b));
assert.equal(orderTotal(['gimpo'], unpriced), null, '가격이 비면 주문을 받지 않습니다');

/* ---- 주문 검증 ---- */
const good: EbForm = {
  ...EMPTY_EB_FORM,
  name: '홍길동',
  email: 'Parent@Example.com ',
  emailConfirm: 'parent@example.com',
  phone: '010-1234-5678',
  books: ['gimpo', 'compare'],
  consentPrivacy: true,
  consentRefund: true,
};
assert.deepEqual(validateOrder(good), []);
assert.equal(validateOrder({ ...good, emailConfirm: 'other@example.com' }).length, 1);
assert.match(validateOrder({ ...good, emailConfirm: 'other@example.com' })[0], /두 칸/);
assert.equal(validateOrder({ ...good, books: [] }).length, 1);
assert.equal(validateOrder({ ...good, books: ['gimpo', 'gimpo'] }).length, 1);
assert.equal(validateOrder({ ...good, consentRefund: false }).length, 1);
assert.equal(validateOrder({ ...good, consentPrivacy: false }).length, 1);
assert.equal(validateOrder({ ...good, cashReceiptPhone: '123' }).length, 1);
assert.deepEqual(validateOrder({ ...good, cashReceiptPhone: '010 9999 8888' }), []);
assert.equal(validateOrder({ ...good, email: 'bad', emailConfirm: 'bad' }).length, 1);

/* ---- 입금자명 ---- */
assert.equal(depositorBase(' 남궁 민수아라 '), '남궁민수아');
const fixed = () => 0;
const rows: EbRow[] = [];
const d1 = pickDepositor(rows, '홍길동', fixed)!;
assert.equal(d1, '홍길동10');
rows.push({ id: 'a', orderedAt: 0, status: EB_STATUS.pending, depositor: d1, total: 10000, books: ['gimpo'], paidChecked: false });
assert.equal(pickDepositor(rows, '홍길동', fixed), '홍길동11', '겹치지 않는 번호');
assert.equal(pickDepositor([{ ...rows[0], status: EB_STATUS.cancelled }], '홍길동', fixed), '홍길동10', '취소 주문 번호는 다시 씁니다');
const full: EbRow[] = Array.from({ length: 90 }, (_, i) => ({ ...rows[0], id: `f${i}`, depositor: `홍길동${i + 10}` }));
assert.equal(pickDepositor(full, '홍길동', fixed), null);
for (let i = 0; i < 50; i += 1) assert.match(pickDepositor(rows, '이영희')!, /^이영희[1-9][0-9]$/);

/* ---- 입금 알림 대조 ---- */
assert.equal(matchDeposit(rows, { amount: 10000, name: '홍길동10', at: 1 }).kind, 'one');
assert.equal(matchDeposit(rows, { amount: 9000, name: '홍길동10', at: 1 }).kind, 'amount');
assert.equal(matchDeposit(rows, { amount: 10000, name: '홍길동', at: 1 }).kind, 'none', '숫자 없이 입금하면 자동으로 맞추지 않습니다');
assert.equal(matchDeposit([...rows, { ...rows[0], id: 'b' }], { amount: 10000, name: '홍길동10', at: 1 }).kind, 'many');
assert.equal(matchDeposit([{ ...rows[0], paidChecked: true }], { amount: 10000, name: '홍길동10', at: 1 }).kind, 'none');

/* ---- 줄마다 할 일 ---- */
const base = { status: EB_STATUS.pending as string, paidChecked: false, resendChecked: false, cancelChecked: false };
assert.equal(decideAction(base), null);
assert.equal(decideAction({ ...base, paidChecked: true }), 'send');
assert.equal(decideAction({ ...base, status: EB_STATUS.check, paidChecked: true }), null, '확인 필요는 자동으로 보내지 않습니다');
assert.equal(decideAction({ ...base, status: EB_STATUS.check, resendChecked: true }), 'resend');
assert.equal(decideAction({ ...base, status: EB_STATUS.sent, paidChecked: true }), null, '보낸 줄은 다시 보내지 않습니다');
assert.equal(decideAction({ ...base, status: EB_STATUS.sent, resendChecked: true }), 'resend');
assert.equal(decideAction({ ...base, paidChecked: true, cancelChecked: true }), 'cancel');
assert.equal(decideAction({ ...base, status: EB_STATUS.cancelled, cancelChecked: true, resendChecked: true }), null);

/* ---- 입금 기한(주문 뒤 1시간) ---- */
const T0 = Date.UTC(2026, 10, 3, 3, 15); // 11/3(화) 12:15 한국 시간
const DL = payDeadlineFor(T0);
assert.equal(EBOOK_CONFIG.payWindowMs, 60 * 60 * 1000);
assert.equal(DL - T0, 3600000, '입금 기한은 주문 뒤 1시간');
assert.equal(formatKst(DL), '11/3(화) 13:15');
assert.equal(formatKst(Date.UTC(2026, 10, 8, 15, 5)), '11/9(월) 00:05', '한국 시간 자정 넘김');
const withDl = { ...base, payDeadline: DL };
const G = EBOOK_CONFIG.payGraceMs;
assert.equal(G, 10 * 60000, '10분 여유');
assert.equal(decideAction(withDl, DL), null, '기한 시각까지는 기다립니다');
assert.equal(decideAction(withDl, DL + 1), null, '기한 뒤 10분 안에는 자동 취소하지 않습니다');
assert.equal(decideAction(withDl, DL + G), null, '기한 + 10분 정각도 기다립니다');
assert.equal(decideAction(withDl, DL + G + 1), 'expire', '기한 + 10분이 지나도 입금이 없으면 미입금 취소');
assert.equal(decideAction({ ...withDl, paidChecked: true, paidAt: DL + G }, DL + G + 600000), 'send', '기한 + 10분 안 입금은 제때 입금');
assert.equal(decideAction(base, DL + 10 * 3600000), null, '기한 칸이 빈 예전 주문은 기한 규칙을 쓰지 않습니다');
assert.equal(decideAction({ ...withDl, paidChecked: true, paidAt: DL - 60000 }, DL + 600000), 'send', '기한 안 입금은 늦게 체크해도 보냅니다');
assert.equal(decideAction({ ...withDl, paidChecked: true }, DL - 1), 'send', '입금 시각 없이 기한 안에 체크하면 보냅니다');
assert.equal(decideAction({ ...withDl, paidChecked: true, paidAt: DL + G + 60000 }, DL + G + 60000), 'late', '기한 + 10분 뒤 입금은 확인 필요');
assert.equal(decideAction({ ...withDl, paidChecked: true }, DL + 1), 'send', '입금 시각 없이 10분 안에 체크하면 보냅니다');
assert.equal(decideAction({ ...withDl, paidChecked: true }, DL + G + 1), 'late', '입금 시각 없이 기한 + 10분 뒤 체크하면 확인 필요');
const exp = { ...base, status: EB_STATUS.expired };
assert.equal(decideAction(exp, DL + 1), null);
assert.equal(decideAction({ ...exp, paidChecked: true }, DL + 1), 'late', '미입금 취소 줄에 입금 확정 → 확인 필요(자동 발송 없음)');
assert.equal(decideAction({ ...exp, resendChecked: true }, DL + 1), 'resend', '세연님이 다시 보내기를 체크하면 보냅니다');
assert.equal(decideAction({ ...exp, cancelChecked: true }, DL + 1), null);
assert.equal(pickDepositor([{ ...rows[0], status: EB_STATUS.expired }], '홍길동', fixed), '홍길동11', '미입금 취소 주문의 입금자명은 다시 쓰지 않습니다');
assert.equal(matchDeposit([{ ...rows[0], status: EB_STATUS.expired }], { amount: 10000, name: '홍길동10', at: 1 }).kind, 'late', '기한 뒤 입금 알림 → 확인 필요');
assert.equal(matchDeposit([{ ...rows[0], status: EB_STATUS.cancelled }], { amount: 10000, name: '홍길동10', at: 1 }).kind, 'none');

/* ---- 미리보기 메일 ---- */
const mm = buyerMail({ id: 'EB-TEST-1', name: '홍길동', email: 'a@b.co', books: ['gimpo', 'compare'] });
assert.deepEqual(mm.attachments, ['2027학년도_경기권외고_8개교_비교자료집.pdf', '2027학년도_김포외고_자소서면접및원서접수가이드.pdf'], '첨부는 목록 순서');

/* ---- 첨부 나누기 ---- */
const MB = 1024 * 1024;
const p = packAttachments([{ size: 10 * MB }, { size: 9 * MB }, { size: 1 * MB }, { size: 30 * MB }], 18 * MB);
assert.deepEqual(p.mails.map((m) => m.map((f) => f.size / MB)), [[10], [9, 1]]);
assert.deepEqual(p.oversize.map((f) => f.size / MB), [30]);

/* ---- Apps Script(Ebook.gs)도 같은 규칙인지 ---- */
const ebCode = fs.readFileSync(path.join(__dirname, '../apps-script/ebooks/Ebook.gs'), 'utf-8');
const sb: { module: { exports: Record<string, any> } } = { module: { exports: {} } };
vm.runInNewContext(ebCode, sb);
const gs = sb.module.exports;
assert.deepEqual(
  JSON.parse(JSON.stringify(gs.EB.BOOKS.map((b: any) => [b.id, b.title, b.price, b.attachName]))),
  EBOOKS.map((b) => [b.id, b.title, b.price, b.attachName]),
  'Ebook.gs 책 목록·가격이 src/lib/ebooks.ts 와 같아야 합니다',
);
assert.ok(gs.EB.BOOKS.every((b: any) => /^PDF_파일_ID_/.test(b.fileId)), '저장소에는 Drive 파일 ID 자리표시만 둡니다');
assert.equal(gs.EB.BANK_ACCOUNT, EBOOK_CONFIG.bankAccount);
assert.equal(gs.EB.SEND_WITHIN_MINUTES, EBOOK_CONFIG.sendWithinMinutes);
assert.equal(gs.EB.DEPOSITOR_NAME_MAX, EBOOK_CONFIG.depositorNameMax);
for (const f of [good, { ...good, emailConfirm: 'x@y.com' }, { ...good, books: [] }, { ...good, consentRefund: false }, { ...good, cashReceiptPhone: '12' }]) {
  assert.deepEqual([...gs.eb_validate(f)], validateOrder(f), 'Ebook.gs 검증 문구가 같아야 합니다');
}
assert.ok(!('BUNDLE_PRICE' in gs.EB), 'Ebook.gs 에도 묶음 가격이 없습니다');
assert.equal(gs.EB.BANK_NAME, EBOOK_CONFIG.bankName);
assert.equal(gs.EB.BANK_NUMBER, EBOOK_CONFIG.bankNumber);
assert.equal(gs.EB.BANK_HOLDER, EBOOK_CONFIG.bankHolder);
for (const ids of [['gimpo'], ['compare', 'gimpo'], ALL, [...ALL].reverse(), ALL.slice(1), ['nope']]) {
  assert.equal(gs.eb_total(ids), orderTotal(ids), `합계가 같아야 합니다: ${ids.join(',')}`);
}
// 주문 접수(입금 안내) 메일: 서버와 미리보기 문구가 같고, 입금에 필요한 값이 모두 들어갑니다.
for (const books of [['gimpo', 'compare'], ALL]) {
  const o = { id: 'EB-1103-121500-123', name: '홍길동', email: 'parent@example.com', depositor: '홍길동27', total: orderTotal(books)!, books, payDeadline: DL };
  const a = gs.eb_orderMail(o);
  const b = orderReceivedMail(o);
  assert.equal(a.subject, b.subject);
  assert.equal(a.body, b.body, '주문 접수 메일 문구가 같아야 합니다');
  for (const must of ['카카오뱅크', '3333-38-6269721', '예금주: 입시는세연쌤', '입금자명: 홍길동27', 'EB-1103-121500-123', formatWonT(o.total), '입금 기한: 11/3(화) 13:15 (주문 뒤 1시간, 한국 시간)', '자동으로 취소']) {
    assert.ok(b.body.includes(must), `주문 접수 메일에 ${must}`);
  }
  for (const banned of ['아니라', '충분합니다', '막혀', '아이']) assert.ok(!b.body.includes(banned), `금지 표현 ${banned}`);
}
assert.ok(!orderReceivedMail({ id: 'x', name: 'a', email: 'e', depositor: 'a10', total: 199000, books: ALL, payDeadline: DL }).body.includes('묶음'));
assert.equal(gs.eb_pickDepositor(rows, '홍길동', fixed), '홍길동11');
assert.equal(gs.eb_depositorBase(' 남궁 민수아라 '), depositorBase(' 남궁 민수아라 '));
for (const dep of [{ amount: 10000, name: '홍길동10', at: 1 }, { amount: 1, name: '홍길동10', at: 1 }, { amount: 10000, name: 'x', at: 1 }]) {
  assert.equal(gs.eb_matchDeposit(rows, dep).kind, matchDeposit(rows, dep).kind);
}
for (const st of Object.values(EB_STATUS)) {
  for (const bits of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const r = { status: st, paidChecked: !!(bits & 1), resendChecked: !!(bits & 2), cancelChecked: !!(bits & 4) };
    assert.equal(gs.eb_decideAction(r), decideAction(r));
    for (const extra of [{ payDeadline: DL }, { payDeadline: DL, paidAt: DL - 1 }, { payDeadline: DL, paidAt: DL + 1 }, { payDeadline: DL, paidAt: DL + G }, { payDeadline: DL, paidAt: DL + G + 1 }, { payDeadline: null, paidAt: null }]) {
      for (const now of [DL - 1, DL, DL + 1, DL + G, DL + G + 1]) {
        assert.equal(gs.eb_decideAction({ ...r, ...extra }, now), decideAction({ ...r, ...extra }, now), `decideAction ${st} ${bits} ${JSON.stringify(extra)} ${now}`);
      }
    }
  }
}
assert.equal(gs.eb_toMs_('2026-11-03 12:07'), Date.UTC(2026, 10, 3, 3, 7), '세무 봇이 적은 입금 시각 글자는 한국 시간으로 읽습니다');
assert.equal(gs.eb_toMs_('2026. 11. 3. 12:07'), Date.UTC(2026, 10, 3, 3, 7));
assert.equal(gs.eb_toMs_(''), null);
assert.equal(gs.EB.PAY_WINDOW_MS, EBOOK_CONFIG.payWindowMs, '입금 기한이 같아야 합니다');
assert.equal(gs.EB.PAY_GRACE_MS, EBOOK_CONFIG.payGraceMs, '10분 여유가 같아야 합니다');
assert.equal(gs.EBS.expired, EB_STATUS.expired);
for (const ms of [DL, Date.UTC(2026, 10, 8, 15, 5), Date.UTC(2026, 11, 31, 14, 59)]) assert.equal(gs.eb_fmtKst(ms), formatKst(ms));
assert.equal(gs.eb_matchDeposit([{ ...rows[0], status: EB_STATUS.expired }], { amount: 10000, name: '홍길동10', at: 1 }).kind, 'late');
// 세무 봇이 머리글로 찾는 칸: 이름·앞뒤 순서는 그대로, '입금 기한'은 맨 뒤에 덧붙임
const C = [...gs.EB_COLS] as string[];
assert.equal(C[C.length - 1], '입금 기한', "'입금 기한'은 맨 뒤 칸");
for (const n of ['상태', '입금 시각', '입금 확정', '메모']) assert.ok(C.includes(n), `${n} 칸`);
assert.deepEqual(C.slice(0, -1), [
  '주문번호', '주문 시각', '상태', '입금자명', '금액', '책',
  '입금 확정', '입금 시각', '다시 보내기', '취소',
  '이름', '이메일', '휴대폰', '현금영수증 번호',
  '개인정보 동의', '환불 제한 확인', '동의 시각',
  '발송 시각', '발송 횟수', '확인 필요 사유', '처리 기록', '메모',
], '기존 칸 이름·순서는 그대로(11/3 이전과 같음)');
assert.deepEqual(JSON.parse(JSON.stringify(gs.eb_packAttachments([{ size: 10 * MB }, { size: 9 * MB }, { size: 30 * MB }], 18 * MB))),
  JSON.parse(JSON.stringify(packAttachments([{ size: 10 * MB }, { size: 9 * MB }, { size: 30 * MB }], 18 * MB))));

/* ---- Code.gs + Ebook.gs 를 가짜 시트로 끝까지 돌려 보기 ---- */
type Cell = unknown;
class FakeSheet {
  data: Cell[][] = [];
  constructor(public name: string) {}
  getName() { return this.name; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); }
  getMaxRows() { return 1000; }
  setFrozenRows() { return this; }
  appendRow(row: Cell[]) { this.data.push([...row]); return this; }
  getRange(r: number, c: number, nr = 1, nc = 1) {
    const sh = this;
    const ensure = (i: number, j: number) => {
      while (sh.data.length < i) sh.data.push([]);
      const row = sh.data[i - 1];
      while (row.length < j) row.push('');
    };
    const range: any = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sh.data[r - 1 + i]?.[c - 1 + j] ?? '')),
      getValue: () => sh.data[r - 1]?.[c - 1] ?? '',
      setValues: (v: Cell[][]) => { v.forEach((row, i) => row.forEach((x, j) => { ensure(r + i, c + j); sh.data[r - 1 + i][c - 1 + j] = x; })); return range; },
      setValue: (x: Cell) => { for (let i = 0; i < nr; i += 1) for (let j = 0; j < nc; j += 1) { ensure(r + i, c + j); sh.data[r - 1 + i][c - 1 + j] = x; } return range; },
      setNumberFormat: () => range,
      setFontWeight: () => range,
      insertCheckboxes: () => { for (let i = 0; i < nr; i += 1) { ensure(r + i, c); if (sh.data[r - 1 + i][c - 1] === '') sh.data[r - 1 + i][c - 1] = false; } return range; },
      getSheet: () => sh,
      getRow: () => r,
      getColumn: () => c,
    };
    return range;
  }
}
const sheets: Record<string, FakeSheet> = {};
const ss = {
  getSheetByName: (n: string) => sheets[n] ?? null,
  insertSheet: (n: string) => (sheets[n] = new FakeSheet(n)),
  setSpreadsheetTimeZone: () => {},
};
const sent: any[] = [];
let mailQuota = 1000;
const driveSizes: Record<string, number> = {};
let gmailMessages: any[] = [];
const chain: any = new Proxy({}, { get: () => () => chain });
const env: any = {
  module: { exports: {} },
  console,
  SpreadsheetApp: { getActive: () => ss, getUi: () => ({ createMenu: () => chain }) },
  ScriptApp: { getProjectTriggers: () => [], deleteTrigger: () => {}, newTrigger: () => chain },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  Utilities: { formatDate: (d: Date) => d.toISOString() },
  MailApp: {
    sendEmail: (...a: any[]) => { mailQuota -= 1; sent.push(a.length === 1 ? a[0] : { to: a[0], subject: a[1], body: a[2] }); },
    getRemainingDailyQuota: () => mailQuota,
  },
  DriveApp: {
    getFileById: (id: string) => {
      if (!(id in driveSizes)) throw new Error('파일을 찾을 수 없음');
      return { getSize: () => driveSizes[id], getBlob: () => ({ name: '', setName(n: string) { this.name = n; return this; } }) };
    },
  },
  GmailApp: { search: () => [{ getMessages: () => gmailMessages }] },
  ContentService: { createTextOutput: (s: string) => ({ s, setMimeType() { return JSON.parse(s); } }), MimeType: { JSON: 'json' } },
};
const miCode = fs.readFileSync(path.join(__dirname, '../apps-script/mock-interview/Code.gs'), 'utf-8');
vm.runInNewContext(`${miCode}\n${ebCode}`, env);
env.setup();
assert.ok(sheets['전자책 주문'] && sheets['전자책 발송 기록'] && sheets['현금영수증 발급 대기'], 'setup 이 전자책 탭 3개를 만듭니다');

// 파일 ID 를 넣은 상태로 바꿉니다(세연님이 Ebook.gs 에서 고치는 부분). 가격은 저장소 값 그대로 씁니다.
env.EB.BOOKS.forEach((b: any, i: number) => { b.fileId = `ID${i}`; driveSizes[`ID${i}`] = 1.1 * MB; });
const post = (f: any) => env.doPost({ postData: { contents: JSON.stringify(f) } });
const r1 = post({ ...good, action: 'ebookOrder', cashReceiptPhone: '01099998888' });
assert.equal(r1.ok, true, JSON.stringify(r1));
assert.match(r1.depositor, /^홍길동[1-9][0-9]$/);
assert.equal(r1.total, 94000, '비교 자료집 79,000 + 김포 15,000');
assert.equal(sent.filter((m) => m.to === 'parent@example.com').length, 1, '주문 접수 메일 1통');
assert.match(sent[0].body, new RegExp(r1.depositor));
assert.match(sent[0].body, /3333-38-6269721/);
assert.match(sent[0].body, new RegExp(r1.id));
const bad = post({ ...good, action: 'ebookOrder', emailConfirm: 'x@y.com' });
assert.equal(bad.ok, false);

const order = sheets['전자책 주문'];
const H = order.data[0] as string[];
const col = (n: string) => H.indexOf(n);
assert.equal(order.data.length, 2);
assert.equal(typeof r1.payDeadline, 'number');
const dl1 = order.data[1][col('입금 기한')] as Date;
assert.equal(Object.prototype.toString.call(dl1), '[object Date]', '주문 때 입금 기한을 적습니다');
assert.equal(dl1.getTime(), r1.payDeadline);
assert.ok(Math.abs(dl1.getTime() - (order.data[1][col('주문 시각')] as Date).getTime() - 3600000) < 1000, '주문 뒤 1시간');
assert.match(sent[0].body, new RegExp(`입금 기한: ${formatKst(r1.payDeadline).replace(/[()]/g, '\\$&')}`), '주문 접수 메일에 입금 기한');
assert.equal(order.data[1][col('상태')], '입금 대기');
assert.equal(order.data[1][col('입금 확정')], false);

// 수동: 입금 확정 체크 → onSheetEdit → PDF 발송
sent.length = 0;
order.data[1][col('입금 확정')] = true;
env.onSheetEdit({ range: order.getRange(2, col('입금 확정') + 1) });
assert.equal(order.data[1][col('상태')], '발송 완료');
assert.equal(order.data[1][col('발송 횟수')], 1);
const pdfMails = sent.filter((m) => m.to === 'parent@example.com');
assert.equal(pdfMails.length, 1, '2권은 메일 한 통');
assert.deepEqual([...pdfMails[0].attachments.map((b: any) => b.name)], ['2027학년도_경기권외고_8개교_비교자료집.pdf', '2027학년도_김포외고_자소서면접및원서접수가이드.pdf']);
assert.equal(sheets['전자책 발송 기록'].data.length, 2);
assert.equal(sheets['현금영수증 발급 대기'].data.length, 2, '현금영수증 대기 1줄');
assert.equal(sheets['현금영수증 발급 대기'].data[1][3], '01099998888');
// 다시 정리해도 두 번 보내지 않음
sent.length = 0;
env.sweepNow();
assert.equal(sent.length, 0);
// 발급함 체크 → 발급 시각
const rc = sheets['현금영수증 발급 대기'];
rc.data[1][5] = true;
env.onSheetEdit({ range: rc.getRange(2, 6) });
assert.equal(Object.prototype.toString.call(rc.data[1][6]), '[object Date]');
// 다시 보내기
order.data[1][col('다시 보내기')] = true;
env.onSheetEdit({ range: order.getRange(2, col('다시 보내기') + 1) });
assert.equal(order.data[1][col('다시 보내기')], false, '체크가 풀립니다');
assert.equal(order.data[1][col('발송 횟수')], 2);
assert.equal(rc.data.length, 2, '현금영수증은 한 번만');

// 발송 실패 → 확인 필요(반복해서 보내지 않음)
const r2 = post({ ...good, name: '이영희', books: ['anyang'], action: 'ebookOrder' });
env.EB.BOOKS[8].fileId = 'missing';
order.data[2][col('입금 확정')] = true;
sent.length = 0;
env.sweepNow();
assert.equal(order.data[2][col('상태')], '확인 필요');
assert.match(String(order.data[2][col('확인 필요 사유')]), /발송 실패/);
assert.ok(sent.some((m) => /확인 필요/.test(m.subject)), '세연님께 확인 필요 메일');
sent.length = 0;
env.sweepNow();
assert.equal(sent.length, 0, '확인 필요 줄은 자동으로 다시 보내지 않습니다');
env.EB.BOOKS[8].fileId = 'ID8';
order.data[2][col('다시 보내기')] = true;
env.sweepNow();
assert.equal(order.data[2][col('상태')], '발송 완료');
assert.equal(r2.ok, true);

// 자동(선택): [입금알림] 메일로 맞추기
env.MI.AUTO_DEPOSIT_CHECK = true;
const r3 = post({ ...good, name: '박민수', books: ['gimpo'], action: 'ebookOrder' });
const r4 = post({ ...good, name: '최지우', books: ['gimpo', 'suwon'], action: 'ebookOrder' });
const msg = (id: string, body: string) => ({ getId: () => id, getDate: () => new Date(), getPlainBody: () => body });
gmailMessages = [
  msg('m1', `[카카오뱅크]\n입금 15,000원\n${r3.depositor}\n잔액 1원`),
  msg('m2', `[카카오뱅크]\n입금 15,000원\n${r4.depositor}\n잔액 1원`),
];
sent.length = 0;
env.sweepNow();
const rowOf = (id: string) => order.data.findIndex((r) => r[0] === id);
assert.equal(order.data[rowOf(r3.id)][col('상태')], '발송 완료', '이름+숫자·금액이 맞으면 자동 발송');
assert.equal(order.data[rowOf(r4.id)][col('상태')], '확인 필요', '금액이 다르면 확인 필요');
assert.match(String(order.data[rowOf(r4.id)][col('확인 필요 사유')]), /입금 금액 15,000원/);
const depLog = [...sheets['입금알림 기록'].data.slice(1).map((r) => r[3])];
assert.deepEqual(depLog, ['전자책 자동 확인', '전자책 확인 필요: 입금 금액 15,000원 (주문 30,000원)']);
// 같은 메일은 두 번 읽지 않습니다.
sent.length = 0;
env.sweepNow();
assert.equal(sheets['입금알림 기록'].data.length, 3);

// 취소
order.data[rowOf(r4.id)][col('취소')] = true;
env.sweepNow();
assert.equal(order.data[rowOf(r4.id)][col('상태')], '취소');

env.MI.AUTO_DEPOSIT_CHECK = false;
gmailMessages = [];

// 9권 모두 주문 → 낱권 합계 199,000원
const r5 = post({ ...good, name: '정묶음', books: [...ALL].reverse(), action: 'ebookOrder' });
assert.equal(r5.ok, true, JSON.stringify(r5));
assert.equal(r5.total, 199000);
assert.equal(order.data[rowOf(r5.id)][col('금액')], 199000);

// 사업자 세무 관리 봇 방식: Sheets API 로 '입금 대기' 줄의 입금 시각·입금 확정·메모 세 칸만 씁니다(onEdit 없음).
// → 5분 정리(sweepNow)가 PDF 를 보내고, 봇이 적은 입금 시각·메모는 그대로 둡니다.
const row5 = rowOf(r5.id);
assert.equal(order.data[row5][col('상태')], '입금 대기');
order.data[row5][col('입금 시각')] = '2026-11-03 12:07';
order.data[row5][col('입금 확정')] = 'TRUE';
order.data[row5][col('메모')] = '세무봇 대조 완료';
sent.length = 0;
env.sweepNow();
assert.equal(order.data[row5][col('상태')], '발송 완료', '세무 봇이 체크한 줄도 보냅니다');
assert.equal(order.data[row5][col('입금 시각')], '2026-11-03 12:07', '봇이 적은 입금 시각을 덮어쓰지 않습니다');
assert.equal(order.data[row5][col('메모')], '세무봇 대조 완료', '메모 칸을 덮어쓰지 않습니다');
assert.equal(sent.filter((m) => m.to === 'parent@example.com' && m.attachments).length, 1, '9권 약 10MB → 한 통');
// 봇이 '확인 필요: …' 메모만 남긴 줄(입금 확정 없음)은 보내지 않고 그대로 둡니다.
const r6 = post({ ...good, name: '한메모', books: ['suwon'], action: 'ebookOrder' });
order.data[rowOf(r6.id)][col('메모')] = '확인 필요: 같은 금액 입금 2건';
sent.length = 0;
env.sweepNow();
assert.equal(order.data[rowOf(r6.id)][col('상태')], '입금 대기');
assert.equal(order.data[rowOf(r6.id)][col('메모')], '확인 필요: 같은 금액 입금 2건');
assert.equal(sent.length, 0);

// 메일 한도가 없으면 주문은 받고 메일만 건너뜁니다(처리 기록에 남김).
mailQuota = 0;
sent.length = 0;
const r7 = post({ ...good, name: '나한도', books: ['gimpo'], action: 'ebookOrder' });
assert.equal(r7.ok, true, '메일 한도가 없어도 주문은 받습니다');
assert.equal(sent.length, 0, '한도가 없으면 보내지 않습니다');
assert.match(String(order.data[rowOf(r7.id)][col('처리 기록')]), /메일 한도/);
assert.equal(order.data[rowOf(r7.id)][col('상태')], '입금 대기');
mailQuota = 1000;
const r8 = post({ ...good, name: '다시옴', books: ['gimpo'], action: 'ebookOrder' });
assert.match(String(order.data[rowOf(r8.id)][col('처리 기록')]), /입금 안내 메일 보냄/);

// 입금 기한: 기한이 지나도 입금이 없으면 5분 정리가 '미입금 취소'로 바꿉니다(메모 칸은 그대로).
const r9 = post({ ...good, name: '기한끝', books: ['gimpo'], action: 'ebookOrder' });
const row9 = rowOf(r9.id);
order.data[row9][col('입금 기한')] = new Date(Date.now() - 5 * 60000);
order.data[row9][col('메모')] = '세무봇 메모';
sent.length = 0;
env.sweepNow();
assert.equal(order.data[row9][col('상태')], '입금 대기', '기한 뒤 10분 안에는 그대로');
order.data[row9][col('입금 기한')] = new Date(Date.now() - 11 * 60000);
env.sweepNow();
assert.equal(order.data[row9][col('상태')], '미입금 취소');
assert.match(String(order.data[row9][col('처리 기록')]), /미입금 취소 \(입금 기한 .+ \+ 10분 지남\)/);
assert.equal(order.data[row9][col('메모')], '세무봇 메모');
assert.equal(order.data[row9][col('입금 확정')], false);
assert.equal(sent.filter((m) => m.attachments).length, 0);
env.sweepNow();
assert.equal(order.data[row9][col('상태')], '미입금 취소', '두 번 정리해도 그대로');
// 미입금 취소 뒤 세연님이 직접 입금 확정 체크 → 확인 필요, 자동 발송 없음
order.data[row9][col('입금 확정')] = true;
sent.length = 0;
env.sweepNow();
assert.equal(order.data[row9][col('상태')], '확인 필요');
assert.match(String(order.data[row9][col('확인 필요 사유')]), /미입금 취소 뒤 입금 확정, 입금 기한\(.+\) \+ 10분 뒤 입금/);
assert.equal(sent.filter((m) => m.attachments).length, 0, '기한 뒤 입금은 자동으로 보내지 않습니다');
assert.ok(sent.some((m) => /확인 필요/.test(m.subject)), '세연님께 확인 필요 메일');
order.data[row9][col('다시 보내기')] = true;
env.sweepNow();
assert.equal(order.data[row9][col('상태')], '발송 완료', '세연님이 확인한 뒤 다시 보내기로 보냅니다');

// 세무 봇이 기한 뒤 입금 시각과 입금 확정을 적은 '입금 대기' 줄 → 확인 필요(보내지 않음), 봇이 적은 칸은 그대로
const r10 = post({ ...good, name: '늦은입금', books: ['suwon'], action: 'ebookOrder' });
const row10 = rowOf(r10.id);
const dl10 = Date.now() - 30 * 60000;
order.data[row10][col('입금 기한')] = new Date(dl10);
order.data[row10][col('입금 시각')] = new Date(dl10 + 11 * 60000);
order.data[row10][col('입금 확정')] = 'TRUE';
order.data[row10][col('메모')] = '세무봇 대조 완료';
sent.length = 0;
env.sweepNow();
assert.equal(order.data[row10][col('상태')], '확인 필요');
assert.equal(order.data[row10][col('메모')], '세무봇 대조 완료');
assert.equal(sent.filter((m) => m.attachments).length, 0);
// 세무 봇이 기한 + 10분 안 입금 시각을 적으면 제때 입금으로 보고 보냅니다
const r10b = post({ ...good, name: '여유입금', books: ['suwon'], action: 'ebookOrder' });
const row10b = rowOf(r10b.id);
const dl10b = Date.now() - 30 * 60000;
order.data[row10b][col('입금 기한')] = new Date(dl10b);
order.data[row10b][col('입금 시각')] = new Date(dl10b + 9 * 60000);
order.data[row10b][col('입금 확정')] = true;
env.sweepNow();
assert.equal(order.data[rowOf(r10b.id)][col('상태')], '발송 완료', '기한 + 10분 안 입금은 제때 입금');
// 기한 안 입금 시각 + 체크는 기한이 지난 뒤 정리해도 보냅니다
const r11 = post({ ...good, name: '제때입금', books: ['suwon'], action: 'ebookOrder' });
const row11 = rowOf(r11.id);
order.data[row11][col('입금 기한')] = new Date(Date.now() - 60000);
order.data[row11][col('입금 시각')] = new Date(Date.now() - 5 * 60000);
order.data[row11][col('입금 확정')] = 'TRUE';
env.sweepNow();
assert.equal(order.data[row11][col('상태')], '발송 완료');
// [입금알림] 자동 확인: 미입금 취소된 주문의 입금 → 확인 필요
env.MI.AUTO_DEPOSIT_CHECK = true;
const r12 = post({ ...good, name: '알림늦음', books: ['gimpo'], action: 'ebookOrder' });
const row12 = rowOf(r12.id);
order.data[row12][col('입금 기한')] = new Date(Date.now() - 11 * 60000);
env.sweepNow();
assert.equal(order.data[row12][col('상태')], '미입금 취소');
gmailMessages = [msg('m9', `[카카오뱅크]\n입금 15,000원\n${r12.depositor}\n잔액 1원`)];
sent.length = 0;
env.sweepNow();
assert.equal(order.data[rowOf(r12.id)][col('상태')], '확인 필요');
assert.match(String(order.data[rowOf(r12.id)][col('확인 필요 사유')]), /입금 기한/);
assert.equal(sent.filter((m) => m.attachments).length, 0);
env.MI.AUTO_DEPOSIT_CHECK = false;
gmailMessages = [];

// 예전 탭(입금 기한 칸 없음)에 setup 을 다시 돌리면 맨 뒤에 칸을 덧붙이고, 기존 칸은 그대로입니다.
const before = [...(order.data[0] as string[])];
order.data.forEach((r) => r.pop());
env.setup();
assert.deepEqual(order.data[0], before);

// Ebook.gs 를 넣지 않은 프로젝트에서는 전자책 주문을 받지 않습니다.
const env3: any = { module: { exports: {} }, ContentService: env.ContentService };
vm.runInNewContext(miCode, env3);
assert.equal(env3.doPost({ postData: { contents: JSON.stringify({ ...good, action: 'ebookOrder' }) } }).ok, false);

/* ---- 저장소·화면에 PDF 가 없는지 ---- */
const root = path.join(__dirname, '..');
const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    ['node_modules', '.git', 'dist'].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
  );
assert.deepEqual(walk(root).filter((f) => /\.pdf$/i.test(f)), [], '저장소에 PDF 를 넣지 않습니다');

// 11/3 결정: 메일 제목·PDF 메일 문구·책 이름
{
  const o = { id: 'EB-TEST-1', name: '홍길동', email: 'a@b.co', depositor: '홍길동27', total: orderTotal(['gimpo'])!, books: ['gimpo'], payDeadline: DL };
  assert.equal(orderReceivedMail(o).subject, '[입시는세연쌤] 전자책 주문 입금 안내 (EB-TEST-1)');
  assert.equal(gs.eb_orderMail(o).subject, '[입시는세연쌤] 전자책 주문 입금 안내 (EB-TEST-1)');
  const pm = buyerMail({ id: 'EB-TEST-1', name: '홍길동', email: 'a@b.co', books: ['gimpo'] }).body;
  assert.ok(pm.includes('다른 사람에게 보내거나 인터넷에 올리면 법적 처벌의 대상이 될 수 있습니다.'));
  assert.ok(pm.includes("파일이 열리지 않으면 카카오톡 채널 '입시는세연쌤'으로 알려 주세요."));
  assert.ok(!pm.includes('답장') && !pm.includes('구매하신 분만'));
  assert.ok(gs.eb_pdfMail({ id: 'EB-TEST-1', name: '홍길동' }, 1, 1, ['x']).body.includes('법적 처벌의 대상'));
  assert.equal(EBOOKS.find((b) => b.id === 'gyeonggi')!.title, '2027학년도 경기외고 자소서 면접 및 원서접수 가이드');
  assert.equal(EBOOKS.find((b) => b.id === 'compare')!.title, '2027학년도 경기권 외고 8개교 비교 자료집');
}
console.log('✅ ebooks order/deposit/send tests passed');

// 상세(샘플·목차) 화면: 데이터·주소·샘플 파일·빌드용 HTML
{
  const { EBOOK_DETAILS, detailById, detailIdFromPath, preselectFromSearch, buyPath, detailPath } = await import('../src/lib/ebooksDetail');
  const { detailHtml } = await import('./ebooks-detail-pages');
  const pub = path.join(__dirname, '../public');
  assert.equal(EBOOK_DETAILS.length, EBOOKS.length);
  for (const b of EBOOKS) {
    const d = detailById(b.id);
    assert.ok(d, `${b.id} 상세 데이터`);
    // 목차 쪽 번호는 2쪽부터 커지고, 책 쪽수 안에 있습니다(완성본 PDF 기준).
    let last = 1;
    for (const t of d!.toc) {
      assert.ok(t.page > last && (b.pages == null || t.page <= b.pages), `${b.id} 목차 쪽 ${t.page}`);
      last = t.page;
    }
    // 샘플은 책마다 4쪽, 마지막 1쪽만 흐리게 처리합니다(세연님 결정 2026-11-03).
    assert.equal(d!.samples.length, 4, `${b.id} 샘플 4쪽`);
    assert.deepEqual(d!.samples.map((x) => !!x.blurred), [false, false, false, true], `${b.id} 흐린 쪽`);
    const expected = b.id === 'compare' ? [1, 3, 13, 37] : b.id === 'gimpo' || b.id === 'anyang' ? [1, 3, 6, 8] : [1, 3, 5, 7];
    assert.deepEqual(d!.samples.map((x) => x.page), expected, `${b.id} 샘플 쪽`);
    for (const sp of d!.samples) {
      assert.ok(sp.page >= 1 && (b.pages == null || sp.page <= b.pages));
      assert.ok(/^\/ebooks\/samples\/[a-z]+-p\d+\.webp$/.test(sp.src), sp.src);
      assert.ok(fs.existsSync(path.join(pub, sp.src)), `샘플 파일 ${sp.src}`);
    }
    const copy = [...d!.audience, ...d!.basis, ...d!.toc.map((t) => t.title), ...d!.samples.map((x) => x.caption)].join('\n');
    for (const banned of ['아니라', '충분합니다', '막혀', '아이', '북스']) assert.ok(!copy.includes(banned), `${b.id} 금지 표현 ${banned}`);
    assert.equal(detailIdFromPath(detailPath(b.id)), b.id);
    assert.equal(detailIdFromPath(`/ebooks/${b.id}`), b.id);
    assert.deepEqual(preselectFromSearch(`?book=${b.id}`), [b.id]);
    assert.equal(buyPath(b.id), `/ebooks/?book=${b.id}#eb-form`);
    const html = detailHtml('<title>x</title><meta name="description" content="d" /><link rel="canonical" href="https://sehyunt.re.kr/ebooks/" /><meta property="og:url" content="https://sehyunt.re.kr/ebooks/" />', b);
    assert.ok(html.includes(`<title>${b.title} 샘플·목차 | 입시는세연쌤</title>`));
    assert.ok(html.includes(`href="https://sehyunt.re.kr/ebooks/${b.id}/"`));
    assert.ok(html.includes(`content="https://sehyunt.re.kr/ebooks/${b.id}/"`));
  }
  assert.equal(detailIdFromPath('/ebooks/'), null);
  assert.equal(detailIdFromPath('/ebooks/samples/'), null);
  assert.equal(detailIdFromPath('/ebooks/nope/'), null);
  assert.deepEqual(preselectFromSearch('?book=nope'), []);
  assert.deepEqual(preselectFromSearch(''), []);
  // PDF 는 저장소 public 에 두지 않습니다(샘플은 이미지만).
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  assert.deepEqual(walk(pub).filter((f) => f.toLowerCase().endsWith('.pdf')), []);
  // 샘플 폴더에는 상세 화면이 쓰는 이미지만 둡니다(쓰지 않는 옛 샘플이 남지 않게).
  const used = new Set(EBOOK_DETAILS.flatMap((d) => d.samples.map((x) => path.basename(x.src))));
  assert.deepEqual(fs.readdirSync(path.join(pub, 'ebooks/samples')).filter((f) => !used.has(f)), []);
  console.log('✅ ebooks detail page tests passed');
}
