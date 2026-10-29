import { SITE } from '../config/site';
import { CAREER_COUNSELING_SLUG } from './careerCounselingPath';

export { CAREER_COUNSELING_SLUG, isCareerCounselingPath } from './careerCounselingPath';
export const CAREER_COUNSELING_PATH = `/${CAREER_COUNSELING_SLUG}/`;
export const CAREER_COUNSELING_COLLECTION = 'careerCounselingApplications';

export const CAREER_COUNSELING_PRODUCT = '진로 컨설팅';
/** Stored on the signed-in application record (owner/admin only). Not shown as a raw number on public pages. */
export const CAREER_COUNSELING_PRICE = 100000;
export const COST_GUIDE = '비용은 1회 1시간 10만 원이에요.';
export const RESOURCES_HREF = '/#resources';

/** 입금 기한이 상담 이틀 전이라, 신청일(한국 시간) 기준 3일 뒤부터 고를 수 있어요. */
export const CONSULT_LEAD_DAYS = 3;
export const CONSULT_DATE_MAX = '2027-02-28';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Calendar date in Asia/Seoul. Does not use the visitor's or the server's local timezone. */
export function kstDateString(nowMs: number = Date.now()): string {
  return new Date(nowMs + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return '';
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return next.toISOString().slice(0, 10);
}

export function consultDateMin(nowMs: number = Date.now()): string {
  return addCalendarDays(kstDateString(nowMs), CONSULT_LEAD_DAYS);
}

export function msUntilNextKstMidnight(nowMs: number = Date.now()): number {
  const kst = new Date(nowMs + KST_OFFSET_MS);
  const nextMidnight = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + 1) - KST_OFFSET_MS;
  return Math.max(nextMidnight - nowMs, 0);
}

/** 신청은 시각과 관계없이 열려 있어요. 2026-11-10 00:00 KST 자동 오픈은 쓰지 않아요. */
export function isCareerCounselingOpen(_nowMs: number = Date.now()): boolean {
  return true;
}

export const CONSULT_TIMES = [
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
] as const;

export const GRADES = ['중3', '고1'] as const;

export const SCHOOL_REGIONS = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
] as const;

export const BIZ_INFO = {
  name: SITE.name,
  ceo: SITE.founder,
  address: SITE.address,
  phone: SITE.phone,
  phoneHref: SITE.phoneHref,
  email: SITE.email,
  instagram: SITE.instagramHandle,
} as const;

export const PAGE_META = {
  title: '진로 컨설팅 (중3~고1 온라인) | 입시는세연쌤',
  description:
    '중3~고1 진로 컨설팅. 학생이 오래 붙잡는 질문과 관심 주제를 살펴 학교 선택, 과목 선택, 탐구 주제까지 방향을 정해요. 온라인 1시간, 전국 어디서나 신청할 수 있어요.',
  canonical: `${SITE.domain}${CAREER_COUNSELING_PATH}`,
};

export const ELIGIBILITY_NOTE = {
  label: '대상',
  text: '중3~고1 학생이라면 사는 지역과 상관없이 신청할 수 있어요',
} as const;

export const HERO_COPY = {
  tag: '중3~고1 · 전국 온라인',
  titleBefore: '좋아하는 분야를 오래 탐구할 질문으로',
  titleEm: '진로 컨설팅',
  lead: '중3~고1이면 사는 곳과 상관없이 신청할 수 있어요. 온라인으로 1시간, 10만 원이에요.',
  chips: ['온라인 1회 1시간', '10만 원', '진행 2일 전까지 입금'],
} as const;

