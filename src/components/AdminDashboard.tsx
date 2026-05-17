import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Clock, MousePointer2, ArrowLeft, ShieldCheck, Download } from 'lucide-react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserData {
  email: string;
  childName: string;
  phone: string;
  interestService: string;
  createdAt: any;
}

export const AdminDashboard = ({ onBack }: { onBack: () => void }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetchUsers();
  }, []);

  const stats = [
    { label: "Total Members", value: users.length.toString(), icon: Users, color: "text-blue-500" },
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

          <button className="h-14 px-8 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent transition-colors flex items-center gap-3">
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
      </div>
    </motion.div>
  );
};
