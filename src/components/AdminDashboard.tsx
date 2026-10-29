import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Clock, MousePointer2, ArrowLeft, ShieldCheck, Download } from 'lucide-react';
import { collection, query, getDocs, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
}

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

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        const fetchedUsers: UserData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push(doc.data() as UserData);
        });
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
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
    if (users.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }
    
    // CSV Headers
    const headers = ["아이디(순번)", "자녀이름", "이메일(아이디)", "연락처", "관심서비스", "가입일"];
    
    // CSV Rows
    const rows = users.map((u, i) => [
      (users.length - i).toString(),
      u.childName || '',
      u.email || '',
      u.phone || '',
      u.interestService || '',
      u.createdAt?.toDate ? u.createdAt.toDate().toLocaleString() : 'N/A'
    ]);
    
    // UTF-8 BOM for Excel compatibility with Korean characters
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sehyunt_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = [
    { label: "Total Members", value: users.length.toString(), icon: Users, color: "text-brand-accent" },
    { label: "Avg. Session", value: "8m 42s", icon: Clock, color: "text-emerald-500" },
    { label: "Daily Visits", value: "124", icon: MousePointer2, color: "text-amber-500" },
  ];

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-brand-secondary border border-brand-light-gray p-8 flex flex-col justify-between h-48 group hover:border-brand-text transition-all">
              <div className="flex justify-between items-start">
                <stat.icon className={stat.color} size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-gray">Status: Active</span>
              </div>
              <div>
                <p className="text-4xl font-black mb-1">{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-gray">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-brand-secondary border border-brand-light-gray overflow-hidden">
          <div className="p-8 border-b border-brand-light-gray flex justify-between items-center">
            <h3 className="font-black uppercase tracking-widest text-sm">Recent Registrations</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-gray">{users.length} Records found</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-light-gray bg-brand-bg/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-gray">Member (Child)</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-gray">Contact (Email/Phone)</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-gray">Interest Service</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-gray">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-gray">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="p-6 h-16 bg-brand-bg/20"></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-brand-gray font-black uppercase tracking-widest text-xs">No users found yet.</td>
                  </tr>
                ) : (
                  users.map((u, i) => (
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
