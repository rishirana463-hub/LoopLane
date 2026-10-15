import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assembleCourses } from '../src/lib/curriculum.js';

const files = ['lessons.json', 'python.json', 'java.json', 'cpp.json'];
const courses = assembleCourses(files.map(file => JSON.parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url), 'utf8'))));
const tiers = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const originalLessonIDs = new Set(Array.from({ length: 15 }, (_, index) => `js-${index + 1}`));
const lessonsOf = course => course.units.flatMap(unit => unit.lessons);
const allLessons = courses.flatMap(lessonsOf);
const allQuestions = allLessons.flatMap(lesson => lesson.questions);
const isText = value => typeof value === 'string' && value.trim().length > 0;
const validID = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);

test('four language paths provide 125 lessons and 627 questions in a stable catalog', () => {
  assert.deepEqual(courses.map(course => course.id), ['javascript-basics', 'python', 'java', 'cpp']);
  assert.deepEqual(courses.map(course => course.language), ['JavaScript', 'Python', 'Java', 'C++']);
  assert.deepEqual(courses.map(course => lessonsOf(course).length), [35, 30, 30, 30]);
  assert.deepEqual(courses.map(course => lessonsOf(course).flatMap(lesson => lesson.questions).length), [177, 150, 150, 150]);
  assert.equal(allLessons.length, 125);
  assert.equal(allQuestions.length, 627);
});

test('lesson, question and practice identifiers remain valid and unique across languages', () => {
  const progressIDs = [...allLessons.map(lesson => lesson.id), ...allQuestions.map(question => question.id)];
  for (const course of courses) {
    assert.ok(validID(course.id), course.id);
    assert.ok(validID(course.practice?.id), `${course.id} practice ID`);
    assert.ok(Number.isInteger(course.practice.xp) && course.practice.xp > 0, `${course.id} practice XP`);
    progressIDs.push(course.practice.id);
  }
  for (const id of progressIDs) assert.ok(validID(id), `Invalid progress ID: ${id}`);
  assert.equal(new Set(progressIDs).size, progressIDs.length, 'A shared identifier could mix language progress.');
});

test('every language advances through Beginner, Intermediate, Advanced and Expert units', () => {
  for (const course of courses) {
    assert.deepEqual([...new Set(course.units.map(unit => unit.level))], tiers, course.id);
    const tierNumbers = course.units.map(unit => tiers.indexOf(unit.level));
    assert.deepEqual(tierNumbers, [...tierNumbers].sort((left, right) => left - right), `${course.id} tier order`);
    for (const unit of course.units) {
      assert.ok(isText(unit.title) && isText(unit.description), unit.id);
      assert.ok(unit.lessons.length > 0, unit.id);
    }
  }
});

test('all added lessons are five-question steps with concepts, examples and valid rewards', () => {
  for (const lesson of allLessons) {
    assert.ok(isText(lesson.title) && isText(lesson.concept), lesson.id);
    assert.ok(Array.isArray(lesson.examples) && lesson.examples.length > 0 && lesson.examples.every(isText), `${lesson.id} examples`);
    assert.ok(Number.isInteger(lesson.xp) && lesson.xp > 0 && lesson.xp <= 10000, `${lesson.id} XP`);
    assert.ok(Number.isFinite(lesson.minutes) && lesson.minutes > 0, `${lesson.id} minutes`);
    if (!originalLessonIDs.has(lesson.id)) assert.equal(lesson.questions.length, 5, lesson.id);
  }
});

test('every exercise has a usable answer schema and new explanations stay under twenty words', () => {
  const types = new Set(['mcq', 'predict', 'fill', 'reorder', 'code']);
  for (const lesson of allLessons) {
    for (const question of lesson.questions) {
      const label = `${lesson.id}: ${question.id}`;
      assert.ok(types.has(question.type), `${label} unsupported type`);
      assert.ok(isText(question.prompt) && isText(question.explanation), label);
      if (!originalLessonIDs.has(lesson.id)) assert.ok(question.explanation.trim().split(/\s+/).length < 20, `${label} explanation is too long`);
      if (['mcq', 'predict', 'fill'].includes(question.type)) {
        assert.ok(Array.isArray(question.options) && question.options.length >= 2 && question.options.length <= 4, `${label} choices`);
        assert.ok(question.options.every(isText), label);
        assert.equal(new Set(question.options).size, question.options.length, `${label} repeated choices`);
      }
      if (question.type === 'mcq' || question.type === 'predict') assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, `${label} answer index`);
      if (question.type === 'predict') assert.ok(isText(question.code), `${label} missing code`);
      if (question.type === 'fill') {
        assert.ok(isText(question.code) && question.code.includes('___'), `${label} missing blank`);
        assert.ok(isText(question.answer) && question.options.includes(question.answer), `${label} fill answer`);
      }
      if (question.type === 'reorder') {
        assert.ok(Array.isArray(question.blocks) && question.blocks.length >= 2 && question.blocks.every(isText), `${label} blocks`);
        assert.ok(Array.isArray(question.answer), `${label} reorder answer`);
        assert.equal(new Set(question.blocks).size, question.blocks.length, `${label} duplicate blocks`);
        assert.deepEqual([...question.answer].sort(), [...question.blocks].sort(), `${label} answer must use each block once`);
      }
      if (question.type === 'code') {
        assert.ok(isText(question.starter) && isText(question.hint), label);
        assert.match(question.functionName, /^[A-Za-z_$][A-Za-z0-9_$]*$/, label);
        assert.ok(Array.isArray(question.tests) && question.tests.length > 0, `${label} test cases`);
        for (const example of question.tests) assert.ok(Array.isArray(example.args) && Object.hasOwn(example, 'expected'), `${label} test case shape`);
      }
    }
  }
});

test('every language mixes four guided question formats and only JavaScript offers executable exercises', () => {
  for (const course of courses) {
    const types = new Set(lessonsOf(course).flatMap(lesson => lesson.questions).map(question => question.type));
    for (const type of ['mcq', 'fill', 'reorder', 'predict']) assert.ok(types.has(type), `${course.id} missing ${type}`);
    if (course.id !== 'javascript-basics') assert.equal(types.has('code'), false, `${course.id} must not run through the JavaScript worker`);
  }
});

test('reviewed JavaScript DSA prediction snippets produce their stated answers', () => {
  const questions = lessonsOf(courses[0]).filter(lesson => !originalLessonIDs.has(lesson.id)).flatMap(lesson => lesson.questions).filter(question => question.type === 'predict');
  assert.ok(questions.length >= 20, 'Every added JavaScript DSA lesson should include an output prediction.');
  for (const question of questions) {
    const output = [];
    // Repository-authored teaching snippets only; this never executes learner input.
    vm.runInNewContext(question.code, { console: { log: (...values) => output.push(values.map(String).join(' ')) } }, { timeout: 100 });
    assert.equal(output.join('\n'), question.options[question.answer], question.id);
  }
});
