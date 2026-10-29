const FOOTNOTE = '고입 일정은 2027학년도 경기도교육청 기준이며, 학교별 면접일은 요강에서 확인해 주세요.';

type Tone = 'study' | 'enter' | 'college' | 'mock';

function Block({
  tone,
  period,
  name,
  desc,
  targetId,
  long,
  small,
  badge,
  onSelect,
}: {
  tone: Tone;
  period?: string;
  name: string;
  desc?: string;
  targetId: string;
  long?: boolean;
  small?: boolean;
  badge?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`program-map-block program-map-block--${tone}${long ? ' program-map-block--long' : ''}${small ? ' program-map-block--small' : ''}${badge ? ' program-map-block--badge' : ''}`}
      onClick={() => onSelect(targetId)}
    >
      <span className="program-map-block-head">
        {badge && <span className="program-map-badge">3:1</span>}
        <span className="program-map-block-copy">
          {period && <span className="program-map-per">{period}</span>}
          <span className={`program-map-nm${small ? ' program-map-nm--sm' : ''}`}>{name}</span>
        </span>
      </span>
      {desc && <span className="program-map-ds">{desc}</span>}
    </button>
  );
}

function LaneTag({ children }: { children: string }) {
  return <span className="program-map-lane-tag">{children}</span>;
}

function BandDates() {
  return (
    <div className="program-map-band-dates">
      <span className="program-map-date">원서 12.4~12.10</span>
      <span className="program-map-date-dot">·</span>
      <span className="program-map-date">자소서 12.15~12.16</span>
      <span className="program-map-date">면접 12.17~12.24</span>
    </div>
  );
}

