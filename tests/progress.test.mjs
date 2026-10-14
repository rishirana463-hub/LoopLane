import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, VERSION, HEART_MAX, HEART_INTERVAL, localDate, createProgress,
  normalizeProgress, refreshProgress, loseHeart, completeLesson, getLevel,
  getLessonStatus, recordMistake, markMistakeCorrect, getDailyXP, buyFreeze, mergeProgress,
} from '../src/lib/progress.js';

const time = (year, month, day, hour = 12) => new Date(year, month - 1, day, hour).getTime();
const done = (state, now, lessonId = 'py-1', extra = {}) => completeLesson(state, { lessonId, xp: 20, wrongAnswers: 1, ...extra }, now).progress;

// Five quick calendar streak checks.
test('streak: completing twice on the same local day counts once', () => {
  const now = time(2026, 10, 12);
  const first = done(createProgress(now), now);
  const second = done(first, time(2026, 10, 12, 23), 'py-2');
  assert.equal(second.streak, 1);
  assert.equal(second.lastCompletedDate, '2026-10-12');
  assert.equal(first.totalXP, 20);
});

test('streak: the next local day adds one, including a DST boundary', () => {
  const first = done(createProgress(), time(2026, 3, 7));
  const next = done(first, time(2026, 3, 8), 'py-2');
  assert.equal(next.streak, 2);
  assert.equal(done(next, time(2026, 3, 9), 'py-3').streak, 3);
});

test('streak: a missed day resets when there is no freeze', () => {
  const first = done({ ...createProgress(), freezes: 0 }, time(2026, 10, 10));
  assert.equal(refreshProgress(first, time(2026, 10, 12)).streak, 0);
  assert.equal(done(first, time(2026, 10, 12), 'py-2').streak, 1);
});

test('streak: calendar month and year boundaries remain consecutive', () => {
  const month = done(done(createProgress(), time(2026, 1, 31)), time(2026, 2, 1), 'py-2');
  const year = done(done(createProgress(), time(2026, 12, 31)), time(2027, 1, 1), 'py-2');
  assert.equal(month.streak, 2);
  assert.equal(year.streak, 2);
});

test('streak: the first ever completion starts at one', () => {
  const now = time(2026, 10, 12, 0);
  assert.equal(localDate(new Date(now)), '2026-10-12');
  assert.equal(done(createProgress(now), now).streak, 1);
  assert.equal(refreshProgress(createProgress(now), now).streak, 0);
});

test('unlock: every earlier lesson is required across unit boundaries', () => {
  const course = { units: [{ lessons: [{ id: 'py-1' }, { id: 'py-2' }] }, { lessons: [{ id: 'py-3' }, { id: 'py-4' }] }] };
  let state = createProgress();
  assert.equal(getLessonStatus(state, course, 'py-1'), 'current');
  assert.equal(getLessonStatus(state, course, 'py-3'), 'locked');
  state = done(state, time(2026, 10, 12), 'py-1');
  assert.equal(getLessonStatus(state, course, 'py-1'), 'done');
  assert.equal(getLessonStatus(state, course, 'py-2'), 'current');
  assert.equal(getLessonStatus(state, course, 'py-3'), 'locked');
  state = done(state, time(2026, 10, 12), 'py-2');
  assert.equal(getLessonStatus(state, course, 'py-3'), 'current');
  assert.equal(getLessonStatus(state, course, 'unknown'), 'locked');
});

test('level: each fifty XP advances and reports a completion level-up', () => {
  assert.deepEqual(getLevel(0), { level: 1, progressXP: 0, nextLevelXP: 50, percent: 0 });
  assert.deepEqual(getLevel(65), { level: 2, progressXP: 15, nextLevelXP: 100, percent: 30 });
  const result = completeLesson({ ...createProgress(), totalXP: 45 }, { lessonId: 'py-1', xp: 20, wrongAnswers: 1 }, time(2026, 10, 12));
  assert.equal(result.levelBefore, 1);
  assert.equal(result.levelAfter, 2);
  assert.equal(result.leveledUp, true);
});

test('hearts regenerate one per thirty minutes, preserve the running timer, and cap at five', () => {
  const now = time(2026, 10, 12);
  const first = loseHeart(createProgress(now), now);
  const second = loseHeart(first, now + 1000);
  assert.equal(first.hearts, 4);
  assert.equal(second.hearts, 3);
  assert.equal(second.heartRefillAt, now + HEART_INTERVAL);
  assert.equal(refreshProgress(second, now + HEART_INTERVAL - 1).hearts, 3);
  const healed = refreshProgress(second, now + HEART_INTERVAL);
  assert.equal(healed.hearts, 4);
  assert.equal(healed.heartRefillAt, now + 2 * HEART_INTERVAL);
  const full = refreshProgress(second, now + 9 * HEART_INTERVAL);
  assert.equal(full.hearts, HEART_MAX);
  assert.equal(full.heartRefillAt, null);
  assert.equal(second.hearts, 3);
});

