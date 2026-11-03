/** 이 시각(Asia/Seoul)이 지나면 홈 모의면접 팝업을 더 이상 띄우지 않습니다. */
export const HOME_MI_POPUP_END_KST = '2026-12-20T23:59:00+09:00';

export const HOME_MI_POPUP_HIDE_KEY = 'mi-popup-hide-date';
export const HOME_MI_POPUP_SESSION_KEY = 'mi-popup-closed';

const BOT_UA =
  /googlebot|bingbot|yandexbot|baiduspider|duckduckbot|slurp|facebookexternalhit|linkedinbot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|embedly|pinterestbot|applebot|petalbot|ahrefsbot|semrushbot|dotbot|mj12bot|bytespider|gptbot|claudebot|amazonbot|prerender|phantomjs|wget\/|curl\//i;

export type HomeMiPopupGate = {
  now: Date;
  pathname: string;
  search: string;
  userAgent: string;
  hideDate: string | null;
  sessionClosed: boolean;
  prerendering: boolean;
};

export function seoulDateKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isAfterHomeMiPopupEnd(now: Date): boolean {
  return now.getTime() > Date.parse(HOME_MI_POPUP_END_KST);
}

export function isHomePath(pathname: string): boolean {
  return pathname === '/' || pathname === '';
}

export function isBotUserAgent(userAgent: string): boolean {
  return BOT_UA.test(userAgent);
}

export function shouldShowHomeMiPopup(gate: HomeMiPopupGate): boolean {
  if (!isHomePath(gate.pathname)) return false;
  if (gate.prerendering) return false;
  if (isAfterHomeMiPopupEnd(gate.now)) return false;
  if (new URLSearchParams(gate.search).has('admin')) return false;
  if (isBotUserAgent(gate.userAgent)) return false;
  if (gate.sessionClosed) return false;
  if (gate.hideDate && gate.hideDate === seoulDateKey(gate.now)) return false;
  return true;
}

function storageGet(store: Storage | undefined, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function readHomeMiPopupGate(now = new Date()): HomeMiPopupGate | null {
  if (typeof window === 'undefined') return null;
  const doc = typeof document !== 'undefined' ? document : undefined;
  const prerendering = Boolean(doc && 'prerendering' in doc && (doc as Document & { prerendering?: boolean }).prerendering);
  return {
    now,
    pathname: window.location.pathname,
    search: window.location.search,
    userAgent: window.navigator?.userAgent ?? '',
    hideDate: storageGet(window.localStorage, HOME_MI_POPUP_HIDE_KEY),
    sessionClosed: storageGet(window.sessionStorage, HOME_MI_POPUP_SESSION_KEY) != null,
    prerendering,
  };
}

export function shouldShowHomeMiPopupNow(now = new Date()): boolean {
  const gate = readHomeMiPopupGate(now);
  if (!gate) return false;
  return shouldShowHomeMiPopup(gate);
}

function storageSet(store: Storage | undefined, key: string, value: string) {
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function persistHomeMiPopupHiddenToday(now = new Date()) {
  if (typeof window === 'undefined') return;
  storageSet(window.localStorage, HOME_MI_POPUP_HIDE_KEY, seoulDateKey(now));
}

export function persistHomeMiPopupClosedForSession() {
  if (typeof window === 'undefined') return;
  storageSet(window.sessionStorage, HOME_MI_POPUP_SESSION_KEY, '1');
}
