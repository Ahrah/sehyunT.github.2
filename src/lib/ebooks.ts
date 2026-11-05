/**
 * 전자책 계좌이체 판매: 설정, 주문 검증, 금액, 입금자명, 입금 알림 대조 규칙.
 *
 * 같은 규칙이 apps-script/ebooks/Ebook.gs 에도 있습니다(서버가 최종 판단).
 * 책·가격을 바꾸면 두 파일을 함께 고치고 `npm test` 를 돌리세요.
 * PDF 파일과 Drive 파일 ID 는 이 저장소에 넣지 않습니다(Ebook.gs 는 자리표시만 둡니다).
 */

/** Apps Script 웹 앱 주소. 비어 있으면 미리보기(테스트 모드)로 동작합니다. */
export const EBOOKS_API_URL: string =
  (import.meta.env?.VITE_EBOOKS_API_URL as string | undefined)?.trim() || '';

export type Ebook = {
  id: string;
  title: string;
  /** 쪽수. null 이면 화면에 쪽수를 보이지 않습니다(분량이 아직 바뀌는 책). */
  pages: number | null;
  /** 가격(원). null 이면 '가격 준비 중'이고 주문을 받지 않습니다. */
  price: number | null;
  summary: string;
  /** 메일 첨부 파일 이름(Ebook.gs 와 같음) */
  attachName: string;
};

/**
 * 가격(11/3 세연님 결정): 학교별 가이드 1권 15,000원. 11/3 21:48 변경: 비교 자료집 79,000원, 묶음 가격 없음(낱권 합계).
 * 바꾸면 Ebook.gs 의 EB.BOOKS 도 같은 값으로 고치세요(`npm test` 가 두 파일이 같은지 봅니다).
 */
export const EBOOKS: readonly Ebook[] = [
  {
    id: 'compare',
    attachName: '2027학년도_경기권외고_8개교_비교자료집.pdf',
    title: '입시는세연쌤books 2027 경기권 외고 8개교 비교 자료집',
    pages: 47,
    price: 79000,
    summary: '경기·고양·과천·김포·동두천·성남·수원·안양외고 일반전형을 한 권에서 나란히 비교할 수 있도록 정리한 자료집입니다. 학원 선생님이 여러 학생의 지원 학교를 함께 살펴볼 때 모집 인원, 전형 단계, 자기소개서, 면접 일정을 학교마다 따로 찾지 않고 바로 확인하실 수 있습니다.',
  },
  {
    id: 'gyeonggi',
    attachName: '2027학년도_경기외고_자소서면접및원서접수가이드.pdf',
    title: '입시는세연쌤books 2027 경기외고 자소서·면접 가이드',
    pages: 31,
    price: 15000,
    summary: '일반전형 166명, 1단계 2배수, 자기소개서 1,500자, 면접 12월 19일(토) 기준입니다.',
  },
  {
    id: 'goyang',
    attachName: '2027학년도_고양외고_자소서면접및원서접수가이드.pdf',
    title: '입시는세연쌤books 2027 고양외고 자소서·면접 가이드',
    pages: 23,
    price: 15000,
    summary: '면접일 12월 24일(목) 기준입니다.',
  },
  {
    id: 'gwacheon',
    attachName: '2027학년도_과천외고_자소서면접및원서접수가이드.pdf',
    title: '입시는세연쌤books 2027 과천외고 자소서·면접 가이드',
    pages: 24,
    price: 15000,
    summary: '면접일 12월 19일(토) 기준입니다.',
  },
  {
    id: 'gimpo',
    attachName: '2027학년도_김포외고_자소서면접및원서접수가이드.pdf',
    title: '입시는세연쌤books 2027 김포외고 자소서·면접 가이드',
    pages: 25,
    price: 15000,
    summary: '영어과 84명·중국어과 41명·일본어과 41명, 1단계 2배수, 자기소개서 1,500자, 면접 12월 19일(토) 기준입니다.',
  },
  {
    id: 'dongducheon',
    attachName: '2027학년도_동두천외고_자소서면접및원서접수가이드.pdf',
    title: '입시는세연쌤books 2027 동두천외고 자소서·면접 가이드',
    pages: 24,
    price: 15000,
    summary: '1단계 1.5배수, 출결 1일 0.2점 감점, 면접 12월 20일(일) 기준입니다.',
  },
  {
    id: 'seongnam',
    attachName: '2027학년도_성남외고_자소서면접및원서접수가이드.pdf',
    title: '입시는세연쌤books 2027 성남외고 자소서·면접 가이드',
    pages: 22,
    price: 15000,
    summary: '일반전형 160명, 1단계 1.5배수, 자기소개서 1,500자, 면접 12월 19일(토) 기준입니다.',
  },
  {
    id: 'suwon',
    attachName: '2027학년도_수원외고_자소서면접및원서접수가이드.pdf',
    title: '입시는세연쌤books 2027 수원외고 자소서·면접 가이드',
    pages: 22,
    price: 15000,
    summary: '면접일 12월 21일(월) 기준입니다.',
  },
  {
    id: 'anyang',
    attachName: '2027학년도_안양외고_자소서면접및원서접수가이드.pdf',
    title: '입시는세연쌤books 2027 안양외고 자소서·면접 가이드',
    pages: 23,
    price: 15000,
    summary: '면접일 12월 19일(토) 기준입니다.',
  },
];

