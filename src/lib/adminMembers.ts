/**
 * 관리자 회원 목록 도우미: '새 글 알림 동의'(users.emailWeeklyOptIn, 동의 시각 emailWeeklyOptInAt) 표시와 CSV.
 * Firestore 를 부르지 않는 순수 함수라 scripts/admin-optin.test.ts 에서 바로 시험합니다.
 */

/** Firestore Timestamp(toDate/toMillis), Date, 밀리초 숫자, ISO 문자열을 밀리초로. 읽지 못하면 null */
export function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  const v = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return null;
}

/** 한국 시간 'yyyy-mm-dd HH:mm'. 없으면 '' */
export function formatKstMinute(value: unknown): string {
  const ms = toMillis(value);
  if (ms == null) return '';
  const d = new Date(ms + 9 * 3600000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export type MemberRow = {
  email?: string;
  childName?: string;
  phone?: string;
  interestService?: string;
  createdAt?: unknown;
  emailWeeklyOptIn?: boolean;
  emailWeeklyOptInAt?: unknown;
};

/** 동의 여부는 true 일 때만 '동의'. 값이 없거나 false 면 '미동의' */
export const optInLabel = (u: MemberRow) => (u.emailWeeklyOptIn === true ? '동의' : '미동의');

/** 동의한 회원만, 동의 시각이 최근인 순서(시각이 없으면 가입일)로 */
export function sortOptedIn(list: readonly MemberRow[]): MemberRow[] {
  const key = (u: MemberRow) => toMillis(u.emailWeeklyOptInAt) ?? toMillis(u.createdAt) ?? 0;
  return list.filter((u) => u.emailWeeklyOptIn === true).sort((a, b) => key(b) - key(a));
}

export const MEMBER_CSV_HEADERS = ['아이디(순번)', '자녀이름', '이메일(아이디)', '연락처', '관심서비스', '가입일', '새 글 알림 동의', '동의 시각'];

/** CSV 한 줄씩(머리글 제외). 순번은 목록 길이부터 거꾸로 셉니다(기존과 같음). */
export function memberCsvRows(list: readonly MemberRow[]): string[][] {
  return list.map((u, i) => [
    String(list.length - i),
    u.childName || '',
    u.email || '',
    u.phone || '',
    u.interestService || '',
    formatKstMinute(u.createdAt) || 'N/A',
    optInLabel(u),
    u.emailWeeklyOptIn === true ? formatKstMinute(u.emailWeeklyOptInAt) : '',
  ]);
}

/** 엑셀에서 한글이 깨지지 않도록 BOM 을 붙이고, 칸마다 따옴표로 감쌉니다. 수식으로 읽히는 첫 글자(= + - @)는 앞에 ' 를 붙입니다. */
export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n');
}
