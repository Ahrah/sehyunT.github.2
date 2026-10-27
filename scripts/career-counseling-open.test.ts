import assert from 'node:assert/strict';
import {
  CAREER_COUNSELING_CLOSED_NOTICE,
  CAREER_COUNSELING_OPEN_AT_MS,
  isCareerCounselingOpen,
} from '../src/lib/careerCounseling';
import {
  buildCareerCounselingPrerenderHtml,
  careerCounselingPrerenderHtml,
} from './career-counseling-prerender';

assert.equal(CAREER_COUNSELING_OPEN_AT_MS, Date.UTC(2026, 10, 9, 15, 0, 0));
assert.equal(new Date(CAREER_COUNSELING_OPEN_AT_MS).toISOString(), '2026-11-09T15:00:00.000Z');
assert.equal(CAREER_COUNSELING_OPEN_AT_MS, Date.parse('2026-11-09T15:00:00.000Z'));

const before = Date.parse('2026-11-09T14:59:59.999Z');
const at = Date.parse('2026-11-09T15:00:00.000Z');
const after = Date.parse('2026-11-09T15:00:00.001Z');

assert.equal(isCareerCounselingOpen(before), false);
assert.equal(isCareerCounselingOpen(at), true);
assert.equal(isCareerCounselingOpen(after), true);
assert.equal(isCareerCounselingOpen(CAREER_COUNSELING_OPEN_AT_MS - 1), false);
assert.equal(isCareerCounselingOpen(CAREER_COUNSELING_OPEN_AT_MS), true);

assert.equal(careerCounselingPrerenderHtml.includes(CAREER_COUNSELING_CLOSED_NOTICE), true);
assert.equal(careerCounselingPrerenderHtml.includes('class="apply"'), false);

const closedHtml = buildCareerCounselingPrerenderHtml(before);
assert.equal(closedHtml.includes(CAREER_COUNSELING_CLOSED_NOTICE), true);
assert.equal(closedHtml.includes('<form'), false);
assert.equal(closedHtml.includes('class="apply"'), false);

const openHtml = buildCareerCounselingPrerenderHtml(at);
assert.equal(openHtml.includes('class="apply"'), true);
assert.equal(openHtml.includes('<form'), true);
assert.equal(openHtml.includes(CAREER_COUNSELING_CLOSED_NOTICE), false);

console.log(`✅ career counseling date gate passed (TZ=${process.env.TZ || 'unset'})`);
