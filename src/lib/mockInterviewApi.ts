import {
  MI_CONFIG,
  MI_STATUS,
  MOCK_INTERVIEW_API_URL,
  type MiForm,
  type MiExtraRequest,
  type MiRow,
  type MiStatus,
  type PublicSlot,
  findActiveDuplicate,
  isOpen,
  publicSlots,
  newBookingRow,
  normalizePhone,
  slotBookingClosesAt,
  summarize,
  sortSlots,
  sweep,
  validateForm,
  validateExtraRequest,
  wishDateOf,
  wishTimeOf,
} from './mockInterview';

export type StatusResponse = { ok: boolean; open: boolean; now: number; slots: PublicSlot[]; error?: string };
export type ExtraRequestResponse = { ok: boolean; id?: string; error?: string };
export const DUP_OTHER_NAME =
  "같은 휴대폰 번호로 이미 신청한 타임이 있습니다. 신청완료 화면의 확인 링크를 열거나 카카오톡 채널 '입시는세연쌤'으로 문의해 주세요.";

/** 한 번에 신청한 타임 하나의 결과 */
export type SubmitItem = {
  id: string;
  date: string;
  time: string;
  status: MiStatus;
  payDeadline: number | null;
};
export type SubmitResponse = {
  ok: boolean;
  /** 묶음 번호(신청번호). 타임마다 '신청번호-1'처럼 줄이 따로 생깁니다. */
  id?: string;
  items?: SubmitItem[];
  /** 지금 입금할 타임(입금 대기)의 입금 기한. 모두 대기면 null */
  payDeadline?: number | null;
  /** 지금 입금할 금액(입금 대기 타임 수 × 수강료) */
  amount?: number;
  /** 확인 링크 키 */
  token?: string;
  studentName?: string;
  school?: string;
  track?: string;
  /** 입금 계좌(확인 링크 화면에서 서버 값을 씁니다) */
  bankAccount?: string;
  /** 같은 휴대폰·같은 타임으로 이미 입금 대기·확정인 신청이 있어 새로 만들지 않고 기존 신청을 돌려준 경우 */
  duplicate?: boolean;
  error?: string;
};

/** 확인 링크(?check=&k=)로 불러온 신청 상태. 신청 직후 응답과 같은 모양입니다. */
export type CheckResponse = SubmitResponse;

/** 실제 홈페이지(sehyunt.re.kr)에 Apps Script 주소 없이 올라가면 테스트 모드를 켜지 않고 '준비 중'으로 둡니다. */
export const isLiveSiteWithoutBackend = () =>
  !MOCK_INTERVIEW_API_URL &&
  typeof window !== 'undefined' &&
  /(^|\.)sehyunt\.re\.kr$/.test(window.location.hostname);

export const isTestMode = () => !MOCK_INTERVIEW_API_URL && !isLiveSiteWithoutBackend();

