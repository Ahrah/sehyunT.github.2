/** 마감 임박 알림(세연님 11/3 15:18): 새로 신청할 수 있는 타임이 하나만 남고 그 타임 남은 자리가 1명일 때 한 번 알림 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { MI_CONFIG, type MiRow, allSlots, lastSeatSlot, setExtraSlots } from '../src/lib/mockInterview';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(__dirname, '../apps-script/mock-interview/Code.gs'), 'utf-8');
const sandbox: { module: { exports: Record<string, any> }; console: Console } = { module: { exports: {} }, console };
vm.runInNewContext(code, sandbox);
const gs = sandbox.module.exports;
const T = (s: string) => Date.parse(`${s}+09:00`);
const NOW = T('2026-11-10T10:00:00');
const PHONE = '010-1234-5678';
const ALERT = 'kakao-bot@example.com';
const clone = <X,>(x: X): X => JSON.parse(JSON.stringify(x));

setExtraSlots([]);
gs.MI.EXTRA_SLOTS = [];
const gated = new Set(MI_CONFIG.waitlistAtOpen as readonly string[]);
const registrable = allSlots().filter((s) => !gated.has(`${s.date} ${s.time}`));
assert.equal(registrable.length, 12, '정규 12타임 모두 신청 가능 (더 이상 waitlist-at-open 없음)');

let n = 0;
const row = (date: string, time: string, status = '입금 대기'): MiRow =>
  ({
    id: `R${++n}`, groupId: '', appliedAt: T('2026-11-09T21:05:00') + n, kind: '예약', date, time, status,
    payDeadline: NOW + 3600000, holdStartedAt: T('2026-11-09T21:05:00'), docsDeadline: null,
    paidChecked: false, paidAt: null, unpaidChecked: false, docsReceived: false, cancelReason: '', log: [],
  }) as unknown as MiRow;
/** 앞의 타임은 모두 4명, 마지막 등록 가능 타임은 held 명 */
function scenario(lastHeld: number, lastIndex = registrable.length - 1): MiRow[] {
  const rows: MiRow[] = [];
  registrable.forEach((s, i) => {
    const k = i === lastIndex ? lastHeld : MI_CONFIG.capacity;
    for (let j = 0; j < k; j += 1) rows.push(row(s.date, s.time, j % 2 ? '확정' : '입금 대기'));
  });
  return rows;
}
const last = registrable[registrable.length - 1];
const LAST_KEY = `${last.date} ${last.time}`;
const both = (rows: MiRow[], now = NOW) => {
  const a = lastSeatSlot(rows, now);
  const b = gs.mi_lastSeatSlot(clone(rows), now);
  assert.equal(b ? b.key : null, a, 'Apps Script 와 홈페이지 규칙이 같음');
  return a;
};

// 1) 조건: 다른 타임이 모두 차고 마지막 타임 남은 자리 1명
assert.equal(both(scenario(3)), LAST_KEY);
assert.equal(both(scenario(2)), null, '남은 자리 2명이면 아님');
assert.equal(both(scenario(4)), null, '모두 차면 아님(대기만)');
{
  // 두 타임이 각각 1명 남음 → 새로 신청할 수 있는 타임이 둘이므로 아님(타임마다 알리지 않음)
  const rows = scenario(3).filter((r) => !(r.date === registrable[0].date && r.time === registrable[0].time)).concat(
    [0, 1, 2].map(() => row(registrable[0].date, registrable[0].time)),
  );
  assert.equal(both(rows), null, '1명 남은 타임이 둘이면 아님');
}
{
  // 취소·대기 줄은 자리를 잡지 않음
  const rows = scenario(3).concat([row(last.date, last.time, '취소'), row(last.date, last.time, '확인 필요')]);
  assert.equal(both(rows), LAST_KEY, '취소·확인 필요는 자리를 잡지 않음');
}
{
  // 마감(시작 24시간 전 지남)된 타임은 신청할 수 없으므로 '찬 타임'으로 봄
  const first3 = registrable.filter((s) => s.date === '2026-12-12');
  const rows = scenario(3).filter((r) => r.date !== '2026-12-12');
  const after = T('2026-12-11T18:30:00');
  assert.ok(first3.length > 0);
  assert.equal(both(rows, NOW), null, '12/12 타임이 비어 있으면 아님');
  assert.equal(both(rows, after), LAST_KEY, '12/12 타임 신청 마감 뒤에는 남은 마지막 타임');
}
{
  // 관리자 화면에서 추가 타임을 열면 조건이 풀림
  setExtraSlots(['2026-12-26 15:00']);
  gs.MI.EXTRA_SLOTS = ['2026-12-26 15:00'];
  assert.equal(both(scenario(3)), null, '추가 타임이 열리면 아님');
  setExtraSlots([]);
  gs.MI.EXTRA_SLOTS = [];
}

