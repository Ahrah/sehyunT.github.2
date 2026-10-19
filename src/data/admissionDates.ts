/** 2027학년도 특목·자사고 고입 일정. 학교 요강이 바뀌면 이 파일만 고치면 됩니다. */

export const ADMISSION_CYCLE = '2027학년도';
export const ADMISSION_SOURCE_NOTE =
  '2027학년도 각 학교 입학요강 기준, 변경될 수 있어요. 최종 일정은 학교 공지를 확인해 주세요.';

export type OfficeWindow = {
  id: string;
  region: string;
  apply: string;
  note?: string;
  extras?: { label: string; value: string }[];
};

export type SchoolDates = {
  id: string;
  name: string;
  apply: string;
  essay: string;
  interview: string;
  result: string;
  /** 학교 요강이 아직 없을 때 교육청 기본계획을 쓴 행 */
  officePlan?: boolean;
  note?: string;
};

export type SchoolGroup = {
  id: string;
  label: string;
  schools: SchoolDates[];
};

export const officeWindows: OfficeWindow[] = [
  {
    id: 'gyeonggi',
    region: '경기',
    apply: '12.4~12.10',
    extras: [
      { label: '1단계 발표', value: '12.14' },
      { label: '2단계 서류', value: '12.15~12.16' },
      { label: '면접', value: '12.17~12.24' },
      { label: '최종 발표', value: '12.29' },
    ],
  },
  {
    id: 'seoul',
    region: '서울',
    apply: '12.3~12.7',
    note: '외고·국제고·자사고, 변경 가능',
  },
  {
    id: 'incheon',
    region: '인천',
    apply: '12.8~12.11',
  },
  {
    id: 'gyeongbuk',
    region: '경북',
    apply: '12.7~12.11',
  },
  {
    id: 'chungnam',
    region: '충남 북일고',
    apply: '12.4~12.10',
    note: '학교 요강 기준',
  },
];

export const schoolGroups: SchoolGroup[] = [
  {
    id: 'flhs',
    label: '외고',
    schools: [
      {
        id: 'gyeonggi-flhs',
        name: '경기외고',
        apply: '12.4~12.10 17:00',
        essay: '12.15~12.16 17:00',
        interview: '12.19',
        result: '12.29 이내',
      },
      {
        id: 'seongnam-flhs',
        name: '성남외고',
        apply: '12.4~12.10',
        essay: '12.15~12.16',
        interview: '12.19',
        result: '12.29 이전',
      },
      {
        id: 'suwon-flhs',
        name: '수원외고',
        apply: '12.4 09:00~12.10 17:00',
        essay: '12.15 09:00~12.16 17:00',
        interview: '12.21(월)',
        result: '12.29 이내',
      },
      {
        id: 'goyang-flhs',
        name: '고양외고',
        apply: '12.4~12.10 17:00',
        essay: '12.15 09:00~12.16 17:00',
        interview: '12.24(목)',
        result: '12.29 이내',
      },
      {
        id: 'gwacheon-flhs',
        name: '과천외고',
        apply: '12.4~12.10 17:00',
        essay: '12.15~12.16 17:00',
        interview: '12.19(토)',
        result: '12.29 이내',
      },
      {
        id: 'gimpo-flhs',
        name: '김포외고',
        apply: '12.4~12.10',
        essay: '미확정(학교 요강 확인 전)',
        interview: '미확정(학교 요강 확인 전)',
        result: '12.29',
        officePlan: true,
        note: '경기도교육청 기본계획 기준. 경기 공통 2단계 서류 12.15~12.16, 면접 12.17~12.24.',
      },
      {
        id: 'dongducheon-flhs',
        name: '동두천외고',
        apply: '12.4~12.10 17:00',
        essay: '12.15~12.16 17:00',
        interview: '12.20(일)',
        result: '12.29',
      },
      {
        id: 'anyang-flhs',
        name: '안양외고',
        apply: '12.4 09:00~12.10 17:00',
        essay: '12.15 00:00~12.16 17:00',
        interview: '12.19(토)',
        result: '12.29 이내',
      },
    ],
  },
  {
    id: 'ih',
    label: '국제고',
    schools: [
      {
        id: 'dongtan-ih',
        name: '동탄국제고',
        apply: '12.4~12.10',
        essay: '12.15~12.16 17:00',
        interview: '12.24',
        result: '12.29',
      },
      {
        id: 'cheongshim-ih',
        name: '청심국제고',
        apply: '12.4~12.10 17:00',
        essay: '12.15~12.16 17:00',
        interview: '12.19',
        result: '12.28',
      },
      {
        id: 'goyang-ih',
        name: '고양국제고',
        apply: '12.4 09:00~12.10 17:00',
        essay: '12.15 09:00~12.16 17:00',
        interview: '12.24(목)',
        result: '12.29 이내(예정)',
      },
    ],
  },
  {
    id: 'jahago',
    label: '자사고',
    schools: [
      {
        id: 'hufs',
        name: '외대부고',
        apply: '12.4~12.10',
        essay: '12.15 09:00~12.16 17:00',
        interview: '12.19~12.20',
        result: '12.25 예정',
      },
      {
        id: 'ansan-dongsan',
        name: '안산동산고',
        apply: '12.4~12.10',
        essay: '12.15~12.16',
        interview: '12.19',
        result: '12.29 이내',
      },
      {
        id: 'incheon-haneul',
        name: '인천하늘고',
        apply: '12.8 09:00~12.11 10:00',
        essay: '12.14 16:00~12.15 16:00',
        interview: '12.22(화) (변경 가능)',
        result: '12.28 16:00',
        note: '원서는 온라인, 1단계 서류는 12.9~12.11 12:00 방문. 면접일은 변경될 수 있어요.',
      },
      {
        id: 'bugil',
        name: '북일고',
        apply: '12.4~12.10 17:00',
        essay: '원서와 함께 (1단계 서류 12.8~12.10)',
        interview: '12.28(월) 충남·사회통합 등 · 12.29(화) 타 시·도',
        result: '12.31(목)',
      },
      {
        id: 'gimcheon',
        name: '김천고',
        apply: '12.7~12.11',
        essay: '원서와 함께 12.7~12.11 17:00 우편·방문',
        interview: '12.18(금)',
        result: '12.24 14:00',
      },
      {
        id: 'hana',
        name: '하나고',
        apply: '12.3~12.7 13:00',
        essay: '12.10 17:00~12.14 10:00',
        interview: '12.21~12.22',
        result: '12.30(수)',
        note: '자기소개서는 2단계 대상자만 제출합니다.',
      },
    ],
  },
];
