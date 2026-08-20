/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, CheckCircle2, GraduationCap, MessageCircle, 
  NotebookPen, Sparkles, Target, Users, BookOpen, 
  Layers, Quote, Mail, Instagram, Menu, X, ArrowUpRight,
  ChevronDown, Award, BookCheck, ExternalLink, Plus, LogOut, User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MyPage } from './components/MyPage';
import { ShieldAlert } from 'lucide-react';
import { GallerySection } from './components/GallerySection';
import { ResourcesSection } from './components/ResourcesSection';
import { LegalModal } from './components/LegalModals';

// --- Types ---
interface Program {
  title: string;
  subtitle: string;
  desc: string;
  content: string;
  features: string[];
  target: string[];
}

const ADMIN_EMAIL = "ahrah0365@gmail.com";

// --- Data ---

const programCategories = [
  {
    id: "career",
    title: "Career & Middle",
    subtitle: "진로 및 고입 전략",
    programs: [
      {
        title: "Career Direction Consulting",
        subtitle: "진로 컨설팅",
        desc: "중학생 시기는 성적 향상을 넘어, 자신의 흥미와 학습 방식을 발견하는 골든타임입니다.",
        content: "단순한 직업 추천이나 적성검사 해석을 넘어 학생의 관심사, 독서 성향, 탐구 방식, 학습 태도를 입체적으로 분석합니다. 장기적으로 지속 가능한 학업 방향을 제안하며, 이는 고등학교 선택과 학생부 로드맵의 기초가 됩니다.",
        features: ["진로 관심사 및 학업 성향 분석", "탐구 분야 확장 방향 제안", "독서 및 활동 로드맵 설계", "고등학교 진학 방향 연결"],
        target: ["진로 방향이 자주 바뀌는 학생", "좋아하는 분야를 찾고 싶은 학생", "학업과 진로의 연결고리가 필요한 학생"]
      },
      {
        title: "Pre-High School Strategy",
        subtitle: "고등학교 입학 전 컨설팅",
        desc: "중3 겨울방학, 고등학교 3년의 성패를 결정짓는 가장 중요한 설계의 시간입니다.",
        content: "진학 예정 학교의 특징과 학업 환경을 분석하여 입학 후의 학생부 운영과 자기주도학습 루틴을 미리 구축합니다. 불필요한 스펙 경쟁 대신 학생의 성향에 맞는 활동 구조를 정립하여 고교 생활의 시행착오를 최소화합니다.",
        features: ["진학 예정 고교별 생활 전략", "학생부 운영 및 세특 구조 이해", "진로 기반 활동 흐름 설계", "과목 선택 및 학업 방향 조언"],
        target: ["상위권 고교 진학 예정 학생", "입학 전 학생부 전략이 필요한 학생", "고등학교 생활에 대한 불안이 있는 학생"]
      }
    ]
  },
  {
    id: "coaching",
    title: "Learning Coaching",
    subtitle: "자기주도학습 솔루션",
    programs: [
      {
        title: "1:1 Self-Directed Coaching",
        subtitle: "1:1 자기주도학습 컨설팅",
        desc: "모두에게 맞는 공부법은 없습니다. 학생의 패턴에 최적화된 공부 엔진을 설계합니다.",
        content: "단순 관리를 넘어 학생이 공부를 미루는 원인, 집중 유지 환경, 목표 달성 기제를 정밀 분석합니다. 티칭이 아닌 코칭 중심으로 운영되며, 진로 관심사와 학업을 연결하여 장기적인 학습 동기를 부여합니다.",
        features: ["개인별 학습 습관 및 실행 구조 분석", "과목별 최적화 공부 방식 제안", "스트레스 및 멘탈 관리 프로그램", "맞춤형 학습 루틴 및 교재 설계"],
        target: ["나만의 공부법을 찾고 싶은 학생", "실행력이 부족해 고민인 학생", "공부 동기와 진로를 연결하고 싶은 학생"]
      },
      {
        title: "Group Learning Program",
        subtitle: "자기주도학습 그룹 프로그램",
        desc: "함께 성장하는 힘. 사고의 교류와 토론을 통해 학습의 깊이를 더하는 훈련입니다.",
        content: "학습 플랜 설계부터 비문학 독해, 정보 구조화 훈련을 동료들과 함께 수행합니다. 자신의 사고 과정을 언어화하고 타인의 관점을 수용하며 사고의 폭을 확장하는 실전 학습 훈련 과정입니다.",
        features: ["실행 가능한 학습 루틴 공동 설계", "비문학 및 원서 기반 논리 독해 훈련", "토론을 통한 활동 기록 및 표현 훈련", "면접 대비 사고 구조화 연습"],
        target: ["혼자서는 방향 유지가 힘든 학생", "독해력과 사고력을 키우고 싶은 학생", "표현 능력과 활동 기록력을 높이고 싶은 학생"]
      }
    ]
  },
  {
    id: "prep",
    title: "Specialized Prep",
    subtitle: "특목·자사고 입시",
    programs: [
      {
        title: "Admissions Consulting",
        subtitle: "자기소개서 집중 컨설팅",
        desc: "나의 경험이 학교의 인재상과 만나는 지점. 설득력 있는 서사를 설계합니다.",
        content: "단순 첨삭을 넘어 학생의 모든 활동과 경험을 재해석합니다. 핵심 메시지를 도출하고 문항별 스토리라인을 구성하며, 최종적으로 면접과의 연결성까지 고려한 완성도 높은 서사를 만듭니다.",
        features: ["자기소개서 핵심 스토리라인 설계", "개별 경험 큐레이션 및 연결", "학교별 강조 포인트 심층 분석", "면접 연계용 질문 리스트 추출"],
        target: ["특목·자사고 지원 예정 학생", "경험은 많으나 정리가 안 되는 학생", "나만의 차별화된 서사가 필요한 학생"]
      },
      {
        title: "Interview Coaching",
        subtitle: "특목·자사고 면접 대비",
        desc: "암기가 아닌 사고력을 증명하는 시간. 실전보다 더 실전 같은 훈련입니다.",
        content: "학교별 면접 유형을 분석하고 예상 질문에 대한 구조적 답변 능력을 키웁니다. 특히 면접 태도와 전달력까지 코칭하여 학생이 자신의 경험을 스스로 설명할 수 있도록 훈련합니다.",
        features: ["3:1 실전 모의면접 시스템 운영", "답변 구조 설계 및 전달력 코칭", "실전 답변 피드백 및 태도 교정", "학생부 기반 압박 면접 시뮬레이션"],
        target: ["실전 면접 경험이 부족한 학생", "논리적인 말하기가 어려운 학생", "경험의 진정성을 입증하고 싶은 학생"]
      },
      {
        title: "Common Quest Program",
        subtitle: "특목·자사고 공통문항 특강",
        desc: "면접의 변별력을 만드는 핵심, 공통문항에 대한 논리적 답변 프레임을 구축합니다.",
        content: "반복 등장하는 핵심 질문들의 논리를 해부합니다. 답변 자체를 외우는 것이 아니라, 어떤 질문이 나와도 학생의 경험과 사고를 구조화해 전달할 수 있는 사고 프레임을 훈련합니다.",
        features: ["공통문항 기출 분석 및 유형별 대응", "답변 프레임 설계 및 논리 전개 연습", "실전 답변 훈련 및 즉각 피드백", "발표 및 메시지 전달력 강화"],
        target: ["공통문항 답변에 두려움이 있는 학생", "사고 과정을 언어화하기 힘든 학생", "실전에서 당황하지 않는 힘을 키울 학생"]
      }
    ]
  },
  {
    id: "high",
    title: "Student Record",
    subtitle: "고등학교 생기부·대입",
    programs: [
      {
        title: "Student Record Strategy",
        subtitle: "학기별 생기부 통합 컨설팅",
        desc: "학생부는 숫자가 아닌 '연결'입니다. 세특과 탐구활동을 하나의 방향으로 엮습니다.",
        content: "한 학기 동안의 진로 관심사와 학업 흐름을 기반으로 세특, 탐구활동, 발표, 독서가 유기적으로 이어지도록 설계합니다. 대학이 매력을 느낄 수 있는 장기적인 성장 흐름을 만듭니다.",
        features: ["학기별 학생부 스토리라인 설계", "심화 세특 및 탐구활동 주제 기획", "교과-진로 연결 실전 활동 설계", "발표 및 보고서 방향성 가이드"],
        target: ["학생부종합전형을 준비하는 고등학생", "활동 간의 연결성이 부족해 고민인 학생", "심도 있는 세특 기록을 원하는 학생"]
      },
      {
        title: "Performance & Statement",
        subtitle: "수행평가·생기부 상시 컨설팅",
        desc: "단순 결과 요약이 아닌, 학생의 사고 과정이 드러나는 질 높은 기록을 만듭니다.",
        content: "수행평가와 수시 활동 내용을 단순 정리가 아닌 학생의 탐구 방향과 사고 흐름이 드러나도록 구체화합니다. 발표 및 보고서 작성을 위한 논리 구조와 최종 세특 기재 포인트까지 조력합니다.",
        features: ["수행평가 주제 구체화 및 방향 설계", "탐구 내용 구조화 및 논리 보완", "보고서 초안 피드백 및 정교화", "생기부 기재용 활동 요약 지원"],
        target: ["수행평가 주제 선정이 어려운 학생", "탐구 과정을 논리적으로 정리하고 싶은 학생", "실질적인 생기부 기록의 질을 높일 학생"]
      },
      {
        title: "Early Admissions Strategy",
        subtitle: "대학 수시 지원 전략",
        desc: "가장 유리한 싸움을 위한 필승의 조합. 데이터와 서사를 결합한 최종 전략.",
        content: "내신 성적과 생기부의 흐름, 면접 가능성을 종합하여 최적의 지원 조합을 제안합니다. 전형별 적합도를 검토하고 합격 가능성과 리스크를 철저히 분석하여 필승의 지원 카드를 설계합니다.",
        features: ["학생부 정성 평가 기반 대학 라인 제안", "수시 전형별 적합도 및 경쟁력 분석", "최종 지원 학과 및 조합 시뮬레이션", "합격 가능성 및 리스크 정밀 진단"],
        target: ["수시 지원을 앞둔 고3 및 수험생", "내 생기부로 어느 대학이 가능할지 궁금한 분", "전략적인 상향 지원 조합을 찾는 분"]
      }
    ]
  }
];

