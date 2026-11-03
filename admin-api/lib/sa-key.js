// 서비스 계정 키(GA4_SA_KEY_JSON)를 읽습니다. Vercel에 붙여 넣을 때 자주 생기는 모양 차이를
// 받아 줍니다: 앞뒤 공백·BOM, 문자열 안의 실제 줄바꿈, 따옴표로 한 번 더 감싼 JSON, base64로 인코딩한 JSON.
// 키 내용은 절대 로그에 남기지 않습니다. describeKeyShape는 모양(참/거짓·길이)만 알려 줍니다.

/** JSON 문자열 값 안에 들어간 실제 줄바꿈·탭을 \n·\t 이스케이프로 바꿉니다. */
function escapeControlCharsInStrings(s) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of s) {
    if (inString) {
      if (escaped) { escaped = false; out += ch; continue; }
      if (ch === '\\') { escaped = true; out += ch; continue; }
      if (ch === '"') { inString = false; out += ch; continue; }
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') continue;
      if (ch === '\t') { out += '\\t'; continue; }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

function tryJson(s) {
  try { return JSON.parse(s); } catch { /* 다음 방법 */ }
  try { return JSON.parse(escapeControlCharsInStrings(s)); } catch { return undefined; }
}

function looksBase64(s) {
  return /^[A-Za-z0-9+/=_-\s]+$/.test(s) && s.replace(/\s/g, '').length >= 100;
}

function decodeBase64(s) {
  try { return Buffer.from(s.replace(/\s/g, ''), 'base64').toString('utf8'); } catch { return ''; }
}

/** 키 문자열을 { client_email, private_key } 객체로 바꿉니다. 실패하면 이유만 담은 Error를 던집니다. */
export function parseServiceAccountKey(raw) {
  let s = String(raw || '').replace(/^\uFEFF/, '').trim();
  let key;
  for (let depth = 0; depth < 3 && key === undefined; depth++) {
    if (s.startsWith('{')) {
      key = tryJson(s);
    } else if (s.startsWith('"') || s.startsWith("'")) {
      const inner = s.startsWith('"') ? tryJson(s) : s.slice(1, -1);
      if (typeof inner === 'string') s = inner.trim();
      else if (inner && typeof inner === 'object') key = inner;
      else break;
    } else if (looksBase64(s)) {
      const decoded = decodeBase64(s).trim();
      if (!decoded.startsWith('{')) break;
      s = decoded;
    } else {
      break;
    }
  }
  if (!key || typeof key !== 'object') {
    const e = new Error('service account key is not valid JSON');
    e.code = 'SA_KEY_NOT_JSON';
    throw e;
  }
  if (typeof key.private_key === 'string' && !key.private_key.includes('\n') && key.private_key.includes('\\n')) {
    key.private_key = key.private_key.replace(/\\n/g, '\n');
  }
  if (!key.client_email || !key.private_key) {
    const e = new Error('service account key is missing client_email or private_key');
    e.code = 'SA_KEY_MISSING_FIELDS';
    throw e;
  }
  return key;
}

/** 키 내용 없이 모양만 설명합니다. 로그용입니다. */
export function describeKeyShape(raw) {
  const s = String(raw || '').replace(/^\uFEFF/, '').trim();
  return {
    length: s.length,
    startsWithBrace: s.startsWith('{'),
    startsWithQuote: s.startsWith('"') || s.startsWith("'"),
    endsWithBrace: s.endsWith('}'),
    hasRealNewline: /\n/.test(s),
    mentionsPrivateKey: s.includes('private_key'),
    mentionsClientEmail: s.includes('client_email'),
    looksBase64: looksBase64(s),
  };
}
