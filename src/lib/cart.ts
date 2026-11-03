/**
 * 입시는세연쌤books 장바구니.
 * 로그인한 회원만 씁니다. 회원별로 이 브라우저(localStorage)에 먼저 저장하고,
 * 실제 회원이면 자기 회원 문서(users/{uid} 의 cart 필드)에도 저장해 다른 기기와 맞춥니다.
 * Firestore 에 닿지 못하면 이 브라우저 저장만으로 동작합니다.
 */
import { EBOOKS, type Ebook, itemsTotal, orderTotal } from './ebooks';
import { hasStoredLogin, readPreviewMember } from './memberPrefill';

export const CART_EVENT = 'eb-cart-change';
const KEY_PREFIX = 'sehyunt-cart:';
/** 아직 회원 문서에 올리지 못한 변경이 있다는 표시 */
const PENDING_PREFIX = 'sehyunt-cart-pending:';
/** 미리보기(테스트 모드) 가짜 회원의 장바구니 키 */
export const PREVIEW_CART_UID = 'preview-member';

export type CartUser = { uid: string; preview: boolean };

/** 책 목록 순서대로, 중복·모르는 id 는 뺍니다. */
export function normalizeCart(ids: readonly unknown[], books: readonly Ebook[] = EBOOKS): string[] {
  const set = new Set(ids.filter((x): x is string => typeof x === 'string'));
  return books.filter((b) => b.price != null && set.has(b.id)).map((b) => b.id);
}

export function readCart(uid: string | null | undefined): string[] {
  if (!uid || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + uid);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? normalizeCart(arr) : [];
  } catch {
    return [];
  }
}

const isRemoteUid = (uid: string) => uid !== PREVIEW_CART_UID;

function setPending(uid: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(PENDING_PREFIX + uid, '1');
    else window.localStorage.removeItem(PENDING_PREFIX + uid);
  } catch {
    /* noop */
  }
}
function isPending(uid: string): boolean {
  try {
    return window.localStorage.getItem(PENDING_PREFIX + uid) === '1';
  } catch {
    return false;
  }
}

/** 회원 문서의 cart 필드를 읽습니다. 없거나 읽지 못하면 null. */
async function readRemoteCart(uid: string): Promise<string[] | null | 'error'> {
  try {
    const [{ db }, { doc, getDoc }] = await Promise.all([import('./firebase'), import('./firestoreApi')]);
    const snap = await getDoc(doc(db, 'users', uid));
    const cart = snap.exists() ? (snap.data() as { cart?: unknown }).cart : undefined;
    return Array.isArray(cart) ? normalizeCart(cart) : null;
  } catch {
    return 'error';
  }
}

let pushSeq = 0;
/** 자기 회원 문서에 cart 필드만 덮어씁니다(merge). 실패하면 다음 로그인 때 다시 올립니다. */
async function pushRemoteCart(uid: string, ids: readonly string[]): Promise<void> {
  const seq = ++pushSeq;
  try {
    const [{ auth, db }, { doc, setDoc, serverTimestamp }] = await Promise.all([import('./firebase'), import('./firestoreApi')]);
    if (auth.currentUser?.uid !== uid) return;
    await setDoc(doc(db, 'users', uid), { cart: [...ids], cartUpdatedAt: serverTimestamp() }, { merge: true });
    if (seq === pushSeq) setPending(uid, false);
  } catch {
    /* 이 브라우저 저장은 그대로 남습니다 */
  }
}

/** 순서는 책 목록 순서, 두 목록을 합칩니다. */
export function mergeCarts(a: readonly string[], b: readonly string[]): string[] {
  return normalizeCart([...a, ...b]);
}

/**
 * 로그인했을 때 한 번: 회원 문서의 장바구니와 이 브라우저의 장바구니를 맞춥니다.
 * - 이 브라우저에 아직 올리지 못한 변경이 있거나 회원 문서에 장바구니가 없으면 둘을 합쳐 올립니다.
 * - 그렇지 않으면 회원 문서(다른 기기에서 바꾼 것)를 따릅니다.
 */
const syncing = new Map<string, Promise<string[]>>();
export function syncCartOnLogin(uid: string): Promise<string[]> {
  if (!isRemoteUid(uid)) return Promise.resolve(readCart(uid));
  let p = syncing.get(uid);
  if (!p) {
    p = doSync(uid);
    syncing.set(uid, p);
  }
  return p;
}
async function doSync(uid: string): Promise<string[]> {
  const local = readCart(uid);
  const remote = await readRemoteCart(uid);
  if (remote === 'error') return local;
  const merged = remote == null || isPending(uid) ? mergeCarts(remote ?? [], local) : remote;
  writeLocal(uid, merged);
  if (remote == null || merged.join() !== remote.join()) {
    setPending(uid, true);
    await pushRemoteCart(uid, merged);
  }
  return merged;
}

function writeLocal(uid: string, next: string[]) {
  try {
    window.localStorage.setItem(KEY_PREFIX + uid, JSON.stringify(next));
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { uid, ids: next } }));
  } catch {
    /* noop */
  }
}

export function writeCart(uid: string, ids: readonly string[]): string[] {
  const next = normalizeCart(ids);
  writeLocal(uid, next);
  if (isRemoteUid(uid)) {
    setPending(uid, true);
    void pushRemoteCart(uid, next);
  }
  return next;
}

export const addToCart = (uid: string, id: string) => writeCart(uid, [...readCart(uid), id]);
export const addAllToCart = (uid: string) => writeCart(uid, EBOOKS.map((b) => b.id));
export const removeFromCart = (uid: string, id: string) => writeCart(uid, readCart(uid).filter((x) => x !== id));
export const removeManyFromCart = (uid: string, ids: readonly string[]) => writeCart(uid, readCart(uid).filter((x) => !ids.includes(x)));

export type CartSummary = {
  count: number;
  itemsSum: number | null;
  total: number | null;
};

export function cartSummary(ids: readonly string[], books: readonly Ebook[] = EBOOKS): CartSummary {
  const itemsSum = itemsTotal(ids, books);
  return { count: ids.length, itemsSum, total: orderTotal(ids, books) };
}

/** 장바구니에서 주문서로 가는 주소 */
export function checkoutPath(): string {
  return '/ebooks/?checkout=cart#eb-form';
}

/** 마이페이지 장바구니를 여는 주소(홈페이지) */
export const MYPAGE_CART_PATH = '/?mypage=cart';
/** 로그인 창을 열고, 로그인하면 돌아올 주소 */
export function loginPath(next: string): string {
  return `/?login=1&next=${encodeURIComponent(next)}`;
}
/** next 는 이 사이트의 /ebooks/ 주소만 받습니다. */
export function safeNext(v: string | null): string | null {
  return v && /^\/ebooks\/[a-z0-9\-/]*(\?[a-z0-9=&\-]*)?(#[a-z\-]*)?$/i.test(v) ? v : null;
}

/** 로그인한 회원(uid). 미리보기에서는 가짜 회원도 받습니다. */
export async function loadCartUser(opts: { allowPreviewMember?: boolean } = {}): Promise<CartUser | null> {
  if (opts.allowPreviewMember && readPreviewMember()) return { uid: PREVIEW_CART_UID, preview: true };
  if (!(await hasStoredLogin())) return null;
  try {
    const { auth } = await import('./firebase');
    await auth.authStateReady();
    if (!auth.currentUser) return null;
    await syncCartOnLogin(auth.currentUser.uid);
    return { uid: auth.currentUser.uid, preview: false };
  } catch {
    return null;
  }
}
