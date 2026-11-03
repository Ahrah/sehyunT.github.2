/**
 * 로그인한 회원의 이름·휴대폰(·이메일)을 신청서에 미리 채웁니다.
 *
 * - 로그인 흔적(Firebase 로그인 저장값)이 없으면 Firebase 를 아예 불러오지 않습니다.
 * - 로그인돼 있으면 Firebase auth·Firestore 를 그때 불러와 본인 users/{uid} 문서만 읽습니다(쓰기 없음).
 * - 사용자가 이미 적은 칸은 덮어쓰지 않습니다. 채운 칸도 그대로 고칠 수 있습니다.
 */

export type MemberProfile = { name: string; phone: string; email: string };

/** 프로필 값 → 신청서 칸 이름 매핑 */
export type PrefillMap<F> = Partial<Record<keyof MemberProfile, keyof F>>;

export const EMPTY_MEMBER_PROFILE: MemberProfile = { name: '', phone: '', email: '' };

/** 01012345678 → 010-1234-5678. 휴대폰 꼴이 아니면 받은 그대로 둡니다. */
export function formatMemberPhone(v: string): string {
  const d = (v || '').replace(/\D/g, '');
  return /^01\d{8,9}$/.test(d) ? d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') : (v || '').trim();
}

/** Firestore users 문서(또는 없음)에서 신청서용 프로필을 만듭니다. 문서가 없거나 비어 있으면 로그인 정보로 채울 수 있는 것만 채웁니다. */
export function profileFromUserDoc(
  data: Record<string, unknown> | null | undefined,
  user: { displayName?: string | null; email?: string | null } | null | undefined,
): MemberProfile {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const d = data || {};
  return {
    name: str(d.childName) || str(user?.displayName),
    phone: formatMemberPhone(str(d.phone)),
    email: str(d.email) || str(user?.email),
  };
}

/**
 * 비어 있고 사용자가 손대지 않은 칸만 프로필 값으로 채웁니다.
 * 바뀐 칸이 없으면 같은 객체를 돌려줍니다(React 다시 그리기 방지).
 */
export function applyMemberPrefill<F extends Record<string, unknown>>(
  form: F,
  profile: MemberProfile | null | undefined,
  map: PrefillMap<F>,
  touched: ReadonlySet<keyof F> = new Set(),
): F {
  if (!profile) return form;
  let next: F = form;
  for (const key of Object.keys(map) as (keyof MemberProfile)[]) {
    const field = map[key];
    if (!field) continue;
    const value = (profile[key] || '').trim();
    if (!value) continue;
    if (touched.has(field)) continue;
    const current = form[field];
    if (typeof current !== 'string' || current.trim() !== '') continue;
    if (next === form) next = { ...form };
    (next as Record<keyof F, unknown>)[field] = value;
  }
  return next;
}

/** Firebase 가 로그인 상태를 남겨 두는 키 앞부분(브라우저 기본 저장소는 IndexedDB, 예전·대체 저장소는 localStorage/sessionStorage) */
const AUTH_KEY_PREFIX = 'firebase:authUser:';
const IDB_NAME = 'firebaseLocalStorageDb';
const IDB_STORE = 'firebaseLocalStorage';

function storageHasAuthUser(s: Storage | undefined): boolean {
  try {
    if (!s) return false;
    for (let i = 0; i < s.length; i++) {
      if (s.key(i)?.startsWith(AUTH_KEY_PREFIX)) return true;
    }
  } catch {
    /* 저장소 접근이 막힌 브라우저 */
  }
  return false;
}

function idbHasAuthUser(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    try {
      if (typeof indexedDB === 'undefined') return done(false);
      const req = indexedDB.open(IDB_NAME);
      // DB 가 없으면 새로 만들지 않고 바로 접습니다.
      req.onupgradeneeded = () => {
        try {
          req.transaction?.abort();
        } catch {
          /* noop */
        }
        done(false);
      };
      req.onerror = () => done(false);
      req.onblocked = () => done(false);
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.close();
            return done(false);
          }
          const keysReq = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).getAllKeys();
          keysReq.onsuccess = () => {
            const found = (keysReq.result || []).some((k) => typeof k === 'string' && k.startsWith(AUTH_KEY_PREFIX));
            db.close();
            done(found);
          };
          keysReq.onerror = () => {
            db.close();
            done(false);
          };
        } catch {
          try {
            db.close();
          } catch {
            /* noop */
          }
          done(false);
        }
      };
      window.setTimeout(() => done(false), 1500);
    } catch {
      done(false);
    }
  });
}

/** 이 브라우저에 홈페이지 로그인 흔적이 있는지 가볍게 확인합니다(Firebase 를 불러오지 않습니다). */
export async function hasStoredLogin(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (storageHasAuthUser(window.localStorage) || storageHasAuthUser(window.sessionStorage)) return true;
  return idbHasAuthUser();
}

/** 미리보기(테스트 모드) 화면 확인용 가짜 회원. 실제 사이트에서는 쓰지 않습니다. */
export const PREVIEW_MEMBER_KEY = 'sehyunt-preview-member';

export function readPreviewMember(): MemberProfile | null {
  try {
    const raw = window.localStorage.getItem(PREVIEW_MEMBER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<MemberProfile> & { childName?: string };
    return profileFromUserDoc({ childName: p.childName || p.name, phone: p.phone, email: p.email }, null);
  } catch {
    return null;
  }
}

/**
 * 로그인한 회원의 프로필을 읽습니다. 로그인하지 않았거나 읽지 못하면 null.
 * `allowPreviewMember` 는 미리보기(테스트 모드)에서만 true 로 넘깁니다.
 */
export async function loadMemberProfile(opts: { allowPreviewMember?: boolean } = {}): Promise<MemberProfile | null> {
  if (opts.allowPreviewMember) {
    const fake = readPreviewMember();
    if (fake) return fake;
  }
  if (!(await hasStoredLogin())) return null;
  try {
    const [{ auth, db }, { doc, getDoc }] = await Promise.all([import('./firebase'), import('./firestoreApi')]);
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      return profileFromUserDoc(snap.exists() ? (snap.data() as Record<string, unknown>) : null, user);
    } catch (err) {
      console.error('회원 정보를 불러오지 못했습니다.', err);
      return profileFromUserDoc(null, user);
    }
  } catch (err) {
    console.error('로그인 정보를 확인하지 못했습니다.', err);
    return null;
  }
}
