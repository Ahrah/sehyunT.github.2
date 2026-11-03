import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, Download } from 'lucide-react';
import { AdminStatsCards, useGaStats } from './AdminGaStats';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  startAfter,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MEMBER_CSV_HEADERS, formatKstMinute, memberCsvRows, sortOptedIn, toCsv } from '../lib/adminMembers';
import {
  CAREER_COUNSELING_COLLECTION,
  careerCounselingStatusLabel,
  formatKstDateTime,
  formatPreferredSlots,
  nextCareerCounselingStatus,
} from '../lib/careerCounseling';

interface UserData {
  email: string;
  childName: string;
  phone: string;
  interestService: string;
  createdAt: any;
  /** 새 글 알림(주간 메일) 동의. 가입할 때 고릅니다(AuthModal). */
  emailWeeklyOptIn?: boolean;
  emailWeeklyOptInAt?: any;
}

/** 전체 회원 목록은 가입 최신순으로 50명씩 읽고 '더 보기'로 이어 읽습니다. */
const PAGE_SIZE = 50;

interface CareerApplicationRow {
  id: string;
  childName: string;
  email: string;
  phone: string;
  schoolName: string;
  schoolRegion: string;
  grade: string;
  careerGoal: string;
  question: string;
  preferredSlots: { date?: string; time?: string }[];
  status: string;
  notifyFailed: boolean;
  createdAt: any;
}

function applicationTime(value: any): string {
  if (value?.toDate) return formatKstDateTime(value.toDate());
  return '시각 없음';
}

function applicationMillis(value: any): number {
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  return 0;
}

