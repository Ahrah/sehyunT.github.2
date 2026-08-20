import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import { X, User, Phone, Sparkles, Mail, Lock, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const profileSchema = z.object({
  childName: z.string().min(1, "이름을 입력해주세요."),
  phone: z.string().min(10, "올바른 휴대폰 번호를 입력해주세요."),
  interestService: z.string().min(1, "관심 서비스를 선택해주세요."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface MyPageProps {
  onClose: () => void;
}

export const MyPage = ({ onClose }: MyPageProps) => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showDirectChange, setShowDirectChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema)
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          reset({
            childName: data.childName || '',
            phone: data.phone || '',
            interestService: data.interestService || ''
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [reset, auth.currentUser]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!auth.currentUser) return;
    setUpdating(true);
    setMessage(null);

    try {
      // Update Firebase Auth Profile
      await updateProfile(auth.currentUser, {
        displayName: data.childName
      });

      // Update Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        childName: data.childName,
        phone: data.phone,
        interestService: data.interestService,
        updatedAt: new Date()
      });

      setMessage({ type: 'success', text: '프로필 정보가 성공적으로 수정되었습니다.' });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: '오류가 발생했습니다: ' + (error.message || '다시 시도해주세요.') });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!auth.currentUser?.email) return;
    setUpdating(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetSent(true);
      setMessage({ type: 'success', text: '비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.' });
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      setMessage({ type: 'error', text: '이메일 발송 실패: ' + (error.message || '다시 시도해주세요.') });
    } finally {
      setUpdating(false);
    }
  };

  const handleDirectPasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !auth.currentUser.email) return;

    if (!currentPassword) {
      setMessage({ type: 'error', text: '현재 비밀번호를 입력해주세요.' });
      return;
    }

    if (newPassword.length < 8 || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      setMessage({ type: 'error', text: '새 비밀번호는 8자 이상이며, 숫자와 특수문자를 각각 최소 1개 이상 포함해야 합니다.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.' });
      return;
    }

    setPasswordUpdating(true);
    setMessage(null);

    try {
      // Re-authenticate user first using current password
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowDirectChange(false);
    } catch (error: any) {
      console.error("Error updating password directly:", error);
      let errorMsg = '비밀번호 변경 중 오류가 발생했습니다.';
      if (error.code === 'auth/wrong-password') {
        errorMsg = '현재 비밀번호가 일치하지 않습니다.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMsg = '보안을 위해 다시 로그인한 뒤 시도해주세요.';
      } else {
        errorMsg = error.message || errorMsg;
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setPasswordUpdating(false);
    }
  };

  const services = [
    "진로 컨설팅",
    "고등학교 입학 전략",
    "1:1 자기주도학습",
    "그룹 자기주도학습",
    "특목·자사고 입시",
    "생기부·대입 컨설팅"
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-brand-text/95 backdrop-blur-md">
        <div className="text-brand-bg font-black uppercase tracking-widest animate-pulse">Loading Profile...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-brand-text/95 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-brand-bg w-full max-w-lg max-h-[90vh] overflow-y-auto relative shadow-2xl p-8 md:p-12"
      >
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 hover:bg-brand-secondary transition-colors"
        >
          <X size={24} />
        </button>

        <div className="mb-10">
          <div className="flex h-10 w-10 items-center justify-center bg-brand-text text-brand-bg font-black text-sm mb-6">MY</div>
          <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">My Profile</h2>
          <p className="text-brand-gray text-[10px] uppercase tracking-widest font-black">
            정보 수정을 통해 더 정확한 컨설팅을 받아보세요.
          </p>
        </div>

        {message && (
          <div className={`mb-8 p-4 flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <div className="space-y-10">
          {/* Account Info (Read-only) */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-brand-accent">Account Info</h3>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray/40" size={18} />
              <input
                value={auth.currentUser?.email || ''}
                disabled
                className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold text-brand-gray/60 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Profile Edit Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-brand-accent">Modify Profile</h3>
            
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                <input
                  {...register("childName")}
                  placeholder="자녀 이름"
                  className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                />
                {errors.childName && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.childName.message}</p>}
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                <input
                  {...register("phone")}
                  placeholder="휴대폰 번호 (- 제외)"
                  className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                />
                {errors.phone && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.phone.message}</p>}
              </div>

              <div className="relative">
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                <select
                  {...register("interestService")}
                  className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors appearance-none"
                >
                  <option value="">관심 서비스 선택</option>
                  {services.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.interestService && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.interestService.message}</p>}
              </div>
            </div>

            <button
              disabled={updating || !isDirty}
              className="w-full bg-brand-text text-brand-bg h-16 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-brand-accent transition-colors disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Save Changes'}
              <ChevronRight size={18} />
            </button>
          </form>

          {/* Security Section */}
          <div className="pt-8 border-t border-brand-light-gray space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-brand-accent">Security</h3>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowDirectChange(!showDirectChange);
                  setMessage(null);
                }}
                className={`flex-1 border border-brand-text h-14 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${
                  showDirectChange 
                    ? 'bg-brand-text text-brand-bg' 
                    : 'text-brand-text hover:bg-brand-text hover:text-brand-bg'
                }`}
              >
                <Lock size={14} />
                {showDirectChange ? 'Cancel Direct Change' : 'Direct Password Change'}
              </button>

              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={updating || resetSent}
                className="flex-1 border border-brand-text text-brand-text h-14 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-brand-text hover:text-brand-bg transition-all disabled:opacity-50"
              >
                <Mail size={14} />
                {resetSent ? 'Re-link Sent' : 'Reset via Email'}
              </button>
            </div>

            {showDirectChange && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleDirectPasswordChange}
                className="space-y-4 pt-4 border-t border-brand-light-gray overflow-hidden"
              >
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호 (본인 확인용)"
                    required
                    className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 (8자 이상, 숫자+특수문자)"
                    required
                    className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 확인"
                    required
                    className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="w-full bg-brand-text text-brand-bg h-14 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-brand-accent transition-colors disabled:opacity-50"
                >
                  {passwordUpdating ? 'Updating Password...' : 'Update Password Now'}
                </button>
              </motion.form>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
