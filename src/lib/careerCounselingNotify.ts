import {
  careerCounselingStatusLabel,
  formatKstDateTime,
  formatPreferredSlots,
} from './careerCounseling';

/**
 * 정적 사이트(GitHub Pages)에서 쓰는 신청 알림.
 * Cloud Functions / Trigger Email 은 이 프로젝트에 없고, Blaze 플랜이 필요합니다.
 * FormSubmit.co 는 API 키 없이 받는 주소로 메일을 보냅니다.
 * 처음 한 번은 consultantsyssam@gmail.com 으로 활성화 메일이 가고, 링크를 눌러야 신청 메일이 도착합니다.
 */
export const CAREER_COUNSELING_NOTIFY_EMAIL = 'consultantsyssam@gmail.com';

const NOTIFY_URL = `https://formsubmit.co/ajax/${CAREER_COUNSELING_NOTIFY_EMAIL}`;
const NOTIFY_TIMEOUT_MS = 8000;

export type CareerCounselingNotifyInput = {
  userId: string;
  email: string;
  childName: string;
  schoolName: string;
  schoolRegion: string;
  grade: string;
  careerGoal: string;
  preferredSlots: readonly { date: string; time: string }[];
  phone: string;
  question: string | null;
  privacyAgreed: boolean;
  productName: string;
  price: number;
  status: string;
};

export function buildCareerCounselingNotifyPayload(
  record: CareerCounselingNotifyInput,
  submittedAt: Date = new Date(),
  applicationId?: string,
): Record<string, string> {
  const name = record.childName.trim() || '이름 없음';
  const submittedAtKst = formatKstDateTime(submittedAt, true);
  const fields: Record<string, string> = {
    _subject: `[입시는세연쌤] 새 진로 컨설팅 신청 - ${name}`,
    _template: 'table',
    _captcha: 'false',
    _replyto: record.email,
    name,
    학생_이름: name,
    계정_이메일: record.email,
    휴대폰: record.phone,
    학년: record.grade,
    재학_학교: record.schoolName,
    학교_소재: record.schoolRegion,
    희망_진로: record.careerGoal,
    질문: record.question?.trim() || '(없음)',
    희망_일정: formatPreferredSlots(record.preferredSlots),
    상품: record.productName,
    금액: `${record.price.toLocaleString('ko-KR')}원`,
    상태: careerCounselingStatusLabel(record.status),
    개인정보_동의: record.privacyAgreed ? '동의' : '미동의',
    회원_ID: record.userId,
    신청_시각_KST: submittedAtKst,
  };
  if (applicationId) fields.신청_ID = applicationId;
  return fields;
}

export async function notifyCareerCounselingApplication(
  record: CareerCounselingNotifyInput,
  submittedAt: Date = new Date(),
  applicationId?: string,
): Promise<void> {
  const response = await fetch(NOTIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(buildCareerCounselingNotifyPayload(record, submittedAt, applicationId)),
    signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => null) as { success?: string | boolean; message?: string } | null;
  const success = body?.success === true || body?.success === 'true';
  if (!response.ok || !success) {
    throw new Error(body?.message || `알림 메일을 보내지 못했어요 (${response.status})`);
  }
}
