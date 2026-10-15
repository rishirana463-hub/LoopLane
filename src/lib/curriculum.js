import { getLessonStatus } from './progress.js';

const DEFAULT_COURSE_ID = 'javascript-basics';
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validID = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const lessonsOf = course => Array.isArray(course?.units) ? course.units.flatMap(unit => unit.lessons || []) : [];

function registerID(seen, value, kind, context) {
  if (!validID(value)) throw new Error(`Invalid ${kind} ID in ${context}.`);
  if (seen.has(value)) throw new Error(`Duplicate ${kind} ID "${value}" in ${context}.`);
  seen.add(value);
}

/** Keep non-course JSON out of the catalog and reject ambiguous progress IDs. */
export function assembleCourses(documents) {
  if (!Array.isArray(documents)) throw new Error('The course catalog must be a list of documents.');
  const courses = [];
  const courseIDs = new Set(), lessonIDs = new Set(), questionIDs = new Set();
  for (const document of documents) {
    if (!isRecord(document) || !Object.hasOwn(document, 'course')) continue;
    const course = document.course;
    if (!isRecord(course) || !Array.isArray(course.units) || !course.units.length) throw new Error('A course must contain at least one unit.');
    registerID(courseIDs, course.id, 'course', 'the catalog');
    const unitIDs = new Set();
    for (const unit of course.units) {
      registerID(unitIDs, unit?.id, 'unit', `course "${course.id}"`);
      if (!Array.isArray(unit.lessons) || !unit.lessons.length) throw new Error(`Unit "${unit.id}" must contain at least one lesson.`);
      for (const lesson of unit.lessons) {
        registerID(lessonIDs, lesson?.id, 'lesson', `course "${course.id}"`);
        if (!Array.isArray(lesson.questions) || !lesson.questions.length) throw new Error(`Lesson "${lesson.id}" must contain at least one question.`);
        for (const question of lesson.questions) registerID(questionIDs, question?.id, 'question', `lesson "${lesson.id}"`);
      }
    }
    courses.push(course);
  }
  if (!courses.length) throw new Error('No learning courses were found.');
  const order = course => Number.isFinite(course.order) ? course.order : course.id === DEFAULT_COURSE_ID ? 0 : Number.MAX_SAFE_INTEGER;
  return courses.sort((left, right) => order(left) - order(right) || left.id.localeCompare(right.id, 'en'));
}

/** Old or unavailable selections safely return to the existing JavaScript path. */
export function getCourse(courses, courseId) {
  if (!Array.isArray(courses)) return null;
  return courses.find(course => course.id === courseId) || courses.find(course => course.id === DEFAULT_COURSE_ID) || courses[0] || null;
}

export function getCourseMistakes(progress, course) {
  const mistakes = isRecord(progress?.mistakes) ? progress.mistakes : {};
  return lessonsOf(course).flatMap(lesson => lesson.questions || []).filter(question => Object.hasOwn(mistakes, question.id));
}

/** A language's own preceding lessons are the only prerequisites for its path. */
export function getNextLesson(progress, course) {
  return lessonsOf(course).find(lesson => getLessonStatus(progress, course, lesson.id) === 'current') || null;
}

export function getCourseSummary(course) {
  const lessons = lessonsOf(course);
  return { units: course?.units?.length || 0, lessons: lessons.length, questions: lessons.reduce((count, lesson) => count + (lesson.questions?.length || 0), 0) };
}