const processSteps = [
  { num: "01", title: "심층 진단", desc: "다각도 심층 진단을 통한 학생의 현재 위치와 잠재력을 파악합니다." },
  { num: "02", title: "약점 분석", desc: "기존 학생부 기록과 학습 패턴의 강약점을 분석하고 보완 지점을 도출합니다." },
  { num: "03", title: "로드맵 수립", desc: "목표 전형에 최적화된 장기적인 성장 로드맵과 입시 전략을 수립합니다." },
  { num: "04", title: "결과물 기획", desc: "핵심 탐구 활동과 세특, 면접으로 이어지는 구체적인 결과물을 기획합니다." },
  { num: "05", title: "정교화", desc: "실행 과정을 밀착 검토하고, 학생만의 고유한 언어로 서사를 고도화합니다." },
  { num: "06", title: "최종 검증", desc: "기록과 면접의 일관성을 확보하고 경쟁력을 극대화하는 최종 점검을 마칩니다." },
];

const compareTable = [
  ["단기 합격 중심", "장기 성장 중심"],
  ["획일적 전략", "학생 맞춤형 전략"],
  ["스펙 나열", "스토리·연결성 중심"],
  ["단순 관리", "자기주도학습·멘탈 관리"],
  ["결과 중심", "사고력·동기까지 관리"],
];

