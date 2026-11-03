import assert from 'node:assert/strict';
import {
  HOME_MI_POPUP_END_KST,
  HOME_MI_POPUP_HIDE_KEY,
  HOME_MI_POPUP_SESSION_KEY,
  isAfterHomeMiPopupEnd,
  readHomeMiPopupGate,
  seoulDateKey,
  shouldShowHomeMiPopup,
  shouldShowHomeMiPopupNow,
  type HomeMiPopupGate,
} from '../src/lib/homeMiPopup';

assert.equal(HOME_MI_POPUP_END_KST, '2026-12-20T23:59:00+09:00');
assert.equal(HOME_MI_POPUP_HIDE_KEY, 'mi-popup-hide-date');
assert.equal(HOME_MI_POPUP_SESSION_KEY, 'mi-popup-closed');
assert.equal(readHomeMiPopupGate(), null);
assert.equal(shouldShowHomeMiPopupNow(), false);

const end = Date.parse(HOME_MI_POPUP_END_KST);
assert.equal(isAfterHomeMiPopupEnd(new Date(end)), false, '종료 시각에는 아직 보여야 합니다');
assert.equal(isAfterHomeMiPopupEnd(new Date(end + 1)), true, '종료 시각 이후에는 숨겨야 합니다');

const base: HomeMiPopupGate = {
  now: new Date('2026-11-03T12:00:00+09:00'),
  pathname: '/',
  search: '',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
  hideDate: null,
  sessionClosed: false,
  prerendering: false,
};

assert.equal(shouldShowHomeMiPopup(base), true);
assert.equal(shouldShowHomeMiPopup({ ...base, pathname: '/mock-interview/' }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, pathname: '/admin' }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, search: '?admin' }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, search: '?admin=1&from=home' }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, search: '?from=admin' }), true);
assert.equal(shouldShowHomeMiPopup({ ...base, userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, userAgent: 'Mozilla/5.0 Prerender (+https://github.com/prerender/prerender)' }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, prerendering: true }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, sessionClosed: true }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, hideDate: '2026-11-03' }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, hideDate: '2026-11-02' }), true);
assert.equal(shouldShowHomeMiPopup({ ...base, now: new Date(end) }), true);
assert.equal(shouldShowHomeMiPopup({ ...base, now: new Date(end + 1) }), false);

assert.equal(seoulDateKey(new Date('2026-11-03T14:59:59.999Z')), '2026-11-03');
assert.equal(seoulDateKey(new Date('2026-11-03T15:00:00.000Z')), '2026-11-04');
assert.equal(shouldShowHomeMiPopup({ ...base, now: new Date('2026-11-03T15:30:00.000Z'), hideDate: '2026-11-04' }), false);
assert.equal(shouldShowHomeMiPopup({ ...base, now: new Date('2026-11-03T14:30:00.000Z'), hideDate: '2026-11-04' }), true);

console.log('✅ home mi popup tests passed');
