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

export function newBookingRow(rows: readonly MiRow[], id: string, date: string, time: string, now: number): MiRow {
  const status = initialStatusFor(rows, date, time);
  const holding = status === MI_STATUS.pending;
  return {
    id,
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
 * 시간 트리거가 하는 일(서버와 같은 규칙).
 * 1) 입금 대기
 *    - '입금 확정' 체크 → 확정. 단, 입금 시각(없으면 지금 시각)이 '입금 기한 + 10분' 뒤면 확정하지 않고 '확인 필요'.
 *    - '입금 시각'만 적혀 있고 그 시각이 '입금 기한 + 10분' 뒤여도 '확인 필요'.
 *    - 입금 확정 없이 '입금 기한 + 10분'이 지나면 자동 취소(취소 사유 '미입금(…)'). 자리가 비고 대기 1번이 올라갑니다.
 *    - (손으로) 기한이 지났고 '미입금'에 체크하면 10분을 기다리지 않고 바로 취소.
 * 2) 미입금으로 취소된 줄에 '입금 확정'(또는 입금 시각)이 들어오면 '확인 필요'. 자동으로 예약하지 않습니다.
 * 3) 확정: 서류 기한이 지났는데 '서류 받음'이 없으면 취소.
 * 4) 빈자리가 생기면 그 타임의 대기 1번부터 입금 대기로 올리고 새 1시간 기한을 줍니다.
 * '확인 필요' 줄은 자리를 잡지 않습니다. 세연님이 보고 상태를 '확정'으로 바꾸거나 환불합니다.
 */