const studentCases = [
  {
    title: "방향이 없던 중학생",
    text: "관심사와 학습 습관을 재정리해 지원 학교와 자기소개서의 중심축을 설정했습니다.",
    tag: "고입 전략",
  },
  {
    title: "활동은 많지만 연결성이 약한 고등학생",
    text: "세특과 탐구활동을 진로 질문 중심으로 재배치해 학생부의 일관성을 강화했습니다.",
    tag: "학생부 설계",
  },
  {
    title: "계획을 세워도 유지가 어려운 학생",
    text: "스트레스 반응과 동기 유형을 분석해 실행 가능한 학습 루틴으로 조정했습니다.",
    tag: "자기주도학습",
  },
];

const analysisAxes = [
  {
    id: "01",
    title: "Learning Pattern Analysis",
    subtitle: "학습 패턴 분석",
    desc: "단순한 노력을 넘어, 계획 위반의 원인과 집중력 저하 지점을 정밀 분석하여 학생에게 최적화된 학습 루틴을 제안합니다."
  },
  {
    id: "02",
    title: "Growth Narrative Design",
    subtitle: "성장 서사 설계",
    desc: "파편화된 활동들을 하나의 일관된 맥락으로 연결하여, 깊이 있는 학업 역량과 학생만의 성장 잠재력을 증명합니다."
  },
  {
    id: "03",
    title: "Student Identity Mapping",
    subtitle: "학생 정체성 매핑",
    desc: "강요된 진로가 아닌, 학생 본연의 호기심과 몰입의 대상을 발견하여 흔들리지 않는 진정성 있는 정체성을 구축합니다."
  },
  {
    id: "04",
    title: "Integrated Strategy Planning",
    subtitle: "통합 전략 설계",
    desc: "생기부의 모든 항목과 면접 답변이 유기적으로 결합되어, 대학과 고교가 원하는 인재상에 완벽히 부합하도록 가이드합니다."
  }
];

const freeOfferings = [
  {
    title: "학부모 설명회",
    desc: "변화하는 입시 트렌드와 성공적인 학생부 전략, 자기주도학습의 핵심 원리를 명쾌하게 짚어드리는 학부모 전용 세션입니다.",
    tags: ["입시 인사이트", "전략 가이드"],
    message: "현재 예정된 학부모 설명회가 없습니다."
  },
  {
    title: "자기주도학습 진단",
    desc: "단순 성적표 너머의 학습 태도와 회복 탄력성을 진단하여, 학생에게 가장 최적화된 공부 엔진을 찾아드립니다.",
    tags: ["심리-학습 매칭", "엔진 진단"],
    message: "현재 해당 이벤트는 마감되었습니다."
  },
  {
    title: "학생부 전략 리포트",
    desc: "현재 학생부의 경쟁력을 객관적으로 진단하고, 목표 대학 합격을 위해 반드시 보완해야 할 전략적 포인트를 체크합니다.",
    tags: ["생기부 진단", "합격 가능성"],
    message: "현재 해당 이벤트는 마감되었습니다."
  }
];

const blogs = [
  { name: "입시 전략 인사이트", url: "https://blog.naver.com/ahrahsehyun", icon: "N" },
  { name: "논리·시사 탐구 기록", url: "https://sehyunt-logic.tistory.com/", icon: "T" },
  { name: "실전 면접 아카이브", url: "https://sehyunt-study.tistory.com/", icon: "S" }
];

// --- Inlined UI Components ---

