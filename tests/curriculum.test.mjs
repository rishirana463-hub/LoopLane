import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const data = JSON.parse(readFileSync(new URL('../src/data/lessons.json', import.meta.url), 'utf8'));
const lessons = data.course.units.flatMap(unit => unit.lessons);
const questions = lessons.flatMap(lesson => lesson.questions);
const originalUnits = data.course.units.slice(0, 4);
const originalLessons = originalUnits.flatMap(unit => unit.lessons);
const originalQuestionHashes = {
  "js-1-q1": "c8344e3a7c13d9d7523adf46343a9cba5b996c3873760d3edc4b98d6abb7f0be",
  "js-1-q2": "0d91e418bb7361c6c1cd2255983b1d3a6faad92b2896716eed4cf34e381ee772",
  "js-1-q3": "d05cd5a96be8385e1ff5e631a307ace324d1d69c2b3808a827097119ea12ffa2",
  "js-1-q4": "7b8a9dba2640f362d9e2a8e26f031a38b819360ce5a3fb14fe3771591771b257",
  "js-1-q5": "caf7a03d9c0d79bb3c748723284b11b347c0bd7f274518daa8931cd389d2c42c",
  "js-2-q1": "843a19b4d5f8e1aaf303b80a552bdbde0b13c300dc7b38e2e514dd61fee7de6b",
  "js-2-q2": "4a562116e4fdd527b76eb7f223b708ef2d71dcc70a5afe95ce4ca1eb7c135060",
  "js-2-q3": "9b47f1f5706c2e36dca45d28174df240803fbbd15b97aecdccbdad0d9997d6a4",
  "js-2-q4": "1486c1d8b078c3abd674916ff0155e88385e01468d27acc2d5e685ab24eed25a",
  "js-2-q5": "73c4f12fe80aa232394fa47a6098c8770690bb027fbe0eb0961db2231c5ffeb9",
  "js-3-q1": "a5580caebbb0fd4e9844f235fa93e10011939ba45e9e1bc4dbc5b4c7215a60c4",
  "js-3-q2": "e33bd305019180abde61f5c95eed1c23d3a7060a893ec56c5382444150e17915",
  "js-3-q3": "5b00ddd5d4233968edf321208a489dd7c81e17704d54e92886311790c7e8a11a",
  "js-3-q4": "4dfec23b917ebe6feba06537b3756b87882f228ad00db3d01205ae1c245a839c",
  "js-3-q5": "ccafb13302749b76a0fef7189a3883b04fe7596c2b5df7fd62760f8ba965917f",
  "js-4-q1": "f1efecab3f8aafda78586e812b402a0b16234085a65dd3aef2416cae50d78ebb",
  "js-4-q2": "c433c8544c6cc7f016ff2e63fb3eaedfea58e05875701eeeab41b738cb69ce41",
  "js-4-q3": "cdf53162d7422fed69b35b63107f16eb75e0abf3b441d16a0815ff488d9f10d6",
  "js-4-q4": "c2a9f2c8f0923d75178f744ea3e09f0e58f4c0f0caa6fa5e76d0db38637e3677",
  "js-4-q5": "a0cbad50e2af84014efb8777b152cefae12b366de13c06a27a408eb9cce6088b",
  "js-5-q1": "f21f3e0e1e40de82504cc5bd19b5d7bf791bf7cd2bd5d280e70fe54bd26cebf3",
  "js-5-q2": "aef7b809cd04937527e7a99d5444ed214b17ac3befed355b1974c59a4e88cd64",
  "js-5-q3": "e9fdfd594c2c76f3b5e5af430464bd3f0cd27895b9c9fe91f991a723624b6d8b",
  "js-5-q4": "7fb63a145f4297b0f87e4496c2c8b8fb8ceebac91f247b9ecfa3f8d3d97515a6",
  "js-5-q5": "288bd11f8a9d2e065bfbec4cf4703cc78ba54e3d780376062c4d4d2c7d02a1f4"
};
const convertedIds = ['js-1-q5', 'js-2-q4', 'js-4-q2', 'js-5-q3'];
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function hash(value) { return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex'); }
function runTrustedSnippet(code) {
  const output = [];
  vm.runInNewContext(code, { console: { log: (...values) => output.push(values.map(String).join(' ')) } }, { timeout: 100 });
  return output.join('\n');
}

test('the original JavaScript path retains its four units, fifteen lessons, and seventy-seven questions', () => {
  assert.equal(data.course.id, 'javascript-basics');
  assert.equal(data.course.title, 'JavaScript Basics');
  assert.deepEqual(originalUnits.map(unit => unit.title), ['Basics', 'Logic', 'Loops & Arrays', 'Objects & Methods']);
  assert.deepEqual(originalUnits.map(unit => unit.lessons.length), [3, 2, 5, 5]);
  assert.equal(originalLessons.length, 15);
  assert.equal(originalLessons.flatMap(lesson => lesson.questions).length, 77);
  assert.deepEqual(originalLessons.map(lesson => lesson.questions.length), [5,5,5,5,7,5,5,5,5,5,5,5,5,5,5]);
  const allIds = [data.course.id, ...data.course.units.map(unit => unit.id), ...lessons.map(lesson => lesson.id), ...questions.map(question => question.id)];
  assert.equal(new Set(allIds).size, allIds.length);
});

test('all twenty-five uploaded questions remain unchanged except four requested predict conversions', () => {
  assert.deepEqual(lessons.slice(0,5).map(({id,title,xp}) => ({id,title,xp})), [
    {id:'js-1',title:'Variables',xp:10}, {id:'js-2',title:'Data Types',xp:10}, {id:'js-3',title:'Operators',xp:10},
    {id:'js-4',title:'Conditionals',xp:15}, {id:'js-5',title:'Functions',xp:15}
  ]);
  for (const [id, expectedHash] of Object.entries(originalQuestionHashes)) {
    const actual = structuredClone(questions.find(question => question.id === id));
    assert.ok(actual, id);
    if (convertedIds.includes(id)) {
      assert.equal(actual.type, 'predict', id);
      assert.equal(actual.prompt, 'What is the output?', id);
      actual.type = 'mcq';
      actual.prompt += '\n\n' + actual.code;
      delete actual.code;
    }
    assert.equal(hash(actual), expectedHash, id + ' original content changed');
  }
  assert.deepEqual(lessons.slice(0,5).flatMap(lesson => lesson.questions).filter(q => q.type === 'predict').map(q => q.id), convertedIds);
});

test('every exercise has a valid answer shape and explanation', () => {
  for (const q of questions) {
    assert.ok(q.id && q.prompt && q.explanation, q.id);
    assert.ok(['mcq','predict','fill','reorder','code'].includes(q.type), q.id);
    if (q.type === 'mcq' || q.type === 'predict') {
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, q.id);
      assert.equal(new Set(q.options).size, q.options.length, q.id + ' duplicate choices');
    }
    if (q.type === 'predict') assert.ok(q.code && !q.prompt.includes('\n\n'), q.id);
    if (q.type === 'fill') {
      assert.equal(typeof q.answer, 'string', q.id);
      assert.ok(q.code.includes('___') && q.options.includes(q.answer), q.id);
    }
    if (q.type === 'reorder') {
      assert.deepEqual([...q.blocks].sort(), [...q.answer].sort(), q.id);
      assert.equal(new Set(q.blocks).size, q.blocks.length, q.id + ' duplicate blocks');
    }
  }
});

