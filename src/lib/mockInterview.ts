/**
 * 12월 3:1 모의면접 신청: 설정, 좌석·대기·기한 규칙.
 *
 * 같은 규칙이 apps-script/mock-interview/Code.gs 에도 있습니다(서버가 최종 판단).
 * 규칙을 바꾸면 두 파일을 함께 고치고 `npm test` 를 돌리세요.
 */

/** Apps Script 웹 앱 주소. 비어 있으면 미리보기(테스트 모드)로 동작합니다. */
export const MOCK_INTERVIEW_API_URL: string =
  (import.meta.env?.VITE_MOCK_INTERVIEW_API_URL as string | undefined)?.trim() || '';

export const MI_CONFIG = {
  /** 신청 오픈: 2026-11-09(월) 21:00 KST */
  openAt: '2026-11-09T21:00:00+09:00',
  dates: ['2026-12-12', '2026-12-13', '2026-12-19', '2026-12-20'],
  /** 신청을 받는 타임 */
  times: ['16:00', '17:00', '18:00'],
  /** '추가 날짜·시간 오픈 신청'에서 고를 수 있는 시간(이 밖의 시간은 직접 적습니다). 정규 타임과 따로입니다. */
  extraRequestTimes: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
  /** 추가 오픈 신청 연락처 보관 마지막 날(이날 밤 12시에 지웁니다) */
  extraRequestKeepUntil: '2026-12-20',
  capacity: 4,
  fee: 80000,
  /** 신청(또는 대기 승격) 뒤 입금 기한 */
  payWindowMs: 60 * 60 * 1000,
  /** 입금 기한 뒤 자동 취소까지 기다리는 시간. 입금 시각이 기한 + 10분 안이면 제때 입금으로 봅니다. Code.gs MI.PAY_GRACE_MS 와 같아야 합니다. */
  payGraceMs: 10 * 60 * 1000,
  /** 서류 기한: 면접 날짜 7일 전 23:59:59 KST */
  docsDaysBefore: 7,
  /** 서류 기한이 지난 뒤 자리를 받은 학생에게 주는 서류 제출 시간 */
  docsGraceMs: 24 * 60 * 60 * 1000,
  /** 면접 시작 몇 시간 전까지 예약·대기 승격을 받을지 */
  bookingCloseMs: 24 * 60 * 60 * 1000,
  /** 사진 활용 동의를 필수로 받을지(세연님 결정: 필수). false 로 바꾸면 선택 동의가 됩니다. */
  photoConsentRequired: true,
  docsEmail: ['consultantsyssam', 'gmail.com'].join('@'),
  bankName: '카카오뱅크',
  bankNumber: '3333-38-6269721',
  bankHolder: '입시는세연쌤',
  bankAccount: '카카오뱅크 3333-38-6269721 (입시는세연쌤)',
  /** 환불 규정이 아직 초안인지(화면에 '확정 전' 표시) */
  refundDraft: true,
} as const;

export const MI_STATUS = {
  pending: '입금 대기',
  confirmed: '확정',
  waitlist: '대기',
  cancelled: '취소',
  /** 자동으로 처리하지 않고 세연님이 보는 줄(기한 뒤 입금, 미입금 취소 뒤 입금 확정). 자리를 잡지 않습니다. */
  check: '확인 필요',
  extraRequest: '추가 오픈 신청',
} as const;
export type MiStatus = (typeof MI_STATUS)[keyof typeof MI_STATUS];

export type MiKind = '예약' | '추가 오픈';