const Card = ({ children, className = "", ...props }: { children: ReactNode; className?: string; [key: string]: any }) => (
  <div {...props} className={`border border-brand-light-gray bg-white transition-all duration-500 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, className = "", variant = "primary" }: { children: ReactNode; className?: string; variant?: "primary" | "outline" | "ghost" }) => {
  const base = "inline-flex items-center justify-center font-bold transition-all duration-500 px-8 py-4 text-xs tracking-[0.2em] uppercase";
  const variants = {
    primary: "bg-brand-text text-brand-bg hover:bg-brand-accent",
    outline: "border border-brand-text text-brand-text hover:bg-brand-text hover:text-brand-bg",
    ghost: "text-brand-text hover:bg-brand-secondary"
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- Animations ---

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

// --- Views ---

const Navbar = ({ onOpenAuth, user, onOpenAdmin, onOpenMyPage }: { onOpenAuth: () => void, user: FirebaseUser | null, onOpenAdmin: () => void, onOpenMyPage: () => void }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-brand-bg/95 backdrop-blur-xl border-b border-brand-light-gray py-4' : 'bg-transparent py-8'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="#" className="group flex items-center gap-4">
          <div className="flex h-12 w-auto items-center justify-center font-black text-xl tracking-tighter">
            <img 
              src="/logo-pic.png" 
              alt="SEHYUNT" 
              className="h-full w-auto object-contain" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement!;
                parent.classList.add('bg-brand-text', 'text-brand-bg', 'w-12');
                parent.innerHTML = 'ST';
              }} 
            />
          </div>
          <div>
            <div className="font-extrabold text-2xl tracking-tighter text-brand-text">SEH-YUN T</div>
            <div className="text-[9px] uppercase tracking-[0.4em] font-black text-brand-accent">Admissions Lab</div>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-12">
          {['About', 'Programs', 'Gallery', 'Resources', 'Contact'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text/40 hover:text-brand-accent transition-colors">
              {item}
            </a>
          ))}
          
          <div className="flex items-center gap-6 pl-6 border-l border-brand-light-gray">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={onOpenMyPage}
                  className="flex items-center gap-2 hover:text-brand-accent transition-colors"
                >
                  {isAdmin ? <ShieldAlert size={14} className="text-brand-accent animate-pulse" /> : <UserIcon size={14} className="text-brand-accent" />}
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">{user.displayName || user.email?.split('@')[0]}님</span>
                </button>
                {isAdmin && (
                  <button 
                    onClick={onOpenAdmin}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-accent hover:underline"
                  >
                    Dashboard
                  </button>
                )}
                <button onClick={handleLogout} className="text-brand-gray hover:text-brand-accent transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={onOpenAuth}
                className="text-[10px] font-black uppercase tracking-widest text-brand-text hover:text-brand-accent transition-colors flex items-center gap-2"
              >
                Login <ChevronRight size={14} />
              </button>
            )}
            
            <a href="https://tally.so/r/w4l51A" target="_blank" rel="noopener noreferrer">
              <Button className="rounded-none bg-brand-text text-brand-bg px-8 py-3 text-[10px] uppercase font-black tracking-widest hover:bg-brand-accent transition-colors">Get Strategy</Button>
            </a>
          </div>
        </div>

        <button className="md:hidden text-brand-text" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="md:hidden fixed inset-0 bg-brand-bg z-50 p-10 flex flex-col justify-center"
          >
            <button className="absolute top-10 right-10 text-brand-text" onClick={() => setIsMenuOpen(false)}>
              <X size={32} />
            </button>
            <div className="flex flex-col gap-12">
              {['About', 'Programs', 'Gallery', 'Resources', 'Contact'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setIsMenuOpen(false)} className="text-6xl font-black uppercase tracking-tighter text-brand-text hover:text-brand-accent transition-colors">
                  {item}
                </a>
              ))}
              <div className="pt-8 border-t border-brand-light-gray flex flex-col gap-8">
                {user ? (
                   <div className="flex flex-col gap-4">
                      <button onClick={() => { setIsMenuOpen(false); onOpenMyPage(); }} className="text-xl font-black uppercase tracking-widest text-brand-text text-left">
                        {user.displayName || user.email}님 안녕하세요.
                      </button>
                      {isAdmin && (
                        <button onClick={() => { setIsMenuOpen(false); onOpenAdmin(); }} className="text-brand-accent font-black uppercase tracking-widest text-left">Dashboard</button>
                      )}
                      <button onClick={handleLogout} className="text-brand-accent font-black uppercase tracking-widest text-left">Logout</button>
                   </div>
                ) : (
                  <button onClick={() => { setIsMenuOpen(false); onOpenAuth(); }} className="text-4xl font-black uppercase tracking-tighter text-left">Login</button>
                )}
                <a href="https://tally.so/r/w4l51A" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full rounded-none py-8 text-xl font-black uppercase">상담 신청</Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default function App() {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email === ADMIN_EMAIL) {
        setIsAdminOpen(true);
      } else {
        setIsAdminOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isAdminOpen]);

  useEffect(() => {
    if (isAuthModalOpen || selectedProgram || isMyPageOpen || (isAdminOpen && user?.email === ADMIN_EMAIL) || legalModalType) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isAuthModalOpen, selectedProgram, isMyPageOpen, isAdminOpen, user, legalModalType]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans antialiased selection:bg-brand-accent/10 selection:text-brand-accent">
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal onClose={() => setIsAuthModalOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMyPageOpen && (
          <MyPage onClose={() => setIsMyPageOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminOpen && user?.email === ADMIN_EMAIL && (
          <AdminDashboard onBack={() => setIsAdminOpen(false)} />
        )}
      </AnimatePresence>

      <LegalModal 
        isOpen={!!legalModalType} 
        type={legalModalType} 
        onClose={() => setLegalModalType(null)} 
      />

      <Navbar 
        onOpenAuth={() => setIsAuthModalOpen(true)} 
        user={user} 
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenMyPage={() => setIsMyPageOpen(true)}
      />
      
      <main>
              {/* Hero Section */}
              <section className="relative overflow-hidden pt-48 pb-32 px-6 lg:px-8">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] bg-brand-accent/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4" />
          
          <div className="mx-auto max-w-7xl grid lg:grid-cols-[1.2fr_0.8fr] gap-16 items-center">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} className="mb-10 inline-flex items-center gap-2 rounded-sm border-l-2 border-brand-accent bg-brand-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-text">
                Premium Admissions Strategy
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-6xl md:text-8xl font-extrabold leading-[1] tracking-tighter mb-8 italic">
                DESIGN YOUR <br />
                <span className="text-brand-accent not-italic">SUCCESS.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg md:text-xl text-brand-gray leading-relaxed max-w-xl mb-12 font-light">
                합격을 넘어, 학생의 고유한 서사와 
                지속 가능한 학습 시스템을 설계하는 프리미엄 전략 컨설팅
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <a href="https://tally.so/r/w4l51A" target="_blank" rel="noopener noreferrer">
                  <Button className="px-12 py-8 text-base bg-brand-text text-brand-bg hover:bg-brand-accent transition-colors duration-500 rounded-none uppercase tracking-widest font-bold">
                    상담 신청하기 <ArrowRight className="ml-3" size={18} />
                  </Button>
                </a>
                <a href="#programs">
                  <Button variant="outline" className="px-12 py-8 text-base border-brand-text hover:bg-brand-text hover:text-brand-bg transition-all duration-500 rounded-none uppercase tracking-widest font-bold">
                    프로그램 보기
                  </Button>
                </a>
              </motion.div>
              
              <motion.div variants={fadeUp} className="mt-20 grid grid-cols-3 gap-12 border-t border-brand-light-gray pt-12 max-w-lg">
                {[
                  { val: "07+", label: "Years Exp" },
                  { val: "100%", label: "Satisfaction" },
                  { val: "1:1", label: "Customized" }
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-3xl font-black tracking-tighter text-brand-text">{stat.val}</div>
                    <div className="text-[10px] text-brand-gray uppercase tracking-[0.2em] mt-2 font-bold">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }} className="relative">
              <div className="relative aspect-[4/5] bg-brand-secondary overflow-hidden group border border-brand-light-gray shadow-2xl">
                <img 
                  src="https://raw.githubusercontent.com/Ahrah/sehyunT.github.io/main/images/profile2.webp" 
                  alt="조세연" 
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover transition-all duration-1000"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/IMG_1441.JPG";
                    target.className = "w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000";
                  }}
                />
                <div className="absolute bottom-10 left-10 right-10 bg-brand-text/90 backdrop-blur p-8 text-brand-bg translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
                  <div className="text-[10px] uppercase tracking-[0.4em] text-brand-accent font-bold mb-2">Founder / CEO</div>
                  <div className="text-2xl font-black mb-4">조세연</div>
                  <p className="text-xs text-brand-bg/60 leading-relaxed font-light">
                    학생마다 맞는 전략은 달라야 합니다. <br />
                    우리는 숫자 너머의 가능성을 봅니다.
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-brand-accent p-6 text-brand-bg font-black italic tracking-tighter text-xl">
                SEHYUN T.
              </div>
            </motion.div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section id="about" className="py-40 px-6 lg:px-8 bg-brand-secondary">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.5fr] gap-24 items-start">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <p className="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">Philosophy</p>
              <h2 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-brand-text">
                성적을 넘어, <br />방식의 <br />혁신.
              </h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-12">
              <motion.div variants={fadeUp} className="flex gap-8 group">
                <div className="text-brand-accent font-black text-6xl opacity-10 group-hover:opacity-100 transition-opacity">01</div>
                <div>
                   <h3 className="text-2xl font-black mb-6 uppercase tracking-tight">나만의 고유한 서사 구축</h3>
                   <p className="text-xl text-brand-gray leading-relaxed font-light max-w-2xl">
                     단순한 스펙 나열이 아닌, 학생의 고유한 관심사와 문제의식을 
                     설득력 있는 성장 이야기로 연결하여 독보적인 경쟁력을 만듭니다.
                   </p>
                </div>
              </motion.div>
              <motion.div variants={fadeUp} className="flex gap-8 group">
                <div className="text-brand-accent font-black text-6xl opacity-10 group-hover:opacity-100 transition-opacity">02</div>
                <div>
                   <h3 className="text-2xl font-black mb-6 uppercase tracking-tight">스스로 움직이는 학습 시스템</h3>
                   <p className="text-xl text-brand-gray leading-relaxed font-light max-w-2xl">
                     입시는 성장의 과정입니다. 스스로 목표를 설정하고 
                     끝까지 완주할 수 있는 단단한 기초와 학습 구조를 함께 설계합니다.
                   </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Methodology Section */}
        <section id="method" className="py-40 px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="mb-24">
            <p className="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">Methodology</p>
            <h2 className="text-5xl font-black tracking-tighter">THE CORE ANALYSIS.</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-1 border-t border-brand-light-gray bg-brand-light-gray overflow-hidden">
            {analysisAxes.map((axis) => (
              <div key={axis.id} className="bg-brand-bg p-12 hover:bg-brand-text group transition-all duration-700">
                <div className="text-brand-accent font-bold text-xs tracking-widest mb-12">AXIS {axis.id}</div>
                <h3 className="text-2xl font-black mb-6 group-hover:text-brand-bg transition-colors leading-tight">{axis.subtitle}</h3>
                <p className="text-brand-gray group-hover:text-brand-bg/60 transition-colors text-sm font-light leading-relaxed mb-12 min-h-[80px]">
                  {axis.desc}
                </p>
                <div className="overflow-hidden h-[1px] w-0 group-hover:w-full bg-brand-accent transition-all duration-700" />
              </div>
            ))}
          </div>
        </section>

        {/* Difference Section */}
        <section className="bg-brand-text py-40 px-6 lg:px-8 text-brand-bg">
          <div className="max-w-7xl mx-auto">
             <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-24 items-center">
               <div>
                  <p className="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">Standard</p>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-8">THE <br />DIFFERENCE.</h2>
                  <p className="text-brand-bg/40 font-light text-lg">결과가 증명하는 압도적 차이.</p>
               </div>
               <div className="border border-white/10 overflow-hidden">
                  <div className="grid grid-cols-[1fr_1.2fr] text-[10px] uppercase tracking-[0.3em] font-black text-brand-accent bg-brand-secondary/5">
                    <div className="p-8 border-r border-white/10">General Consulting</div>
                    <div className="p-8">SehyunT Strategy Lab</div>
                  </div>
                  {compareTable.map(([a, b], i) => (
                    <div key={i} className="grid grid-cols-[1fr_1.2fr] border-t border-white/10 hover:bg-white/5 transition-colors">
                      <div className="p-8 border-r border-white/10 text-brand-bg/30 text-sm font-light italic">{a}</div>
                      <div className="p-8 text-brand-bg text-sm font-bold tracking-tight">{b}</div>
                    </div>
                  ))}
               </div>
             </div>
          </div>
        </section>

        {/* Programs Section */}
        <section id="programs" className="py-48 px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-32 border-b-2 border-brand-text/10 pb-16">
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-[0.6em] text-brand-accent font-black">Professional Curriculum</p>
              <h2 className="text-6xl md:text-7xl font-extrabold tracking-[-0.05em] uppercase leading-none">Programs</h2>
            </div>
            <p className="text-brand-gray text-left md:text-right max-w-sm font-light text-base md:text-lg leading-[1.6] mt-8 md:mt-0 italic">
              단순한 입시 관리가 아닌, <br className="hidden md:block" />체계적인 분석을 기반으로 한 맞춤형 솔루션.
            </p>
          </div>
          
          <div className="space-y-32">
            {programCategories.map((category) => (
              <div key={category.id} className="grid lg:grid-cols-[1fr_2fr] gap-16">
                <div className="sticky top-32 h-fit">
                   <div className="text-[10px] uppercase tracking-[0.5em] text-brand-accent font-black mb-6">{category.title}</div>
                   <h3 className="text-4xl font-extrabold tracking-tighter mb-8">{category.subtitle}</h3>
                   <div className="w-16 h-1 bg-brand-text" />
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {category.programs.map((prog, idx) => (
                    <motion.div 
                      key={prog.title}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={fadeUp}
                      className="group bg-white border border-brand-light-gray p-10 hover:border-brand-text transition-all duration-500 flex flex-col"
                    >
                      <h4 className="text-[11px] uppercase tracking-[0.3em] font-black text-brand-gray mb-6 group-hover:text-brand-accent transition-colors">
                        {prog.title}
                      </h4>
                      <h5 className="text-2xl font-black mb-8 leading-tight">{prog.subtitle}</h5>
                      <p className="text-brand-gray font-light text-sm leading-relaxed mb-10 flex-grow italic">
                        "{prog.desc}"
                      </p>
                      
                      <div className="space-y-3 pt-8 border-t border-brand-light-gray group-hover:border-brand-accent transition-colors">
                        {prog.features.slice(0, 3).map((feat) => (
                          <div key={feat} className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-brand-text/60">
                             <div className="w-1 h-1 bg-brand-light-gray group-hover:bg-brand-accent" />
                             {feat}
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => setSelectedProgram(prog)}
                        className="mt-12 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-brand-text group-hover:text-brand-accent transition-all"
                      >
                        Learn More <Plus size={14} className="group-hover:rotate-90 transition-transform duration-500" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Program Modal */}
        <AnimatePresence>
          {selectedProgram && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProgram(null)}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-text/95 backdrop-blur-md"
            >
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-brand-bg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-12 lg:p-20 relative rounded-none"
              >
                <button 
                  onClick={() => setSelectedProgram(null)}
                  className="absolute top-10 right-10 p-2 hover:bg-brand-secondary transition-colors"
                >
                  <X size={32} />
                </button>

                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-6">{selectedProgram.title}</p>
                  <h2 className="text-5xl font-black mb-12 tracking-tighter leading-tight italic">{selectedProgram.subtitle}</h2>
                  
                  <div className="prose prose-lg text-brand-text font-light mb-16 leading-[1.8]">
                    <p>{selectedProgram.content}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-12">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-brand-accent mb-8">Curriculum</h4>
                      <ul className="space-y-4">
                        {selectedProgram.features.map(feat => (
                          <li key={feat} className="flex items-start gap-4 text-sm font-bold leading-tight">
                            <span className="text-brand-accent">/</span> {feat}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-brand-accent mb-8">Candidates</h4>
                      <ul className="space-y-4">
                        {selectedProgram.target.map(t => (
                          <li key={t} className="flex items-start gap-4 text-sm text-brand-gray">
                            <Plus size={14} className="mt-1 text-brand-accent shrink-0" /> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-20 pt-12 border-t border-brand-light-gray flex items-center justify-between">
                    <a href="https://tally.so/r/w4l51A" target="_blank" rel="noopener noreferrer">
                      <Button className="px-12 py-8 bg-brand-text text-brand-bg hover:bg-brand-accent transition-colors">프로그램 신청하기</Button>
                    </a>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-gray flex items-center gap-3">
                      SehyunT Strategy Lab <Sparkles size={14} className="text-brand-accent" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Parent Insights Section */}
        <section className="py-40 px-6 lg:px-8 bg-brand-secondary">
          <div className="max-w-7xl mx-auto">
            <div className="mb-24 flex flex-col md:flex-row justify-between gap-12">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">Parent View</p>
                <h2 className="text-5xl font-black tracking-tighter">COMMON CHALLENGES.</h2>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-px bg-brand-light-gray border border-brand-light-gray">
               {[
                 { q: "의미 없는 활동의 나열", a: "방향성 없는 스펙 쌓기는 경쟁력이 없습니다. 학생만의 고유한 서사로 엮어, 이미 존재하는 경험에 숨을 불어넣는 전략을 제안합니다." },
                 { q: "작심삼일의 반복", a: "의지의 문제가 아닌 시스템의 부재입니다. 심리 상태와 개인별 성향을 고려해 무너지지 않는 맞춤형 학습 구조를 재설계합니다." },
                 { q: "막연한 스펙 경쟁", a: "불필요한 군더더기는 덜어내고, 합격의 당락을 결정짓는 핵심 탐구 주제와 경험만을 선별하여 정교화합니다." },
                 { q: "진로와 기록의 불일치", a: "단순 희망 사항이 아닌 구체적 증거로 채워지는 생기부. 면접에서 막힘 없는 답변으로 이어지는 실전형 기록 전략입니다." }
               ].map((item, i) => (
                 <div key={i} className="bg-brand-bg p-16 group hover:bg-brand-text transition-all duration-500">
                    <h4 className="text-xl font-black mb-6 uppercase tracking-tight flex items-center gap-4 group-hover:text-brand-bg transition-colors">
                      <span className="w-8 h-px bg-brand-accent" />
                      {item.q}
                    </h4>
                    <p className="text-brand-gray leading-relaxed font-light group-hover:text-brand-bg/60 transition-colors">
                      {item.a}
                    </p>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Free Experience Section */}
        <section className="py-40 px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="mb-24 text-center">
            <p className="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">Start Now</p>
            <h2 className="text-5xl font-black tracking-tighter uppercase relative inline-block">
              Experience Lab.
              <div className="absolute -bottom-4 left-0 w-full h-1 bg-brand-accent" />
            </h2>
          </div>

          <div className="space-y-4">
            {freeOfferings.map((offering) => (
              <div 
                key={offering.title} 
                onClick={() => alert(offering.message)}
                className="group relative bg-brand-bg p-12 border border-brand-light-gray flex flex-col md:flex-row justify-between items-center gap-12 hover:border-brand-text transition-all duration-500 cursor-pointer overflow-hidden"
              >
                <div className="absolute left-0 top-0 w-2 h-full bg-brand-accent -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                <div className="flex-1">
                  <div className="flex gap-4 mb-6">
                    {offering.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-black uppercase tracking-widest text-brand-accent">#{tag}</span>
                    ))}
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter">{offering.title}</h3>
                </div>
                <p className="flex-1 text-brand-gray font-light text-base leading-relaxed">
                  {offering.desc}
                </p>
                <div className="flex items-center gap-4 font-black text-xs uppercase tracking-[0.3em] group-hover:text-brand-accent transition-colors">
                  Apply <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Gallery Section */}
        <GallerySection isAdmin={user?.email === ADMIN_EMAIL} />

        {/* Resources Section */}
        <ResourcesSection isAdmin={user?.email === ADMIN_EMAIL} />

        {/* Call to Action Section */}
        <section id="contact" className="bg-brand-text py-48 px-6 lg:px-8 text-center text-brand-bg overflow-hidden relative">
           <div className="absolute inset-x-0 bottom-0 opacity-5 pointer-events-none select-none text-[30vw] font-black leading-none whitespace-nowrap overflow-hidden">
             LEVEL UP
           </div>
           
           <div className="max-w-5xl mx-auto relative z-10">
             <p className="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-12">Contact Us</p>
             <h2 className="text-6xl md:text-9xl font-black leading-[0.9] tracking-tighter mb-20 uppercase italic">
               Master your <br />
               <span className="text-brand-accent not-italic">Future.</span>
             </h2>
             
             <div className="flex flex-col sm:flex-row justify-center gap-8 mb-32">
                <a href="https://tally.so/r/w4l51A" target="_blank" rel="noopener noreferrer" className="flex-1 max-w-xs">
                  <Button className="w-full py-10 text-xl font-black uppercase rounded-none bg-brand-bg text-brand-text hover:bg-brand-accent hover:text-brand-bg transition-all duration-700">Get Consult</Button>
                </a>
                <a href="https://blog.naver.com/ahrahsehyun" target="_blank" rel="noopener noreferrer" className="flex-1 max-w-xs">
                   <Button variant="outline" className="w-full py-10 text-xl font-black uppercase rounded-none border-white hover:bg-white hover:text-brand-text transition-all duration-700">Official Blog</Button>
                </a>
             </div>

             <div className="flex flex-wrap justify-center gap-16 text-brand-bg/40 text-[10px] font-black uppercase tracking-[0.4em]">
                <a href="mailto:consultantsyssam@gmail.com" className="flex items-center gap-4 transition-colors hover:text-brand-accent cursor-pointer"><Mail size={16} /> consultantsyssam@gmail.com</a>
                <a href="https://instagram.com/consultant.sy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 transition-colors hover:text-brand-accent cursor-pointer"><Instagram size={16} /> @consultant.sy</a>
                <div className="flex items-center gap-4 transition-colors hover:text-brand-accent cursor-default"><MessageCircle size={16} /> Kakao Channel</div>
             </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-24 sm:py-32 px-6 lg:px-8 border-t border-brand-light-gray bg-brand-bg">
        <div className="max-w-7xl mx-auto">
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-24">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-4 mb-6 sm:mb-8">
                  <img src="/logo-pic.png" alt="SEH-YUN T" className="h-12 w-auto" />
                  <div className="text-3xl sm:text-4xl font-black tracking-tighter">SEH-YUN T.</div>
                </div>
                <p className="text-brand-gray max-w-sm leading-relaxed font-light text-sm sm:text-base">
                  Premium Admissions Strategy & Self-Directed Learning Lab. <br />
                  성장을 넘어 성공을 설계하는 가장 정교한 교육 파트너.
                </p>
              </div>
              <div>
                 <h4 className="font-black text-xs uppercase tracking-[0.4em] mb-6 sm:mb-10 text-brand-accent">Official Channels</h4>
                 <ul className="space-y-4 text-[10px] font-black uppercase tracking-[0.2em]">
                    {blogs.map((blog) => (
                      <li key={blog.name}>
                        <a href={blog.url} target="_blank" rel="noopener noreferrer" className="text-brand-gray hover:text-brand-accent transition-colors">
                          {blog.name}
                        </a>
                      </li>
                    ))}
                 </ul>
              </div>
              <div>
                 <h4 className="font-black text-xs uppercase tracking-[0.4em] mb-6 sm:mb-10 text-brand-accent">Inquiry</h4>
                 <a href="mailto:consultantsyssam@gmail.com" className="text-sm font-black tracking-widest text-brand-text hover:text-brand-accent transition-colors">
                   consultantsyssam@gmail.com
                 </a>
              </div>
           </div>
           
           {/* Business Information */}
           <div className="mt-16 sm:mt-24 pt-8 border-t border-brand-light-gray/70 text-[11px] sm:text-xs text-brand-gray space-y-2">
             <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
               <span><strong className="font-bold text-brand-text">상호명:</strong> 입시는세연쌤</span>
               <span><strong className="font-bold text-brand-text">사업자등록번호:</strong> 612-69-00756</span>
               <span><strong className="font-bold text-brand-text">대표:</strong> 조세연</span>
               <span><strong className="font-bold text-brand-text">이메일:</strong> consultantsyssam@gmail.com</span>
             </div>
             <p className="text-[10px] sm:text-[11px] text-brand-gray/80 font-light">
               입시 전략 컨설팅 · 고입/대입 학종 로드맵 · 1:1 자기주도학습 코칭
             </p>
           </div>

           {/* Copyright & Legal Links */}
           <div className="mt-8 pt-8 border-t border-brand-light-gray flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-brand-gray text-[9px] sm:text-[10px] tracking-[0.3em] font-black uppercase">
                © 2023 SEHYUNT. ALL RIGHTS RESERVED.
              </p>
              <div className="flex gap-8 sm:gap-12 text-[9px] sm:text-[10px] text-brand-gray tracking-[0.3em] font-black uppercase">
                <button 
                  type="button"
                  onClick={() => setLegalModalType('privacy')}
                  className="hover:text-brand-accent cursor-pointer transition-colors"
                >
                  Privacy Policy
                </button>
                <button 
                  type="button"
                  onClick={() => setLegalModalType('terms')}
                  className="hover:text-brand-accent cursor-pointer transition-colors"
                >
                  Terms of Use
                </button>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}
