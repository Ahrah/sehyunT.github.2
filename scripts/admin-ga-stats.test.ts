import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from 'jose';
import {
  CACHE_TTL_MS,
  buildBatchRequest,
  handleRequest,
  parseBatchResponse,
  readConfig,
} from '../admin-api/lib/ga-stats.js';
import { verifyFirebaseIdToken } from '../admin-api/lib/deps.js';
import { fetchGaStats, formatDuration, gaReportUrl, interpretGaResponse } from '../src/lib/adminGaStats';
import { AdminStatsCards } from '../src/components/AdminGaStats';

const SITE_ORIGIN = 'https://sehyunt.re.kr';
const PROJECT = 'gen-lang-client-0337316086';
const gaReply = {
  reports: [
    { rows: [{ metricValues: [{ value: '37' }, { value: '41' }, { value: '125.6' }] }] },
    { rows: [{ metricValues: [{ value: '210' }, { value: '260' }, { value: '98.2' }] }] },
  ],
};

function makeDeps(overrides: Record<string, any> = {}) {
  const calls = { ga: 0 };
  let now = Date.parse('2026-11-03T04:00:00Z');
  const deps = {
    verifyIdToken: async (token: string, projectId: string) => {
      assert.equal(projectId, PROJECT);
      if (token === 'admin') return { email: 'Ahrah0365@gmail.com' };
      if (token === 'member') return { email: 'someone@example.com' };
      throw new Error('bad token');
    },
    runBatchReport: async (_c: any, body: any) => {
      calls.ga++;
      assert.deepEqual(body, buildBatchRequest());
      return gaReply;
    },
    now: () => now,
    cache: { value: null, expiresAt: 0 },
    log: () => {},
    ...overrides,
  };
  return { deps, calls, advance: (ms: number) => (now += ms) };
}

const configured = readConfig({ GA4_PROPERTY_ID: '123456789', GA4_SA_KEY_JSON: '{"fake":true}' });
const unconfigured = readConfig({});
const req = (o: Record<string, any> = {}) => ({ method: 'GET', origin: SITE_ORIGIN, authorization: 'Bearer admin', ...o });

// 설정 읽기
assert.equal(unconfigured.gaConfigured, false);
assert.equal(readConfig({ GA4_PROPERTY_ID: 'G-BTG5X3NHL5', GA4_SA_KEY_JSON: '{}' }).gaConfigured, false, '측정 ID는 속성 ID가 될 수 없습니다');
assert.equal(configured.gaConfigured, true);
assert.deepEqual(configured.allowedOrigins, ['https://sehyunt.re.kr', 'https://www.sehyunt.re.kr', 'https://sehyunt-preview.vercel.app']);

// CORS: 허용하지 않은 출처는 거절하고 허용 헤더도 주지 않습니다.
{
  const { deps } = makeDeps();
  const r = await handleRequest(req({ origin: 'https://evil.example' }), configured, deps);
  assert.equal(r.status, 403);
  assert.equal(r.headers['Access-Control-Allow-Origin'], undefined);
  const pre = await handleRequest(req({ method: 'OPTIONS', authorization: undefined }), configured, deps);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers['Access-Control-Allow-Origin'], SITE_ORIGIN);
  assert.equal(pre.headers['Access-Control-Allow-Headers'], 'Authorization');
  const preview = await handleRequest(req({ origin: 'https://sehyunt-preview.vercel.app' }), configured, deps);
  assert.equal(preview.headers['Access-Control-Allow-Origin'], 'https://sehyunt-preview.vercel.app');
}

// 인증: 토큰 없음·잘못된 토큰 → 401, 관리자 아닌 회원 → 403. 어느 경우에도 GA를 부르지 않습니다.
{
  const { deps, calls } = makeDeps();
  assert.equal((await handleRequest(req({ authorization: undefined }), configured, deps)).status, 401);
  assert.equal((await handleRequest(req({ authorization: 'Bearer nope' }), configured, deps)).status, 401);
  assert.equal((await handleRequest(req({ authorization: 'Bearer member' }), configured, deps)).status, 403);
  assert.equal((await handleRequest(req({ method: 'POST' }), configured, deps)).status, 405);
  assert.equal(calls.ga, 0);
}

// 연결 전: 관리자에게만 not_configured를 알려 줍니다.
{
  const { deps, calls } = makeDeps();
  const r = await handleRequest(req(), unconfigured, deps);
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(r.body), { status: 'not_configured' });
  assert.equal(calls.ga, 0);
  assert.equal((await handleRequest(req({ authorization: 'Bearer member' }), unconfigured, deps)).status, 403);
}

// 정상 응답과 5분 캐시
{
  const { deps, calls, advance } = makeDeps();
  const first = JSON.parse((await handleRequest(req(), configured, deps)).body);
  assert.equal(first.status, 'ok');
  assert.equal(first.cached, false);
  assert.equal(first.propertyId, '123456789');
  assert.deepEqual(first.today, { activeUsers: 37, sessions: 41, avgSessionSeconds: 126 });
  assert.deepEqual(first.last7Days, { activeUsers: 210, sessions: 260, avgSessionSeconds: 98 });
  advance(CACHE_TTL_MS - 1);
  const second = JSON.parse((await handleRequest(req(), configured, deps)).body);
  assert.equal(second.cached, true);
  assert.equal(calls.ga, 1);
  advance(2);
  await handleRequest(req(), configured, deps);
  assert.equal(calls.ga, 2);
  // 캐시가 있어도 관리자가 아니면 숫자를 주지 않습니다.
  assert.equal((await handleRequest(req({ authorization: 'Bearer member' }), configured, deps)).status, 403);
}

