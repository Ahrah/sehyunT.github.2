// 실제 배포에서 쓰는 의존성입니다. (테스트에서는 가짜로 바꿉니다.)
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { JWT } from 'google-auth-library';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/** Firebase ID 토큰을 구글 공개키로 검증합니다. firebase-admin verifyIdToken과 같은 검사입니다. */
export async function verifyFirebaseIdToken(token, projectId, keySet = JWKS) {
  const { payload } = await jwtVerify(token, keySet, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  });
  if (!payload.sub) throw new Error('missing sub');
  if (typeof payload.auth_time === 'number' && payload.auth_time * 1000 > Date.now() + 60_000) {
    throw new Error('auth_time in future');
  }
  return payload;
}

let jwtClient = null;
/** 이 API 전용 서비스 계정 키(GA4_SA_KEY_JSON)로 GA4 Data API를 부릅니다. */
export async function runBatchReport(config, body) {
  if (!jwtClient) {
    const key = JSON.parse(config.saKey);
    jwtClient = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
  }
  const res = await jwtClient.request({
    url: `https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:batchRunReports`,
    method: 'POST',
    data: body,
    timeout: 8000,
  });
  return res.data;
}