// 2) 알림 내용
assert.equal(gs.mi_lastSeatText('2026-12-20', '17:00'), '[마감임박] 12월 20일 17시 3:1 모의면접 남은 자리 1명');
const p1 = gs.mi_lastSeatPlan(scenario(3), NOW, { key: '' }, PHONE, ALERT);
assert.equal(p1.slot.key, LAST_KEY);
assert.equal(p1.send.length, 2);
const sms = p1.send.find((x: any) => x.channel === 'sms');
assert.equal(sms.to, gs.MI.OWNER_EMAIL, '문자발송 메일은 세연님 메일로');
assert.equal(sms.subject, '[문자발송] 모의면접 01012345678', '제목에 전화번호');
assert.equal(sms.body, gs.mi_lastSeatText(last.date, last.time), '본문은 SMS 텍스트만');
const mail = p1.send.find((x: any) => x.channel === 'mail');
assert.equal(mail.to, ALERT);
assert.equal(mail.subject, '[마감임박] 3:1 모의면접');
assert.ok(!mail.subject.includes('[문자발송]'), '카카오 봇 메일은 단축어가 읽지 않음');
const lines = mail.body.split('\n');
assert.ok(lines[0].startsWith('날짜: ') && lines[1].startsWith('시간: ') && lines[2] === '남은 인원: 1', '고정 줄');
assert.equal(gs.mi_lastSeatAlertMail('2026-12-20', '18:00').body.split('\n').slice(0, 3).join('|'), '날짜: 12월 20일(일)|시간: 18시|남은 인원: 1');
assert.ok(mail.body.includes('마감 임박! 이후 대기 신청만 가능합니다'));

// 3) 한 번만: 보낸 뒤에는 다시 보내지 않음
const sent: string[] = [];
let state = gs.mi_sendLastSeat_(p1, (to: string) => sent.push(to));
assert.deepEqual(clone(state), { key: LAST_KEY, sms: true, mail: true });
assert.equal(sent.length, 2);
for (let i = 0; i < 3; i += 1) {
  const again = gs.mi_lastSeatPlan(scenario(3), NOW + i * 300000, clone(state), PHONE, ALERT);
  assert.equal(again.send.length, 0, '같은 타임에는 다시 보내지 않음(5분 정리마다)');
  state = again.state;
}
// 4) 조건이 풀리면 기록을 지우고, 다시 조건이 되면 또 보냄
const freed = gs.mi_lastSeatPlan(scenario(2), NOW, clone(state), PHONE, ALERT);
assert.deepEqual(clone(freed.state), { key: '' }, '자리가 비면 기록 지움');
const rearm = gs.mi_lastSeatPlan(scenario(3), NOW, clone(freed.state), PHONE, ALERT);
assert.equal(rearm.send.length, 2, '다시 1명이 되면 또 알림');
const full = gs.mi_lastSeatPlan(scenario(4), NOW, { key: LAST_KEY, sms: true, mail: true }, PHONE, ALERT);
assert.deepEqual(clone(full.state), { key: '' }, '모두 차도 기록 지움');
// 다른 타임이 마지막이 되면 그 타임으로 새로 알림
const other = registrable[0];
const p2 = gs.mi_lastSeatPlan(scenario(3, 0), NOW, { key: LAST_KEY, sms: true, mail: true }, PHONE, ALERT);
assert.equal(p2.slot.key, `${other.date} ${other.time}`);
assert.equal(p2.send.length, 2, '마지막 타임이 바뀌면 새로 알림');