test('new lessons include all four curated exercise types and concise explanations', () => {
  for (const unit of originalUnits.slice(2)) {
    const types = new Set(unit.lessons.flatMap(lesson => lesson.questions).map(q => q.type));
    for (const type of ['mcq','fill','reorder','predict']) assert.ok(types.has(type), unit.id + ' missing ' + type);
  }
  for (const q of questions.filter(q => !Object.hasOwn(originalQuestionHashes, q.id))) {
    assert.ok(q.explanation.trim().split(/\s+/).length < 20, q.id + ' explanation must be under twenty words');
  }
  for (const lesson of lessons) assert.ok(lesson.concept && lesson.examples.length > 0 && lesson.minutes > 0, lesson.id);
});

test('new authored predict answers execute to the stated output', () => {
  // Only the new, reviewed curriculum snippets run here; uploaded question code is never evaluated.
  for (const q of lessons.slice(5).flatMap(lesson => lesson.questions).filter(q => q.type === 'predict')) {
    assert.equal(runTrustedSnippet(q.code), q.options[q.answer], q.id);
  }
});

test('new authored fill, reorder, and teaching examples execute correctly', () => {
  const fillOutputs = {'js-6-q2':'0\n1\n2','js-7-q2':'3','js-8-q2':'toast','js-9-q2':'blue','js-10-q2':'2','js-11-q2':'10','js-12-q2':'10','js-13-q2':'4','js-14-q2':'2','js-15-q2':'Hi, Asha!'};
  const reorderOutputs = {'js-6-q4':'0\n1','js-7-q4':'1\n2\n3','js-8-q4':'5','js-9-q4':'2','js-10-q4':'Sam','js-11-q4':'7','js-12-q4':'2','js-13-q4':'3','js-14-q4':'2','js-15-q4':'Hi, Asha!'};
  for (const lesson of originalLessons.slice(5)) {
    for (const q of lesson.questions) {
      if (q.type === 'fill') assert.equal(runTrustedSnippet(q.code.replace('___', q.answer)), fillOutputs[q.id], q.id);
      if (q.type === 'reorder') assert.equal(runTrustedSnippet(q.answer.join('\n')), reorderOutputs[q.id], q.id);
    }
    for (const example of lesson.examples) assert.doesNotThrow(() => runTrustedSnippet(example), lesson.id);
  }
});

test('two code exercises have valid trusted reference results including zero, negatives, and fractions', () => {
  const codeQuestions = questions.filter(q => q.type === 'code');
  assert.deepEqual(codeQuestions.map(q => q.id), ['js-5-q6','js-5-q7']);
  const trustedReferences = {add: (a,b) => a+b, double: n => n*2};
  for (const q of codeQuestions) {
    assert.ok(q.starter.includes('function ' + q.functionName + '(') && q.hint, q.id);
    assert.ok(q.tests.length >= 4, q.id);
    assert.ok(q.tests.some(t => t.args.includes(0)), q.id + ' zero case');
    assert.ok(q.tests.some(t => t.args.some(n => n < 0)), q.id + ' negative case');
    assert.ok(q.tests.some(t => t.args.some(n => !Number.isInteger(n))), q.id + ' fractional case');
    for (const t of q.tests) assert.equal(trustedReferences[q.functionName](...t.args), t.expected, q.id);
  }
});
