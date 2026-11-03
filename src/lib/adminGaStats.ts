/** 관리자 화면 GA4 방문 통계: API 응답 해석과 화면 문구를 한곳에 둡니다. */
import { SITE } from '../config/site';

export type GaMetrics = { activeUsers: number; sessions: number; avgSessionSeconds: number };

export type GaStatsState =
  | { kind: 'loading' }
  | { kind: 'not_configured' }
  | { kind: 'error'; reason: 'network' | 'unauthorized' | 'server' }
  | { kind: 'ok'; today: GaMetrics; last7Days: GaMetrics; propertyId: string; fetchedAt: string };

export const ADMIN_STATS_API_URL: string =
  (import.meta.env?.VITE_ADMIN_STATS_API_URL as string | undefined) || SITE.adminStatsApiUrl;

const GA_HOME = 'https://analytics.google.com/analytics/web/';

export function gaReportUrl(propertyId?: string): string {
  return propertyId && /^\d+$/.test(propertyId) ? `${GA_HOME}#/p${propertyId}/reports/intelligenthome` : GA_HOME;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0 ? `${m}분 ${rest}초` : `${rest}초`;
}

function isMetrics(v: any): v is GaMetrics {
  return v && ['activeUsers', 'sessions', 'avgSessionSeconds'].every((k) => typeof v[k] === 'number');
}

/** HTTP 상태와 본문을 화면 상태로 바꿉니다. 모르는 모양이면 '연결 안 됨'으로 둡니다. */
export function interpretGaResponse(httpStatus: number, body: any): GaStatsState {
  if (httpStatus === 401 || httpStatus === 403) return { kind: 'error', reason: 'unauthorized' };
  if (httpStatus === 200 && body?.status === 'not_configured') return { kind: 'not_configured' };
  if (httpStatus === 200 && body?.status === 'ok' && isMetrics(body.today) && isMetrics(body.last7Days)) {
    return {
      kind: 'ok',
      today: body.today,
      last7Days: body.last7Days,
      propertyId: String(body.propertyId || ''),
      fetchedAt: String(body.fetchedAt || ''),
    };
  }
  return { kind: 'error', reason: 'server' };
}

export function gaStatusLabel(state: GaStatsState): string {
  switch (state.kind) {
    case 'loading':
      return '확인 중';
    case 'not_configured':
      return '연결 전';
    case 'ok':
      return '연결됨';
    default:
      return '연결 안 됨';
  }
}

export function gaStatusMessage(state: GaStatsState): string {
  switch (state.kind) {
    case 'loading':
      return '구글 애널리틱스 숫자를 불러오는 중입니다.';
    case 'not_configured':
      return '구글 애널리틱스 연결 전입니다. 연결을 마치면 실제 방문 숫자가 보입니다.';
    case 'ok':
      return '구글 애널리틱스 숫자입니다. 5분마다 새로 불러옵니다.';
    case 'error':
      if (state.reason === 'unauthorized') return '관리자 로그인을 확인하지 못했습니다. 다시 로그인해 주세요.';
      if (state.reason === 'network') return '통계 서버에 연결하지 못했습니다. 잠시 뒤 다시 열어 주세요.';
      return '구글 애널리틱스에서 숫자를 받지 못했습니다. 연결 설정을 확인해 주세요.';
  }
}

/** 관리자 ID 토큰을 붙여 통계 API를 부릅니다. */
export async function fetchGaStats(
  getIdToken: () => Promise<string>,
  fetchImpl: typeof fetch = fetch,
  url: string = ADMIN_STATS_API_URL,
): Promise<GaStatsState> {
  let token: string;
  try {
    token = await getIdToken();
  } catch {
    return { kind: 'error', reason: 'unauthorized' };
  }
  try {
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return interpretGaResponse(res.status, body);
  } catch {
    return { kind: 'error', reason: 'network' };
  }
}