export const WHY_COPY = {
  title: '좋아하는 분야를 오래 탐구할 질문으로',
  paragraphs: [
    '적성검사 결과만 보고 진로를 정하지는 않아요. 학생이 오래 붙잡고 있는 질문이 뭔지, 어떤 주제를 읽고 싶어 하는지, 자료를 어떻게 다루고 어떤 태도로 공부하는지를 같이 봐요. 그걸 바탕으로 관심 분야를 좁히고, 학교 선택과 과목 선택, 탐구 주제까지 바로 해 볼 수 있는 방향을 정해요.',
    '좋아하는 건 있는데 뭐부터 해야 할지 모르겠다는 학생, 진로가 자주 바뀌는 학생에게 잘 맞아요.',
  ],
} as const;

export const PROGRAM_INTRO = {
  title: '1시간 동안 보는 것',
  text: '관심사와 공부 성향을 먼저 파악해요. 그다음 탐구 질문을 넓히고 깊게 할 방향을 제안하고, 독서나 자료조사, 탐구 계획을 같이 세워요. 고등학교를 고를 기준도 함께 정리해요.',
} as const;

export const SCHEDULE_TITLE = '신청부터 상담까지';

export const APPLY_INTRO = '아래 항목을 신청서에 적어 주시면, 문자로 일정을 조율해요.';

export const APPLY_SUCCESS_BODY =
  '문자로 일정을 조율해 드릴게요. 진행 2일 전까지 학생 이름으로 입금해 주셔야 예약이 확정돼요. 입금 계좌는 문자로 따로 안내드려요.';

export const SUBMIT_LABEL = '진로 컨설팅 신청하기';

export const SCHOOL_PLACEHOLDER = '예: ○○중학교, ○○고등학교';
export const QUESTION_PLACEHOLDER = '진로나 공부에서 고민되는 점을 편하게 적어 주세요';
export function consultSlotHint(nowMs: number = Date.now()): string {
  const min = consultDateMin(nowMs);
  return `고르실 수 있는 상담 날짜는 ${min}부터 ${CONSULT_DATE_MAX}까지예요. 신청일(한국 시간) 기준 3일 뒤부터이고, 입금 기한이 상담 이틀 전이라 그보다 빠른 날은 받을 수 없어요. 시작 시간은 오후 3시부터 밤 10시까지예요. 문자로 일정을 조율한 뒤, 진행 2일 전까지 학생 이름으로 입금해 주셔야 예약이 확정돼요.`;
}

export const PROGRAM_STEPS = [
  {
    n: 'STEP 1',
    title: '신청서',
    items: ['로그인한 뒤 학년, 재학 학교, 희망 진로, 편한 일정 세 가지를 적어 주세요.'],
    main: false,
  },
  {
    n: 'STEP 2',
    title: '일정 확정과 입금',
    items: [
      '문자로 일정을 맞춘 다음 입금 안내를 보내 드려요.',
      '진행 2일 전까지 학생 이름으로 입금해 주셔야 예약이 확정돼요.',
      '입금 계좌는 문자로 따로 안내드려요.',
    ],
    main: true,
  },
  {
    n: 'STEP 3',
    title: '온라인 1시간',
    items: ['정해진 시간에 온라인으로 만나요.'],
    main: false,
  },
] as const;

export const SCHEDULE_CARDS = [
  { h: '대상', big: '중3~고1', p: '전국 어디서나', red: false },
  { h: '진행', big: '온라인 1시간', p: '문자로 일정 조율', red: false },
  { h: '비용', big: '10만 원', p: '진행 2일 전까지 입금', red: true },
  { h: '입금자명', big: '학생 이름', p: '입금 계좌는 문자로 따로 안내드려요', red: false },
] as const;

export const REFUND_ITEMS = [
  '진행 2일 전까지 취소하시면 전액 환불해 드려요.',
  '진행 1일 전부터 당일까지 취소하시면 환불하지 않아요.',
] as const;

export const PAY_GUIDE =
  '신청서를 내시면 문자로 일정을 조율해요. 진행 2일 전까지 학생 이름으로 입금해 주셔야 예약이 확정돼요. 입금 계좌는 문자로 따로 안내드려요.';

