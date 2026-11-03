// GA4 방문 통계 API의 핵심 로직입니다. 외부 의존성(토큰 검증, GA 호출, 시계)은
// 주입받아서 테스트에서 가짜로 바꿀 수 있습니다.

export const DEFAULT_ALLOWED_ORIGINS = [
  'https://sehyunt.re.kr',
  'https://www.sehyunt.re.kr',
  'https://sehyunt-preview.vercel.app',
];
export const DEFAULT_ADMIN_EMAIL = 'ahrah0365@gmail.com';
export const DEFAULT_FIREBASE_PROJECT_ID = 'gen-lang-client-0337316086';
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** 환경 변수를 읽어 설정 객체로 만듭니다. 값 자체는 어디에도 출력하지 않습니다. */
export function readConfig(env) {
  const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null);
  const propertyId = (env.GA4_PROPERTY_ID || '').trim();
  const saKey = env.GA4_SA_KEY_JSON || '';
  return {
    allowedOrigins: list(env.ALLOWED_ORIGINS) || DEFAULT_ALLOWED_ORIGINS,
    adminEmail: (env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
    firebaseProjectId: (env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID).trim(),
    propertyId: /^\d+$/.test(propertyId) ? propertyId : '',
    saKey,
    gaConfigured: /^\d+$/.test(propertyId) && saKey.length > 0,
  };
}

/** GA4 batchRunReports 요청 본문입니다. 0번은 오늘, 1번은 최근 7일(오늘 포함)입니다. */
export function buildBatchRequest() {
  const metrics = [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }];
  return {
    requests: [
      { dateRanges: [{ startDate: 'today', endDate: 'today' }], metrics },
      { dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }], metrics },
    ],
  };
}

function metricRow(report) {
  const values = report?.rows?.[0]?.metricValues || [];
  const num = (i) => {
    const n = Number(values[i]?.value);
    return Number.isFinite(n) ? n : 0;
  };
  return { activeUsers: Math.round(num(0)), sessions: Math.round(num(1)), avgSessionSeconds: Math.round(num(2)) };
}

/** GA4 응답을 화면에서 쓰는 모양으로 바꿉니다. 데이터가 없는 날은 0으로 둡니다. */
export function parseBatchResponse(body) {
  const reports = body?.reports;
  if (!Array.isArray(reports) || reports.length < 2) throw new Error('unexpected GA response shape');
  return { today: metricRow(reports[0]), last7Days: metricRow(reports[1]) };
}

function corsHeaders(origin, allowedOrigins) {
  const h = { Vary: 'Origin' };
  if (origin && allowedOrigins.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Authorization';
    h['Access-Control-Max-Age'] = '600';
  }
  return h;
}

/**
 * 요청 하나를 처리합니다.
 * deps.verifyIdToken(token, projectId) → payload(email 포함), 실패하면 throw
 * deps.runBatchReport(config, requestBody) → GA4 응답 JSON
 * deps.now() → ms
 * deps.cache → { value, expiresAt } 를 담는 객체(인스턴스마다 하나)
 */
export async function handleRequest({ method, origin, authorization }, config, deps) {
  const base = corsHeaders(origin, config.allowedOrigins);
  const json = (status, body, extra = {}) => ({
    status,
    headers: { ...base, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...extra },
    body: JSON.stringify(body),
  });

  if (origin && !config.allowedOrigins.includes(origin)) return json(403, { status: 'forbidden_origin' });
  if (method === 'OPTIONS') return { status: 204, headers: base, body: '' };
  if (method !== 'GET') return json(405, { status: 'method_not_allowed' }, { Allow: 'GET, OPTIONS' });

  const match = /^Bearer\s+(.+)$/i.exec(authorization || '');
  if (!match) return json(401, { status: 'unauthorized' });
  let payload;
  try {
    payload = await deps.verifyIdToken(match[1].trim(), config.firebaseProjectId);
  } catch {
    return json(401, { status: 'unauthorized' });
  }
  const email = String(payload?.email || '').toLowerCase();
  if (!email || email !== config.adminEmail) return json(403, { status: 'forbidden' });

  if (!config.gaConfigured) return json(200, { status: 'not_configured' });

  const now = deps.now();
  const cache = deps.cache;
  if (cache.value && cache.expiresAt > now) {
    return json(200, { ...cache.value, cached: true });
  }
  try {
    const raw = await deps.runBatchReport(config, buildBatchRequest());
    const value = {
      status: 'ok',
      propertyId: config.propertyId,
      fetchedAt: new Date(now).toISOString(),
      ...parseBatchResponse(raw),
    };
    cache.value = value;
    cache.expiresAt = now + CACHE_TTL_MS;
    return json(200, { ...value, cached: false });
  } catch (err) {
    // 원인만 짧게 남기고 키나 토큰은 남기지 않습니다.
    deps.log?.(`ga-stats: GA call failed: ${err?.code || err?.response?.status || err?.name || 'error'}`);
    return json(502, { status: 'error' });
  }
}