// 5) 속성이 없으면 그쪽은 건너뜀(나중에 늦게 보내지 않음)
const noMail = gs.mi_lastSeatPlan(scenario(3), NOW, { key: '' }, PHONE, '');
assert.deepEqual(clone(noMail.send.map((x: any) => x.channel)), ['sms'], 'ALERT_EMAIL 이 비면 카카오 봇 메일 건너뜀');
assert.equal(noMail.state.mail, true);
const noPhone = gs.mi_lastSeatPlan(scenario(3), NOW, { key: '' }, null, ALERT);
assert.deepEqual(clone(noPhone.send.map((x: any) => x.channel)), ['mail'], 'OWNER_PHONE 이 없으면 문자 메일 건너뜀');
assert.equal(gs.mi_lastSeatPlan(scenario(3), NOW, { key: '' }, '1234', 'not-an-email').send.length, 0);

// 6) 보내지 못한 쪽만 다음 정리에 다시 보냄
const p3 = gs.mi_lastSeatPlan(scenario(3), NOW, { key: '' }, PHONE, ALERT);
const st3 = gs.mi_sendLastSeat_(p3, (to: string) => { if (to === ALERT) throw new Error('quota'); });
assert.deepEqual(clone(st3), { key: LAST_KEY, sms: true, mail: false });
const retry = gs.mi_lastSeatPlan(scenario(3), NOW, clone(st3), PHONE, ALERT);
assert.deepEqual(clone(retry.send.map((x: any) => x.channel)), ['mail'], '실패한 카카오 봇 메일만 다시');

// 7) SMS_SINCE·오픈 전에는 보내지 않고 기록도 그대로
const before = gs.mi_lastSeatPlan(scenario(3), T('2026-11-09T20:00:00'), { key: 'x' }, PHONE, ALERT);
assert.equal(before.send.length, 0);
assert.deepEqual(clone(before.state), { key: 'x' });
const savedSince = gs.MI.SMS_SINCE;
gs.MI.SMS_SINCE = '2026-11-11T00:00:00+09:00';
assert.equal(gs.mi_lastSeatPlan(scenario(3), NOW, { key: '' }, PHONE, ALERT).send.length, 0, 'SMS_SINCE 전에는 보내지 않음');
gs.MI.SMS_SINCE = savedSince;

// 8) 정리 함수마다 확인을 부르고, 관리자 목록에 lastSeat 을 넣음
assert.equal((code.match(/mi_checkLastSeat_\(data\.rows, now\);/g) || []).length, 4, '신청·관리자·시트 메뉴 취소·5분 정리');
assert.ok(code.includes('lastSeat: (function (s) { return s ? s.key : null; })(mi_lastSeatSlot(data.rows, now))'));
assert.equal(gs.MI.OWNER_PHONE_PROP, 'OWNER_PHONE');
assert.equal(gs.MI.ALERT_EMAIL_PROP, 'ALERT_EMAIL');
const admin = fs.readFileSync(path.join(__dirname, '../src/components/MockInterviewAdmin.tsx'), 'utf-8');
assert.ok(admin.includes('data?.lastSeat === `${r.date} ${r.time}`'), '관리자 배지는 그 타임 줄에만');

console.log('✅ last-seat alert (one open slot, 1 seat left) tests passed');