export function ProgramRoadmap({ onSelect }: { onSelect: (targetId: string) => void }) {
  return (
    <div className="program-map">
      <header className="program-map-head">
        <p className="program-map-ey">PROGRAM ROADMAP</p>
        <h3 className="program-map-title">학년별 프로그램 로드맵</h3>
      </header>

      <div className="program-map-grid" aria-label="학년별 프로그램 로드맵 표">
        <div className="program-map-bg program-map-bg--p1" />
        <div className="program-map-bg program-map-bg--p2" />
        <div className="program-map-bg program-map-bg--p3" />
        <div className="program-map-hl program-map-hl--r2" />
        <div className="program-map-hl program-map-hl--r3" />
        <div className="program-map-hl program-map-hl--r6" />
        <div className="program-map-hl program-map-hl--r7" />
        <div className="program-map-hl program-map-hl--r8" />
        <div className="program-map-hl program-map-hl--thin-r5" />
        <div className="program-map-hl program-map-hl--thin-r9" />
        <div className="program-map-vl program-map-vl--a1" />
        <div className="program-map-vl program-map-vl--l2" />
        <div className="program-map-vl program-map-vl--a3" />

        <div className="program-map-lh program-map-lh--1">
          <b>학습·진로</b>
        </div>
        <div className="program-map-lh program-map-lh--2">
          <b>고입</b>
          <span>특목·자사고</span>
        </div>
        <div className="program-map-lh program-map-lh--3">
          <b>생기부·대입</b>
        </div>

        <div className="program-map-phase program-map-phase--q1">
          <i>01</i>
          <b>
            기초
            <br />
            다지기
          </b>
          <small>중1~중2</small>
        </div>
        <div className="program-map-phase program-map-phase--q2">
          <i>02</i>
          <b>
            고입
            <br />
            승부
          </b>
          <small>중3</small>
        </div>
        <div className="program-map-phase program-map-phase--q3">
          <i>03</i>
          <b>
            대입
            <br />
            설계
          </b>
          <small>고1~고3</small>
        </div>

        <div className="program-map-gr program-map-gr--m1">중1</div>
        <div className="program-map-gr program-map-gr--m2">중2</div>
        <div className="program-map-gr program-map-gr--m3">중3</div>
        <div className="program-map-gr program-map-gr--h1">고1</div>
        <div className="program-map-gr program-map-gr--h2">고2</div>
        <div className="program-map-gr program-map-gr--h3">고3</div>

        <div className="program-map-tk program-map-tk--summer">여름방학</div>
        <div className="program-map-tk program-map-tk--winter-term">11~12월</div>
        <div className="program-map-tk program-map-tk--winter">겨울</div>
        <div className="program-map-tk program-map-tk--s1">1학기</div>
        <div className="program-map-tk program-map-tk--s2">2학기</div>

        <div className="program-map-cell program-map-cell--study">
          <Block
            tone="study"
            long
            period="중1~중3"
            name="자기주도학습 컨설팅"
            desc="학생에게 맞는 공부 방식을 찾습니다."
            targetId="program-self-study"
            onSelect={onSelect}
          />
        </div>
        <div className="program-map-cell program-map-cell--career">
          <Block
            tone="enter"
            long
            period="중1~고1"
            name="진로 컨설팅"
            desc="막연한 관심사를 구체적인 탐구 질문으로 바꿉니다."
            targetId="program-career"
            onSelect={onSelect}
          />
        </div>
        <div className="program-map-cell program-map-cell--subject">
          <Block
            tone="college"
            long
            period="고1~고2"
            name="진로선택과목 상담"
            desc="희망 전공에 맞춰 들을 과목 순서를 정합니다."
            targetId="program-subject"
            onSelect={onSelect}
          />
        </div>
        <div className="program-map-cell program-map-cell--essay">
          <Block
            tone="enter"
            period="중3 여름방학"
            name="자기소개서 집중 컨설팅"
            desc="학생이 왜 그 활동을 했고 무엇을 생각했는지 문장에 담습니다."
            targetId="program-essay"
            onSelect={onSelect}
          />
        </div>

        <div className="program-map-band" role="note">
          <div className="program-map-band-top">
            <b>중3 12월 고입 일정</b>
            <small>경기도교육청 기준</small>
          </div>
          <BandDates />
        </div>

        <div className="program-map-ivg">
          <Block
            tone="enter"
            period="원서접수 후~면접 전"
            name="특목·자사고 면접 대비"
            desc="학교별 질문에 맞춰 생각을 짧게 말하는 연습을 합니다."
            targetId="program-interview"
            onSelect={onSelect}
          />
          <div className="program-map-ivg-row">
            <Block
              tone="enter"
              small
              name="공통문항 특강"
              desc="처음 보는 질문에도 생각의 순서를 지킵니다."
              targetId="program-interview"
              onSelect={onSelect}
            />
            <Block
              tone="mock"
              small
              badge
              name="3:1 모의면접"
              desc="면접관 3명 앞에서 실제 면접처럼 답합니다."
              targetId="program-mock"
              onSelect={onSelect}
            />
          </div>
        </div>

        <div className="program-map-cell program-map-cell--prehs">
          <Block
            tone="enter"
            period="중3 겨울"
            name="고등학교 입학 전 컨설팅"
            desc="입학 전에 먼저 챙길 과목과 공부 습관을 정합니다."
            targetId="program-pre-hs"
            onSelect={onSelect}
          />
        </div>
        <div className="program-map-cell program-map-cell--record">
          <button type="button" className="program-map-block program-map-block--college program-map-block--long program-map-block--rec" onClick={() => onSelect('program-record')}>
            <span className="program-map-per">고1 1학기~고3 1학기</span>
            <span className="program-map-nm">학기별 생기부 통합 컨설팅</span>
            <span className="program-map-ds">학생부에 탐구의 깊이와 생각의 변화를 담습니다.</span>
            <span className="program-map-or">또는</span>
            <span className="program-map-nm">수행평가·생기부 상시 컨설팅</span>
            <span className="program-map-ds">제출물에 자신의 생각 과정을 담도록 돕습니다.</span>
          </button>
        </div>
        <div className="program-map-cell program-map-cell--susi">
          <Block
            tone="college"
            period="고3 1학기"
            name="대학 수시 지원 전략"
            desc="학생의 강점이 살아나는 지원 조합을 찾습니다."
            targetId="program-susi"
            onSelect={onSelect}
          />
        </div>
        <div className="program-map-cell program-map-cell--hs-mock">
          <Block
            tone="mock"
            badge
            period="고3 2학기"
            name="3:1 모의면접"
            desc="면접 직후 피드백, 1일 뒤 보고서 전달"
            targetId="program-mock"
            onSelect={onSelect}
          />
        </div>
      </div>

      <div className="program-map-stack">
        <section className="program-map-stack-phase">
          <div className="program-map-phase program-map-phase--q1">
            <i>01</i>
            <b>기초 다지기</b>
            <small>중1~중2</small>
          </div>
          <div className="program-map-stack-row">
            <p className="program-map-stack-grade">중1 · 중2</p>
            <LaneTag>학습·진로</LaneTag>
            <Block tone="study" period="중1~중3" name="자기주도학습 컨설팅" desc="학생에게 맞는 공부 방식을 찾습니다." targetId="program-self-study" onSelect={onSelect} />
          </div>
        </section>

        <section className="program-map-stack-phase">
          <div className="program-map-phase program-map-phase--q2">
            <i>02</i>
            <b>고입 승부</b>
            <small>중3</small>
          </div>
          <div className="program-map-stack-row">
            <p className="program-map-stack-grade">중3 · 여름방학</p>
            <LaneTag>학습·진로</LaneTag>
            <Block tone="study" period="중1~중3" name="자기주도학습 컨설팅" desc="학생에게 맞는 공부 방식을 찾습니다." targetId="program-self-study" onSelect={onSelect} />
            <Block tone="enter" period="중1~고1" name="진로 컨설팅" desc="막연한 관심사를 구체적인 탐구 질문으로 바꿉니다." targetId="program-career" onSelect={onSelect} />
            <LaneTag>고입 · 특목·자사고</LaneTag>
            <Block tone="enter" period="중3 여름방학" name="자기소개서 집중 컨설팅" desc="학생이 왜 그 활동을 했고 무엇을 생각했는지 문장에 담습니다." targetId="program-essay" onSelect={onSelect} />
          </div>
          <div className="program-map-band" role="note">
            <div className="program-map-band-top">
              <b>중3 12월 고입 일정</b>
              <small>경기도교육청 기준</small>
            </div>
            <BandDates />
          </div>
          <div className="program-map-stack-row">
            <p className="program-map-stack-grade">중3 · 11~12월</p>
            <LaneTag>고입 · 특목·자사고</LaneTag>
            <Block tone="enter" period="원서접수 후~면접 전" name="특목·자사고 면접 대비" desc="학교별 질문에 맞춰 생각을 짧게 말하는 연습을 합니다." targetId="program-interview" onSelect={onSelect} />
            <Block tone="enter" small name="공통문항 특강" desc="처음 보는 질문에도 생각의 순서를 지킵니다." targetId="program-interview" onSelect={onSelect} />
            <Block tone="mock" small badge name="3:1 모의면접" desc="면접관 3명 앞에서 실제 면접처럼 답합니다." targetId="program-mock" onSelect={onSelect} />
          </div>
          <div className="program-map-stack-row">
            <p className="program-map-stack-grade">중3 · 겨울</p>
            <LaneTag>고입 · 특목·자사고</LaneTag>
            <Block tone="enter" period="중3 겨울" name="고등학교 입학 전 컨설팅" desc="입학 전에 먼저 챙길 과목과 공부 습관을 정합니다." targetId="program-pre-hs" onSelect={onSelect} />
          </div>
        </section>

        <section className="program-map-stack-phase">
          <div className="program-map-phase program-map-phase--q3">
            <i>03</i>
            <b>대입 설계</b>
            <small>고1~고3</small>
          </div>
          <div className="program-map-stack-row">
            <p className="program-map-stack-grade">고1 · 고2</p>
            <LaneTag>학습·진로</LaneTag>
            <Block tone="enter" period="중1~고1" name="진로 컨설팅" desc="막연한 관심사를 구체적인 탐구 질문으로 바꿉니다." targetId="program-career" onSelect={onSelect} />
            <Block tone="college" period="고1~고2" name="진로선택과목 상담" desc="희망 전공에 맞춰 들을 과목 순서를 정합니다." targetId="program-subject" onSelect={onSelect} />
            <LaneTag>생기부·대입</LaneTag>
            <button type="button" className="program-map-block program-map-block--college program-map-block--rec" onClick={() => onSelect('program-record')}>
              <span className="program-map-per">고1 1학기~고3 1학기</span>
              <span className="program-map-nm">학기별 생기부 통합 컨설팅</span>
              <span className="program-map-ds">학생부에 탐구의 깊이와 생각의 변화를 담습니다.</span>
              <span className="program-map-or">또는</span>
              <span className="program-map-nm">수행평가·생기부 상시 컨설팅</span>
              <span className="program-map-ds">제출물에 자신의 생각 과정을 담도록 돕습니다.</span>
            </button>
          </div>
          <div className="program-map-stack-row">
            <p className="program-map-stack-grade">고3 · 1학기</p>
            <LaneTag>생기부·대입</LaneTag>
            <Block tone="college" period="고3 1학기" name="대학 수시 지원 전략" desc="학생의 강점이 살아나는 지원 조합을 찾습니다." targetId="program-susi" onSelect={onSelect} />
          </div>
          <div className="program-map-stack-row">
            <p className="program-map-stack-grade">고3 · 2학기</p>
            <LaneTag>생기부·대입</LaneTag>
            <Block tone="mock" badge period="고3 2학기" name="3:1 모의면접" desc="면접 직후 피드백, 1일 뒤 보고서 전달" targetId="program-mock" onSelect={onSelect} />
          </div>
        </section>
      </div>

      <p className="program-map-foot">{FOOTNOTE}</p>
    </div>
  );
}
