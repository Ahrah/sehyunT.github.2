import assert from 'node:assert/strict';
import { isCareerCounselingOpen } from '../src/lib/careerCounseling';
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

assert.equal(careerCounselingPrerenderHtml, buildCareerCounselingPrerenderHtml(0));
assert.equal(careerCounselingPrerenderHtml.includes('class="apply"'), true);
assert.equal(careerCounselingPrerenderHtml.includes('11월 10일부터 신청 가능합니다.'), false);

console.log(`✅ career counseling form stays open (TZ=${process.env.TZ || 'unset'})`);