export const EBOOK_CONFIG = {
  bankName: '카카오뱅크',
  bankNumber: '3333-38-6269721',
  bankHolder: '입시는세연쌤',
  bankAccount: '카카오뱅크 3333-38-6269721 (입시는세연쌤)',
  contactEmail: ['consultantsyssam', 'gmail.com'].join('@'),
  /** 입금 기한: 주문 뒤 1시간(모의면접과 같음). 지나도 입금이 없으면 5분 정리가 '미입금 취소'로 바꿉니다. Ebook.gs EB.PAY_WINDOW_MS 와 같아야 합니다. */
  payWindowMs: 60 * 60 * 1000,
  /** 입금 기한 뒤 10분 여유. 자동 취소는 기한 + 10분이 지난 뒤에 하고, 입금 시각이 기한 + 10분 안이면 제때 입금으로 봅니다. Ebook.gs EB.PAY_GRACE_MS 와 같아야 합니다. */
  payGraceMs: 10 * 60 * 1000,
  /** 입금 확인 뒤 PDF 를 보내는 시간 안내 */
  sendWithinMinutes: 30,
  /** 입금자명 = 이름 앞 몇 글자 + 숫자 2자리 */
  depositorNameMax: 5,
  /** 개인정보·거래 기록 보관 기간(전자상거래법: 계약·대금결제 기록 5년) */
  keepYears: 5,
} as const;

export const EB_STATUS = {
  pending: '입금 대기',
  sent: '발송 완료',
  check: '확인 필요',
  cancelled: '취소',
  /** 입금 기한까지 입금이 확인되지 않은 주문 */
  expired: '미입금 취소',
} as const;
export type EbStatus = (typeof EB_STATUS)[keyof typeof EB_STATUS];

export type EbForm = {
  name: string;
  email: string;
  emailConfirm: string;
  phone: string;
  /** 생년월일 (YYYY-MM-DD, 만 19세 미만 확인용) */
  birthdate: string;
  books: string[];
  cashReceiptPhone: string;
  consentPrivacy: boolean;
  consentRefund: boolean;
  /** 미성년자(만 19세 미만) 부모 동의 체크 여부 */
  consentParent: boolean;
  /** 부모 동의 체크 시각(ms). 제출 시점에 설정됩니다. */
  consentParentAt?: number;
  /** 스팸 방지 칸(사람은 비워 둡니다) */
  website: string;
};

export const EMPTY_EB_FORM: EbForm = {
  name: '',
  email: '',
  emailConfirm: '',
  phone: '',
  birthdate: '',
  books: [],
  cashReceiptPhone: '',
  consentPrivacy: false,
  consentRefund: false,
  consentParent: false,
  website: '',
};

export function normalizePhone(v: string): string {
  return String(v || '').replace(/[^0-9]/g, '');
}
export function isPhone(v: string): boolean {
  return /^01[016789][0-9]{7,8}$/.test(normalizePhone(v));
}
export function normalizeEmail(v: string): string {
  return String(v || '').trim().toLowerCase();
}
export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(v));
}

