/** Canonical site contact and channel URLs. Displayed strings must stay identical to current pages. */
export const SITE = {
  name: '입시는세연쌤',
  nameEn: 'SEHYUN T',
  domain: 'https://sehyunt.re.kr',
  founder: '조세연',
  adminEmail: 'ahrah0365@gmail.com',
  email: 'sehyun@sehyunt.re.kr',
  consultUrl: 'https://tally.so/r/KYrWDz',
  phone: '010-5308-6879',
  phoneHref: 'tel:01053086879',
  businessNumber: '612-69-00756',
  address: '경기도 성남시 수정구 창업로 43, 81호',
  instagramHandle: '@consultant.sy',
  instagramUrl: 'https://instagram.com/consultant.sy',
  instagramBrandUrl: 'https://www.instagram.com/ipsee.sehyunt/',
  kakaoChannelUrl: 'https://pf.kakao.com/_xbijSX',
  kakaoChannelUrlHttp: 'http://pf.kakao.com/_xbijSX',
  kakaoInterviewNoticeUrl: 'https://pf.kakao.com/_xbijSX/114866113',
  naverBlogUrl: 'https://blog.naver.com/ahrahsehyun',
  youtubeUrl: 'https://www.youtube.com/@%EC%9E%85%EC%8B%9C%EB%8A%94%EC%84%B8%EC%97%B0%EC%8C%A4',
  threadsUrl: 'https://www.threads.net/@ipsee.sehyunt',
  gaId: 'G-BTG5X3NHL5',
  blogs: [
    { name: '입시 전략 인사이트', url: 'https://blog.naver.com/ahrahsehyun' },
    { name: '논리·시사 탐구 기록', url: 'https://sehyunt-logic.tistory.com/' },
    { name: '실전 면접 아카이브', url: 'https://sehyunt-study.tistory.com/' },
  ],
} as const;

export const NOTO_SANS_KR_HREF =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400..900&display=swap';

export const NOTO_SERIF_KR_HREF =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400&display=swap';

export const PRETENDARD_HREF =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css';

export const PRETENDARD_HEAD = `
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="preload" as="style" href="${PRETENDARD_HREF}">
    <link rel="stylesheet" href="${PRETENDARD_HREF}">`;

export function ensureStylesheet(id: string, href: string, preconnectOrigin?: string) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  if (preconnectOrigin && !document.querySelector(`link[rel="preconnect"][href="${preconnectOrigin}"]`)) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = preconnectOrigin;
    preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);
  }
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'style';
  preload.href = href;
  document.head.appendChild(preload);
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function loadPretendard() {
  ensureStylesheet('pretendard-font', PRETENDARD_HREF, 'https://cdn.jsdelivr.net');
}
