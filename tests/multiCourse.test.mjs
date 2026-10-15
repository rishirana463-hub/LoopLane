import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProgress, normalizeProgress, refreshProgress, completeLesson,
  getLessonStatus, getLevel, recordMistake, mergeProgress, STORAGE_KEY, VERSION,
} from '../src/lib/progress.js';
import { assembleCourses, getCourse, getCourseMistakes, getNextLesson, getCourseSummary } from '../src/lib/curriculum.js';

const now = new Date(2026, 9, 15, 12).getTime();
function document(id, prefix, order) {
  return { course: { id, order, title: id, units: [{ id: `${prefix}-unit`, lessons: [1, 2].map(number => ({
    id: `${prefix}-${number}`, title: `Lesson ${number}`, xp: 20,
    questions: [{ id: `${prefix}-${number}-q1`, type: 'mcq', prompt: 'Choose the first option.', options: ['First', 'Second'], answer: 0, explanation: 'The first option is correct.' }],
  })) }] } };
}
const javascript = document('javascript-basics', 'js', 0);
const python = document('python', 'py', 1);
const java = document('java', 'java', 2);
const cpp = document('cpp', 'cpp', 3);
const finish = (progress, lessonId) => completeLesson(progress, { lessonId, xp: 20, wrongAnswers: 1 }, now).progress;

test('legacy version-one progress retains all achievements and gains the JavaScript default', () => {
  const saved = finish({ ...createProgress(now), hearts: 4, heartRefillAt: now + 1800000, dailyGoal: 30, muted: true, onboarded: true }, 'js-1');
  delete saved.activeCourseId;
  const restored = normalizeProgress(JSON.parse(JSON.stringify(saved)), now);
  assert.equal(STORAGE_KEY, 'codeleap-progress-v1');
  assert.equal(VERSION, 1);
  assert.deepEqual(restored, { ...saved, activeCourseId: 'javascript-basics' });
});

test('catalog filters unrelated documents and orders courses independently of import timing', () => {
  const courses = assembleCourses([cpp, null, { metadata: true }, java, python, javascript]);
  assert.deepEqual(courses.map(course => course.id), ['javascript-basics', 'python', 'java', 'cpp']);
  assert.deepEqual(getCourseSummary(courses[0]), { units: 1, lessons: 2, questions: 2 });
  assert.equal(cpp.course.id, 'cpp');
});

test('duplicate progress identifiers and incomplete course documents fail with useful messages', () => {
  const reusedLesson = structuredClone(python);
  reusedLesson.course.units[0].lessons[0].id = 'js-1';
  assert.throws(() => assembleCourses([javascript, reusedLesson]), /Duplicate lesson ID "js-1"/);
  const reusedQuestion = structuredClone(python);
  reusedQuestion.course.units[0].lessons[0].questions[0].id = 'js-1-q1';
  assert.throws(() => assembleCourses([javascript, reusedQuestion]), /Duplicate question ID "js-1-q1"/);
  assert.throws(() => assembleCourses([javascript, javascript]), /Duplicate course ID/);
  assert.throws(() => assembleCourses([{ course: { id: 'python', units: [] } }]), /at least one unit/);
  assert.throws(() => assembleCourses([]), /No learning courses/);
});

test('each language unlocks independently and next lesson stays within the selected path', () => {
  const state = finish(createProgress(now), 'js-1');
  assert.equal(getLessonStatus(state, javascript.course, 'js-2'), 'current');
  assert.equal(getLessonStatus(state, python.course, 'py-1'), 'current');
  assert.equal(getLessonStatus(state, python.course, 'py-2'), 'locked');
  assert.equal(getNextLesson(state, python.course).id, 'py-1');
  const pythonDone = finish(finish(state, 'py-1'), 'py-2');
  assert.equal(getNextLesson(pythonDone, python.course), null);
  assert.equal(getNextLesson(pythonDone, javascript.course).id, 'js-2');
});

test('missing or removed course selections fall back to JavaScript then the first available course', () => {
  const courses = assembleCourses([python, javascript]);
  assert.equal(getCourse(courses, 'python').id, 'python');
  assert.equal(getCourse(courses, 'removed-course').id, 'javascript-basics');
  assert.equal(getCourse([python.course], 'missing').id, 'python');
  assert.equal(getCourse([], 'missing'), null);
  assert.equal(getCourse(null, 'missing'), null);
});

test('mistakes practice includes only questions from the selected language', () => {
  const state = recordMistake(recordMistake(recordMistake(createProgress(now), 'py-1-q1'), 'js-2-q1'), 'unknown-q1');
  assert.deepEqual(getCourseMistakes(state, python.course).map(question => question.id), ['py-1-q1']);
  assert.deepEqual(getCourseMistakes(state, javascript.course).map(question => question.id), ['js-2-q1']);
  assert.deepEqual(getCourseMistakes(state, cpp.course), []);
});

test('selected course survives normalization, refresh and cloud merge as a local preference', () => {
  const local = { ...finish(createProgress(now), 'py-1'), activeCourseId: 'python' };
  const remote = { ...finish(createProgress(now), 'java-1'), activeCourseId: 'java', totalXP: 80 };
  assert.equal(normalizeProgress(local, now).activeCourseId, 'python');
  assert.equal(refreshProgress(local, now).activeCourseId, 'python');
  const merged = mergeProgress(local, remote, now);
  assert.equal(merged.activeCourseId, 'python');
  assert.equal(merged.totalXP, 80);
  assert.deepEqual(Object.keys(merged.completed).sort(), ['java-1', 'py-1']);
  assert.equal(mergeProgress(createProgress(now), remote, now).activeCourseId, 'javascript-basics');
  for (const invalid of ['', '__proto__', 'constructor', '../python', null]) {
    assert.equal(normalizeProgress({ ...local, activeCourseId: invalid }, now).activeCourseId, 'javascript-basics');
  }
});

test('XP, level, streak and hearts remain shared while completion stays isolated by lesson ID', () => {
  const first = finish(createProgress(now), 'js-1');
  const second = finish({ ...first, activeCourseId: 'python' }, 'py-1');
  const third = finish({ ...second, activeCourseId: 'cpp' }, 'cpp-1');
  assert.equal(third.totalXP, 60);
  assert.equal(getLevel(third.totalXP).level, 2);
  assert.equal(third.streak, 1);
  assert.equal(third.hearts, 5);
  assert.equal(third.activeCourseId, 'cpp');
  assert.equal(getLessonStatus(third, java.course, 'java-1'), 'current');
  assert.equal(getLessonStatus(third, cpp.course, 'cpp-1'), 'done');
  assert.equal(getLessonStatus(third, cpp.course, 'cpp-2'), 'current');
  assert.equal(first.totalXP, 20);
});