/** 미리보기(테스트 모드)에서만 ?now=2026-11-09T21:01 로 시각을 바꿔 볼 수 있습니다. KST 로 읽습니다. */
export function previewNowOverride(search: string): number | null {
  if (!isTestMode()) return null;
  const raw = new URLSearchParams(search).get('now');
  if (!raw) return null;
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.length === 16 ? `${raw}:00` : raw}+09:00`;
  const t = Date.parse(withZone);
  return Number.isNaN(t) ? null : t;
}

/* ---------- 테스트 모드: 브라우저 localStorage 에만 저장 ---------- */

const STORE_KEY = 'mi-preview-rows-v3';
const EXTRA_REQ_KEY = 'mi-preview-extra-requests-v2';
type MockExtraRequest = {
  id: string;
  at: number;
  wishDate: string;
  wishTime: string;
  name: string;
  phone: string;
  applicationId: string;
};
type MockRow = MiRow & { phone: string; studentName?: string; school?: string; track?: string };

function mockToken(): string {
  const a = new Uint8Array(16);
  try {
    crypto.getRandomValues(a);
  } catch {
    for (let i = 0; i < a.length; i += 1) a[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 묶음 하나의 현재 상태(서버 mi_view_ 와 같은 모양) */
function viewOf(rows: readonly MockRow[], groupId: string): SubmitResponse | null {
  const mine = rows.filter((r) => (r.groupId || r.id) === groupId);
  if (!mine.length) return null;
  const items = mine.map((r) => ({ id: r.id, date: r.date, time: r.time, status: r.status, payDeadline: r.status === MI_STATUS.pending ? r.payDeadline : null }));
  const pend = items.filter((x) => x.status === MI_STATUS.pending && x.payDeadline != null);
  return {
    ok: true,
    id: groupId,
    items,
    payDeadline: pend.length ? Math.min(...pend.map((x) => x.payDeadline!)) : null,
    amount: pend.length * MI_CONFIG.fee,
    token: mine[0].token,
    studentName: mine[0].studentName,
    school: mine[0].school,
    track: mine[0].track,
    bankAccount: MI_CONFIG.bankAccount,
  };
}

export function mockCheck(id: string, token: string, now: number): CheckResponse {
  const rows = sweep(loadRows(), now) as MockRow[];
  saveRows(rows);
  const v = viewOf(rows, id);
  if (!v || !token || v.token !== token) return { ok: false, error: '신청을 찾지 못했습니다. 받은 확인 링크를 그대로 열어 주세요.' };
  return v;
}

function loadRows(): MockRow[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as MockRow[]) : [];
  } catch {
    return [];
  }
}
function saveRows(rows: MockRow[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(rows));
  } catch {
    /* 저장 공간이 없으면 이번 화면에서만 씁니다. */
  }
}
function loadExtraRequests(): MockExtraRequest[] {
  try {
    const raw = localStorage.getItem(EXTRA_REQ_KEY);
    return raw ? (JSON.parse(raw) as MockExtraRequest[]) : [];
  } catch {
    return [];
  }
}
export function resetMock() {
  try {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(EXTRA_REQ_KEY);
    for (const old of ['mi-preview-open-requests-v1', 'mi-preview-extra-requests-v1', 'mi-preview-rows-v2']) localStorage.removeItem(old);
  } catch {
    /* noop */
  }
}

export function mockStatus(now: number): StatusResponse {
  const rows = sweep(loadRows(), now) as MockRow[];
  saveRows(rows);
  return { ok: true, open: isOpen(now), now, slots: publicSlots(summarize(rows, now)) };
}

export function mockSubmit(form: MiForm, now: number): SubmitResponse {
  if (form.website) return { ok: true, id: 'ignored', items: [], payDeadline: null, amount: 0 };
  if (!isOpen(now)) return { ok: false, error: '11/9(월) 밤 9시에 신청이 열립니다.' };
  const errors = validateForm(form);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  const picks = sortSlots(form.slots);
  if (!picks.length) return { ok: false, error: '고른 타임이 없습니다.' };
  const closed = picks.find((x) => now >= slotBookingClosesAt(x.date, x.time));
  if (closed) return { ok: false, error: `${closed.date} ${closed.time}은 신청이 마감되었습니다.` };
  const rows = sweep(loadRows(), now) as MockRow[];
  const phone = normalizePhone(form.phone);
  // 같은 휴대폰·같은 타임이 입금 대기·확정이면 새로 만들지 않고 기존 신청을 보여 줍니다.
  const existing = findActiveDuplicate(rows, phone, picks);
  if (existing) {
    const v = viewOf(rows, existing);
    const n = (x: string | undefined) => (x ?? '').replace(/\s+/g, '');
    // 이름까지 같을 때만 기존 신청을 보여 줍니다(Code.gs 와 같음).
    if (v && n(v.studentName) && n(v.studentName) === n(form.studentName)) return { ...v, duplicate: true };
    return { ok: false, error: DUP_OTHER_NAME };
  }
  const other = picks.find((x) =>
    rows.some((r) => r.phone === phone && r.status !== MI_STATUS.cancelled && r.date === x.date && r.time === x.time),
  );
  if (other) return { ok: false, error: `같은 휴대폰 번호로 이미 신청한 타임입니다(${other.date} ${other.time}).` };
  const groupId = `MI-TEST-${new Set(rows.map((r) => r.groupId || r.id)).size + 1}`;
  const token = mockToken();
  picks.forEach((x, i) => {
    const row: MockRow = {
      ...newBookingRow(rows, `${groupId}-${i + 1}`, x.date, x.time, now, groupId),
      token,
      phone,
      studentName: form.studentName.trim(),
      school: form.school.trim(),
      track: form.track.trim(),
    };
    rows.push(row);
  });
  saveRows(rows);
  return viewOf(rows, groupId)!;
}

export function mockExtraRequest(f: MiExtraRequest, now: number): ExtraRequestResponse {
  if (f.website) return { ok: true, id: 'ignored' };
  if (!isOpen(now)) return { ok: false, error: '11/9(월) 밤 9시부터 신청할 수 있습니다.' };
  const errors = validateExtraRequest(f);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  const list = loadExtraRequests();
  const phone = normalizePhone(f.phone);
  const wishDate = wishDateOf(f);
  const wishTime = wishTimeOf(f);
  if (list.some((r) => r.phone === phone && r.wishDate === wishDate && r.wishTime === wishTime)) {
    return { ok: false, error: '같은 날짜·시간으로 이미 추가 오픈 신청을 했습니다.' };
  }
  const id = `XR-TEST-${list.length + 1}`;
  list.push({ id, at: now, wishDate, wishTime, name: f.name.trim(), phone, applicationId: f.applicationId });
  try {
    localStorage.setItem(EXTRA_REQ_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
  return { ok: true, id };
}

/** 미리보기 전용: 12/13 16:00 을 4명으로 채우고 대기 1명을 넣어 '대기' 상태를 보여 줍니다. */
export function seedWaitlistDemo(now: number) {
  const rows = loadRows().filter((r) => !r.id.startsWith('MI-DEMO-'));
  const date = MI_CONFIG.dates[1];
  const time = MI_CONFIG.times[0];
  for (let i = 1; i <= 5; i += 1) {
    const id = `MI-DEMO-${i}`;
    rows.push({ ...newBookingRow(rows, id, date, time, now - (10 - i) * 60000), phone: `0100000000${i}` });
  }
  // 17시는 3자리를 채웁니다(화면에는 숫자 없이 그대로 신청 가능으로 보입니다).
  for (let i = 6; i <= 8; i += 1) {
    const id = `MI-DEMO-${i}`;
    rows.push({ ...newBookingRow(rows, id, date, MI_CONFIG.times[1], now - (10 - i) * 60000), phone: `0100000000${i}` });
  }
  saveRows(rows);
}

/* ---------- 실제 모드: Apps Script 웹 앱 ---------- */

export async function fetchStatus(now: number): Promise<StatusResponse> {
  if (isTestMode()) return mockStatus(now);
  const res = await fetch(`${MOCK_INTERVIEW_API_URL}?action=status`, { method: 'GET' });
  return (await res.json()) as StatusResponse;
}

export async function fetchCheck(id: string, token: string, now: number): Promise<CheckResponse> {
  if (isTestMode()) return mockCheck(id, token, now);
  const q = `?action=check&check=${encodeURIComponent(id)}&k=${encodeURIComponent(token)}`;
  const res = await fetch(`${MOCK_INTERVIEW_API_URL}${q}`, { method: 'GET' });
  return (await res.json()) as CheckResponse;
}

export async function submitApplication(form: MiForm, now: number): Promise<SubmitResponse> {
  if (isTestMode()) return mockSubmit(form, now);
  // text/plain 으로 보내야 Apps Script 가 CORS 사전 요청 없이 받습니다.
  const res = await fetch(MOCK_INTERVIEW_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    // 학생 이름이 입금자명입니다.
    body: JSON.stringify({ ...form, depositor: form.studentName }),
  });
  return (await res.json()) as SubmitResponse;
}

export async function submitExtraRequest(f: MiExtraRequest, now: number): Promise<ExtraRequestResponse> {
  if (isTestMode()) return mockExtraRequest(f, now);
  const res = await fetch(MOCK_INTERVIEW_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...f, action: 'extraRequest' }),
  });
  return (await res.json()) as ExtraRequestResponse;
}

export { MI_CONFIG };
