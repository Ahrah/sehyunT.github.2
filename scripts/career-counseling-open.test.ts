import assert from 'node:assert/strict';
import { consultDateMin, formatKstDateTime, isCareerCounselingOpen, isConsultDate } from '../src/lib/careerCounseling';
import {
  buildCareerCounselingPrerenderHtml,
  careerCounselingPrerenderHtml,
} from './career-counseling-prerender';

const times = [
  0,
  Date.parse('2026-11-09T14:59:59.999Z'),
  Date.parse('2026-11-09T15:00:00.000Z'),
  Date.parse('2026-11-09T15:00:00.001Z'),
  Date.UTC(2026, 10, 9, 15, 0, 0),
  Date.now(),
];

for (const now of times) {
  assert.equal(isCareerCounselingOpen(now), true);
  const html = buildCareerCounselingPrerenderHtml(now);
  assert.equal(html.includes('class="apply"'), true);
  assert.equal(html.includes('<form'), true);
  assert.equal(html.includes('11월 10일부터 신청 가능합니다.'), false);
  assert.equal(html.includes('온라인 진로·선택과목 상담'), false);
  assert.equal(html.includes('40분'), false);
  assert.equal(html.includes('비수도권'), false);
  assert.equal(html.includes('59.5'), false);
  assert.equal(html.includes('진로 컨설팅'), true);
}

const beforeKstMidnight = Date.parse('2026-10-29T14:59:59.999Z');
const atKstMidnight = Date.parse('2026-10-29T15:00:00.000Z');
assert.equal(consultDateMin(beforeKstMidnight), '2026-11-01');
assert.equal(consultDateMin(atKstMidnight), '2026-11-02');
assert.equal(isConsultDate('2026-11-01', beforeKstMidnight), true);
assert.equal(isConsultDate('2026-11-01', atKstMidnight), false);
assert.equal(isConsultDate('2027-02-28', atKstMidnight), true);
assert.equal(isConsultDate('2027-03-01', atKstMidnight), false);
assert.equal(formatKstDateTime(new Date(beforeKstMidnight), true), '2026-10-29 23:59:59 KST');
assert.equal(formatKstDateTime(new Date(atKstMidnight), true), '2026-10-30 00:00:00 KST');

assert.equal(careerCounselingPrerenderHtml, buildCareerCounselingPrerenderHtml(0));
assert.equal(careerCounselingPrerenderHtml.includes('class="apply"'), true);
assert.equal(careerCounselingPrerenderHtml.includes('11월 10일부터 신청 가능합니다.'), false);

console.log(`✅ career counseling form stays open (TZ=${process.env.TZ || 'unset'})`);
