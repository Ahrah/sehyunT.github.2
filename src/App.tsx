/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Instagram,
  LogOut,
  Mail,
  Menu,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { SITE } from './config/site';
import { ProgramsSection } from './components/ProgramsSection';

type AuthUser = { email: string | null; displayName: string | null };

const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const MyPage = lazy(() => import('./components/MyPage').then((m) => ({ default: m.MyPage })));
const ResourcesSection = lazy(() => import('./components/ResourcesSection').then((m) => ({ default: m.ResourcesSection })));
const LegalModal = lazy(() => import('./components/LegalModals').then((m) => ({ default: m.LegalModal })));

const ADMIN_EMAIL = SITE.adminEmail;

const strategySteps = [
  { number: '01', title: '학생을 읽습니다', label: 'Discover', text: '다양한 진로 분야를 제시하고, 학생의 관심을 바탕으로 진로 방향을 정합니다.' },
  { number: '02', title: '핵심 질문을 찾습니다', label: 'Define', text: '진로에 맞는 목표 학교와 전형을 정하고, 탐구 주제를 선정합니다.' },
  { number: '03', title: '성장의 흐름을 설계합니다', label: 'Design', text: '중3 여름방학부터 자기소개서를 첨삭합니다.' },
  { number: '04', title: '학생의 언어로 실행합니다', label: 'Do', text: '12월 모의면접으로 실전 면접을 준비합니다.' },
  { number: '05', title: '끝까지 점검하고 다듬습니다', label: 'Refine', text: '고등학교 진학 후 학기 단위로 학생부종합전형 생기부를 관리합니다.' },
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
        <div className="h-fit lg:sticky lg:top-32">
          <p className="section-label text-brand-coral">Sehyun T Strategy Map</p>
          <h2 className="mt-7 whitespace-nowrap text-[clamp(1.6rem,7.6vw,2.1rem)] font-black leading-[1.1] tracking-[-0.06em] lg:text-[2.15rem]">합격만이 아닌<br />오래 남는 성장의 설계도</h2>
          <p className="mt-8 max-w-md text-base leading-7 text-white/72">상담은 정답을 대신 주는 일이 아닙니다. 학생이 자기 방향을 이해하고 다음 선택을 해낼 수 있도록 다섯 단계를 함께 걷습니다.</p>
          <div className="mt-12 hidden lg:block">
            <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="absolute inset-y-0 left-0 bg-brand-coral" animate={{ width: `${((activeStep + 1) / strategySteps.length) * 100}%` }} transition={reduceMotion ? { duration: 0 } : { duration: 0.45 }} />
            </div>
            <div className="mt-4 flex justify-between text-[10px] font-bold tracking-[0.2em] text-white/60"><span>START</span><span>GROWTH</span></div>
          </div>
        </div>

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

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    void Promise.all([import('./lib/firebase'), import('firebase/auth')]).then(([{ auth }, { onAuthStateChanged }]) => {
      if (cancelled) return;
      unsub = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setIsAdminOpen(currentUser?.email === ADMIN_EMAIL);
      });
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [isAdminOpen]);

  useEffect(() => {
    const locked = isAuthModalOpen || isMyPageOpen || (isAdminOpen && user?.email === ADMIN_EMAIL) || legalModalType;
    document.body.style.overflow = locked ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isAuthModalOpen, isMyPageOpen, isAdminOpen, user, legalModalType]);

  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.65 } };

  return (
    <div id="top" className="min-h-screen bg-brand-paper text-brand-ink selection:bg-brand-coral/35">
      <Suspense fallback={null}>
        <AnimatePresence>{isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}</AnimatePresence>
        <AnimatePresence>{isMyPageOpen && <MyPage onClose={() => setIsMyPageOpen(false)} />}</AnimatePresence>
        <AnimatePresence>{isAdminOpen && user?.email === ADMIN_EMAIL && <AdminDashboard onBack={() => setIsAdminOpen(false)} />}</AnimatePresence>
        <LegalModal isOpen={!!legalModalType} type={legalModalType} onClose={() => setLegalModalType(null)} />
      </Suspense>

      <Navbar user={user} onOpenAuth={() => setIsAuthModalOpen(true)} onOpenAdmin={() => setIsAdminOpen(true)} onOpenMyPage={() => setIsMyPageOpen(true)} />

      <main>
        <section className="relative overflow-hidden px-6 pb-24 pt-32 sm:px-8 sm:pb-32 sm:pt-40 lg:min-h-[92vh] lg:px-12 lg:pb-20">
          <div className="hero-orbit hero-orbit-one" />
          <div className="hero-orbit hero-orbit-two" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-ink/12 bg-white/70 px-4 py-2 text-xs font-bold backdrop-blur"><Sparkles size={14} className="text-brand-accent" /> 학생마다 다른 길을 설계합니다</div>
              <h1 className="mt-8 max-w-4xl text-[clamp(3.45rem,7vw,7.5rem)] font-black leading-[0.92] tracking-[-0.075em]">
                입시가 아니라,<br /><span className="hero-emphasis">학생의 다음</span>을<br />설계합니다.
              </h1>
              <p className="mt-8 max-w-xl text-lg font-medium leading-8 text-brand-ink/62 sm:text-xl">진로·학습·기록·면접을 따로 보지 않습니다. 학생이 자기 힘으로 성장할 수 있도록 하나의 흐름으로 연결합니다.</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a href={SITE.consultUrl} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto">상담 신청하기 <ArrowRight size={17} /></Button></a>
                <a href="#programs"><Button variant="line" className="w-full bg-white/35 sm:w-auto">프로그램 살펴보기 <ChevronDown size={17} /></Button></a>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-brand-ink/10 pt-6 text-sm font-semibold text-brand-ink/65">
                <span>진로에서 입시까지</span><span>학생 중심 1:1 설계</span><span>실행과 기록의 연결</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[610px] lg:mr-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2.2rem] bg-brand-sand shadow-[0_35px_90px_rgba(28,34,40,0.17)]">
                <picture>
                  <source srcSet="/IMG_1441.webp" type="image/webp" />
                  <img src="/IMG_1441.jpg" alt="입시 컨설턴트 조세연" className="h-full w-full object-cover object-[center_23%]" width={1536} height={2304} loading="eager" fetchPriority="high" decoding="async" />
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

        <ProgramsSection />

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
            <motion.div {...reveal} className="max-w-3xl"><p className="section-label text-brand-accent">Student Changes</p><h2 className="mt-6 text-5xl font-black tracking-[-0.06em] sm:text-6xl">숫자보다 먼저 보이는 변화</h2></motion.div>
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

        <Suspense fallback={<section id="resources" className="scroll-mt-20 bg-brand-secondary py-40" />}>
          <ResourcesSection isAdmin={user?.email === ADMIN_EMAIL} onOpenAuth={() => setIsAuthModalOpen(true)} />
        </Suspense>

        <section id="contact" className="relative overflow-hidden bg-brand-coral px-6 py-28 sm:px-8 sm:py-36 lg:px-12 lg:py-44">
          <div className="contact-ring" />
          <motion.div {...reveal} className="relative mx-auto max-w-5xl text-center">
            <p className="section-label">Start a Conversation</p>
            <h2 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-0.065em] sm:text-7xl lg:text-8xl">1:1 상담 신청하기</h2>
            <p className="mx-auto mt-7 max-w-2xl text-lg font-medium leading-8 text-brand-ink/65">현재 상황과 고민을 남겨주시면, 어떤 프로그램이 필요한지부터 차근차근 안내드립니다.</p>
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
            <div><p>상호명 {SITE.name} · 대표 {SITE.founder} · 사업자등록번호 {SITE.businessNumber}</p><a href={`mailto:${SITE.email}`} className="mt-1 inline-flex items-center gap-2 hover:text-white"><Mail size={13} /> {SITE.email}</a><a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className="ml-5 inline-flex items-center gap-2 hover:text-white"><Instagram size={13} /> {SITE.instagramHandle}</a></div>
            <div className="flex flex-wrap gap-5"><button onClick={() => setLegalModalType('terms')} className="hover:text-white">이용약관</button><button onClick={() => setLegalModalType('privacy')} className="hover:text-white">개인정보처리방침</button><span>© {new Date().getFullYear()} SEHYUN T</span></div>
          </div>
        </div>
      </footer>

    </div>
  );
}
