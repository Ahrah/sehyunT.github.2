import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, Sparkles, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const authSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .regex(/[0-9]/, "숫자를 포함해야 합니다.")
    .regex(/[^a-zA-Z0-9]/, "특수문자를 포함해야 합니다."),
  isSignUp: z.boolean(),
  childName: z.string().optional(),
  interestService: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => {
  if (data.isSignUp) {
    return !!data.childName && !!data.interestService && !!data.phone;
  }
  return true;
}, {
  message: "필수 정보를 모두 입력해주세요.",
  path: ["childName"], 
});

type AuthFormValues = z.infer<typeof authSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      isSignUp: false,
    }
  });

  const onSubmit = async (data: AuthFormValues) => {
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await updateProfile(userCredential.user, { displayName: data.childName });
        
        // Store extra info in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: data.email,
          childName: data.childName,
          phone: data.phone,
          interestService: data.interestService,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      }
      onClose();
      reset();
    } catch (err: any) {
      console.error(err);
      let message = '오류가 발생했습니다. 다시 시도해주세요.';
      
      const errorCode = (err.code || err.message || "").toLowerCase();
      
      if (errorCode.includes('auth/invalid-credential') || errorCode.includes('auth/wrong-password') || errorCode.includes('auth/user-not-found')) {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (errorCode.includes('auth/email-already-in-use')) {
        message = '이미 사용 중인 이메일입니다.';
      } else if (errorCode.includes('auth/network-request-failed')) {
        message = 'Firebase 연결 실패: 현재 도메인이 Firebase 콘솔의 "승인된 도메인"에 등록되어 있는지 확인해주세요.';
      } else if (errorCode.includes('dummy-key') || errorCode.includes('api key')) {
        message = 'Firebase API Key 설정이 올바르지 않습니다. 환경 변수 입력을 확인해주세요.';
      }
      
      setError(message);
    } finally {
      setLoading(false);
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

  if (!isOpen && !loading) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-brand-text/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="bg-brand-bg w-full max-w-lg max-h-[90vh] overflow-y-auto relative shadow-2xl"
          >
            <div className="sticky top-0 right-0 z-10 flex justify-end p-4 bg-gradient-to-b from-brand-bg to-transparent pointer-events-none">
              <button 
                onClick={onClose}
                className="p-2 bg-brand-bg border border-brand-light-gray hover:bg-brand-secondary transition-colors pointer-events-auto"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 pb-12 pt-4 md:px-12">
              <div className="mb-8">
                <div className="flex h-10 w-10 items-center justify-center bg-brand-text text-brand-bg font-black text-sm mb-6">ST</div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase mb-2">
                  {isSignUp ? 'Member Join' : 'Log In'}
                </h2>
                <p className="text-brand-gray text-[10px] uppercase tracking-widest font-black">
                  {isSignUp ? '맞춤형 입시 전략의 시작' : '다시 오신 것을 환영합니다'}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <input type="hidden" {...register("isSignUp")} value={isSignUp ? "true" : "false"} />
                
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                    <input
                      {...register("email")}
                      placeholder="아이디 (이메일)"
                      className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                    />
                    {errors.email && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.email.message}</p>}
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                    <input
                      {...register("password")}
                      type="password"
                      placeholder="비밀번호 (8자 이상, 숫자+특수문자)"
                      className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                    />
                    {errors.password && <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-widest">{errors.password.message}</p>}
                  </div>

                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 overflow-hidden pt-2"
                    >
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                        <input
                          {...register("childName")}
                          placeholder="자녀 이름"
                          className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                        />
                      </div>

                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={18} />
                        <input
                          {...register("phone")}
                          placeholder="휴대폰 번호 (- 제외)"
                          className="w-full bg-brand-secondary border border-brand-light-gray h-14 pl-12 pr-4 text-sm font-bold focus:border-brand-accent outline-none transition-colors"
                        />
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
                      </div>
                    </motion.div>
                  )}
                </div>

                {error && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest text-center">{error}</p>}

                <button
                  disabled={loading}
                  className="w-full bg-brand-text text-brand-bg h-16 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-brand-accent transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (isSignUp ? 'Join Now' : 'Login Now')}
                  <ChevronRight size={18} />
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    reset();
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-brand-gray hover:text-brand-text transition-colors"
                >
                  {isSignUp ? '이미 회원이신가요? 로그인' : '아직 회원이 아니신가요? 회원가입'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
