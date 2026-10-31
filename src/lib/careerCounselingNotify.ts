/**
 * 정적 사이트(GitHub Pages)에서 쓰는 신청 알림.
 * Cloud Functions / Trigger Email 은 이 프로젝트에 없고, Blaze 플랜이 필요합니다.
 * FormSubmit.co AJAX 로 보내는 주소는 활성화 후 받은 랜덤 alias 입니다.
 * 활성화 전이면 FORMSUBMIT_ALIAS 가 placeholder 라 네트워크 호출을 건너뜁니다.
 * 활성화 메일의 랜덤 alias 로 이 값만 바꾸면 알림이 나갑니다.
 */
export const FORMSUBMIT_ALIAS = '98ced276c2a162b675682e1867a91498';

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

export function isFormSubmitAliasReady(alias: string = FORMSUBMIT_ALIAS): boolean {
  const trimmed = alias.trim();
  return trimmed.length > 0 && trimmed !== 'PENDING_FORMSUBMIT_ALIAS' && !trimmed.includes('@');
}

export function careerCounselingNotifyUrl(alias: string = FORMSUBMIT_ALIAS): string | null {
  if (!isFormSubmitAliasReady(alias)) return null;
  return `https://formsubmit.co/ajax/${alias.trim()}`;
}

export function buildCareerCounselingNotifyPayload(applicationId: string): Record<string, string> {
  return {
    _subject: '새 진로 컨설팅 신청 1건',
    _template: 'table',
    _captcha: 'false',
    _honey: '',
    신청_ID: applicationId,
    안내: '관리자 화면에서 확인해 주세요',
  };
}

export async function notifyCareerCounselingApplication(
  applicationId: string,
  alias: string = FORMSUBMIT_ALIAS,
): Promise<void> {
  const url = careerCounselingNotifyUrl(alias);
  if (!url) return;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(buildCareerCounselingNotifyPayload(applicationId)),
    signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => null) as { success?: string | boolean; message?: string } | null;
  const success = body?.success === true || body?.success === 'true';
  if (!response.ok || !success) {
    throw new Error(body?.message || `알림 메일을 보내지 못했어요 (${response.status})`);
  }
}
