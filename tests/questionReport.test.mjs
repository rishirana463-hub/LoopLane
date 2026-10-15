import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestionReportUrl } from '../src/lib/questionReport.js';

function readReport(input) {
  const url = new URL(buildQuestionReportUrl(input));
  return { url, subject: url.searchParams.get('subject'), body: url.searchParams.get('body') };
}

test('question reports identify the lesson and question without sending anything', () => {
  const { url, subject, body } = readReport({
    lessonTitle: 'Variables', lessonId: 'js-1', questionId: 'js-1-q2',
    questionType: 'fill', prompt: 'Choose a variable name.', appVersion: '1.0.0',
  });
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'rishirana463@gmail.com');
  assert.equal(subject, 'Looplane question report: Variables');
  for (const line of ['What went wrong?', '[Describe the problem here.]', 'Lesson: Variables', 'Lesson ID: js-1', 'Question ID: js-1-q2', 'Question type: fill', 'App version: 1.0.0', 'Question prompt:\nChoose a variable name.']) {
    assert.ok(body.includes(line), `Missing report context: ${line}`);
  }
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
});

test('Unicode, ampersands, hashes, plus signs and multiline prompts survive mailto encoding', () => {
  const input = {
    lessonTitle: 'C++ & café #2', lessonId: 'cpp-2', questionId: 'cpp-2-q1', questionType: 'predict',
    prompt: 'What prints?\ncout << "你好 & # + ?";\n🙂', appVersion: '1.0.0',
  };
  const { url, subject, body } = readReport(input);
  assert.equal(subject, `Looplane question report: ${input.lessonTitle}`);
  assert.ok(body.endsWith(input.prompt));
  assert.equal(url.hash, '');
  assert.ok(url.href.includes('%26'));
  assert.ok(url.href.includes('%23'));
  assert.ok(url.href.includes('%2B'));
  assert.ok(url.href.includes('%0A'));
});

test('only public question context is included, even when private fields are supplied', () => {
  const privateValues = ['learner-secret-answer', 'private learner code', 'expected-secret-answer', 'secret-token', 'learner@example.com', 'private-progress'];
  const { body, subject } = readReport({
    lessonTitle: 'Functions', lessonId: 'js-5', questionId: 'js-5-q5', questionType: 'code', prompt: 'Write a sum function.',
    learnerAnswer: privateValues[0], code: privateValues[1], answer: privateValues[2],
    session: { access_token: privateValues[3] }, email: privateValues[4], progress: privateValues[5],
    tests: [{ args: [1, 2], expected: privateValues[2] }], storage: privateValues[3],
  });
  for (const value of privateValues) assert.equal(`${subject}\n${body}`.includes(value), false);
  assert.ok(body.endsWith('Write a sum function.'));
  assert.equal(body.includes('App version:'), false);
});

test('subject stays on one line and absent optional context does not become undefined', () => {
  const report = readReport({ lessonTitle: 'Variables\r\nBcc: other@example.com', prompt: 'First line\nSecond line' });
  assert.equal(report.subject, 'Looplane question report: Variables Bcc: other@example.com');
  assert.equal(/[\r\n]/.test(report.subject), false);
  assert.ok(report.body.endsWith('First line\nSecond line'));
  const empty = readReport();
  assert.equal(empty.subject, 'Looplane question report: Lesson');
  assert.equal(empty.body.includes('undefined'), false);
});
