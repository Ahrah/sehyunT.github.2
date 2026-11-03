import {
  EBOOKS_API_URL,
  EB_STATUS,
  type EbForm,
  type EbRow,
  EBOOKS,
  EBOOK_CONFIG,
  formatKst,
  formatWon,
  normalizeEmail,
  orderTotal,
  payDeadlineFor,
  pickDepositor,
  validateOrder,
} from './ebooks';

export type OrderResponse = {
  ok: boolean;
  id?: string;
  depositor?: string;
  total?: number;
  email?: string;
  books?: string[];
  /** 입금 기한(ms, 주문 뒤 1시간) */
  payDeadline?: number;
  error?: string;
};

/** 실제 홈페이지(sehyunt.re.kr)에 Apps Script 주소 없이 올라가면 테스트 모드를 켜지 않고 '준비 중'으로 둡니다. */
export const isLiveSiteWithoutBackend = () =>
  !EBOOKS_API_URL && typeof window !== 'undefined' && /(^|\.)sehyunt\.re\.kr$/.test(window.location.hostname);

export const isTestMode = () => !EBOOKS_API_URL && !isLiveSiteWithoutBackend();

/* ---------- 테스트 모드: 브라우저 localStorage 에만 저장 ---------- */

const STORE_KEY = 'eb-preview-orders-v1';
export type MockOrder = EbRow & { name: string; email: string; sentAt: number | null };

export function loadMockOrders(): MockOrder[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as MockOrder[]) : [];
  } catch {
    return [];
  }
}
function save(rows: MockOrder[]) {
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

export function mockOrder(f: EbForm, now: number, rand: () => number = Math.random): OrderResponse {
  if (f.website) return { ok: true, id: 'ignored' };
  const errors = validateOrder(f);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  const total = orderTotal(f.books);
  if (total == null) return { ok: false, error: '가격을 정하는 중인 책이 있습니다.' };
  const rows = loadMockOrders();
  const depositor = pickDepositor(rows, f.name, rand);
  if (!depositor) return { ok: false, error: '같은 이름의 주문이 많습니다. 카카오톡 채널로 문의해 주세요.' };
  const id = `EB-TEST-${rows.length + 1}`;
  const payDeadline = payDeadlineFor(now);
  rows.push({
    id,
    orderedAt: now,
    status: EB_STATUS.pending,
    depositor,
    total,
    books: [...f.books],
    paidChecked: false,
    payDeadline,
    name: f.name.trim(),
    email: normalizeEmail(f.email),
    sentAt: null,
  });
  save(rows);
  return { ok: true, id, depositor, total, email: normalizeEmail(f.email), books: [...f.books], payDeadline };
}

export type MockMail = { to: string; subject: string; body: string; attachments: string[] };

/**
 * 주문 접수(입금 안내) 메일. Ebook.gs eb_orderMail 과 같은 문구입니다(`npm test` 가 비교합니다).
 * 실제로는 Apps Script 가 주문을 받자마자 주문자에게 보냅니다. 미리보기에서는 화면에만 보여 줍니다.
 */
export function orderReceivedMail(o: {
  id: string;
  name: string;
  email: string;
  depositor: string;
  total: number;
  books: string[];
  payDeadline: number;
}): MockMail {
  const ordered = EBOOKS.filter((b) => o.books.includes(b.id));
  const lines = [`${o.name}님, 전자책 주문을 받았습니다.`, '', `주문번호: ${o.id}`, ...ordered.map((b) => `- ${b.title}`)];
  lines.push(
    '',
    '[입금 안내]',
    `은행: ${EBOOK_CONFIG.bankName}`,
    `계좌번호: ${EBOOK_CONFIG.bankNumber}`,
    `예금주: ${EBOOK_CONFIG.bankHolder}`,
    `금액: ${formatWon(o.total)}`,
    `입금자명: ${o.depositor}`,
    `입금 기한: ${formatKst(o.payDeadline)} (주문 뒤 1시간, 한국 시간)`,
    '',
    '입금자명을 위와 같이 적어 주세요. 숫자 2자리까지 같아야 확인이 빠릅니다.',
    '입금 기한까지 입금이 확인되지 않으면 주문은 자동으로 취소됩니다. 기한이 지난 뒤 입금하셨다면 확인한 뒤 연락드립니다.',
    `입금이 확인되면 ${EBOOK_CONFIG.sendWithinMinutes}분 안에 이 주소로 PDF를 보내 드립니다.`,
    '메일이 보이지 않으면 스팸함과 프로모션함을 확인해 주세요.',
    '',
    "문의: 카카오톡 채널 '입시는세연쌤' 또는 이 메일에 답장",
  );
  return {
    to: o.email,
    subject: `[입시는세연쌤] 전자책 주문 입금 안내 (${o.id})`,
    body: lines.join('\n'),
    attachments: [],
  };
}

/** 미리보기 전용: 세연님이 '입금 확정'을 체크했을 때 나갈 메일을 보여 줍니다. 실제로 보내지 않습니다. */
export function mockConfirm(id: string, now: number): MockMail | null {
  const rows = loadMockOrders();
  const r = rows.find((x) => x.id === id);
  if (!r || r.status !== EB_STATUS.pending) return null;
  r.paidChecked = true;
  r.status = EB_STATUS.sent;
  r.sentAt = now;
  save(rows);
  return buyerMail(r);
}

export function buyerMail(r: { id: string; name: string; email: string; books: string[] }): MockMail {
  const ordered = EBOOKS.filter((b) => r.books.includes(b.id));
  const titles = ordered.map((b) => b.title);
  return {
    to: r.email,
    subject: `[입시는세연쌤] 주문하신 전자책 PDF를 보내 드립니다 (${r.id})`,
    body: [
      `${r.name}님, 입금을 확인했습니다. 주문하신 전자책 PDF를 이 메일에 첨부했습니다.`,
      '',
      ...titles.map((t) => `- ${t}`),
      '',
      '다른 사람에게 보내거나 인터넷에 올리면 법적 처벌의 대상이 될 수 있습니다.',
      "파일이 열리지 않으면 카카오톡 채널 '입시는세연쌤'으로 알려 주세요.",
    ].join('\n'),
    attachments: ordered.map((b) => b.attachName),
  };
}

/* ---------- 실제 모드: Apps Script 웹 앱 ---------- */

export async function submitOrder(f: EbForm, now: number): Promise<OrderResponse> {
  if (isTestMode()) return mockOrder(f, now);
  // text/plain 으로 보내야 Apps Script 가 CORS 사전 요청 없이 받습니다.
  const res = await fetch(EBOOKS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...f, action: 'ebookOrder' }),
  });
  return (await res.json()) as OrderResponse;
}