export const FAQS: { q: string; a: string }[] = [
  {
    q: '결제는 언제 하나요?',
    a: '일정이 정해지면 문자로 입금 안내를 보내 드려요. 진행 2일 전까지 입금해 주셔야 예약이 확정돼요.',
  },
  {
    q: '환불은 어떻게 되나요?',
    a: '진행 2일 전까지 취소하시면 전액 환불해 드려요. 진행 1일 전부터 당일까지 취소하시면 환불하지 않아요.',
  },
  {
    q: '서울·경기에 살아도 신청할 수 있나요?',
    a: '네. 온라인이라 지역 제한이 없어요.',
  },
  {
    q: '희망 진로가 아직 없어요.',
    a: '괜찮아요. 신청서에는 고민 중인 후보를 적어 주세요. 상담에서는 학생이 오래 붙잡는 질문부터 같이 찾아볼게요.',
  },
];

export type PreferredSlot = { date: string; time: string };

export type CareerCounselingApplicationInput = {
  userId: string;
  email: string;
  childName: string;
  schoolName: string;
  schoolRegion: string;
  grade: (typeof GRADES)[number];
  careerGoal: string;
  preferredSlots: [PreferredSlot, PreferredSlot, PreferredSlot];
  phone: string;
  question: string;
  privacyAgreed: boolean;
};

export function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export function formatPhone(value: string): string {
  const digits = normalizePhone(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidMobile(value: string): boolean {
  return /^01[016789]\d{7,8}$/.test(normalizePhone(value));
}

export function isKnownSchoolRegion(region: string): boolean {
  return (SCHOOL_REGIONS as readonly string[]).includes(region);
}

export function isConsultDate(date: string, nowMs: number = Date.now()): boolean {
  return !!date && date >= consultDateMin(nowMs) && date <= CONSULT_DATE_MAX;
}

export function isConsultTime(time: string): boolean {
  return (CONSULT_TIMES as readonly string[]).includes(time);
}

export function validateCareerCounselingForm(
  input: CareerCounselingApplicationInput,
  nowMs: number = Date.now(),
): string | null {
  if (!input.schoolName.trim()) return '재학 학교명을 적어 주세요.';
  if (!isKnownSchoolRegion(input.schoolRegion)) return '학교 소재 시·도를 선택해 주세요.';
  if (!(GRADES as readonly string[]).includes(input.grade)) return '학년을 선택해 주세요.';
  if (!input.careerGoal.trim()) return '희망 진로를 적어 주세요.';
  if (!isValidMobile(input.phone)) return '문자 수신 가능한 휴대폰 번호를 확인해 주세요.';
  if (!input.privacyAgreed) return '개인정보 수집·이용에 동의해 주세요.';

  const min = consultDateMin(nowMs);
  for (let i = 0; i < input.preferredSlots.length; i += 1) {
    const slot = input.preferredSlots[i];
    if (!isConsultDate(slot.date, nowMs) || !isConsultTime(slot.time)) {
      return `희망 일정 ${i + 1}의 날짜와 시작 시간을 상담 기간(${min} ~ ${CONSULT_DATE_MAX}, 15:00~22:00) 안에서 선택해 주세요.`;
    }
  }

  return null;
}

export function toCareerCounselingRecord(input: CareerCounselingApplicationInput) {
  const error = validateCareerCounselingForm(input);
  if (error) throw new Error(error);

  return {
    userId: input.userId,
    email: input.email,
    childName: input.childName,
    schoolName: input.schoolName.trim(),
    schoolRegion: input.schoolRegion,
    grade: input.grade,
    careerGoal: input.careerGoal.trim(),
    preferredSlots: input.preferredSlots,
    phone: formatPhone(input.phone),
    question: input.question.trim() || null,
    privacyAgreed: true,
    productName: CAREER_COUNSELING_PRODUCT,
    price: CAREER_COUNSELING_PRICE,
    status: 'submitted' as const,
  };
}
