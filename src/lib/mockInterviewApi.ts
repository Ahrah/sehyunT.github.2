import {
  MI_CONFIG,
  MI_STATUS,
  MOCK_INTERVIEW_API_URL,
  type MiForm,
  type MiExtraRequest,
  type MiRow,
  type MiStatus,
  type SlotSummary,
  isOpen,
  newBookingRow,
  normalizePhone,
  slotBookingClosesAt,
  summarize,
  sweep,
  validateForm,
  validateExtraRequest,
  wishDateOf,
  wishTimeOf,
  waitlistPosition,
} from './mockInterview';

export type StatusResponse = { ok: boolean; open: boolean; now: number; slots: SlotSummary[]; error?: string };
export type ExtraRequestResponse = { ok: boolean; id?: string; error?: string };
export type SubmitResponse = {
  ok: boolean;
  id?: string;
  status?: MiStatus;
  payDeadline?: number | null;
  waitlistPosition?: number | null;
  error?: string;
};

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

const STORE_KEY = 'mi-preview-rows-v2';
const EXTRA_REQ_KEY = 'mi-preview-extra-requests-v1';
type MockExtraRequest = { id: string; at: number; wishDate: string; wishTime: string; name: string; phone: string };
type MockRow = MiRow & { phone: string };

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
    localStorage.removeItem('mi-preview-open-requests-v1');
  } catch {
    /* noop */
  }
}

export function mockStatus(now: number): StatusResponse {
  const rows = sweep(loadRows(), now) as MockRow[];
  saveRows(rows);
  return { ok: true, open: isOpen(now), now, slots: summarize(rows, now) };
}

export function mockSubmit(form: MiForm, now: number): SubmitResponse {
  if (form.website) return { ok: true, id: 'ignored', status: MI_STATUS.pending };
  if (!isOpen(now)) return { ok: false, error: '11/9(월) 밤 9시에 신청이 열립니다.' };
  const errors = validateForm(form);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  if (now >= slotBookingClosesAt(form.date, form.time)) {
    return { ok: false, error: '이 시간은 신청이 마감되었습니다.' };
  }
  const rows = sweep(loadRows(), now) as MockRow[];
  const phone = normalizePhone(form.phone);
  const dup = rows.some(
    (r) => r.phone === phone && r.status !== MI_STATUS.cancelled && r.date === form.date && r.time === form.time,
  );
  if (dup) return { ok: false, error: '같은 휴대폰 번호로 이미 신청한 시간입니다.' };
  const id = `MI-TEST-${rows.length + 1}`;
  const row: MockRow = { ...newBookingRow(rows, id, form.date, form.time, now), phone };
  rows.push(row);
  saveRows(rows);
  return {
    ok: true,
    id,
    status: row.status,
    payDeadline: row.payDeadline,
    waitlistPosition: waitlistPosition(rows, id),
  };
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
  list.push({ id, at: now, wishDate, wishTime, name: f.name.trim(), phone });
  try {
    localStorage.setItem(EXTRA_REQ_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
  return { ok: true, id };
}

/** 미리보기 전용: 12/12 16:00 을 4명으로 채우고 대기 1명을 넣어 '대기' 상태를 보여 줍니다. */
export function seedWaitlistDemo(now: number) {
  const rows = loadRows().filter((r) => !r.id.startsWith('MI-DEMO-'));
  const date = MI_CONFIG.dates[0];
  const time = MI_CONFIG.times[0];
  for (let i = 1; i <= 5; i += 1) {
    const id = `MI-DEMO-${i}`;
    rows.push({ ...newBookingRow(rows, id, date, time, now - (10 - i) * 60000), phone: `0100000000${i}` });
  }
  // 17시는 3자리를 채워 '남은 자리 1/4' 를 보여 줍니다.
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

export async function submitApplication(form: MiForm, now: number): Promise<SubmitResponse> {
  if (isTestMode()) return mockSubmit(form, now);
  // text/plain 으로 보내야 Apps Script 가 CORS 사전 요청 없이 받습니다.
  const res = await fetch(MOCK_INTERVIEW_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(form),
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