export const AdminDashboard = ({ onBack }: { onBack: () => void }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<CareerApplicationRow[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // '동의한 회원만 보기': 50명 제한 없이 동의한 회원 전체를 따로 읽습니다.
  const [optInOnly, setOptInOnly] = useState(false);
  const [optInUsers, setOptInUsers] = useState<UserData[] | null>(null);
  const [optInLoading, setOptInLoading] = useState(false);
  const [listError, setListError] = useState('');

  const fetchPage = useCallback(async (after: QueryDocumentSnapshot | null) => {
    const base = collection(db, 'users');
    const q = after
      ? query(base, orderBy('createdAt', 'desc'), startAfter(after), limit(PAGE_SIZE))
      : query(base, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    const snap = await getDocs(q);
    const page = snap.docs.map((d) => d.data() as UserData);
    setUsers((prev) => (after ? [...prev, ...page] : page));
    setCursor(snap.docs.length ? snap.docs[snap.docs.length - 1] : after);
    setHasMore(snap.docs.length === PAGE_SIZE);
  }, []);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(cursor);
    } catch (err) {
      console.error("Error fetching more users:", err);
      setListError('회원 목록을 더 불러오지 못했습니다.');
    } finally {
      setLoadingMore(false);
    }
  };

  // 동의자는 단일 필드 조건(where)만 써서 자동 색인으로 읽습니다. 정렬은 화면에서 합니다(복합 색인 불필요).
  const loadOptIn = useCallback(async () => {
    setOptInLoading(true);
    setListError('');
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('emailWeeklyOptIn', '==', true)));
      setOptInUsers(sortOptedIn(snap.docs.map((d) => d.data() as UserData)) as UserData[]);
    } catch (err) {
      console.error("Error fetching opt-in users:", err);
      setListError('알림에 동의한 회원을 불러오지 못했습니다.');
    } finally {
      setOptInLoading(false);
    }
  }, []);

  const toggleOptIn = (on: boolean) => {
    setOptInOnly(on);
    if (on && optInUsers == null && !optInLoading) void loadOptIn();
  };

  const shown: UserData[] = optInOnly ? optInUsers ?? [] : users;
  const shownLoading = optInOnly ? optInLoading || optInUsers == null : loading;

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchUsers = async () => {
      try {
        await fetchPage(null);
      } catch (err) {
        console.error("Error fetching users:", err);
        setListError('회원 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    const fetchApplications = async () => {
      try {
        let fetched: CareerApplicationRow[] = [];
        const mapSnap = (snap: { id: string; data: () => any }) => {
          const data = snap.data();
          fetched.push({
            id: snap.id,
            childName: data.childName || '',
            email: data.email || '',
            phone: data.phone || '',
            schoolName: data.schoolName || '',
            schoolRegion: data.schoolRegion || '',
            grade: data.grade || '',
            careerGoal: data.careerGoal || '',
            question: data.question || '',
            preferredSlots: Array.isArray(data.preferredSlots) ? data.preferredSlots : [],
            status: data.status || 'submitted',
            notifyFailed: data.notifyFailed === true,
            createdAt: data.createdAt ?? null,
          });
        };
        try {
          const q = query(collection(db, CAREER_COUNSELING_COLLECTION), orderBy('createdAt', 'desc'), limit(200));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((snap) => mapSnap(snap));
        } catch (orderErr) {
          console.warn('진로 컨설팅 신청 정렬 조회에 실패해 받은 뒤 정렬합니다.', orderErr);
          fetched = [];
          const querySnapshot = await getDocs(collection(db, CAREER_COUNSELING_COLLECTION));
          querySnapshot.forEach((snap) => mapSnap(snap));
          fetched.sort((a, b) => applicationMillis(b.createdAt) - applicationMillis(a.createdAt));
          fetched = fetched.slice(0, 200);
        }
        setApplications(fetched);
        setApplicationsError(null);
      } catch (err) {
        console.error('진로 컨설팅 신청 목록을 불러오지 못했어요.', err);
        setApplicationsError('신청 목록을 불러오지 못했어요. 관리자 계정인지, Firestore 규칙이 배포됐는지 확인해 주세요.');
      } finally {
        setApplicationsLoading(false);
      }
    };

    fetchUsers();
    fetchApplications();
  }, []);

  const toggleApplicationStatus = async (row: CareerApplicationRow) => {
    const next = nextCareerCounselingStatus(row.status);
    setStatusSavingId(row.id);
    try {
      await updateDoc(doc(db, CAREER_COUNSELING_COLLECTION, row.id), {
        status: next,
        updatedAt: serverTimestamp(),
      });
      setApplications((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: next } : item)));
    } catch (err) {
      console.error(err);
      alert('상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleExportCSV = () => {
    if (shown.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }
    // 지금 보고 있는 목록(동의자만 보기면 동의자 전체, 아니면 불러온 회원)을 내려받습니다.
    const csvContent = toCsv(MEMBER_CSV_HEADERS, memberCsvRows(shown));
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sehyunt_users${optInOnly ? '_optin' : ''}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const gaStats = useGaStats();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] w-full h-full bg-brand-bg md:py-20 py-10 px-6 overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-gray hover:text-brand-text mb-6 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="text-brand-accent" size={24} />
              <h1 className="text-5xl font-black uppercase tracking-tighter">Admin Control</h1>
            </div>
            <p className="text-brand-gray text-xs uppercase tracking-widest font-black">실시간 사용자 가입 및 분석 현황</p>
          </div>

          <button 
            onClick={handleExportCSV}
            className="h-14 px-8 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent transition-colors flex items-center gap-3 cursor-pointer"
          >
            <Download size={16} /> Export Data
          </button>
        </div>

        <AdminStatsCards memberCount={users.length} state={gaStats} />

        <div className="bg-brand-secondary border border-brand-light-gray overflow-hidden">
          <div className="p-8 border-b border-brand-light-gray flex flex-wrap gap-4 justify-between items-center">
            <h3 className="font-black uppercase tracking-widest text-sm">{optInOnly ? '새 글 알림에 동의한 회원' : 'Recent Registrations'}</h3>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input type="checkbox" checked={optInOnly} onChange={(e) => toggleOptIn(e.target.checked)} className="w-4 h-4" />
                동의한 회원만 보기
              </label>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-gray">
                {optInOnly ? (optInUsers ? `동의 ${optInUsers.length}명(전체)` : '불러오는 중') : `${users.length} Records found`}
              </span>
            </div>
          </div>
          {listError && <p className="px-8 pt-4 text-xs font-bold text-red-600">{listError}</p>}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-light-gray bg-brand-bg/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-gray">Member (Child)</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-gray">Contact (Email/Phone)</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-gray">Interest Service</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-gray">Joined Date</th>
                  <th className="p-6 text-[10px] font-black tracking-widest text-brand-gray">새 글 알림 동의</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-gray">
                {shownLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="p-6 h-16 bg-brand-bg/20"></td>
                    </tr>
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-brand-gray font-black uppercase tracking-widest text-xs">
                      {optInOnly ? '새 글 알림에 동의한 회원이 아직 없습니다.' : 'No users found yet.'}
                    </td>
                  </tr>
                ) : (
                  shown.map((u, i) => (
                    <tr key={i} className="hover:bg-brand-bg transition-colors group">
                      <td className="p-6">
                        <p className="font-black text-sm">{u.childName}</p>
                        <p className="text-[10px] text-brand-accent uppercase font-bold tracking-widest">Premium Member</p>
                      </td>
                      <td className="p-6">
                        <p className="text-xs font-bold">{u.email}</p>
                        <p className="text-[10px] text-brand-gray">{u.phone}</p>
                      </td>
                      <td className="p-6">
                        <span className="inline-block px-3 py-1 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-wider">{u.interestService}</span>
                      </td>
                      <td className="p-6 text-brand-gray text-xs">
                        {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-6 text-xs">
                        {u.emailWeeklyOptIn === true ? (
                          <>
                            <span className="inline-block px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black">동의</span>
                            <p className="text-[10px] text-brand-gray mt-1">{formatKstMinute(u.emailWeeklyOptInAt) || '동의 시각 없음'}</p>
                          </>
                        ) : (
                          <span className="text-brand-gray">미동의</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!optInOnly && hasMore && !loading && (
            <div className="p-6 border-t border-brand-light-gray text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="h-10 px-6 border border-brand-text text-xs font-black hover:bg-brand-text hover:text-brand-bg transition-colors disabled:opacity-50"
              >
                {loadingMore ? '불러오는 중…' : `회원 ${PAGE_SIZE}명 더 보기`}
              </button>
            </div>
          )}
        </div>

        <div className="bg-brand-secondary border border-brand-light-gray overflow-hidden mt-12">
          <div className="p-8 border-b border-brand-light-gray flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h3 className="font-black tracking-widest text-sm">진로 컨설팅 신청</h3>
              <p className="mt-2 text-[10px] font-bold text-brand-gray">최신 신청이 위에 보여요. 상태를 누르면 신규와 연락함으로 바뀌어요.</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-gray">{applications.length}건</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-light-gray bg-brand-bg/50">
                  <th className="p-6 text-[10px] font-black tracking-widest text-brand-gray">신청 시각 (KST)</th>
                  <th className="p-6 text-[10px] font-black tracking-widest text-brand-gray">학생 이름</th>
                  <th className="p-6 text-[10px] font-black tracking-widest text-brand-gray">학년 · 학교</th>
                  <th className="p-6 text-[10px] font-black tracking-widest text-brand-gray">연락처</th>
                  <th className="p-6 text-[10px] font-black tracking-widest text-brand-gray">희망 일정</th>
                  <th className="p-6 text-[10px] font-black tracking-widest text-brand-gray">관심 · 메시지</th>
                  <th className="p-6 text-[10px] font-black tracking-widest text-brand-gray">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-gray">
                {applicationsLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="p-6 h-16 bg-brand-bg/20"></td>
                    </tr>
                  ))
                ) : applicationsError ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-brand-gray font-bold text-xs">{applicationsError}</td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-brand-gray font-bold text-xs">아직 접수된 신청이 없어요.</td>
                  </tr>
                ) : (
                  applications.map((row) => {
                    const contacted = row.status === 'contacted';
                    const saving = statusSavingId === row.id;
                    return (
                      <tr key={row.id} className="hover:bg-brand-bg transition-colors align-top">
                        <td className="p-6 text-brand-gray text-xs whitespace-nowrap">{applicationTime(row.createdAt)}</td>
                        <td className="p-6">
                          <p className="font-black text-sm">{row.childName || '이름 없음'}</p>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-bold">{row.grade || '학년 없음'} · {row.schoolName || '학교 없음'}</p>
                          <p className="text-[10px] text-brand-gray">{row.schoolRegion}</p>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-bold">{row.phone || '번호 없음'}</p>
                          <p className="text-[10px] text-brand-gray">{row.email}</p>
                        </td>
                        <td className="p-6 text-xs whitespace-pre-line">{formatPreferredSlots(row.preferredSlots)}</td>
                        <td className="p-6 max-w-xs">
                          <p className="text-xs font-bold">{row.careerGoal || '희망 진로 없음'}</p>
                          {row.question ? <p className="mt-2 text-[10px] text-brand-gray whitespace-pre-wrap">{row.question}</p> : null}
                        </td>
                        <td className="p-6">
                          <button
                            type="button"
                            onClick={() => void toggleApplicationStatus(row)}
                            disabled={saving}
                            aria-label={contacted ? '상태를 신규로 바꾸기' : '상태를 연락함으로 바꾸기'}
                            className={`px-3 py-1 text-[10px] font-black tracking-wider cursor-pointer disabled:opacity-50 ${
                              contacted
                                ? 'bg-brand-secondary text-brand-text border border-brand-light-gray'
                                : 'bg-brand-text text-brand-bg'
                            }`}
                          >
                            {saving ? '저장 중' : careerCounselingStatusLabel(row.status)}
                          </button>
                          {row.notifyFailed ? (
                            <span className="mt-2 inline-block bg-brand-accent px-2 py-1 text-[10px] font-black tracking-wider text-white">메일 실패</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
