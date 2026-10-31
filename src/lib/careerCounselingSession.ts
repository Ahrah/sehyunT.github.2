import type { User as FirebaseUser } from 'firebase/auth';
import { CAREER_COUNSELING_COLLECTION, formatPhone } from './careerCounseling';
import type { CareerCounselingNotifyInput } from './careerCounselingNotify';

export type CareerAuthProfile = { childName: string; phone: string };
export type CareerAuthListener = (user: FirebaseUser | null, profile: CareerAuthProfile) => void;

let watchers = new Set<CareerAuthListener>();
let last: { user: FirebaseUser | null; profile: CareerAuthProfile } | null = null;
let started: Promise<void> | null = null;
let unsubAuth: (() => void) | undefined;

export function watchCareerAuth(listener: CareerAuthListener): () => void {
  watchers.add(listener);
  if (last) listener(last.user, last.profile);
  return () => {
    watchers.delete(listener);
  };
}

export function ensureCareerAuth(): Promise<void> {
  if (started) return started;
  started = (async () => {
    const [{ auth, db }, { onAuthStateChanged }, { doc, getDoc }] = await Promise.all([
      import('./firebase'),
      import('firebase/auth'),
      import('./firestoreApi'),
    ]);
    unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        last = { user: null, profile: { childName: '', phone: '' } };
        watchers.forEach((listener) => listener(last!.user, last!.profile));
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        const data = snap.exists() ? snap.data() : {};
        last = {
          user: currentUser,
          profile: {
            childName: (data.childName as string) || currentUser.displayName || '',
            phone: formatPhone((data.phone as string) || ''),
          },
        };
      } catch (err) {
        console.error(err);
        last = {
          user: currentUser,
          profile: {
            childName: currentUser.displayName || '',
            phone: '',
          },
        };
      }
      watchers.forEach((listener) => listener(last!.user, last!.profile));
    });
  })();
  return started;
}

export async function signOutCareer() {
  const [{ auth }, { signOut }] = await Promise.all([
    import('./firebase'),
    import('firebase/auth'),
  ]);
  await signOut(auth);
}

export async function submitCareerApplication(record: CareerCounselingNotifyInput) {
  await ensureCareerAuth();
  const [{ db }, { addDoc, collection, doc, serverTimestamp, updateDoc }] = await Promise.all([
    import('./firebase'),
    import('./firestoreApi'),
  ]);
  const created = await addDoc(collection(db, CAREER_COUNSELING_COLLECTION), {
    ...record,
    createdAt: serverTimestamp(),
  });
  try {
    const { notifyCareerCounselingApplication } = await import('./careerCounselingNotify');
    await notifyCareerCounselingApplication(created.id);
  } catch (err) {
    // 신청 저장은 성공으로 둔다. 메일만 실패하면 관리자 목록에서 보이도록 표시한다.
    console.error('진로 컨설팅 알림 메일을 보내지 못했어요. 신청 저장은 유지됩니다.', err);
    try {
      await updateDoc(doc(db, CAREER_COUNSELING_COLLECTION, created.id), { notifyFailed: true });
    } catch (markErr) {
      console.error('알림 실패 표시를 저장하지 못했어요.', markErr);
    }
  }
}

export function stopCareerAuth() {
  unsubAuth?.();
  unsubAuth = undefined;
  started = null;
  last = null;
  watchers = new Set();
}
