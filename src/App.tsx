/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Compass,
  FileText,
  Instagram,
  Youtube,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Plus,
  ShieldAlert,
  Target,
  User as UserIcon,
  X,
} from 'lucide-react';
import { SITE, NOTO_SERIF_KR_HREF, ensureStylesheet } from './config/site';
import { HomeFocusSection } from './components/HomeFocusSection';

type AuthUser = { email: string | null; displayName: string | null };

const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const MyPage = lazy(() => import('./components/MyPage').then((m) => ({ default: m.MyPage })));
const ResourcesSection = lazy(() => import('./components/ResourcesSection').then((m) => ({ default: m.ResourcesSection })));
const LegalModal = lazy(() => import('./components/LegalModals').then((m) => ({ default: m.LegalModal })));

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

const ADMIN_EMAIL = SITE.adminEmail;

const programCategories: ProgramCategory[] = [
  {
    id: 'career',
    number: '01',
    eyebrow: '중학생 · 예비고',
    title: '진로·고입 전략',
    description: '중학교 시기는 진로 방향과 학습 방식을 정하는 시기이며, 이 시기의 탐구 경험이 고입 자기소개서의 근거가 됩니다.',
    icon: Compass,
    programs: [
      {
        title: 'Career Direction Consulting',
        subtitle: '진로 컨설팅',
        desc: '막연한 관심사를 오래 탐구할 수 있는 질문으로 바꿉니다.',
        content: '적성검사 결과만으로 진로를 정하지 않습니다. 학생이 오래 붙잡는 질문, 읽고 싶어 하는 주제, 자료를 다루는 방식과 학습 태도를 함께 살펴 관심 분야를 좁혀 갑니다. 이후 학교 선택, 과목 선택, 탐구 주제까지 실제 행동으로 옮길 수 있는 방향을 정합니다.',
        features: ['관심사·학습 성향 분석', '탐구 질문 확장·심화 방향 제안', '독서·자료조사·탐구 계획 정리', '고교 선택 기준 정리'],
        target: ['진로 방향이 자주 바뀌는 학생', '좋아하는 분야를 찾고 싶은 학생', '학업과 진로의 연결고리가 필요한 학생'],
      },
      {
        title: 'Online Career Subject Counseling',
        subtitle: '온라인 진로·선택과목 상담',
        desc: '비수도권 고1·고2를 위한 40분 온라인 화상 상담과 1장짜리 과목 이수 로드맵.',
        content: '희망 전공을 먼저 듣고, 앞으로 들을 과목의 이수 경로를 함께 설계합니다. 상담 전날까지 생기부와 희망 진로를 받아 미리 읽고, 상담이 끝나면 1장짜리 과목 이수 로드맵을 드립니다. 서울·경기·인천 외 지역 고등학교 재학생만 신청할 수 있으며, 비용은 회원가입 후 자료실에서 확인하실 수 있어요.',
        features: ['40분 온라인 화상 상담', '과목 이수 로드맵 1장', '공동교육과정·온라인학교 대안 점검', '세특·탐구와 과목 연결'],
        target: ['서울·경기·인천 외 지역 고등학교 재학생(고1·고2)', '희망 전공에 맞춰 과목을 고르고 싶은 학생', '학교에 없는 과목의 대안이 궁금한 학생'],
        landing: { href: '/jinro-counseling/', label: '온라인 진로·선택과목 상담' },
      },
      {
        title: 'Pre-High School Strategy',
        subtitle: '고등학교 입학 전 컨설팅',
        desc: '중3 겨울, 고등학교 3년의 시행착오를 줄입니다.',
        content: '진학 예정 학교의 교육과정과 활동 환경을 먼저 확인합니다. 입학 뒤 무엇을 무리하게 더할지보다, 어떤 과목에서 어떤 질문을 발전시키고 어떤 공부 습관을 먼저 잡아야 하는지 우선순위를 정합니다.',
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
    description: '학생의 학습 패턴을 진단하고, 그에 맞는 학습 전략을 함께 세웁니다.',
    icon: Target,
    programs: [
      {
        title: '1:1 Self-Directed Coaching',
        subtitle: '1:1 자기주도학습 컨설팅',
        desc: '학생에게 가장 효율적인 공부 방식을 찾습니다.',
        content: '공부를 미루는 순간, 집중이 깨지는 조건, 잘 되는 시간대와 과목별 습관을 함께 확인합니다. 누가 옆에서 계속 관리해야 움직이는 방식이 아니라, 학생이 자기 상태를 알고 스스로 조정할 수 있는 공부 루틴을 만드는 데 초점을 둡니다.',
        features: ['개인별 학습 습관 및 실행 구조 분석', '과목별 최적화 공부 방식 제안', '스트레스 및 멘탈 관리', '맞춤형 학습 루틴 및 교재 설계'],
        target: ['나만의 공부법을 찾고 싶은 학생', '실행력이 부족해 고민인 학생', '공부 동기와 진로를 연결하고 싶은 학생'],
      },
      {
        title: 'Group Learning Program',
        subtitle: '자기주도학습 그룹 프로그램',
        desc: '읽고, 질문하고, 말하면서 생각을 더 깊게 만듭니다.',
        content: '비문학과 원서를 읽고 핵심 정보를 구조화한 뒤, 서로 다른 해석을 비교하며 자신의 생각을 말로 정리합니다. 정답을 빠르게 찾는 연습보다 근거를 찾고 관점을 바꾸며 설명하는 연습에 가깝습니다.',
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
    description: '자기소개서 첨삭, 12월 모의면접, 공통문항 특강으로 특목고 입시를 준비합니다.',
    icon: MessageCircle,
    programs: [
      {
        title: 'Admissions Consulting',
        subtitle: '자기소개서 집중 컨설팅',
        desc: '무엇을 했는지보다 왜 했고 무엇을 생각했는지가 보이게 만듭니다.',
        content: '문장을 예쁘게 고치는 데서 시작하지 않습니다. 학생이 실제로 한 활동을 다시 살펴 질문의 출발점, 선택의 이유, 탐구 과정과 생각의 변화를 찾아냅니다. 그다음 문항에 필요한 내용만 남겨 학생의 말투로 정리합니다.',
        features: ['자기소개서 핵심 스토리라인 설계', '개별 경험 큐레이션 및 연결', '학교별 강조 포인트 분석', '면접 연계 질문 리스트 추출'],
        target: ['특목·자사고 지원 예정 학생', '경험은 많으나 정리가 안 되는 학생', '차별화된 서사가 필요한 학생'],
        landing: { href: '/jasoseo-consulting/', label: '자소서 컨설팅' },
      },
      {
        title: 'Interview Coaching',
        subtitle: '특목·자사고 면접 대비',
        desc: '외운 답보다 짧은 시간 안에 생각을 정리해 말하는 힘을 기릅니다.',
        content: '학교별 질문 방식과 평가 포인트를 분석한 뒤, 예상하지 못한 질문에서도 핵심을 잡고 근거를 붙여 답하는 연습을 합니다. 학생부와 자소서의 내용을 자기 말로 짧고 정확하게 설명하는 훈련까지 이어갑니다.',
        features: ['3:1 실전 모의면접', '답변 구조 및 전달력 코칭', '실전 답변 피드백', '학생부 기반 압박 질문 훈련'],
        target: ['실전 면접 경험이 부족한 학생', '논리적인 말하기가 어려운 학생', '경험의 진정성을 입증하고 싶은 학생'],
        landing: { href: '/interview-consulting/', label: '면접 컨설팅' },
      },
      {
        title: 'Common Question Program',
        subtitle: '특목·자사고 공통문항 특강',
        desc: '처음 보는 질문에도 생각의 순서를 잃지 않게 훈련합니다.',
        content: '자주 나오는 공통문항을 유형별로 나누고, 질문이 무엇을 확인하려는지부터 읽습니다. 답안을 외우지 않고 주장-근거-사례-한계의 순서를 연습해 즉석에서도 자기 생각을 만들 수 있게 합니다.',
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
    description: '세특과 수행평가를 채우는 데 그치지 않고, 질문을 만들고 자료를 찾고 더 깊게 파고든 흔적이 기록에 남도록 돕습니다.',
    icon: FileText,
    programs: [
      {
        title: 'Student Record Strategy',
        subtitle: '학기별 생기부 통합 컨설팅',
        desc: '학생부에서 탐구의 깊이와 생각의 변화가 보이게 만듭니다.',
        content: '한 학기 동안 수업에서 생긴 질문을 출발점으로 독서, 자료조사, 발표, 보고서가 어디까지 깊어질 수 있는지 봅니다. 모든 활동을 억지로 같은 주제에 묶기보다, 각 활동에서 학생이 어떤 관점으로 문제를 보고 어떻게 질문을 발전시켰는지가 기록에 드러나도록 정리합니다.',
        features: ['학기별 학생부 스토리라인 설계', '세특 및 탐구활동 주제 기획', '교과-진로 연결 활동 설계', '발표 및 보고서 방향 가이드'],
        target: ['학생부종합전형을 준비하는 학생', '활동 간 연결성이 부족한 학생', '깊이 있는 세특을 만들고 싶은 학생'],
        landing: { href: '/saenggibu-consulting/', label: '생기부 컨설팅' },
      },
      {
        title: 'Performance & Statement',
        subtitle: '수행평가·생기부 상시 컨설팅',
        desc: '무엇을 제출했는지보다 어떻게 생각했는지가 보이게 합니다.',
        content: '수행평가 주제를 정할 때부터 질문이 너무 넓거나 얕지 않은지 점검합니다. 자료의 관점을 비교하고, 한계를 찾고, 후속 질문을 만드는 과정까지 학생이 직접 해낼 수 있도록 보고서와 발표의 논리를 함께 다듬습니다.',
        features: ['수행평가 주제 구체화', '탐구 내용 구조화', '보고서 초안 피드백', '생기부 기재용 활동 요약'],
        target: ['수행평가 주제 선정이 어려운 학생', '탐구 과정을 정리하고 싶은 학생', '기록의 질을 높이고 싶은 학생'],
        landing: { href: '/saenggibu-consulting/', label: '생기부 컨설팅' },
      },
      {
        title: 'Early Admissions Strategy',
        subtitle: '대학 수시 지원 전략',
        desc: '성적과 기록을 함께 읽고, 실제 지원에서 강점이 살아나는 조합을 찾습니다.',
        content: '내신, 과목 선택, 학생부의 탐구 깊이와 면접 준비도를 함께 봅니다. 전형별로 무엇이 강점이고 어디에서 위험이 생기는지 구분해 지원 대학과 학과의 우선순위를 정합니다.',
        features: ['학생부 정성 평가', '전형별 적합도 분석', '지원 학과 및 조합 시뮬레이션', '가능성과 리스크 진단'],
        target: ['수시 지원을 앞둔 고3', '지원 대학 범위가 궁금한 학생', '전략적인 지원 조합이 필요한 학생'],
      },
    ],
  },
];

const strategySteps = [
  { number: '01', title: '관심사를 살핍니다', label: 'Discover', text: '다양한 진로 분야를 제시하고, 학생의 관심을 바탕으로 진로 방향을 정합니다.' },
  { number: '02', title: '질문을 좁힙니다', label: 'Define', text: '진로에 맞는 목표 학교와 전형을 정하고, 탐구 주제를 선정합니다.' },
  { number: '03', title: '탐구를 깊게 만듭니다', label: 'Design', text: '중3 여름방학부터 자기소개서를 첨삭합니다.' },
  { number: '04', title: '직접 연구하고 정리합니다', label: 'Do', text: '12월 모의면접으로 실전 면접을 준비합니다.' },
  { number: '05', title: '기록하고 말하는 힘으로 남깁니다', label: 'Refine', text: '고등학교 진학 후 학기 단위로 학생부종합전형 생기부를 관리합니다.' },
];

const studentCases = [
  { tag: '진로·고입', before: '관심 분야가 자주 바뀌어 무엇을 준비해야 할지 막막했던 중학생', after: '좋아하는 주제와 학습 경험을 연결해 지원 학교와 자기소개서의 중심 질문을 세웠습니다.' },
  { tag: '생기부', before: '활동은 많지만 세특과 탐구의 연결이 보이지 않았던 고등학생', after: '진로 질문을 기준으로 활동의 우선순위를 다시 잡아 학생부 전체의 일관성을 높였습니다.' },
  { tag: '자기주도학습', before: '계획은 잘 세우지만 며칠 뒤면 지쳐 포기하던 학생', after: '집중 시간과 회복 패턴을 반영한 작은 루틴으로 바꾸며 스스로 다시 시작하는 힘을 길렀습니다.' },
];


const Button = ({ children, className = '', variant = 'dark' }: { children: ReactNode; className?: string; variant?: 'dark' | 'light' | 'line' }) => {
  const variants = {
    dark: 'bg-brand-ink text-white hover:bg-brand-accent',
    light: 'bg-white text-brand-ink hover:bg-brand-mist',
    line: 'border border-brand-ink/20 text-brand-ink hover:border-brand-ink',
  };
  return <span className={`inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-7 text-sm font-bold transition-colors ${variants[variant]} ${className}`}>{children}</span>;
};

const Navbar = ({ user, onOpenAuth, onOpenAdmin, onOpenMyPage }: { user: AuthUser | null; onOpenAuth: () => void; onOpenAdmin: () => void; onOpenMyPage: () => void }) => {
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
    try {
      const [{ auth }, { signOut }] = await Promise.all([import('./lib/firebase'), import('firebase/auth')]);
      await signOut(auth);
    } catch (error) { console.error('Logout failed', error); }
  };

  const closeAnd = (action?: () => void) => {
    setIsMenuOpen(false);
    action?.();
  };

  const links = [
    ['소개', '#about'],
    ['프로그램', '#programs'],
    ['진로 상담', '/jinro-counseling/'],
    ['전략 지도', '#strategy'],
    ['자료실', '#resources'],
  ];

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-brand-ink/10 bg-brand-paper/95 py-3 backdrop-blur-xl' : 'bg-transparent py-5'}`}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3">
          <img src="/logo-mark.svg" alt="" className="h-10 w-10 object-contain" width={40} height={40} />
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
          <a href={SITE.consultUrl} target="_blank" rel="noopener noreferrer"><Button className="min-h-12 px-6">상담 신청 <ArrowUpRight size={16} /></Button></a>
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
              <a href={SITE.consultUrl} target="_blank" rel="noopener noreferrer"><Button variant="light" className="w-full">상담 신청하기 <ArrowRight size={17} /></Button></a>
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
        <motion.div {...(reduceMotion ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.65 } })} className="h-fit lg:sticky lg:top-32">
          <p className="section-label text-brand-coral">How We Work</p>
          <h2 className="mt-7 whitespace-nowrap text-[clamp(1.6rem,7.6vw,2.1rem)] font-black leading-[1.1] tracking-[-0.06em] lg:text-[2.15rem]">합격만이 아닌<br />오래 남는 성장의 설계도</h2>
          <p className="mt-8 max-w-md text-base leading-7 text-white/72">질문을 만들고, 범위를 좁히고, 자료를 비교하고, 직접 설명할 수 있을 때까지 탐구의 깊이를 만듭니다.</p>
          <div className="mt-12 hidden lg:block">
            <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="absolute inset-y-0 left-0 w-full origin-left bg-brand-coral" animate={{ scaleX: (activeStep + 1) / strategySteps.length }} style={{ transformOrigin: 'left center' }} transition={reduceMotion ? { duration: 0 } : { duration: 0.45 }} />
            </div>
            <div className="mt-4 flex justify-between text-[10px] font-bold tracking-[0.2em] text-white/60"><span>START</span><span>GROWTH</span></div>
          </div>
        </motion.div>

        <div>
          {strategySteps.map((step, index) => (
            <div key={step.number} ref={(node) => { stepRefs.current[index] = node; }} data-step={index} className="flex min-h-[42vh] border-t border-white/15 py-12 first:border-t-0 lg:min-h-[58vh] lg:py-20">
              <motion.div animate={{ opacity: activeStep === index ? 1 : 0.72, x: activeStep === index || reduceMotion ? 0 : 14 }} transition={{ duration: reduceMotion ? 0 : 0.4 }} className="grid w-full grid-cols-[auto_1fr] gap-6 sm:gap-10">
                <span className="pt-2 font-mono text-sm font-bold text-brand-coral">{step.number}</span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">{step.label}</p>
                  <h3 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{step.title}</h3>
                  <p className="mt-7 max-w-xl text-base leading-8 text-white/78 sm:text-lg">{step.text}</p>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

function afterIdle(fn: () => void, timeout: number) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 1);
  return () => window.clearTimeout(id);
}

function LazyVisible({
  id,
  fallback,
  children,
  rootMargin = '480px',
}: {
  id?: string;
  fallback: ReactNode;
  children: ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    if (id && window.location.hash === `#${id}`) {
      setShow(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShow(true);
        io.disconnect();
      }
    }, { rootMargin });
    io.observe(node);
    const onHash = () => {
      if (id && window.location.hash === `#${id}`) setShow(true);
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      io.disconnect();
      window.removeEventListener('hashchange', onHash);
    };
  }, [id, rootMargin, show]);

  return <div ref={ref}>{show ? children : fallback}</div>;
}

export default function App() {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    const start = () => {
      void Promise.all([import('./lib/firebase'), import('firebase/auth')]).then(([{ auth }, { onAuthStateChanged }]) => {
        if (cancelled) return;
        unsub = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setIsAdminOpen(currentUser?.email === ADMIN_EMAIL);
        });
      });
    };
    const cancelIdle = afterIdle(start, 2500);
    return () => {
      cancelled = true;
      unsub();
      cancelIdle();
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const card = portraitRef.current;
    if (!hero || !card) return;
    const onMove = (event: PointerEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 900) return;
      const rect = hero.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translate3d(${nx * 12}px, ${ny * 10}px, 0) rotateX(${ny * -1.6}deg) rotateY(${nx * 1.8}deg)`;
    };
    const onLeave = () => { card.style.transform = ''; };
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    return () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  useEffect(() => {
    const start = () => ensureStylesheet('sehyun-serif-font', NOTO_SERIF_KR_HREF, 'https://fonts.gstatic.com');
    return afterIdle(start, 4000);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [isAdminOpen]);

  useEffect(() => {
    const locked = isAuthModalOpen || selectedProgram || isMyPageOpen || (isAdminOpen && user?.email === ADMIN_EMAIL) || legalModalType;
    document.body.style.overflow = locked ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isAuthModalOpen, selectedProgram, isMyPageOpen, isAdminOpen, user, legalModalType]);

  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.65 } };

  return (
    <div id="top" className="min-h-screen bg-brand-paper text-brand-ink selection:bg-brand-coral/35">
      <Suspense fallback={null}>
        <AnimatePresence>{isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}</AnimatePresence>
        <AnimatePresence>{isMyPageOpen && <MyPage onClose={() => setIsMyPageOpen(false)} />}</AnimatePresence>
        <AnimatePresence>{isAdminOpen && user?.email === ADMIN_EMAIL && <AdminDashboard onBack={() => setIsAdminOpen(false)} />}</AnimatePresence>
        {legalModalType && <LegalModal isOpen type={legalModalType} onClose={() => setLegalModalType(null)} />}
      </Suspense>

      <Navbar user={user} onOpenAuth={() => setIsAuthModalOpen(true)} onOpenAdmin={() => setIsAdminOpen(true)} onOpenMyPage={() => setIsMyPageOpen(true)} />

      <main>
        <section ref={heroRef} className="hero-stage relative overflow-hidden px-6 pb-24 pt-32 sm:px-8 sm:pb-32 sm:pt-40 lg:min-h-[92vh] lg:px-12 lg:pb-20">
          <div className="hero-grid" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
            <div>
              <h1 className="mt-4 max-w-5xl text-[clamp(2.5rem,5.4vw,5.8rem)] font-black leading-[1.08] tracking-[-0.065em]">
                입시에 더해,<br /><span className="hero-emphasis hero-step-line">학생의 다음 STEP을</span><br />설계합니다.
              </h1>
              <p className="mt-9 max-w-2xl text-lg font-medium leading-[1.9] text-brand-ink/68 sm:text-xl">학생이 자기 힘으로 성장할 수 있도록, 관심사를 질문으로 바꾸고 여러 관점에서 탐구하며 스스로 연구하는 힘을 기릅니다. 그 생각의 깊이가 학생부 기록에 남고, 면접에서는 짧은 시간 안에도 분명하게 드러나도록 훈련합니다.</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a href={SITE.consultUrl} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto">상담 신청하기 <ArrowRight size={17} /></Button></a>
                <a href="#programs"><Button variant="line" className="w-full bg-white/35 sm:w-auto">프로그램 살펴보기 <ChevronDown size={17} /></Button></a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-brand-ink/10 pt-5 text-sm font-semibold text-brand-ink/65 lg:mt-12 lg:pt-6">
                <span>질문을 만드는 힘</span><span>심화탐구·연구 역량</span><span>기록·면접 표현력</span>
              </div>
            </div>

            <div ref={portraitRef} className="relative mx-auto w-[92%] max-w-[20rem] lg:mr-0 lg:w-full lg:max-w-[min(31.25rem,26.9vw)]" style={{ willChange: 'transform' }}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2.2rem] bg-brand-sand shadow-[0_35px_90px_rgba(28,34,40,0.17)]">
                <picture>
                  <source type="image/webp" srcSet="/IMG_1441-800.webp 800w, /IMG_1441.webp 1536w" sizes="(max-width: 1024px) 81vw, 27vw" />
                  <img src="/IMG_1441-800.jpg" srcSet="/IMG_1441-800.jpg 800w, /IMG_1441.jpg 1536w" sizes="(max-width: 1024px) 81vw, 27vw" alt="입시 컨설턴트 조세연" className="h-full w-full object-cover object-[center_23%]" width={800} height={1200} loading="eager" fetchPriority="high" decoding="async" />
                </picture>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-ink/85 via-brand-ink/20 to-transparent px-7 pb-7 pt-32 text-white sm:px-9 sm:pb-9">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-coral">Founder · Admissions Consultant</p>
                  <p className="mt-2 text-2xl font-black">조세연</p>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-3 max-w-[260px] rounded-3xl bg-white p-5 shadow-xl sm:-left-10 sm:p-6">
                <p className="text-sm font-normal leading-6">“학생이 감당할 수 있는 속도에 맞춰 전략을 세웁니다.”</p>
              </div>
            </div>
          </div>
        </section>

        <HomeFocusSection />

        <section id="programs" className="scroll-mt-20 bg-white py-28 sm:py-36">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <motion.div {...reveal} className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div><p className="section-label text-brand-accent">Programs</p><h2 className="programs-heading mt-6 font-black">지금 필요한 한 가지부터</h2></div>
              <p className="max-w-2xl text-lg leading-8 text-brand-ink/60 lg:ml-auto">학생의 진로, 기록, 학업 현황을 분석해 1:1로 컨설팅합니다.</p>
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
              <div><p className="section-label text-brand-accent">What Matters</p><h2 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-0.06em] sm:text-7xl">좋은 전략은<br />학생을 닮아야<br />합니다.</h2></div>
              <div className="lg:pt-16">
                <p className="belief-quote text-2xl sm:text-3xl">"학생에게 필요한 것은 그럴듯한 활동을 많이 만드는 일이 아니라, 자기 질문을 만들고 여러 관점에서 자료를 읽고 끝까지 생각해보는 경험입니다. 그 과정이 쌓이면 기록에서는 탐구의 깊이가 보이고, 면접에서는 짧은 시간 안에도 자기 생각을 설명할 수 있습니다."</p>
                <div className="mt-12 grid gap-8 border-t border-brand-ink/15 pt-10 sm:grid-cols-2">
                  <div><h3 className="text-xl font-black">깊어지는 탐구</h3><p className="mt-3 text-sm leading-7 text-brand-ink/58">넓은 관심사에서 출발해 질문을 좁히고, 자료를 비교하며 한 단계 더 깊은 후속 탐구로 나아갑니다.</p></div>
                  <div><h3 className="text-xl font-black">생각을 설명하는 힘</h3><p className="mt-3 text-sm leading-7 text-brand-ink/58">결과물을 대신 만들지 않습니다. 학생이 근거를 찾고 판단하고, 자신의 생각을 기록과 말로 설명할 수 있게 훈련합니다.</p></div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-brand-paper py-28 sm:py-36">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <motion.div {...reveal} className="max-w-3xl"><p className="section-label text-brand-accent">What Changes</p><h2 className="mt-6 text-5xl font-black tracking-[-0.06em] sm:text-6xl">숫자보다 먼저 보이는 변화</h2></motion.div>
            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {studentCases.map((item, index) => (
                <motion.article {...reveal} key={item.tag} className="flex min-h-[360px] flex-col rounded-[1.75rem] border border-brand-ink/10 bg-white p-7 sm:p-9">
                  <div className="flex items-center justify-between"><span className="rounded-full bg-brand-coral/30 px-3 py-1.5 text-xs font-black">{item.tag}</span><span className="font-mono text-xs text-brand-ink/30">0{index + 1}</span></div>
                  <p className="mt-9 text-base font-bold leading-7 text-brand-ink/62">{item.before}</p>
                  <div className="my-7 h-px bg-brand-ink/10" />
                  <p className="mt-auto text-xl font-black leading-8 tracking-[-0.025em]">“{item.after}”</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <StrategyMap />

        <LazyVisible
          id="resources"
          fallback={<section id="resources" className="scroll-mt-20 bg-brand-secondary py-40" />}
        >
          <Suspense fallback={<section id="resources" className="scroll-mt-20 bg-brand-secondary py-40" />}>
            <ResourcesSection isAdmin={user?.email === ADMIN_EMAIL} onOpenAuth={() => setIsAuthModalOpen(true)} />
          </Suspense>
        </LazyVisible>

        <section id="contact" className="relative overflow-hidden bg-brand-coral px-6 py-28 sm:px-8 sm:py-36 lg:px-12 lg:py-44">
          <div className="contact-ring" />
          <motion.div {...reveal} className="relative mx-auto max-w-5xl text-center">
            <p className="section-label">Start Here</p>
            <h2 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-0.065em] sm:text-7xl lg:text-8xl">1:1 상담 신청하기</h2>
            <p className="mx-auto mt-7 max-w-2xl text-lg font-medium leading-8 text-brand-ink/65">학생이 지금 어디에서 막혀 있는지 알려주시면, 무엇부터 확인하고 어떤 방식으로 준비하면 좋을지 안내드립니다.</p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={SITE.consultUrl} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto">상담 신청하기 <ArrowUpRight size={18} /></Button></a>
              <a href={SITE.naverBlogUrl} target="_blank" rel="noopener noreferrer"><Button variant="light" className="w-full sm:w-auto">블로그에서 더 알아보기</Button></a>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="bg-brand-ink px-6 py-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-b border-white/12 pb-12 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div><div className="flex items-center gap-3"><img src="/logo-mark-white.svg" alt="" className="h-11 w-11 object-contain" width={44} height={44} loading="lazy" /><strong className="text-2xl tracking-[-0.04em]">{SITE.name}</strong></div><p className="mt-5 max-w-md text-sm leading-7 text-white/52">특목고 입시와 학생부종합전형, 1:1 전략 컨설팅 입시는세연쌤</p></div>
            <div><h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-coral">Consulting</h3><nav className="mt-5 flex flex-col gap-3 text-sm text-white/60"><a href="/jinro-counseling/">진로·선택과목 상담</a><a href="/saenggibu-consulting/">생기부 컨설팅</a><a href="/jasoseo-consulting/">자소서 컨설팅</a><a href="/interview-consulting/">면접 컨설팅</a></nav></div>
            <div><h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-coral">Channels</h3><nav className="mt-5 flex flex-col gap-3 text-sm text-white/60">{SITE.blogs.map((blog) => <a key={blog.name} href={blog.url} target="_blank" rel="noopener noreferrer">{blog.name}</a>)}</nav></div>
          </div>
          <div className="grid gap-7 pt-9 text-xs leading-6 text-white/45 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><p>상호명 {SITE.name} · 대표 {SITE.founder} · 사업자등록번호 {SITE.businessNumber}</p><a href={`mailto:${SITE.email}`} className="mt-1 inline-flex items-center gap-2 hover:text-white"><Mail size={13} /> {SITE.email}</a><a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className="ml-5 inline-flex items-center gap-2 hover:text-white"><Instagram size={13} /> {SITE.instagramHandle}</a><a href={SITE.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube 입시는세연쌈" className="ml-5 inline-flex items-center gap-2 hover:text-white"><Youtube size={13} /> 유튜브</a></div>
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
                <a href={SITE.consultUrl} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto">상담 신청 <ArrowRight size={16} /></Button></a>
                {selectedProgram.landing && <a href={selectedProgram.landing.href}><Button variant="line" className="w-full sm:w-auto">{selectedProgram.landing.label} 안내</Button></a>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
