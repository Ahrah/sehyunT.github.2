import assert from 'node:assert/strict';
import { findHits, loadRules } from './style-check';

const rules = loadRules();
const jagi = rules.filter((rule) => rule.id === 'jagi');
assert.equal(jagi.length, 1, 'jagi 규칙이 있어야 합니다');

function ids(text: string) {
  return findHits(text, jagi, 'test').map((hit) => hit.match);
}

assert.deepEqual(ids('자신의 말로 정리합니다.'), [], '자신은 통과해야 합니다');
assert.deepEqual(ids('자기 말로 정리합니다.'), ['자기 말로'], '자기 말은 잡혀야 합니다');
assert.deepEqual(ids('자기소개서를 씁니다.'), [], '자기소개서는 예외입니다');
assert.deepEqual(ids('자기주도학습 컨설팅'), [], '자기주도학습은 예외입니다');
assert.deepEqual(ids('자기평가서를 제출합니다.'), [], '자기평가서는 예외입니다');
assert.deepEqual(ids('자기가 한 일을 적습니다.'), ['자기가'], '자기가는 잡혀야 합니다');
assert.deepEqual(ids('자기의 생각을 말합니다.'), ['자기의'], '자기의사는 잡혀야 합니다');

console.log('✅ style-check jagi tests passed');
