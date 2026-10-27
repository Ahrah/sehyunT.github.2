import { SITE } from '../config/site';
import { CAREER_COUNSELING_SLUG } from './careerCounselingPath';

export { CAREER_COUNSELING_SLUG, isCareerCounselingPath } from './careerCounselingPath';
export const CAREER_COUNSELING_PATH = `/${CAREER_COUNSELING_SLUG}/`;
export const CAREER_COUNSELING_COLLECTION = 'careerCounselingApplications';

export const CAREER_COUNSELING_PRODUCT = '온라인 진로·선택과목 상담';
/** Stored on the signed-in application record (owner/admin only). Not shown on public pages. */
export const CAREER_COUNSELING_PRICE = 60000;
export const COST_GUIDE = '비용은 회원가입 후 자료실에서 확인하실 수 있어요.';
export const RESOURCES_HREF = '/#resources';

export const APPLY_DATE_MIN = '2026-11-10';
export const APPLY_DATE_MAX = '2026-12-10';
export const CONSULT_DATE_MIN = '2026-11-25';
export const CONSULT_DATE_MAX = '2026-12-25';

/** 2026-11-10 00:00 KST. Compare Date.now() to this UTC instant; never the visitor's local timezone. */
export const CAREER_COUNSELING_OPEN_AT_MS = Date.UTC(2026, 10, 9, 15, 0, 0);
export const CAREER_COUNSELING_CLOSED_NOTICE = '11월 10일부터 신청 가능합니다.';

export function isCareerCounselingOpen(nowMs: number = Date.now()): boolean {
  return nowMs >= CAREER_COUNSELING_OPEN_AT_MS;
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
  '23:00',
] as const;

export const GRADES = ['고1', '고2'] as const;

export const SCHOOL_REGIONS = [
  '부산광역시',
  '대구광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
] as const;

export const EXCLUDED_REGIONS = ['서울특별시', '경기도', '인천광역시'] as const;

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
  title: '온라인 진로·선택과목 상담 | 입시는세연쌤',
  description:
    '비수도권 고등학교 재학생 전용. 희망 전공에서 과목 이수 경로를 역설계하는 40분 온라인 화상 상담과 1장짜리 과목 이수 로드맵.',
  canonical: `${SITE.domain}${CAREER_COUNSELING_PATH}`,
};

export const PROGRAM_STEPS = [
  {
    n: 'STEP 1 · 상담 전날까지',
    title: '자료 제출',
    items: ['학교생활기록부', '희망 진로', '학교 선택과목표 (있는 경우)'],
    main: false,
  },
  {
    n: 'STEP 2 · 40분',
    title: '온라인 화상 상담',
    items: [
      '희망 전공에서 과목 이수 경로를 역설계해요',
      '학교에 개설되지 않은 과목은 공동교육과정·온라인학교 등 대안 가능성을 점검해요',
      '세특·탐구 활동을 과목과 연결하는 방향을 잡아요',
    ],
    main: true,
  },
  {
    n: 'STEP 3 · 상담 후',
    title: '과목 이수 로드맵',
    items: ['상담 내용을 1장짜리 과목 이수 로드맵으로 정리해 드려요'],
    main: false,
  },
] as const;

export const SCHEDULE_CARDS = [
  { h: '신청 기간', big: '11/10 ~ 12/10', p: '2026년, 시즌 한정', red: false },
  { h: '상담 진행', big: '11/25 ~ 12/25', p: '온라인 화상 40분', red: false },
  { h: '대상', big: '고1 · 고2', p: '서울·경기·인천 외 지역 고등학교 재학생', red: false },
  { h: '비용', big: '자료실에서 확인', p: '회원가입 후 자료실에서 확인하실 수 있어요.', red: true },
] as const;

export const REFUND_ITEMS = [
  '상담 2일 전까지 취소하면 전액 환불해 드려요.',
  '상담 1일 전부터 당일까지 취소하면 환불하지 않아요.',
  '자격이 맞지 않으면 전액 환불해 드려요.',
] as const;

export const PAY_GUIDE =
  `신청서를 제출하시면 문자로 상담 일정을 조율해 드려요. ${COST_GUIDE} 일정이 확정되면 입금 안내를 문자로 보내 드려요.`;