/** YYYY-MM-DD 형식 체크 */
export function isValidDate(v: string): boolean {
  const date = String(v || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(date);
}

/**
 * 만 나이 계산 (한국 나이가 아닌 국제 나이).
 * 생년월일(YYYY-MM-DD)과 기준일(ms)로 계산합니다.
 */
export function calculateAge(birthdate: string, nowMs: number): number {
  const birth = new Date(birthdate);
  const now = new Date(nowMs);
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/** 미성년자 여부 (만 19세 미만) */
export function isMinor(birthdate: string, nowMs: number): boolean {
  if (!isValidDate(birthdate)) return false;
  return calculateAge(birthdate, nowMs) < 19;
}

export function bookById(id: string, books: readonly Ebook[] = EBOOKS): Ebook | undefined {
  return books.find((b) => b.id === id);
}

/** 가격. 비어 있으면 null(가격 준비 중). */
export function priceOf(book: Ebook): number | null {
  return book.price;
}

/** 낱권 합계. 고른 책 중 하나라도 가격이 없으면 null. */
export function itemsTotal(ids: readonly string[], books: readonly Ebook[] = EBOOKS): number | null {
  let sum = 0;
  for (const id of ids) {
    const b = bookById(id, books);
    if (!b || b.price == null) return null;
    sum += b.price;
  }
  return sum;
}

/** 낼 금액 = 고른 책 가격의 합(묶음 할인 없음). 고른 책 중 하나라도 가격이 없으면 null. */
export function orderTotal(ids: readonly string[], books: readonly Ebook[] = EBOOKS): number | null {
  return itemsTotal(ids, books);
}

export function hasUnsetPrices(books: readonly Ebook[] = EBOOKS): boolean {
  return books.some((b) => b.price == null);
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '11/3(화) 14:05' (한국 시간). Ebook.gs eb_fmtKst 와 같습니다. */
export function formatKst(ms: number): string {
  const d = new Date(ms + KST_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]}) ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** 주문 시각 → 입금 기한(ms) */
export function payDeadlineFor(orderedAt: number): number {
  return orderedAt + EBOOK_CONFIG.payWindowMs;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

/** 빈 배열이면 통과. 각 항목은 주문하는 분에게 보여 줄 문장입니다. */
export function validateOrder(f: EbForm, books: readonly Ebook[] = EBOOKS, nowMs = Date.now()): string[] {
  const errors: string[] = [];
  const name = String(f.name || '').trim();
  if (!name) errors.push('주문자 이름을 적어 주세요.');
  else if (name.length > 20) errors.push('주문자 이름은 20자 안으로 적어 주세요.');
  if (!isEmail(f.email)) errors.push('PDF를 받을 이메일 주소를 확인해 주세요.');
  else if (normalizeEmail(f.email) !== normalizeEmail(f.emailConfirm)) errors.push('이메일 주소 두 칸이 서로 다릅니다.');
  if (!isPhone(f.phone)) errors.push('휴대폰 번호를 확인해 주세요.');
  if (!isValidDate(f.birthdate)) errors.push('생년월일을 확인해 주세요.');
  else if (isMinor(f.birthdate, nowMs) && f.consentParent !== true) {
    errors.push('미성년자(만 19세 미만)는 부모님 또는 법정대리인 동의가 필요합니다.');
  }
  const ids = Array.isArray(f.books) ? f.books : [];
  if (ids.length === 0) errors.push('책을 1권 이상 골라 주세요.');
  else if (new Set(ids).size !== ids.length || ids.some((id) => !bookById(id, books))) errors.push('고른 책을 다시 확인해 주세요.');
  const cr = String(f.cashReceiptPhone || '').trim();
  if (cr && !isPhone(cr)) errors.push('현금영수증용 전화번호를 확인해 주세요. 받지 않으려면 비워 두세요.');
  if (f.consentPrivacy !== true) errors.push('개인정보 수집·이용에 동의해 주세요.');
  if (f.consentRefund !== true) errors.push('디지털 콘텐츠 환불 제한 안내를 확인해 주세요.');
  return errors;
}

/** 입금자명 앞부분: 공백을 빼고 이름 앞 5글자 */
export function depositorBase(name: string): string {
  return String(name || '').replace(/\s+/g, '').slice(0, EBOOK_CONFIG.depositorNameMax);
}

export type EbRow = {
  id: string;
  orderedAt: number;
  status: EbStatus;
  depositor: string;
  total: number;
  books: string[];
  paidChecked: boolean;
  /** 입금 기한(ms). 비어 있으면 기한 규칙을 쓰지 않습니다. */
  payDeadline?: number | null;
};

/**
 * 숫자 2자리(10~99)를 고릅니다. 취소되지 않은 주문 중 같은 입금자명이 없도록 합니다.
 * rand 는 0 이상 1 미만을 돌려주는 함수입니다. 남은 번호가 없으면 null.
 */
export function pickDepositor(rows: readonly EbRow[], name: string, rand: () => number = Math.random): string | null {
  const base = depositorBase(name);
  const used = new Set(rows.filter((r) => r.status !== EB_STATUS.cancelled).map((r) => r.depositor.replace(/\s+/g, '')));
  const free: string[] = [];
  for (let n = 10; n <= 99; n += 1) if (!used.has(`${base}${n}`)) free.push(`${base}${n}`);
  if (free.length === 0) return null;
  return free[Math.floor(rand() * free.length) % free.length];
}

export type EbDeposit = { amount: number; name: string; at: number };
export type EbMatch =
  | { kind: 'none' }
  | { kind: 'one'; row: EbRow }
  | { kind: 'amount'; row: EbRow }
  | { kind: 'many'; rows: EbRow[] }
  | { kind: 'late'; row: EbRow };

/**
 * 입금 알림 1건을 주문과 맞춰 봅니다.
 * - 입금자명(이름+숫자 2자리)이 같은 '입금 대기' 주문이 정확히 1건이고 금액도 같을 때만 'one'(자동 확인).
 * - 이름은 맞는데 금액이 다르면 'amount', 2건 이상이면 'many' → 둘 다 '확인 필요'.
 * - '입금 대기' 주문은 없고 같은 입금자명의 '미입금 취소' 주문이 있으면 'late'(기한 뒤 입금) → '확인 필요'.
 */
export function matchDeposit(rows: readonly EbRow[], dep: EbDeposit): EbMatch {
  const same = (r: EbRow) => !r.paidChecked && r.depositor.replace(/\s+/g, '') === dep.name;
  const hits = rows.filter((r) => r.status === EB_STATUS.pending && same(r));
  if (hits.length === 0) {
    const late = rows.filter((r) => r.status === EB_STATUS.expired && same(r));
    return late.length ? { kind: 'late', row: late[0] } : { kind: 'none' };
  }
  if (hits.length > 1) return { kind: 'many', rows: hits };
  return hits[0].total === dep.amount ? { kind: 'one', row: hits[0] } : { kind: 'amount', row: hits[0] };
}

export type EbAction = 'send' | 'resend' | 'cancel' | 'expire' | 'late' | null;

/**
 * 시트 한 줄에서 할 일을 정합니다.
 * - '취소' 체크 → 취소(보내지 않음)
 * - '입금 대기' + '입금 확정' 체크 → 보내기. 단, 입금이 입금 기한 뒤면 'late'(보내지 않고 '확인 필요')
 *   입금 시각이 있으면 그 시각으로 보고, 없으면(체크만 있음) 지금 시각으로 봅니다.
 * - '입금 대기' + 입금 확정 없음 + 입금 기한 지남 → 'expire'('미입금 취소')
 * - '미입금 취소' 줄에 '입금 확정'이 체크되면 'late'('확인 필요'). 자동으로 보내지 않습니다.
 * - '다시 보내기' 체크(취소가 아닌 줄) → 보내기. '확인 필요'·'미입금 취소' 줄도 세연님이 확인한 뒤 이 칸으로 보냅니다.
 * - '확인 필요' 줄은 자동으로 보내지 않습니다.
 * - 입금 기한 칸이 비어 있는 줄(기한을 넣기 전 주문)은 기한 규칙을 쓰지 않습니다.
 */
export function decideAction(
  r: {
    status: EbStatus | string;
    paidChecked: boolean;
    resendChecked: boolean;
    cancelChecked: boolean;
    payDeadline?: number | null;
    paidAt?: number | null;
  },
  now = 0,
): EbAction {
  const closed = r.status === EB_STATUS.cancelled || r.status === EB_STATUS.expired;
  if (r.cancelChecked) return closed ? null : 'cancel';
  if (r.status === EB_STATUS.cancelled) return null;
  if (r.resendChecked) return 'resend';
  if (r.status === EB_STATUS.expired) return r.paidChecked ? 'late' : null;
  if (r.status !== EB_STATUS.pending) return null;
  const dl = r.payDeadline ?? null;
  if (r.paidChecked) {
    if (dl == null) return 'send';
    const paidAt = r.paidAt ?? now;
    return paidAt > dl + EBOOK_CONFIG.payGraceMs ? 'late' : 'send';
  }
  return dl != null && now > dl + EBOOK_CONFIG.payGraceMs ? 'expire' : null;
}

/**
 * 첨부 파일을 메일 여러 통으로 나눕니다(한 통 maxBytes 이하).
 * 한 파일이 maxBytes 보다 크면 oversize 로 돌려줍니다(첨부하지 않고 '확인 필요').
 */
export function packAttachments<T extends { size: number }>(files: readonly T[], maxBytes: number): { mails: T[][]; oversize: T[] } {
  const mails: T[][] = [];
  const oversize: T[] = [];
  let cur: T[] = [];
  let curSize = 0;
  for (const f of files) {
    if (f.size > maxBytes) {
      oversize.push(f);
      continue;
    }
    if (cur.length && curSize + f.size > maxBytes) {
      mails.push(cur);
      cur = [];
      curSize = 0;
    }
    cur.push(f);
    curSize += f.size;
  }
  if (cur.length) mails.push(cur);
  return { mails, oversize };
}
