/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  FileText,
  Instagram,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MyPage } from './components/MyPage';
import { ResourcesSection } from './components/ResourcesSection';
import { LegalModal } from './components/LegalModals';

interface Program {
  title: string;
  subtitle: string;
  desc: string;
  content: string;
  features: string[];
  target: string[];
  landing?: { href: string; label: string };
}

interface ProgramCategory {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Compass;
  programs: Program[];
}

const ADMIN_EMAIL = 'ahrah0365@gmail.com';
const CONSULT_URL = 'https://tally.so/r/KYrWDz';

const programCategories: ProgramCategory[] = [
  {
    id: 'career',
    number: '01',
    eyebrow: '중학생 · 예비고',
    title: '진로·고입 전략',
    description: '관심사와 학습 성향을 발견하고, 학교 선택부터 고교 생활의 첫 방향까지 연결합니다.',
    icon: Compass,
    programs: [
      {
        title: 'Career Direction Consulting',
        subtitle: '진로 컨설팅',
        desc: '좋아하는 것과 잘하는 것을 입시의 방향으로 바꿉니다.',
        content: '단순한 직업 추천이나 적성검사 해석을 넘어 학생의 관심사, 독서 성향, 탐구 방식, 학습 태도를 입체적으로 분석합니다. 장기적으로 지속 가능한 학업 방향을 제안하며, 이는 고등학교 선택과 학생부 로드맵의 기초가 됩니다.',
        features: ['진로 관심사 및 학업 성향 분석', '탐구 분야 확장 방향 제안', '독서 및 활동 로드맵 설계', '고등학교 진학 방향 연결'],
        target: ['진로 방향이 자주 바뀌는 학생', '좋아하는 분야를 찾고 싶은 학생', '학업과 진로의 연결고리가 필요한 학생'],
      },
      {
        title: 'Pre-High School Strategy',
        subtitle: '고등학교 입학 전 컨설팅',
        desc: '중3 겨울, 고등학교 3년의 시행착오를 줄입니다.',
        content: '진학 예정 학교의 특징과 학업 환경을 분석하여 입학 후의 학생부 운영과 자기주도학습 루틴을 미리 구축합니다. 불필요한 스펙 경쟁 대신 학생의 성향에 맞는 활동 구조를 정립합니다.',
        features: ['진학 예정 고교별 생활 전략', '학생부 운영 및 세특 구조 이해', '진로 기반 활동 흐름 설계', '과목 선택 및 학업 방향 조언'],
        target: ['상위권 고교 진학 예정 학생', '입학 전 학생부 전략이 필요한 학생', '고등학교 생활에 대한 불안이 있는 학생'],
      },
    ],
  },
  {
    id: 'learning',
    number: '02',
    eyebrow: '학습 습관 · 실행력',
    title: '자기주도학습',
    description: '계획을 세우는 데서 끝나지 않고, 학생이 스스로 실행하고 회복하는 공부 구조를 만듭니다.',
    icon: Target,
    programs: [
      {
        title: '1:1 Self-Directed Coaching',
        subtitle: '1:1 자기주도학습 컨설팅',
        desc: '학생마다 다른 공부의 작동 방식을 찾습니다.',
        content: '단순 관리를 넘어 학생이 공부를 미루는 원인, 집중 유지 환경, 목표 달성 기제를 정밀 분석합니다. 티칭이 아닌 코칭 중심으로 운영되며, 진로 관심사와 학업을 연결하여 장기적인 학습 동기를 만듭니다.',
        features: ['개인별 학습 습관 및 실행 구조 분석', '과목별 최적화 공부 방식 제안', '스트레스 및 멘탈 관리', '맞춤형 학습 루틴 및 교재 설계'],
        target: ['나만의 공부법을 찾고 싶은 학생', '실행력이 부족해 고민인 학생', '공부 동기와 진로를 연결하고 싶은 학생'],
      },
      {
        title: 'Group Learning Program',
        subtitle: '자기주도학습 그룹 프로그램',
        desc: '함께 읽고 말하며 사고의 깊이를 키웁니다.',
        content: '학습 플랜 설계부터 비문학 독해, 정보 구조화 훈련을 동료들과 함께 수행합니다. 자신의 사고 과정을 언어화하고 타인의 관점을 수용하며 사고의 폭을 확장합니다.',
        features: ['실행 가능한 학습 루틴 공동 설계', '비문학 및 원서 기반 논리 독해', '토론을 통한 표현 훈련', '면접 대비 사고 구조화'],
        target: ['혼자서는 방향 유지가 힘든 학생', '독해력과 사고력을 키우고 싶은 학생', '표현 능력을 높이고 싶은 학생'],
      },
    ],
  },
  {
    id: 'admissions',
    number: '03',
    eyebrow: '특목고 · 자사고',
    title: '자소서·면접',
    description: '학생의 경험을 설득력 있는 언어로 정리하고, 어떤 질문에도 자기 생각을 말하도록 훈련합니다.',
    icon: MessageCircle,
    programs: [
      {
        title: 'Admissions Consulting',
        subtitle: '자기소개서 집중 컨설팅',
        desc: '경험의 나열을 학생만의 서사로 바꿉니다.',
        content: '단순 첨삭을 넘어 학생의 활동과 경험을 재해석합니다. 핵심 메시지를 도출하고 문항별 스토리라인을 구성하며, 면접과의 연결성까지 고려한 서사를 만듭니다.',
        features: ['자기소개서 핵심 스토리라인 설계', '개별 경험 큐레이션 및 연결', '학교별 강조 포인트 분석', '면접 연계 질문 리스트 추출'],
        target: ['특목·자사고 지원 예정 학생', '경험은 많으나 정리가 안 되는 학생', '차별화된 서사가 필요한 학생'],
        landing: { href: '/jasoseo-consulting/', label: '자소서 컨설팅' },
      },
      {
        title: 'Interview Coaching',
        subtitle: '특목·자사고 면접 대비',
        desc: '암기보다 사고력과 진정성을 보여주는 답변을 만듭니다.',
        content: '학교별 면접 유형을 분석하고 예상 질문에 대한 구조적 답변 능력을 키웁니다. 면접 태도와 전달력까지 코칭하여 학생이 자신의 경험을 스스로 설명할 수 있도록 훈련합니다.',
        features: ['3:1 실전 모의면접', '답변 구조 및 전달력 코칭', '실전 답변 피드백', '학생부 기반 압박 질문 훈련'],
        target: ['실전 면접 경험이 부족한 학생', '논리적인 말하기가 어려운 학생', '경험의 진정성을 입증하고 싶은 학생'],
        landing: { href: '/interview-consulting/', label: '면접 컨설팅' },
      },
      {
        title: 'Common Question Program',
        subtitle: '특목·자사고 공통문항 특강',
        desc: '낯선 질문에도 흔들리지 않는 사고의 틀을 세웁니다.',
        content: '반복 등장하는 핵심 질문들의 논리를 해부합니다. 답을 외우는 대신 어떤 질문이 나와도 학생의 경험과 사고를 구조화해 전달할 수 있는 프레임을 훈련합니다.',
        features: ['공통문항 기출 분석', '유형별 답변 프레임 설계', '즉석 답변 훈련', '발표 및 메시지 전달력 강화'],
        target: ['공통문항 답변이 어려운 학생', '사고를 말로 정리하기 힘든 학생', '실전 대응력을 키우고 싶은 학생'],
      },
    ],
  },
  {
    id: 'record',
    number: '04',
    eyebrow: '고등학생 · 대입',
    title: '생기부·수시 전략',
    description: '세특, 탐구, 수행평가와 지원 전략을 하나의 성장 흐름으로 연결합니다.',
    icon: FileText,
    programs: [
      {
        title: 'Student Record Strategy',
        subtitle: '학기별 생기부 통합 컨설팅',
        desc: '학생부의 여러 기록을 하나의 방향으로 연결합니다.',
        content: '한 학기 동안의 진로 관심사와 학업 흐름을 기반으로 세특, 탐구활동, 발표, 독서가 유기적으로 이어지도록 설계합니다. 대학이 읽어낼 수 있는 장기적인 성장 흐름을 만듭니다.',
        features: ['학기별 학생부 스토리라인 설계', '세특 및 탐구활동 주제 기획', '교과-진로 연결 활동 설계', '발표 및 보고서 방향 가이드'],
        target: ['학생부종합전형을 준비하는 학생', '활동 간 연결성이 부족한 학생', '깊이 있는 세특을 만들고 싶은 학생'],
        landing: { href: '/saenggibu-consulting/', label: '생기부 컨설팅' },
      },
      {
        title: 'Performance & Statement',
        subtitle: '수행평가·생기부 상시 컨설팅',
        desc: '결과보다 학생의 사고 과정이 보이는 기록을 만듭니다.',
        content: '수행평가와 수시 활동 내용을 학생의 탐구 방향과 사고 흐름이 드러나도록 구체화합니다. 발표와 보고서의 논리 구조부터 최종 세특 기재 포인트까지 조력합니다.',
        features: ['수행평가 주제 구체화', '탐구 내용 구조화', '보고서 초안 피드백', '생기부 기재용 활동 요약'],
        target: ['수행평가 주제 선정이 어려운 학생', '탐구 과정을 정리하고 싶은 학생', '기록의 질을 높이고 싶은 학생'],
        landing: { href: '/saenggibu-consulting/', label: '생기부 컨설팅' },
      },
      {
        title: 'Early Admissions Strategy',
        subtitle: '대학 수시 지원 전략',
        desc: '데이터와 학생의 강점을 결합해 지원 조합을 설계합니다.',
        content: '내신 성적과 생기부의 흐름, 면접 가능성을 종합하여 최적의 지원 조합을 제안합니다. 전형별 적합도를 검토하고 합격 가능성과 리스크를 함께 분석합니다.',
        features: ['학생부 정성 평가', '전형별 적합도 분석', '지원 학과 및 조합 시뮬레이션', '가능성과 리스크 진단'],
        target: ['수시 지원을 앞둔 고3', '지원 대학 범위가 궁금한 학생', '전략적인 지원 조합이 필요한 학생'],
      },
    ],
  },
];