export type MiRow = {
  id: string;
  appliedAt: number;
  kind: MiKind;
  date: string;
  time: string;
  status: MiStatus;
  /** 입금 기한(epoch ms). 입금 대기일 때만 의미가 있습니다. */
  payDeadline: number | null;
  /** 입금 대기로 바뀐 시각(신청 또는 대기 승격) */
  holdStartedAt: number | null;
  docsDeadline: number | null;
  /** 세연님이 입력하는 칸: '입금 확정' 체크, (선택) 은행 입금 시각, '미입금' 체크 */
  paidChecked: boolean;
  paidAt: number | null;
  unpaidChecked: boolean;
  docsReceived: boolean;
  cancelReason: string;
  /** '확인 필요'가 된 까닭 */
  checkReason?: string;
  /** 한 번에 여러 타임을 신청하면 같은 묶음 번호를 씁니다. 비어 있으면 혼자인 신청입니다. */
  groupId?: string;
  log: string[];
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function slotStart(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00+09:00`);
}

export function isOpen(now: number): boolean {
  return now >= Date.parse(MI_CONFIG.openAt);
}

export function slotKey(date: string, time: string): string {
  return `${date} ${time}`;
}

export function isValidSlot(date: string, time: string): boolean {
  return (MI_CONFIG.dates as readonly string[]).includes(date) && (MI_CONFIG.times as readonly string[]).includes(time);
}

/** 예약·대기를 받는 마지막 시각(면접 시작 24시간 전) */
export function slotBookingClosesAt(date: string, time: string): number {
  return slotStart(date, time) - MI_CONFIG.bookingCloseMs;
}

/** 면접 날짜 7일 전 23:59:59.999 KST */
export function baseDocsDeadline(date: string): number {
  const dayStartKst = Date.parse(`${date}T00:00:00+09:00`);
  return dayStartKst - (MI_CONFIG.docsDaysBefore - 1) * 24 * 60 * 60 * 1000 - 1;
}

/** 자리를 받은 시각 기준 서류 기한: 기본 기한, 이미 지났다면 받은 시각 + 24시간 */
export function docsDeadlineFor(date: string, holdStartedAt: number): number {
  return Math.max(baseDocsDeadline(date), holdStartedAt + MI_CONFIG.docsGraceMs);
}

const HOLDING: readonly MiStatus[] = [MI_STATUS.pending, MI_STATUS.confirmed];

export function slotRows(rows: readonly MiRow[], date: string, time: string): MiRow[] {
  return rows.filter((r) => r.kind === '예약' && r.date === date && r.time === time);
}

export function heldCount(rows: readonly MiRow[], date: string, time: string): number {
  return slotRows(rows, date, time).filter((r) => HOLDING.includes(r.status)).length;
}

export function waitlistOf(rows: readonly MiRow[], date: string, time: string): MiRow[] {
  return slotRows(rows, date, time)
    .filter((r) => r.status === MI_STATUS.waitlist)
    .sort((a, b) => a.appliedAt - b.appliedAt || a.id.localeCompare(b.id));
}

export type SlotSummary = {
  date: string;
  time: string;
  capacity: number;
  left: number;
  waitlist: number;
  closed: boolean;
};

export function summarize(rows: readonly MiRow[], now: number): SlotSummary[] {
  const out: SlotSummary[] = [];
  for (const date of MI_CONFIG.dates) {
    for (const time of MI_CONFIG.times) {
      out.push({
        date,
        time,
        capacity: MI_CONFIG.capacity,
        left: Math.max(0, MI_CONFIG.capacity - heldCount(rows, date, time)),
        waitlist: waitlistOf(rows, date, time).length,
        closed: now >= slotBookingClosesAt(date, time),
      });
    }
  }
  return out;
}

/**
 * 새 예약 신청의 상태를 정합니다.
 * 자리가 남아 있고 앞선 대기자가 없을 때만 입금 대기, 아니면 대기.
 */
export function initialStatusFor(rows: readonly MiRow[], date: string, time: string): MiStatus {
  const full = heldCount(rows, date, time) >= MI_CONFIG.capacity;
  const queued = waitlistOf(rows, date, time).length > 0;
  return full || queued ? MI_STATUS.waitlist : MI_STATUS.pending;
}

export function newBookingRow(
  rows: readonly MiRow[],
  id: string,
  date: string,
  time: string,
  now: number,
  groupId = '',
): MiRow {
  const status = initialStatusFor(rows, date, time);
  const holding = status === MI_STATUS.pending;
  return {
    id,
    groupId,
    appliedAt: now,
    kind: '예약',
    date,
    time,
    status,
    payDeadline: holding ? now + MI_CONFIG.payWindowMs : null,
    holdStartedAt: holding ? now : null,
    docsDeadline: holding ? docsDeadlineFor(date, now) : null,
    paidChecked: false,
    paidAt: null,
    unpaidChecked: false,
    docsReceived: false,
    cancelReason: '',
    log: [`${formatKst(now)} ${status}`],
  };
}

/** 미입금으로 취소된 줄인지(자동 취소·'미입금' 체크·예전 문구) */
export function isUnpaidCancel(reason: string): boolean {
  return /^미입금/.test(reason) || reason === '1시간 안에 입금하지 않음';
}

/** 자동 취소 기준 시각: 입금 기한 + 10분 */
export function payGraceEnd(payDeadline: number): number {
  return payDeadline + MI_CONFIG.payGraceMs;
}

/**
 * 입금 묶음: 같은 묶음 번호이고 같은 입금 기한인 입금 대기 줄. 한 번에 신청한 타임은 한 번에 입금합니다.
 * 대기에서 승격된 줄은 승격 시각으로 기한이 새로 생기므로 따로 묶입니다(같은 때 승격된 같은 묶음 줄은 함께).
 */
export function payUnitKey(r: Pick<MiRow, 'id' | 'groupId' | 'payDeadline'>): string {
  return r.groupId ? `${r.groupId}|${r.payDeadline}` : `row:${r.id}`;
}

export type PayDecision = { action: 'confirm' | 'check' | 'cancel' | 'none'; reason: string };

/**
 * 입금 묶음 하나의 판단(서버 mi_decidePay 와 같음).
 * paid: 묶음 안 한 줄이라도 '입금 확정' 체크, paidAt: 묶음 안 가장 이른 '입금 시각', unpaid: 한 줄이라도 '미입금' 체크.
 */
export function decidePay(
  u: { paid: boolean; paidAt: number | null; unpaid: boolean; payDeadline: number },
  now: number,
): PayDecision {
  const graceEnd = payGraceEnd(u.payDeadline);
  const dl = formatKst(u.payDeadline);
  if (u.paidAt != null && u.paidAt > graceEnd) {
    return { action: 'check', reason: `입금 기한(${dl}) + 10분 뒤 입금(입금 시각 ${formatKst(u.paidAt)})` };
  }
  if (u.paid) {
    if (u.paidAt == null && now > graceEnd) return { action: 'check', reason: `입금 기한(${dl}) + 10분 뒤 입금 확정(입금 시각 없음)` };
    return { action: 'confirm', reason: '' };
  }
  if (now > graceEnd) return { action: 'cancel', reason: `미입금(입금 기한 ${dl} + 10분 지남)` };
  if (now > u.payDeadline && u.unpaid) return { action: 'cancel', reason: '미입금(미입금 체크)' };
  return { action: 'none', reason: '' };
}

/**
 * 시간 트리거가 하는 일(서버와 같은 규칙).
 * 1) 입금 대기(입금 묶음 단위로 판단)
 *    - 묶음 안 한 줄이라도 '입금 확정' 체크 → 묶음 전체 확정. 단, 입금 시각(없으면 지금 시각)이 '입금 기한 + 10분' 뒤면 '확인 필요'.
 *    - '입금 시각'만 적혀 있고 그 시각이 '입금 기한 + 10분' 뒤여도 '확인 필요'.
 *    - 입금 확정 없이 '입금 기한 + 10분'이 지나면 묶음 전체 자동 취소(취소 사유 '미입금(…)'). 자리가 비고 대기 1번이 올라갑니다.
 *    - (손으로) 기한이 지났고 '미입금'에 체크하면 10분을 기다리지 않고 바로 취소.
 * 2) 미입금으로 취소된 줄에 '입금 확정'(또는 입금 시각)이 들어오면 '확인 필요'. 자동으로 예약하지 않습니다.
 * 3) 확정: 서류 기한이 지났는데 '서류 받음'이 없으면 취소.
 * 4) 빈자리가 생기면 그 타임의 대기 1번부터 입금 대기로 올리고 새 1시간 기한을 줍니다.
 * '확인 필요' 줄은 자리를 잡지 않습니다. 세연님이 보고 상태를 '확정'으로 바꾸거나 환불합니다.
 */
export function sweep(input: readonly MiRow[], now: number): MiRow[] {
  const rows = input.map((r) => ({ ...r, log: [...r.log] }));
  const units = new Map<string, MiRow[]>();
  for (const r of rows) {
    if (r.kind !== '예약' || r.status !== MI_STATUS.pending || r.payDeadline == null) continue;
    const k = payUnitKey(r);
    units.set(k, [...(units.get(k) ?? []), r]);
  }
  for (const unit of units.values()) {
    const paidAts = unit.map((r) => r.paidAt).filter((t): t is number => t != null);
    const d = decidePay(
      {
        paid: unit.some((r) => r.paidChecked),
        paidAt: paidAts.length ? Math.min(...paidAts) : null,
        unpaid: unit.some((r) => r.unpaidChecked),
        payDeadline: unit[0].payDeadline!,
      },
      now,
    );
    for (const r of unit) {
      if (d.action === 'confirm') {
        r.status = MI_STATUS.confirmed;
        r.log.push(`${formatKst(now)} 확정`);
      } else if (d.action === 'check') needsCheck(r, now, d.reason);
      else if (d.action === 'cancel') cancel(r, now, d.reason);
    }
  }
  for (const r of rows) {
    if (r.kind !== '예약') continue;
    if (r.status === MI_STATUS.cancelled && isUnpaidCancel(r.cancelReason) && (r.paidChecked || r.paidAt != null)) {
      needsCheck(r, now, `미입금 취소 뒤 입금 확정${r.paidAt != null ? `(입금 시각 ${formatKst(r.paidAt)})` : ''}`);
    }
    if (r.status === MI_STATUS.confirmed && r.docsDeadline != null && now > r.docsDeadline && !r.docsReceived) {
      cancel(r, now, '서류 미제출');
    }
  }
  for (const date of MI_CONFIG.dates) {
    for (const time of MI_CONFIG.times) {
      if (now >= slotBookingClosesAt(date, time)) continue;
      let free = MI_CONFIG.capacity - heldCount(rows, date, time);
      const queue = waitlistOf(rows, date, time);
      while (free > 0 && queue.length > 0) {
        const next = queue.shift()!;
        next.status = MI_STATUS.pending;
        next.holdStartedAt = now;
        next.payDeadline = now + MI_CONFIG.payWindowMs;
        next.docsDeadline = docsDeadlineFor(date, now);
        next.log.push(`${formatKst(now)} 대기에서 입금 대기로 승격`);
        free -= 1;
      }
    }
  }
  return rows;
}

function cancel(r: MiRow, now: number, reason: string) {
  r.status = MI_STATUS.cancelled;
  r.cancelReason = reason;
  r.log.push(`${formatKst(now)} 취소: ${reason}`);
}

function needsCheck(r: MiRow, now: number, reason: string) {
  r.status = MI_STATUS.check;
  r.checkReason = reason;
  r.log.push(`${formatKst(now)} 확인 필요: ${reason}`);
}

/** 대기 순번(1부터). 대기가 아니면 null */
export function waitlistPosition(rows: readonly MiRow[], id: string): number | null {
  const row = rows.find((r) => r.id === id);
  if (!row || row.status !== MI_STATUS.waitlist) return null;
  return waitlistOf(rows, row.date, row.time).findIndex((r) => r.id === id) + 1;
}

export function formatKst(ms: number): string {
  const d = new Date(ms + KST_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '12/12(토)' */
export function formatDateLabel(date: string): string {
  const d = new Date(Date.parse(`${date}T12:00:00+09:00`) + KST_OFFSET_MS);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]})`;
}

/** '11/9(월) 21:05' */
export function formatShortKst(ms: number): string {
  const d = new Date(ms + KST_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]}) ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export const OPEN_LABEL = '11/9(월) 밤 9시 신청 오픈';