// GA 오류 → 502, 키나 토큰 내용은 응답에 없습니다.
{
  const logs: string[] = [];
  const { deps } = makeDeps({
    runBatchReport: async () => {
      throw Object.assign(new Error('PERMISSION_DENIED private_key=xyz'), { code: 403 });
    },
    log: (m: string) => logs.push(m),
  });
  const r = await handleRequest(req(), configured, deps);
  assert.equal(r.status, 502);
  assert.deepEqual(JSON.parse(r.body), { status: 'error' });
  assert.equal(logs.join(' ').includes('private_key'), false);
}

// 데이터가 없는 날(rows 없음)은 0으로 둡니다.
assert.deepEqual(parseBatchResponse({ reports: [{}, {}] }).today, { activeUsers: 0, sessions: 0, avgSessionSeconds: 0 });
assert.throws(() => parseBatchResponse({}));

// 실제 Firebase ID 토큰 검증(issuer·audience·서명)
{
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  const keySet = createLocalJWKSet({ keys: [jwk] });
  const sign = (aud: string, iss: string) =>
    new SignJWT({ email: 'ahrah0365@gmail.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setSubject('uid1')
      .setAudience(aud)
      .setIssuer(iss)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
  const good = await sign(PROJECT, `https://securetoken.google.com/${PROJECT}`);
  assert.equal((await verifyFirebaseIdToken(good, PROJECT, keySet)).email, 'ahrah0365@gmail.com');
  await assert.rejects(verifyFirebaseIdToken(await sign('other-project', `https://securetoken.google.com/other-project`), PROJECT, keySet));
  await assert.rejects(verifyFirebaseIdToken(await sign(PROJECT, 'https://evil.example'), PROJECT, keySet));
  const other = await generateKeyPair('RS256');
  const forged = await new SignJWT({ email: 'ahrah0365@gmail.com' })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setSubject('uid1').setAudience(PROJECT).setIssuer(`https://securetoken.google.com/${PROJECT}`)
    .setIssuedAt().setExpirationTime('1h').sign(other.privateKey);
  await assert.rejects(verifyFirebaseIdToken(forged, PROJECT, keySet));
}

// 화면 쪽 해석
assert.deepEqual(interpretGaResponse(200, { status: 'not_configured' }), { kind: 'not_configured' });
assert.deepEqual(interpretGaResponse(403, {}), { kind: 'error', reason: 'unauthorized' });
assert.deepEqual(interpretGaResponse(502, { status: 'error' }), { kind: 'error', reason: 'server' });
assert.deepEqual(interpretGaResponse(200, { status: 'ok', today: {} }), { kind: 'error', reason: 'server' });
assert.equal(formatDuration(522), '8분 42초');
assert.equal(formatDuration(42), '42초');
assert.equal(gaReportUrl('123456789'), 'https://analytics.google.com/analytics/web/#/p123456789/reports/intelligenthome');
assert.equal(gaReportUrl(''), 'https://analytics.google.com/analytics/web/');
{
  let sentAuth = '';
  const fakeFetch = (async (_u: string, init: any) => {
    sentAuth = init.headers.Authorization;
    return { status: 200, json: async () => ({ status: 'not_configured' }) };
  }) as unknown as typeof fetch;
  assert.deepEqual(await fetchGaStats(async () => 'tok', fakeFetch, 'https://x'), { kind: 'not_configured' });
  assert.equal(sentAuth, 'Bearer tok');
  const down = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
  assert.deepEqual(await fetchGaStats(async () => 'tok', down, 'https://x'), { kind: 'error', reason: 'network' });
  assert.deepEqual(await fetchGaStats(async () => { throw new Error('signed out'); }, fakeFetch, 'https://x'), { kind: 'error', reason: 'unauthorized' });
}

// 화면: 연결 전·오류일 때 가짜 숫자가 없고, 연결되면 실제 숫자가 보입니다.
const render = (state: any) => renderToStaticMarkup(createElement(AdminStatsCards, { memberCount: 5, state }));
for (const state of [{ kind: 'not_configured' }, { kind: 'error', reason: 'server' }, { kind: 'loading' }]) {
  const html = render(state);
  for (const fake of ['8m 42s', '>124<', 'Status: Active', 'Avg. Session', 'Daily Visits']) assert.equal(html.includes(fake), false, fake);
  assert.equal(html.includes('GA에서 자세히 보기'), true);
}
assert.equal(render({ kind: 'not_configured' }).includes('연결 전'), true);
assert.equal(render({ kind: 'error', reason: 'server' }).includes('연결 안 됨'), true);
{
  const html = render({
    kind: 'ok',
    today: { activeUsers: 37, sessions: 41, avgSessionSeconds: 126 },
    last7Days: { activeUsers: 210, sessions: 260, avgSessionSeconds: 98 },
    propertyId: '123456789',
    fetchedAt: '2026-11-03T04:00:00.000Z',
  });
  assert.equal(html.includes('연결됨'), true);
  assert.equal(html.includes('>37<'), true);
  assert.equal(html.includes('1분 38초'), true);
  assert.equal(html.includes('#/p123456789/'), true);
}

console.log('✅ admin GA stats API and cards');