export function sweep(input: readonly MiRow[], now: number): MiRow[] {
  const rows = input.map((r) => ({ ...r, log: [...r.log] }));
  for (const r of rows) {
    if (r.kind !== '예약') continue;
    if (r.status === MI_STATUS.pending && r.payDeadline != null) {
      const graceEnd = payGraceEnd(r.payDeadline);
      if (r.paidAt != null && r.paidAt > graceEnd) {
        needsCheck(r, now, `입금 기한(${formatKst(r.payDeadline)}) + 10분 뒤 입금(입금 시각 ${formatKst(r.paidAt)})`);
      } else if (r.paidChecked) {
        if (r.paidAt == null && now > graceEnd) {
          needsCheck(r, now, `입금 기한(${formatKst(r.payDeadline)}) + 10분 뒤 입금 확정(입금 시각 없음)`);
        } else {
          r.status = MI_STATUS.confirmed;
          r.log.push(`${formatKst(now)} 확정`);
        }
      } else if (now > graceEnd) {
        cancel(r, now, `미입금(입금 기한 ${formatKst(r.payDeadline)} + 10분 지남)`);
      } else if (now > r.payDeadline && r.unpaidChecked) {
        cancel(r, now, '미입금(미입금 체크)');
      }
    } else if (r.status === MI_STATUS.cancelled && isUnpaidCancel(r.cancelReason) && (r.paidChecked || r.paidAt != null)) {
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

export type MiForm = {
  kind: MiKind;
  date: string;
  time: string;
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
  date: '',
  time: '',
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

export function normalizePhone(v: string): string {
  return v.replace(/[^0-9]/g, '');
}

export function isPhone(v: string): boolean {
  return /^01[016789][0-9]{7,8}$/.test(normalizePhone(v));
}

/** 빈 배열이면 통과. 각 항목은 학생·학부모에게 보여 줄 문장입니다. */
export function validateForm(f: MiForm, photoRequired: boolean = MI_CONFIG.photoConsentRequired): string[] {
  const errors: string[] = [];
  if (f.kind !== '예약') return ['신청 구분이 올바르지 않습니다.'];
  if (!isValidSlot(f.date, f.time)) errors.push('날짜와 시간을 골라 주세요.');
  if (!f.studentName.trim()) errors.push('학생 이름을 적어 주세요.');
  if (!f.school.trim()) errors.push('지원 학교를 적어 주세요.');
  if (!f.track.trim()) errors.push('지원 전형을 적어 주세요.');
  if (!isPhone(f.phone)) errors.push('휴대폰 번호를 확인해 주세요.');
  if (!f.depositor.trim()) errors.push('입금자명을 적어 주세요.');
  if (f.under14) {
    if (!f.guardianName.trim()) errors.push('보호자 이름을 적어 주세요.');
    if (!isPhone(f.guardianPhone)) errors.push('보호자 연락처를 확인해 주세요.');
    if (!f.guardianConsent) errors.push('만 14세 미만은 보호자 동의가 있어야 신청할 수 있습니다.');
  }
  if (!f.consentPrivacy) errors.push('개인정보 수집·이용에 동의해야 신청할 수 있습니다.');
  if (!f.consentVideo) errors.push('면접 영상 촬영에 동의해야 신청할 수 있습니다.');
  if (photoRequired && !f.consentPhoto) errors.push('사진 활용에 동의해야 신청할 수 있습니다.');
  return errors;
}

/* ---------- 추가 날짜·시간 오픈 신청(대기·추가 타임 연락용, 입금 없음) ---------- */

/** 목록에 없는 날짜·시간을 직접 적을 때 고르는 값 */
export const OTHER_CHOICE = 'other';

export type MiExtraRequest = {
  /** MI_CONFIG.dates 중 하나 또는 OTHER_CHOICE */
  date: string;
  dateText: string;
  /** MI_CONFIG.extraRequestTimes 중 하나 또는 OTHER_CHOICE */
  time: string;
  timeText: string;
  name: string;
  phone: string;
  under14: boolean;
  guardianName: string;
  guardianPhone: string;
  guardianConsent: boolean;
  consentPrivacy: boolean;
  website: string;
};

export const EMPTY_EXTRA_REQUEST: MiExtraRequest = {
  date: '',
  dateText: '',
  time: '',
  timeText: '',
  name: '',
  phone: '',
  under14: false,
  guardianName: '',
  guardianPhone: '',
  guardianConsent: false,
  consentPrivacy: false,
  website: '',
};

/** 이용 목적(동의 문구·시트 칸에 같은 말을 씁니다) */
export const EXTRA_REQUEST_PURPOSE = '대기·추가 타임 연락';

const WISH_MAX = 40;

/** 시트에 남길 희망 날짜: 고른 날짜(yyyy-mm-dd) 또는 직접 적은 글 */
export function wishDateOf(f: Pick<MiExtraRequest, 'date' | 'dateText'>): string {
  if ((MI_CONFIG.dates as readonly string[]).includes(f.date)) return f.date;
  return f.date === OTHER_CHOICE ? f.dateText.trim().slice(0, WISH_MAX) : '';
}

/** 시트에 남길 희망 시간: 고른 시간(HH:mm) 또는 직접 적은 글 */
export function wishTimeOf(f: Pick<MiExtraRequest, 'time' | 'timeText'>): string {
  if ((MI_CONFIG.extraRequestTimes as readonly string[]).includes(f.time)) return f.time;
  return f.time === OTHER_CHOICE ? f.timeText.trim().slice(0, WISH_MAX) : '';
}

/** 추가 오픈 신청 연락처를 지우는 시각: 보관 마지막 날 23:59:59.999 KST */
export function extraRequestPurgeAt(): number {
  return Date.parse(`${MI_CONFIG.extraRequestKeepUntil}T23:59:59.999+09:00`);
}

export function validateExtraRequest(f: MiExtraRequest): string[] {
  const errors: string[] = [];
  if (!wishDateOf(f)) errors.push(f.date === OTHER_CHOICE ? '원하는 날짜를 적어 주세요.' : '원하는 날짜를 골라 주세요.');
  if (!wishTimeOf(f)) errors.push(f.time === OTHER_CHOICE ? '원하는 시간을 적어 주세요.' : '원하는 시간을 골라 주세요.');
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