/* ---------- 신청서 ---------- */

/** 목록에 없는 날짜·시간을 직접 적을 때 쓰는 값('목록에 없는 날짜' 추가 오픈 신청 버튼도 이 값을 씁니다) */
export const OTHER_CHOICE = 'other';

export type MiSlotPick = { date: string; time: string };

export type MiForm = {
  kind: MiKind;
  /** 고른 정규 타임(여러 개). 버튼을 누르면 고르고, 다시 누르면 뺍니다. */
  slots: MiSlotPick[];
  /** '추가 오픈 신청'을 누른 날짜(MI_CONFIG.dates 또는 OTHER_CHOICE). 원하는 시간은 신청완료 화면에서 고릅니다. */
  extraDates: string[];
  studentName: string;
  school: string;
  track: string;
  phone: string;
  depositor: string;
  under14: boolean;
  guardianName: string;
  guardianPhone: string;
  guardianConsent: boolean;
  consentPrivacy: boolean;
  consentVideo: boolean;
  consentPhoto: boolean;
  /** 스팸 방지용 숨은 칸. 사람이 채우지 않습니다. */
  website: string;
};

export const EMPTY_FORM: MiForm = {
  kind: '예약',
  slots: [],
  extraDates: [],
  studentName: '',
  school: '',
  track: '',
  phone: '',
  depositor: '',
  under14: false,
  guardianName: '',
  guardianPhone: '',
  guardianConsent: false,
  consentPrivacy: false,
  consentVideo: false,
  consentPhoto: false,
  website: '',
};