test('every completed replay and practice earns supplied XP and the perfect bonus', () => {
  const now = time(2026, 10, 12);
  const first = completeLesson(createProgress(now), { lessonId: 'py-1', xp: 20, wrongAnswers: 0 }, now);
  assert.equal(first.xpEarned, 25);
  assert.equal(first.perfect, true);
  assert.equal(first.progress.completed['py-1'].xpAwarded, 25);
  const repeat = completeLesson(first.progress, { lessonId: 'py-1', xp: 20, wrongAnswers: 0 }, now);
  assert.equal(repeat.xpEarned, 25);
  assert.equal(repeat.progress.completed['py-1'].attempts, 2);
  assert.equal(repeat.progress.completed['py-1'].xpAwarded, 50);
  const practice = completeLesson(repeat.progress, { lessonId: 'py-1', xp: 10, practice: true }, now);
  assert.equal(practice.xpEarned, 15);
  assert.equal(practice.perfect, true);
  assert.deepEqual(practice.progress.completed, repeat.progress.completed);
  assert.equal(getDailyXP(practice.progress, now), 65);
  const imperfectPractice = completeLesson(practice.progress, { lessonId: 'py-2', xp: 12, wrongAnswers: 1, practice: true }, now);
  assert.equal(imperfectPractice.xpEarned, 12);
  assert.equal(imperfectPractice.perfect, false);
  assert.equal(imperfectPractice.progress.completed['py-2'], undefined);
});

test('unfinished runs award nothing and zero-heart completion cannot award XP or unlock lessons', () => {
  const now = time(2026, 10, 12);
  const started = recordMistake(loseHeart(createProgress(now), now), 'py-1:q-1');
  assert.equal(started.totalXP, 0);
  assert.deepEqual(started.completed, {});
  const exhausted = { ...started, hearts: 0, heartRefillAt: now + HEART_INTERVAL };
  const result = completeLesson(exhausted, { lessonId: 'py-1', xp: 20, wrongAnswers: 5 }, now);
  assert.equal(result.xpEarned, 0);
  assert.equal(result.progress.totalXP, 0);
  assert.equal(result.progress.streak, 0);
  assert.deepEqual(result.progress.completed, {});
});

test('one freeze covers one missed day exactly once and replacement costs fifty net XP', () => {
  const first = done(createProgress(), time(2026, 10, 10));
  const frozen = refreshProgress(first, time(2026, 10, 12));
  assert.equal(frozen.streak, 1);
  assert.equal(frozen.freezes, 0);
  assert.equal(frozen.freezeThroughDate, '2026-10-11');
  assert.deepEqual(refreshProgress(frozen, time(2026, 10, 12)), frozen);
  assert.equal(done(frozen, time(2026, 10, 12), 'py-2').streak, 2);
  assert.equal(refreshProgress(frozen, time(2026, 10, 13)).streak, 0);
  const withXP = { ...frozen, totalXP: 70, dailyXP: { '2026-10-12': 70 } };
  const purchase = buyFreeze(withXP);
  assert.equal(purchase.totalXP, 20);
  assert.equal(purchase.freezes, 1);
  assert.equal(getDailyXP(purchase, time(2026, 10, 12)), 70);
  assert.deepEqual(buyFreeze(purchase), purchase);
  assert.equal(buyFreeze({ ...withXP, totalXP: 49 }).freezes, 0);
});

test('mistakes require two correct answers and another wrong answer resets that count', () => {
  const initial = createProgress();
  const wrong = recordMistake(initial, 'py-1:q-1');
  const once = markMistakeCorrect(wrong, 'py-1:q-1');
  assert.equal(once.mistakes['py-1:q-1'].correctCount, 1);
  assert.equal(recordMistake(once, 'py-1:q-1').mistakes['py-1:q-1'].correctCount, 0);
  assert.equal(markMistakeCorrect(once, 'py-1:q-1').mistakes['py-1:q-1'], undefined);
  assert.deepEqual(initial.mistakes, {});
});

test('merge keeps higher XP and completion unions without doubling points or healing', () => {
  const now = time(2026, 10, 12);
  const left = recordMistake(loseHeart(done(createProgress(), now, 'py-1'), now), 'py-1:q-1');
  const right = markMistakeCorrect(recordMistake(done({ ...createProgress(), totalXP: 30 }, now, 'py-2'), 'py-1:q-1'), 'py-1:q-1');
  const merged = mergeProgress(left, right, now);
  assert.equal(merged.totalXP, 50);
  assert.deepEqual(Object.keys(merged.completed).sort(), ['py-1', 'py-2']);
  assert.equal(merged.dailyXP['2026-10-12'], 20);
  assert.equal(merged.hearts, 4);
  assert.equal(merged.heartRefillAt, now + HEART_INTERVAL);
  assert.equal(merged.mistakes['py-1:q-1'].correctCount, 0);
  assert.deepEqual(mergeProgress(merged, right, now), merged);
  assert.equal(left.totalXP, 20);
});

test('normalization discards corrupt schemas and prototype keys and bounds stored fields', () => {
  const now = time(2026, 10, 12);
  assert.equal(STORAGE_KEY, 'codeleap-progress-v1');
  assert.equal(VERSION, 1);
  for (const value of [null, [], 'text', { version: 2, totalXP: 999 }]) assert.deepEqual(normalizeProgress(value, now), createProgress(now));
  const raw = JSON.parse('{"version":1,"totalXP":-1,"hearts":99,"freezes":99,"dailyGoal":-50,"lastCompletedDate":"2026-02-30","streak":999,"completed":{"__proto__":{"completedAt":100}},"mistakes":{"constructor":{"correctCount":0}},"dailyXP":{"2026-10-12":-20}}');
  const normalized = normalizeProgress(raw, now);
  assert.equal(normalized.totalXP, 0);
  assert.equal(normalized.hearts, 5);
  assert.equal(normalized.freezes, 1);
  assert.equal(normalized.dailyGoal, 10);
  assert.equal(normalized.streak, 0);
  assert.deepEqual(normalized.completed, {});
  assert.deepEqual(normalized.mistakes, {});
  assert.equal({}.completedAt, undefined);
});