const strategySteps = [
  { number: '01', title: '학생을 읽습니다', label: 'Discover', text: '성적표보다 먼저 학생의 관심사, 학습 습관, 스트레스 반응과 지금까지의 경험을 입체적으로 봅니다.' },
  { number: '02', title: '핵심 질문을 찾습니다', label: 'Define', text: '막연한 진로를 구체적인 질문으로 바꾸고, 학생에게 중요한 선택과 보완 지점을 선명하게 정리합니다.' },
  { number: '03', title: '성장의 흐름을 설계합니다', label: 'Design', text: '진로, 교과, 탐구, 독서와 기록이 따로 놀지 않도록 하나의 로드맵 안에서 연결합니다.' },
  { number: '04', title: '학생의 언어로 실행합니다', label: 'Do', text: '대신 만들어주는 결과물이 아니라 학생이 이해하고 말할 수 있는 활동과 학습 루틴으로 옮깁니다.' },
  { number: '05', title: '끝까지 점검하고 다듬습니다', label: 'Refine', text: '실행 결과를 함께 돌아보고 기록과 면접의 일관성을 높이며 다음 선택까지 이어지도록 정교화합니다.' },
];

const studentCases = [
  { tag: '진로·고입', before: '관심 분야가 자주 바뀌어 무엇을 준비해야 할지 막막했던 중학생', after: '좋아하는 주제와 학습 경험을 연결해 지원 학교와 자기소개서의 중심 질문을 세웠습니다.' },
  { tag: '생기부', before: '활동은 많지만 세특과 탐구의 연결이 보이지 않았던 고등학생', after: '진로 질문을 기준으로 활동의 우선순위를 다시 잡아 학생부 전체의 일관성을 높였습니다.' },
  { tag: '자기주도학습', before: '계획은 잘 세우지만 며칠 뒤면 지쳐 포기하던 학생', after: '집중 시간과 회복 패턴을 반영한 작은 루틴으로 바꾸며 스스로 다시 시작하는 힘을 길렀습니다.' },
];

