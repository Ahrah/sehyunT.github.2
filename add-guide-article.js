/**
 * Script to add parent guide article to Firestore
 * Run with: node --experimental-modules add-guide-article.js
 * 
 * This adds the initial "외고·자사고 입시 컨설팅, 이렇게 고르세요" article.
 * After running once, future articles can be added via the admin UI.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Load Firebase config
const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = config.firestoreDatabaseId 
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Article content
const articleContent = `외고·국제고·자사고 입시는 일반 대입 컨설팅과 결이 다릅니다.
학교마다 전형·면접·서류 성격이 다르고, 유명 업체보다 [HIGHLIGHT]우리 아이가 지원할 학교에 맞는 준비가 결과를 가릅니다[/HIGHLIGHT].

아래는 학부모가 상담 전에 먼저 보면 좋은 기준입니다.

[H]1. 지원 학교 전문성[/H]

외대부고·하나고 같은 전국 단위 자사고와, 경기외고·성남외고·동탄국제고 같은 광역·국제고는 준비 포인트가 다릅니다.

확인할 것:
- 목표 학교의 최근 모집요강·면접 방식을 설명하는지
- 어디든 통하는 합격 공식만 반복하지 않는지
- 자소서·면접·생기부가 그 학교 인재상에 맞게 연결되는지

[H]2. 자소서 첨삭보다 활동 구조화[/H]

좋은 컨설팅은 문장만 다듬지 않습니다.
[HIGHLIGHT]생기부·탐구·동아리·독서·수행평가가 하나의 논리로 이어지게 돕습니다[/HIGHLIGHT].

흐름 예:
생기부·활동 → 탐구 경험 → 지원동기 → 진로 → 면접 답변

이 연결이 없으면 면접에서 꼬리질문에 무너지기 쉽습니다.

[H]3. 모의면접의 질[/H]

암기 답 교정만 하는 면접은 부족합니다.
[HIGHLIGHT]서류 검증 질문, 인성·상황 질문, 공통문항형 논리 질문까지 반복 훈련[/HIGHLIGHT]이 되는지 보세요.

[H]4. 최신 요강 반영[/H]

전형은 해마다, 학교마다 바뀝니다.
몇 년 전 합격 사례만 반복하는 곳은 위험합니다.
[HIGHLIGHT]상담에서 올해 기준으로 일정·자격·면접 형태를 말하는지 확인하세요[/HIGHLIGHT].

[H]세연쌤은 이 기준으로 이렇게 합니다[/H]

[HIGHLIGHT]세연쌤은 외고·자사고·국제고 고입과, 특목·자사고·일반고 학생의 대입 학생부종합(생기부)을 함께 다룹니다[/HIGHLIGHT].

[H]고입 (외고·자사고·국제고)[/H]
- 자기소개서: 경험 큐레이션, 스토리라인, 학교별 강조점
- 면접: 실전 모의면접, 답변 구조, 공통문항 논리 프레임
- 지원 전: 성향·자격·학교 적합도 점검

[H]대입 학종 (생기부)[/H]
- 학기별 생기부 스토리라인
- 수행평가·세특·탐구를 진로와 연결
- 방학 오프라인 / 학기 중 상시 관리
- 자기주도학습·멘탈까지 포함한 실행 구조

철학은 단순합니다.
스펙 나열이 아니라, 학생만의 서사와 지속 가능한 학습 시스템을 설계합니다.

대표: 조세연
사이트: http://sehyunt.re.kr/
자료실: http://sehyunt.re.kr/#materials
블로그: https://sehyunt-study.tistory.com/
관련 글: https://sehyunt-study.tistory.com/38

[H]상담 전에 준비하면 좋은 것[/H]
1. 목표 학교 후보 2~3곳
2. 최근 생기부·활동 요약 (고입이라면 중학교 활동)
3. 가장 걱정되는 지점 (자소서 / 면접 / 생기부 / 학습 루틴)

같은 질문에 업체 이름만 찾는 대신, [HIGHLIGHT]우리 아이에 맞는 준비 구조를 먼저 고르세요[/HIGHLIGHT].
그다음이 컨설턴트·프로그램 선택입니다.

문의·상담 신청은 사이트에서 가능합니다.
http://sehyunt.re.kr/`;

async function addGuideArticle() {
  try {
    console.log('Adding parent guide article to Firestore...');
    
    const docRef = await addDoc(collection(db, 'resources'), {
      title: '외고·자사고 입시 컨설팅, 이렇게 고르세요',
      description: '외고·자사고·국제고 입시 컨설팅을 선택할 때 학부모가 먼저 확인해야 할 핵심 기준과 세연쌤의 차별화된 접근법을 소개합니다.',
      fileUrl: '#',
      fileName: 'parent-guide.article',
      fileType: 'article',
      content: articleContent,
      storagePath: null,
      createdAt: new Date()
    });

    console.log('✅ Article added successfully with ID:', docRef.id);
    console.log('📍 You can view it at: http://sehyunt.re.kr/#resources');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding article:', error);
    process.exit(1);
  }
}

addGuideArticle();