/** 고른 타임 목록에서 하나를 넣거나 뺍니다(토글). */
export function toggleSlot(list: readonly MiSlotPick[], date: string, time: string): MiSlotPick[] {
  return list.some((x) => x.date === date && x.time === time)
    ? list.filter((x) => !(x.date === date && x.time === time))
    : [...list, { date, time }];
}

/** 문자열 목록에서 하나를 넣거나 뺍니다(토글). */
export function toggleValue(list: readonly string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** 날짜·시간 순서로 정렬 */
export function sortSlots(list: readonly MiSlotPick[]): MiSlotPick[] {
  return [...list].sort((a, b) => slotStart(a.date, a.time) - slotStart(b.date, b.time));
}

export function normalizePhone(v: string): string {
  return v.replace(/[^0-9]/g, '');
}

export function isPhone(v: string): boolean {
  return /^01[016789][0-9]{7,8}$/.test(normalizePhone(v));
}

/**
 * 빈 배열이면 통과. 각 항목은 학생·학부모에게 보여 줄 문장입니다.
 * 정규 타임을 하나 이상 고르면 입금자명·영상·사진 동의가 필요합니다. 추가 오픈 신청만 하면 입금이 없으므로 받지 않습니다.
 */
export function validateForm(f: MiForm, photoRequired: boolean = MI_CONFIG.photoConsentRequired): string[] {
  const errors: string[] = [];
  if (f.kind !== '예약') return ['신청 구분이 올바르지 않습니다.'];
  const slots = Array.isArray(f.slots) ? f.slots : [];
  const extra = Array.isArray(f.extraDates) ? f.extraDates : [];
  const booking = slots.length > 0;
  if (!booking && !extra.length) errors.push("타임을 하나 이상 고르거나 '추가 오픈 신청'을 눌러 주세요.");
  if (slots.some((x) => !x || !isValidSlot(x.date, x.time))) errors.push('고를 수 없는 타임이 들어 있습니다.');
  else if (new Set(slots.map((x) => slotKey(x.date, x.time))).size !== slots.length) errors.push('같은 타임을 두 번 골랐습니다.');
  if (extra.some((d) => d !== OTHER_CHOICE && !(MI_CONFIG.dates as readonly string[]).includes(d))) {
    errors.push('추가 오픈 신청 날짜가 올바르지 않습니다.');
  }
  if (!f.studentName.trim()) errors.push('학생 이름을 적어 주세요.');
  if (!f.school.trim()) errors.push('지원 학교를 적어 주세요.');
  if (!f.track.trim()) errors.push('지원 전형을 적어 주세요.');
  if (!isPhone(f.phone)) errors.push('휴대폰 번호를 확인해 주세요.');
  if (booking && !f.depositor.trim()) errors.push('입금자명을 적어 주세요.');
  if (f.under14) {
    if (!f.guardianName.trim()) errors.push('보호자 이름을 적어 주세요.');
    if (!isPhone(f.guardianPhone)) errors.push('보호자 연락처를 확인해 주세요.');
    if (!f.guardianConsent) errors.push('만 14세 미만은 보호자 동의가 있어야 신청할 수 있습니다.');
  }
  if (!f.consentPrivacy) errors.push('개인정보 수집·이용에 동의해야 신청할 수 있습니다.');
  if (booking && !f.consentVideo) errors.push('면접 영상 촬영에 동의해야 신청할 수 있습니다.');
  if (booking && photoRequired && !f.consentPhoto) errors.push('사진 활용에 동의해야 신청할 수 있습니다.');
  return errors;
}

/* ---------- 추가 날짜·시간 오픈 신청(신청완료 화면에서 고름, 대기·추가 타임 연락용, 입금 없음) ---------- */

/** 원하는 날짜·시간(여러 개). 목록에서 고르거나 직접 적습니다. */
export type MiWish = {
  /** MI_CONFIG.dates 중 고른 날짜 */
  dates: string[];
  dateText: string;
  /** MI_CONFIG.extraRequestTimes 중 고른 시간 */
  times: string[];
  timeText: string;
};

export const EMPTY_WISH: MiWish = { dates: [], dateText: '', times: [], timeText: '' };

/** 서버로 보내는 추가 오픈 신청: 신청서의 이름·연락처·동의 + 원하는 날짜·시간 */
export type MiExtraRequest = MiWish & {
  /** 같은 신청서로 정규 타임도 신청했다면 그 신청번호 */
  applicationId: string;
  name: string;
  phone: string;
  under14: boolean;
  guardianName: string;
  guardianPhone: string;
  guardianConsent: boolean;
  consentPrivacy: boolean;
  website: string;
};

export function extraRequestFrom(f: MiForm, wish: MiWish, applicationId = ''): MiExtraRequest {
  return {
    ...wish,
    applicationId,
    name: f.studentName,
    phone: f.phone,
    under14: f.under14,
    guardianName: f.guardianName,
    guardianPhone: f.guardianPhone,
    guardianConsent: f.guardianConsent,
    consentPrivacy: f.consentPrivacy,
    website: f.website,
  };
}

/** 이용 목적(동의 문구·시트 칸에 같은 말을 씁니다) */
export const EXTRA_REQUEST_PURPOSE = '대기·추가 타임 연락';

const WISH_MAX = 40;

/** 시트 '희망 날짜' 칸: 고른 날짜(yyyy-mm-dd, 날짜 순)와 직접 적은 글을 ', '로 잇습니다. 없으면 ''. */
export function wishDateOf(w: Pick<MiWish, 'dates' | 'dateText'>): string {
  const picked = MI_CONFIG.dates.filter((d) => (w.dates ?? []).includes(d));
  const text = String(w.dateText ?? '').trim().slice(0, WISH_MAX);
  return [...picked, ...(text ? [text] : [])].join(', ');
}

/** 시트 '희망 시간' 칸: 고른 시간(HH:mm, 시간 순)과 직접 적은 글을 ', '로 잇습니다. 없으면 ''. */
export function wishTimeOf(w: Pick<MiWish, 'times' | 'timeText'>): string {
  const picked = MI_CONFIG.extraRequestTimes.filter((t) => (w.times ?? []).includes(t));
  const text = String(w.timeText ?? '').trim().slice(0, WISH_MAX);
  return [...picked, ...(text ? [text] : [])].join(', ');
}

/** 추가 오픈 신청 연락처를 지우는 시각: 보관 마지막 날 23:59:59.999 KST */
export function extraRequestPurgeAt(): number {
  return Date.parse(`${MI_CONFIG.extraRequestKeepUntil}T23:59:59.999+09:00`);
}

export function validateWish(w: MiWish): string[] {
  const errors: string[] = [];
  if (!wishDateOf(w)) errors.push('원하는 날짜를 하나 이상 고르거나 적어 주세요.');
  if (!wishTimeOf(w)) errors.push('원하는 시간을 하나 이상 고르거나 적어 주세요.');
  return errors;
}

export function validateExtraRequest(f: MiExtraRequest): string[] {
  const errors = validateWish(f);
  if (!f.name.trim()) errors.push('이름을 적어 주세요.');
  if (!isPhone(f.phone)) errors.push('연락처를 확인해 주세요.');
  if (f.under14) {
    if (!f.guardianName.trim()) errors.push('보호자 이름을 적어 주세요.');
    if (!isPhone(f.guardianPhone)) errors.push('보호자 연락처를 확인해 주세요.');
    if (!f.guardianConsent) errors.push('만 14세 미만은 보호자 동의가 있어야 신청할 수 있습니다.');
  }
  if (!f.consentPrivacy) errors.push('개인정보 수집·이용에 동의해야 추가 오픈 신청을 할 수 있습니다.');
  return errors;
}

/** '12/20' */
export function formatMonthDay(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}