const blogs = [
  { name: '입시 전략 인사이트', url: 'https://blog.naver.com/ahrahsehyun' },
  { name: '논리·시사 탐구 기록', url: 'https://sehyunt-logic.tistory.com/' },
  { name: '실전 면접 아카이브', url: 'https://sehyunt-study.tistory.com/' },
];

const Button = ({ children, className = '', variant = 'dark' }: { children: ReactNode; className?: string; variant?: 'dark' | 'light' | 'line' }) => {
  const variants = {
    dark: 'bg-brand-ink text-white hover:bg-brand-accent',
    light: 'bg-white text-brand-ink hover:bg-brand-mist',
    line: 'border border-brand-ink/20 text-brand-ink hover:border-brand-ink',
  };
  return <span className={`inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-7 text-sm font-bold transition-colors ${variants[variant]} ${className}`}>{children}</span>;
};

const Navbar = ({ user, onOpenAuth, onOpenAdmin, onOpenMyPage }: { user: FirebaseUser | null; onOpenAuth: () => void; onOpenAdmin: () => void; onOpenMyPage: () => void }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logout = async () => {
    try { await signOut(auth); } catch (error) { console.error('Logout failed', error); }
  };

  const closeAnd = (action?: () => void) => {
    setIsMenuOpen(false);
    action?.();
  };

  const links = [
    ['소개', '#about'],
    ['프로그램', '#programs'],
    ['전략 지도', '#strategy'],
    ['자료실', '#resources'],
  ];

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-brand-ink/10 bg-brand-paper/95 py-3 backdrop-blur-xl' : 'bg-transparent py-5'}`}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3" aria-label="입시는세연쌤 홈">
          <img src="/logo-pic.png" alt="" className="h-10 w-10 rounded-full object-cover" />
          <div className="leading-none">
            <strong className="block text-lg tracking-[-0.04em]">입시는세연쌤</strong>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.24em] text-brand-accent">Sehyun T Admissions</span>
          </div>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {links.map(([label, href]) => <a key={href} href={href} className="text-sm font-semibold text-brand-ink/70 hover:text-brand-ink">{label}</a>)}
          {user ? (
            <div className="flex items-center gap-4 border-l border-brand-ink/10 pl-6">
              <button onClick={onOpenMyPage} className="flex items-center gap-2 text-sm font-bold hover:text-brand-accent">
                {isAdmin ? <ShieldAlert size={16} /> : <UserIcon size={16} />} {user.displayName || user.email?.split('@')[0]}님
              </button>
              {isAdmin && <button onClick={onOpenAdmin} className="text-xs font-black text-brand-accent">관리자</button>}
              <button onClick={logout} aria-label="로그아웃" className="text-brand-ink/50 hover:text-brand-accent"><LogOut size={17} /></button>
            </div>
          ) : <button onClick={onOpenAuth} className="text-sm font-bold text-brand-ink/65 hover:text-brand-ink">로그인</button>}
          <a href={CONSULT_URL} target="_blank" rel="noopener noreferrer"><Button className="min-h-12 px-6">상담 신청 <ArrowUpRight size={16} /></Button></a>
        </div>

        <button onClick={() => setIsMenuOpen(true)} aria-label="메뉴 열기" className="grid h-11 w-11 place-items-center rounded-full border border-brand-ink/15 lg:hidden"><Menu size={21} /></button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-brand-ink px-6 py-7 text-white lg:hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white/60">입시는세연쌤</span>
              <button onClick={() => setIsMenuOpen(false)} aria-label="메뉴 닫기" className="grid h-12 w-12 place-items-center rounded-full border border-white/20"><X /></button>
            </div>
            <div className="flex min-h-[80vh] flex-col justify-center gap-7">
              {links.map(([label, href], index) => <a key={href} href={href} onClick={() => closeAnd()} className="flex items-center gap-4 text-4xl font-black tracking-[-0.05em]"><span className="text-xs text-brand-coral">0{index + 1}</span>{label}</a>)}
              <div className="mt-5 border-t border-white/15 pt-7">
                {user ? <button onClick={() => closeAnd(onOpenMyPage)} className="mr-6 text-base font-bold">마이페이지</button> : <button onClick={() => closeAnd(onOpenAuth)} className="mr-6 text-base font-bold">로그인</button>}
                {isAdmin && <button onClick={() => closeAnd(onOpenAdmin)} className="text-base font-bold text-brand-coral">관리자</button>}
              </div>
              <a href={CONSULT_URL} target="_blank" rel="noopener noreferrer"><Button variant="light" className="w-full">상담 신청하기 <ArrowRight size={17} /></Button></a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const StrategyMap = () => {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveStep(Number((visible.target as HTMLElement).dataset.step));
    }, { rootMargin: '-30% 0px -45% 0px', threshold: [0.1, 0.35, 0.7] });
    stepRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="strategy" className="bg-brand-ink py-28 text-white sm:py-36 lg:py-44">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24 lg:px-12">
        <div className="h-fit lg:sticky lg:top-32">
          <p className="section-label text-brand-coral">Sehyun T Strategy Map</p>
          <h2 className="mt-7 text-5xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl">합격보다 오래 남는<br />성장의 설계도</h2>
          <p className="mt-8 max-w-md text-base leading-7 text-white/55">상담은 정답을 대신 주는 일이 아닙니다. 학생이 자기 방향을 이해하고 다음 선택을 해낼 수 있도록 다섯 단계를 함께 걷습니다.</p>
          <div className="mt-12 hidden lg:block">
            <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="absolute inset-y-0 left-0 bg-brand-coral" animate={{ width: `${((activeStep + 1) / strategySteps.length) * 100}%` }} transition={reduceMotion ? { duration: 0 } : { duration: 0.45 }} />
            </div>
            <div className="mt-4 flex justify-between text-[10px] font-bold tracking-[0.2em] text-white/35"><span>START</span><span>GROWTH</span></div>
          </div>
        </div>

        <div>
          {strategySteps.map((step, index) => (
            <div key={step.number} ref={(node) => { stepRefs.current[index] = node; }} data-step={index} className="flex min-h-[42vh] border-t border-white/15 py-12 first:border-t-0 lg:min-h-[58vh] lg:py-20">
              <motion.div animate={{ opacity: activeStep === index ? 1 : 0.38, x: activeStep === index || reduceMotion ? 0 : 14 }} transition={{ duration: reduceMotion ? 0 : 0.4 }} className="grid w-full grid-cols-[auto_1fr] gap-6 sm:gap-10">
                <span className="pt-2 font-mono text-xs text-brand-coral">{step.number}</span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/40">{step.label}</p>
                  <h3 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{step.title}</h3>
                  <p className="mt-7 max-w-xl text-base leading-8 text-white/62 sm:text-lg">{step.text}</p>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function App() {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setIsAdminOpen(currentUser?.email === ADMIN_EMAIL);
  }), []);

  useEffect(() => { window.scrollTo(0, 0); }, [isAdminOpen]);

  useEffect(() => {
    const locked = isAuthModalOpen || selectedProgram || isMyPageOpen || (isAdminOpen && user?.email === ADMIN_EMAIL) || legalModalType;
    document.body.style.overflow = locked ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isAuthModalOpen, selectedProgram, isMyPageOpen, isAdminOpen, user, legalModalType]);

  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.65 } };

  return (
    <div id="top" className="min-h-screen bg-brand-paper text-brand-ink selection:bg-brand-coral/35">
      <AnimatePresence>{isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{isMyPageOpen && <MyPage onClose={() => setIsMyPageOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{isAdminOpen && user?.email === ADMIN_EMAIL && <AdminDashboard onBack={() => setIsAdminOpen(false)} />}</AnimatePresence>
      <LegalModal isOpen={!!legalModalType} type={legalModalType} onClose={() => setLegalModalType(null)} />

      <Navbar user={user} onOpenAuth={() => setIsAuthModalOpen(true)} onOpenAdmin={() => setIsAdminOpen(true)} onOpenMyPage={() => setIsMyPageOpen(true)} />

      <main>
        <section className="relative overflow-hidden px-6 pb-24 pt-32 sm:px-8 sm:pb-32 sm:pt-40 lg:min-h-[92vh] lg:px-12 lg:pb-20">
          <div className="hero-orbit hero-orbit-one" />
          <div className="hero-orbit hero-orbit-two" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
            <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.7 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-ink/12 bg-white/70 px-4 py-2 text-xs font-bold backdrop-blur"><Sparkles size={14} className="text-brand-accent" /> 학생마다 다른 길을 설계합니다</div>
              <h1 className="mt-8 max-w-4xl text-[clamp(3.45rem,7vw,7.5rem)] font-black leading-[0.92] tracking-[-0.075em]">
                입시가 아니라,<br /><span className="hero-emphasis">학생의 다음</span>을<br />설계합니다.
              </h1>
              <p className="mt-8 max-w-xl text-lg font-medium leading-8 text-brand-ink/62 sm:text-xl">진로·학습·기록·면접을 따로 보지 않습니다. 학생이 자기 힘으로 성장할 수 있도록 하나의 흐름으로 연결합니다.</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a href={CONSULT_URL} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto">상담 신청하기 <ArrowRight size={17} /></Button></a>
                <a href="#programs"><Button variant="line" className="w-full bg-white/35 sm:w-auto">프로그램 살펴보기 <ChevronDown size={17} /></Button></a>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-brand-ink/10 pt-6 text-sm font-semibold text-brand-ink/55">
                <span>진로에서 입시까지</span><span>학생 중심 1:1 설계</span><span>실행과 기록의 연결</span>
              </div>
            </motion.div>

            <motion.div initial={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.9, delay: 0.1 }} className="relative mx-auto w-full max-w-[610px] lg:mr-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2.2rem] bg-brand-sand shadow-[0_35px_90px_rgba(28,34,40,0.17)]">
                <img src="/IMG_1441.JPG" alt="입시 컨설턴트 조세연" className="h-full w-full object-cover object-[center_23%]" loading="eager" decoding="async" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-ink/85 via-brand-ink/20 to-transparent px-7 pb-7 pt-32 text-white sm:px-9 sm:pb-9">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-coral">Founder · Admissions Consultant</p>
                  <p className="mt-2 text-2xl font-black">조세연</p>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-3 max-w-[260px] rounded-3xl bg-white p-5 shadow-xl sm:-left-10 sm:p-6">
                <p className="text-sm font-bold leading-6">“학생의 언어와 속도를 지키는 전략이어야 오래 갑니다.”</p>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="programs" className="scroll-mt-20 bg-white py-28 sm:py-36">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <motion.div {...reveal} className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div><p className="section-label text-brand-accent">Programs</p><h2 className="mt-6 text-5xl font-black tracking-[-0.06em] sm:text-6xl">지금 필요한<br />한 가지부터</h2></div>
              <p className="max-w-2xl text-lg leading-8 text-brand-ink/60 lg:ml-auto">복잡한 프로그램 목록 대신 학생의 현재 고민에 맞는 네 개의 시작점으로 정리했습니다. 카드를 열면 세부 프로그램과 진행 방향을 확인할 수 있습니다.</p>
            </motion.div>

            <div className="mt-16 grid gap-4 lg:grid-cols-2">
              {programCategories.map((category) => {
                const Icon = category.icon;
                const expanded = expandedCategory === category.id;
                return (
                  <motion.article {...reveal} key={category.id} className={`overflow-hidden rounded-[1.75rem] border transition-colors ${expanded ? 'border-brand-ink bg-brand-mist' : 'border-brand-ink/10 bg-brand-paper hover:border-brand-ink/30'}`}>
                    <button onClick={() => setExpandedCategory(expanded ? null : category.id)} aria-expanded={expanded} className="w-full p-7 text-left sm:p-9">
                      <div className="flex items-start justify-between gap-5">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-accent shadow-sm"><Icon size={23} /></div>
                        <span className="font-mono text-xs text-brand-ink/35">{category.number}</span>
                      </div>
                      <p className="mt-9 text-xs font-black tracking-[0.18em] text-brand-accent">{category.eyebrow}</p>
                      <h3 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">{category.title}</h3>
                      <p className="mt-5 max-w-xl leading-7 text-brand-ink/58">{category.description}</p>
                      <div className="mt-8 flex items-center justify-between border-t border-brand-ink/10 pt-5 text-sm font-bold"><span>세부 프로그램 {category.programs.length}개</span><Plus size={19} className={`transition-transform ${expanded ? 'rotate-45' : ''}`} /></div>
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div initial={reduceMotion ? undefined : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.35 }} className="overflow-hidden">
                          <div className="space-y-3 border-t border-brand-ink/10 p-5 sm:p-7">
                            {category.programs.map((program) => (
                              <div key={program.title} className="rounded-2xl bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
                                <div><h4 className="font-black">{program.subtitle}</h4><p className="mt-1 text-sm leading-6 text-brand-ink/55">{program.desc}</p></div>
                                <button onClick={() => setSelectedProgram(program)} className="mt-4 inline-flex shrink-0 items-center gap-2 text-sm font-black text-brand-accent sm:mt-0">자세히 <ArrowRight size={15} /></button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 bg-brand-sand py-28 sm:py-36 lg:py-44">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <motion.div {...reveal} className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
              <div><p className="section-label text-brand-accent">Our Belief</p><h2 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-0.06em] sm:text-7xl">좋은 전략은<br />학생을 닮아야<br />합니다.</h2></div>
              <div className="lg:pt-16">
                <p className="text-2xl font-bold leading-[1.55] tracking-[-0.025em] sm:text-3xl">입시는 누군가의 정답을 복사하는 과정이 아니라, 나만의 질문을 발견하고 끝까지 설명할 수 있게 되는 과정이라고 믿습니다.</p>
                <div className="mt-12 grid gap-8 border-t border-brand-ink/15 pt-10 sm:grid-cols-2">
                  <div><BookOpen className="text-brand-accent" /><h3 className="mt-5 text-xl font-black">연결된 성장</h3><p className="mt-3 text-sm leading-7 text-brand-ink/58">진로, 수업, 탐구와 기록이 하나의 맥락 안에서 이어지도록 설계합니다.</p></div>
                  <div><Users className="text-brand-accent" /><h3 className="mt-5 text-xl font-black">학생의 주도권</h3><p className="mt-3 text-sm leading-7 text-brand-ink/58">결과물을 대신 만들기보다 학생이 이해하고 선택하고 말하는 힘을 키웁니다.</p></div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-brand-paper py-28 sm:py-36">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <motion.div {...reveal} className="max-w-3xl"><p className="section-label text-brand-accent">Student Changes</p><h2 className="mt-6 text-5xl font-black tracking-[-0.06em] sm:text-6xl">숫자보다 먼저 보이는 변화</h2><p className="mt-6 text-lg leading-8 text-brand-ink/58">검증되지 않은 합격 실적 대신, 상담을 통해 학생의 생각과 행동이 어떻게 달라졌는지를 보여드립니다.</p></motion.div>
            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {studentCases.map((item, index) => (
                <motion.article {...reveal} key={item.tag} className="flex min-h-[360px] flex-col rounded-[1.75rem] border border-brand-ink/10 bg-white p-7 sm:p-9">
                  <div className="flex items-center justify-between"><span className="rounded-full bg-brand-coral/30 px-3 py-1.5 text-xs font-black">{item.tag}</span><span className="font-mono text-xs text-brand-ink/30">0{index + 1}</span></div>
                  <p className="mt-9 text-base font-bold leading-7 text-brand-ink/45">{item.before}</p>
                  <div className="my-7 h-px bg-brand-ink/10" />
                  <p className="mt-auto text-xl font-black leading-8 tracking-[-0.025em]">{item.after}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <StrategyMap />

        <ResourcesSection isAdmin={user?.email === ADMIN_EMAIL} />

        <section id="contact" className="relative overflow-hidden bg-brand-coral px-6 py-28 sm:px-8 sm:py-36 lg:px-12 lg:py-44">
          <div className="contact-ring" />
          <motion.div {...reveal} className="relative mx-auto max-w-5xl text-center">
            <p className="section-label">Start a Conversation</p>
            <h2 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-0.065em] sm:text-7xl lg:text-8xl">학생의 다음 장면을<br />함께 설계해볼까요?</h2>
            <p className="mx-auto mt-7 max-w-2xl text-lg font-medium leading-8 text-brand-ink/65">현재 상황과 고민을 남겨주시면, 어떤 프로그램이 필요한지부터 차근차근 안내드립니다.</p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={CONSULT_URL} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto">상담 신청하기 <ArrowUpRight size={18} /></Button></a>
              <a href="https://blog.naver.com/ahrahsehyun" target="_blank" rel="noopener noreferrer"><Button variant="light" className="w-full sm:w-auto">블로그에서 더 알아보기</Button></a>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="bg-brand-ink px-6 py-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-b border-white/12 pb-12 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div><div className="flex items-center gap-3"><img src="/logo-pic.png" alt="" className="h-11 w-11 rounded-full object-cover" /><strong className="text-2xl tracking-[-0.04em]">입시는세연쌤</strong></div><p className="mt-5 max-w-md text-sm leading-7 text-white/52">학생의 진로와 학습, 기록을 하나의 성장 흐름으로 연결하는 입시 전략 컨설팅.</p></div>
            <div><h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-coral">Consulting</h3><nav className="mt-5 flex flex-col gap-3 text-sm text-white/60"><a href="/saenggibu-consulting/">생기부 컨설팅</a><a href="/jasoseo-consulting/">자소서 컨설팅</a><a href="/interview-consulting/">면접 컨설팅</a></nav></div>
            <div><h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-coral">Channels</h3><nav className="mt-5 flex flex-col gap-3 text-sm text-white/60">{blogs.map((blog) => <a key={blog.name} href={blog.url} target="_blank" rel="noopener noreferrer">{blog.name}</a>)}</nav></div>
          </div>
          <div className="grid gap-7 pt-9 text-xs leading-6 text-white/45 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><p>상호명 입시는세연쌤 · 대표 조세연 · 사업자등록번호 612-69-00756</p><a href="mailto:consultantsyssam@gmail.com" className="mt-1 inline-flex items-center gap-2 hover:text-white"><Mail size={13} /> consultantsyssam@gmail.com</a><a href="https://instagram.com/consultant.sy" target="_blank" rel="noopener noreferrer" className="ml-5 inline-flex items-center gap-2 hover:text-white"><Instagram size={13} /> @consultant.sy</a></div>
            <div className="flex flex-wrap gap-5"><button onClick={() => setLegalModalType('terms')} className="hover:text-white">이용약관</button><button onClick={() => setLegalModalType('privacy')} className="hover:text-white">개인정보처리방침</button><span>© {new Date().getFullYear()} SEHYUN T</span></div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {selectedProgram && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProgram(null)} className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/80 p-4 backdrop-blur-sm sm:p-7">
            <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="program-title" className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-brand-paper p-7 sm:p-12">
              <button onClick={() => setSelectedProgram(null)} aria-label="닫기" className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full border border-brand-ink/10 bg-white"><X size={20} /></button>
              <p className="section-label pr-16 text-brand-accent">{selectedProgram.title}</p>
              <h2 id="program-title" className="mt-5 pr-12 text-4xl font-black tracking-[-0.055em] sm:text-5xl">{selectedProgram.subtitle}</h2>
              <p className="mt-7 text-base leading-8 text-brand-ink/62">{selectedProgram.content}</p>
              <div className="mt-10 grid gap-8 border-t border-brand-ink/10 pt-9 sm:grid-cols-2">
                <div><h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-accent">함께 하는 일</h3><ul className="mt-5 space-y-3">{selectedProgram.features.map((feature) => <li key={feature} className="flex gap-3 text-sm font-semibold leading-6"><Check size={16} className="mt-1 shrink-0 text-brand-accent" />{feature}</li>)}</ul></div>
                <div><h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-accent">이런 학생에게</h3><ul className="mt-5 space-y-3">{selectedProgram.target.map((target) => <li key={target} className="flex gap-3 text-sm leading-6 text-brand-ink/62"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-coral" />{target}</li>)}</ul></div>
              </div>
              <div className="mt-10 flex flex-col gap-3 border-t border-brand-ink/10 pt-8 sm:flex-row">
                <a href={CONSULT_URL} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto">상담 신청 <ArrowRight size={16} /></Button></a>
                {selectedProgram.landing && <a href={selectedProgram.landing.href}><Button variant="line" className="w-full sm:w-auto">{selectedProgram.landing.label} 안내</Button></a>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
