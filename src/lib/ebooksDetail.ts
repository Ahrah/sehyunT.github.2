/**
 * 전자책 상세 화면(/ebooks/<id>/) 데이터.
 * 제목·쪽수·목차는 2026-11-05 변경 목록과 같습니다. 장 제목과 시작 쪽만 적습니다.
 * 샘플 이미지는 public/ebooks/samples/<id>-p<쪽>.webp 입니다.
 * blurred 는 본문을 모자이크로 가린 쪽입니다(변경 목록의 mosaic 쪽).
 * PDF 파일은 저장소에 넣지 않습니다. 샘플이 없으면 samples 를 비워 두면 화면에 '샘플 준비 중'이 나옵니다.
 */
import { EBOOKS, type Ebook } from './ebooks';

export type TocItem = { label: string; title: string; page: number };
/** blurred: 내용을 읽기 어렵게 모자이크로 가린 쪽입니다. */
export type SamplePage = { page: number; src: string; caption: string; blurred?: boolean };
export type EbookDetail = {
  id: string;
  /** 이런 분께 맞습니다 */
  audience: string[];
  /** 이 책의 기준(완성본 2쪽 '이 책을 읽기 전에'에서 옮김) */
  basis: string[];
  toc: TocItem[];
  samples: SamplePage[];
};

const sample = (id: string, page: number, caption: string, blurred = false): SamplePage => ({
  page,
  src: `/ebooks/samples/${id}-p${page}.webp`,
  caption,
  ...(blurred ? { blurred: true } : {}),
});

/** 샘플 쪽이 들어 있는 장의 제목 */
function captionFor(toc: readonly TocItem[], page: number): string {
  let hit = toc[0];
  for (const t of toc) if (t.page <= page) hit = t;
  return hit.label ? `${hit.label} ${hit.title}` : hit.title;
}

const PARTS: readonly { label: string; title: string }[] = [
  { label: 'PART 0', title: '한 장 요약' },
  { label: 'PART 1', title: '내 점수 계산해 보기' },
  { label: 'PART 2', title: '면접관은 내 자소서를 어떻게 읽는가' },
  { label: 'PART 3', title: '자소서 쓰기' },
  { label: 'PART 4', title: '내 문장이 질문으로 바뀌는 예 5세트' },
  { label: 'PART 5', title: '면접' },
  { label: 'PART 6', title: '원서접수 준비 step by step' },
  { label: 'PART 7', title: 'D-day 점검표' },
  { label: 'PART 8', title: '다음 단계' },
];

type SchoolSpec = {
  id: string;
  school: string;
  /** PART 0~8 시작 쪽 */
  parts: [number, number, number, number, number, number, number, number, number];
  /** [쪽, 모자이크 여부] */
  samples: readonly (readonly [number, boolean])[];
};

/** 학교별 가이드 8권은 같은 장 제목입니다. 시작 쪽만 책마다 다릅니다. */
const SCHOOLS: SchoolSpec[] = [
  { id: 'gyeonggi', school: '경기외고', parts: [3, 5, 7, 8, 15, 16, 19, 30, 31], samples: [[4, true], [8, false], [10, true], [16, true], [19, false]] },
  { id: 'goyang', school: '고양외고', parts: [3, 5, 7, 8, 15, 16, 19, 22, 23], samples: [[4, true], [8, false], [10, true], [16, true], [19, false]] },
  { id: 'gwacheon', school: '과천외고', parts: [3, 5, 7, 8, 15, 16, 19, 23, 24], samples: [[4, true], [8, false], [11, true], [16, true], [19, false]] },
  { id: 'gimpo', school: '김포외고', parts: [3, 6, 8, 9, 15, 16, 19, 24, 25], samples: [[3, true], [9, false], [11, true], [16, true], [19, false]] },
  { id: 'dongducheon', school: '동두천외고', parts: [3, 5, 7, 8, 15, 16, 19, 23, 24], samples: [[4, true], [8, false], [10, true], [16, true], [19, false]] },
  { id: 'seongnam', school: '성남외고', parts: [3, 5, 7, 8, 14, 15, 18, 21, 22], samples: [[4, true], [8, false], [10, true], [15, true], [18, false]] },
  { id: 'suwon', school: '수원외고', parts: [3, 5, 7, 8, 14, 15, 18, 21, 22], samples: [[4, true], [8, false], [10, true], [15, true], [18, false]] },
  { id: 'anyang', school: '안양외고', parts: [3, 6, 8, 9, 16, 17, 19, 22, 23], samples: [[4, true], [9, false], [11, true], [17, true], [19, false]] },
];

