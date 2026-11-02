import {
  MI_CONFIG,
  MI_STATUS,
  MOCK_INTERVIEW_API_URL,
  type MiForm,
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
  waitlistPosition,
} from './mockInterview';

export type StatusResponse = { ok: boolean; open: boolean; now: number; slots: SlotSummary[]; error?: string };
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

const STORE_KEY = 'mi-preview-rows-v1';
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
export function resetMock() {
  try {
    localStorage.removeItem(STORE_KEY);
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
  if (form.website) return { ok: true, id: 'ignored', status: MI_STATUS.request };
  if (!isOpen(now)) return { ok: false, error: '11/9(월) 밤 9시에 신청이 열립니다.' };
  const errors = validateForm(form);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  if (form.kind === '예약' && now >= slotBookingClosesAt(form.date, form.time)) {
    return { ok: false, error: '이 시간은 신청이 마감되었습니다.' };
  }
  const rows = sweep(loadRows(), now) as MockRow[];
  const phone = normalizePhone(form.phone);
  const dup = rows.some(
    (r) =>
      r.phone === phone &&
      r.status !== MI_STATUS.cancelled &&
      (form.kind === '요청' ? r.kind === '요청' : r.kind === '예약' && r.date === form.date && r.time === form.time),
  );
  if (dup) return { ok: false, error: '같은 휴대폰 번호로 이미 신청한 시간입니다.' };
  const id = `MI-TEST-${rows.length + 1}`;
  if (form.kind === '요청') {
    rows.push({
      ...newBookingRow([], id, '', '', now),
      kind: '요청',
      status: MI_STATUS.request,
      payDeadline: null,
      holdStartedAt: null,
      docsDeadline: null,
      log: [],
      phone,
    });
    saveRows(rows);
    return { ok: true, id, status: MI_STATUS.request };
  }
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

export { MI_CONFIG };