export const FAQS: { q: string; a: string }[] = [
  {
    q: '집은 지방인데 학교가 서울·경기·인천에 있어요. 신청할 수 있나요?',
    a: '이 상담은 재학 중인 학교의 소재지를 기준으로 해요. 학교가 서울·경기·인천에 있으면 신청할 수 없어요. 반대로 집이 수도권이어도 학교가 그 외 지역에 있으면 신청할 수 있답니다.',
  },
  {
    q: '결제는 언제 하나요?',
    a: `신청서를 내신 뒤에는 문자로 상담 일정을 조율해요. ${COST_GUIDE} 일정이 확정되면 입금 안내와 계좌를 문자로 보내 드려요.`,
  },
  {
    q: '환불은 어떻게 되나요?',
    a: '상담 2일 전까지 취소하시면 전액 환불해 드려요. 상담 1일 전부터 당일까지 취소하시면 환불하지 않아요. 신청 자격이 맞지 않으면 전액 환불해 드려요.',
  },
  {
    q: '자격이 맞지 않는 걸 나중에 알게 되면 어떻게 되나요?',
    a: '상담 전에 신청서의 학교 정보를 확인해요. 자격 조건과 맞지 않으면 신청을 취소하고, 이미 입금하신 금액은 전액 환불해 드려요.',
  },
  {
    q: '학교 선택과목표가 없어도 괜찮을까요?',
    a: '선택과목표는 있는 경우에만 보내 주시면 돼요. 없어도 학교생활기록부와 희망 진로를 바탕으로 상담을 진행하니 걱정할 필요 없답니다.',
  },
  {
    q: '희망 전공이 아직 정해지지 않았어요.',
    a: '고민 중인 후보 전공을 적어 주세요. 후보마다 필요한 과목 흐름을 함께 살펴보고 로드맵에 정리해 드려요.',
  },
  {
    q: '상담은 어떤 방식으로 진행되나요?',
    a: '40분 온라인 화상 상담으로 진행해요. 신청서에 적어 주신 희망 일정 세 가지를 바탕으로 문자로 일정을 조율하고, 확정된 뒤에는 상담 전날까지 자료를 받아 미리 읽어 둘게요. 상담 진행 기간은 11/25~12/25예요.',
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
  eligibilityConfirmed: boolean;
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

export function isAllowedRegion(region: string): boolean {
  return (SCHOOL_REGIONS as readonly string[]).includes(region)
    && !(EXCLUDED_REGIONS as readonly string[]).includes(region);
}

export function isConsultDate(date: string): boolean {
  return !!date && date >= CONSULT_DATE_MIN && date <= CONSULT_DATE_MAX;
}

export function isConsultTime(time: string): boolean {
  return (CONSULT_TIMES as readonly string[]).includes(time);
}

export function validateCareerCounselingForm(input: CareerCounselingApplicationInput): string | null {
  if (!input.schoolName.trim()) return '재학 학교명을 적어 주세요.';
  if (!isAllowedRegion(input.schoolRegion)) {
    return '서울·경기·인천 외 지역의 고등학교만 신청할 수 있어요. 학교 소재 시·도를 다시 확인해 주세요.';
  }
  if (!(GRADES as readonly string[]).includes(input.grade)) return '학년을 선택해 주세요.';
  if (!input.careerGoal.trim()) return '희망 진로를 적어 주세요.';
  if (!isValidMobile(input.phone)) return '문자 수신 가능한 휴대폰 번호를 확인해 주세요.';
  if (!input.eligibilityConfirmed) return '신청 자격 확인에 동의해 주세요.';
  if (!input.privacyAgreed) return '개인정보 수집·이용에 동의해 주세요.';

  for (let i = 0; i < input.preferredSlots.length; i += 1) {
    const slot = input.preferredSlots[i];
    if (!isConsultDate(slot.date) || !isConsultTime(slot.time)) {
      return `희망 일정 ${i + 1}의 날짜와 시작 시간을 상담 기간(2026-11-25 ~ 2026-12-25, 15:00~23:00) 안에서 선택해 주세요.`;
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
    eligibilityConfirmed: true,
    privacyAgreed: true,
    productName: CAREER_COUNSELING_PRODUCT,
    price: CAREER_COUNSELING_PRICE,
    status: 'submitted' as const,
  };
}