function schoolDetail(s: SchoolSpec): EbookDetail {
  const toc: TocItem[] = PARTS.map((p, i) => ({ label: p.label, title: p.title, page: s.parts[i] }));
  return {
    id: s.id,
    audience: [
      `${s.school} 2027학년도 일반전형에 지원하려는 학생과 학부모님`,
      '자기소개서를 쓰고 면접을 준비하는 학생',
      '내 점수를 직접 계산해 보고 원서접수 일정을 확인하려는 분',
    ],
    basis: [
      `${s.school} 「2027학년도 신입생 입학전형요항」과 경기도교육청 「2027학년도 경기도 고등학교 입학전형 기본계획」이 기준입니다.`,
      '일반전형 기준입니다. 다른 전형 지원자는 학교 요항을 따로 확인해야 합니다.',
      '사실과 세연쌤의 해석을 나눠 적었습니다. 예시 학생과 점수는 모두 가상입니다.',
      '자료 기준일은 2026년 10월 29일입니다.',
    ],
    toc,
    samples: s.samples.map(([page, blurred]) => sample(s.id, page, captionFor(toc, page), blurred)),
  };
}

const COMPARE_TOC: TocItem[] = [
  { label: '0장', title: '이 책을 쓰는 법', page: 3 },
  { label: '1장', title: '한눈에 보는 2027 일정', page: 5 },
  { label: '2장', title: '외고 공통 규칙', page: 7 },
  { label: '3장', title: '점수 환산 완전 정리', page: 11 },
  { label: '4장', title: '비교표① 학과별 일반전형 인원', page: 14 },
  { label: '5장', title: '비교표② 1단계 배수·출결 가중치', page: 16 },
  { label: '6장', title: '비교표③ 자소서 글자 수·문항 구조', page: 20 },
  { label: '7장', title: '비교표④ 면접 일정·영역별 배점·동점자', page: 21 },
  { label: '8장', title: '학교별 1쪽 프로필', page: 27 },
  { label: '9장', title: '학교 고르는 나만의 점검표', page: 36 },
  { label: '10장', title: '원서접수 준비와 접수 방법', page: 38 },
  { label: '11장', title: '자소서는 면접 대본이다', page: 44 },
  { label: '마지막 장', title: '유의할 점', page: 45 },
  { label: '12장', title: '다음 단계', page: 47 },
];

const COMPARE: EbookDetail = {
  id: 'compare',
  audience: [
    '경기권 외고 8개교 가운데 지원할 학교를 고르는 학생과 학부모님',
    '학교별 인원·1단계 배수·출결 가중치·자기소개서 글자 수·면접 배점을 한곳에서 비교하려는 분',
  ],
  basis: [
    '각 학교 「2027학년도 신입생 입학전형요항」과 경기도교육청 「2027학년도 경기도 고등학교 입학전형 기본계획」이 기준입니다.',
    '일반전형 기준입니다. 다른 전형 지원자는 학교 요항을 따로 확인해야 합니다.',
    '사실과 세연쌤의 해석을 나눠 적었습니다.',
    '자료 기준일은 2026년 10월 29일입니다.',
  ],
  toc: COMPARE_TOC,
  // 25·27쪽은 본문을 모자이크로 가렸습니다.
  samples: ([
    [14, false],
    [18, false],
    [20, false],
    [25, true],
    [27, true],
    [40, false],
    [44, false],
  ] as const).map(([page, blurred]) => sample('compare', page, captionFor(COMPARE_TOC, page), blurred)),
};

export const EBOOK_DETAILS: readonly EbookDetail[] = [COMPARE, ...SCHOOLS.map(schoolDetail)];

export function detailById(id: string): EbookDetail | undefined {
  return EBOOK_DETAILS.find((d) => d.id === id);
}

/** 상세 화면 주소 */
export function detailPath(id: string): string {
  return `/ebooks/${id}/`;
}

/** 상세 화면의 '구매하기' 주소: 판매 페이지 주문서에서 이 책을 미리 골라 둡니다. */
export function buyPath(id: string): string {
  return `/ebooks/?book=${encodeURIComponent(id)}#eb-form`;
}

/** '/ebooks/goyang/' → 'goyang'. 상세 화면이 아니면 null. */
export function detailIdFromPath(pathname: string, books: readonly Ebook[] = EBOOKS): string | null {
  const m = /^\/ebooks\/([a-z0-9-]+)\/?(?:index\.html)?$/.exec(pathname);
  if (!m) return null;
  return books.some((b) => b.id === m[1]) && detailById(m[1]) ? m[1] : null;
}

/** '?book=goyang' → ['goyang']. 모르는 id 면 빈 배열. */
export function preselectFromSearch(search: string, books: readonly Ebook[] = EBOOKS): string[] {
  const id = new URLSearchParams(search).get('book') || '';
  const b = books.find((x) => x.id === id);
  return b && b.price != null ? [b.id] : [];
}
