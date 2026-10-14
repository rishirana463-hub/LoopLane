export const STORAGE_KEY = 'codeleap-progress-v1';
export const VERSION = 1;
export const HEART_MAX = 5;
export const HEART_INTERVAL = 1800000;

const DAY_MS = 86400000;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const validID = (value) => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}$/.test(value) && !BAD_KEYS.has(value);
const bound = (value, min, max, fallback = min) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
const timestamp = (value, fallback = null) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
const clock = (now) => timestamp(now, Date.now());

export function localDate(date = new Date()) {
  const current = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(current.getTime())) return localDate(new Date());
  return `${String(current.getFullYear()).padStart(4, '0')}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Compare calendar labels through UTC only to avoid 23/25-hour DST arithmetic.
function dayNumber(value) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function nextDay(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day + 1, 12);
  return localDate(date);
}

export function createProgress(now = Date.now()) {
  return {
    version: VERSION,
    totalXP: 0,
    hearts: HEART_MAX,
    heartRefillAt: null,
    streak: 0,
    lastCompletedDate: null,
    streakCheckedDate: null,
    freezeThroughDate: null,
    completed: {},
    mistakes: {},
    dailyXP: {},
    dailyGoal: 20,
    muted: false,
    freezes: 1,
    onboarded: false,
  };
}

/** Whitelist saved fields; unknown versions and invalid shapes start fresh. */
export function normalizeProgress(raw, now = Date.now()) {
  const currentTime = clock(now);
  const result = createProgress(currentTime);
  if (!isRecord(raw) || raw.version !== VERSION) return result;
  result.totalXP = bound(raw.totalXP, 0, 1000000000);
  result.hearts = bound(raw.hearts, 0, HEART_MAX, HEART_MAX);
  result.heartRefillAt = result.hearts === HEART_MAX ? null : timestamp(raw.heartRefillAt, currentTime + HEART_INTERVAL);
  if (result.heartRefillAt !== null && result.heartRefillAt > currentTime + HEART_INTERVAL) result.heartRefillAt = currentTime + HEART_INTERVAL;
  result.lastCompletedDate = validDate(raw.lastCompletedDate) ? raw.lastCompletedDate : null;
  result.streakCheckedDate = validDate(raw.streakCheckedDate) ? raw.streakCheckedDate : null;
  result.freezeThroughDate = validDate(raw.freezeThroughDate) ? raw.freezeThroughDate : null;
  result.streak = result.lastCompletedDate ? bound(raw.streak, 0, 1000000) : 0;
  result.dailyGoal = bound(raw.dailyGoal, 10, 500, 20);
  result.muted = typeof raw.muted === 'boolean' ? raw.muted : false;
  result.freezes = bound(raw.freezes, 0, 1, 1);
  result.onboarded = typeof raw.onboarded === 'boolean' ? raw.onboarded : false;

  if (isRecord(raw.completed)) {
    for (const lessonId of Object.keys(raw.completed).slice(0, 10000)) {
      const lesson = raw.completed[lessonId];
      if (!validID(lessonId) || !isRecord(lesson) || timestamp(lesson.completedAt) === null) continue;
      result.completed[lessonId] = {
        completedAt: timestamp(lesson.completedAt),
        bestAccuracy: bound(lesson.bestAccuracy, 0, 100),
        attempts: bound(lesson.attempts, 1, 1000000, 1),
        xpAwarded: bound(lesson.xpAwarded, 0, 1000000),
      };
    }
  }
  if (isRecord(raw.mistakes)) {
    for (const qId of Object.keys(raw.mistakes).slice(0, 10000)) {
      if (!validID(qId) || !isRecord(raw.mistakes[qId])) continue;
      const correctCount = bound(raw.mistakes[qId].correctCount, 0, 2);
      if (correctCount < 2) result.mistakes[qId] = { correctCount };
    }
  }
  if (isRecord(raw.dailyXP)) {
    for (const date of Object.keys(raw.dailyXP).filter(validDate).sort().slice(-730)) {
      result.dailyXP[date] = bound(raw.dailyXP[date], 0, 1000000);
    }
  }
  return result;
}

/** Regenerate hearts and reconcile an elapsed local-day streak immutably. */
export function refreshProgress(state, now = Date.now()) {
  const currentTime = clock(now);
  const result = normalizeProgress(state, currentTime);
  if (result.hearts < HEART_MAX && currentTime >= result.heartRefillAt) {
    const elapsedHearts = 1 + Math.floor((currentTime - result.heartRefillAt) / HEART_INTERVAL);
    result.hearts = Math.min(HEART_MAX, result.hearts + elapsedHearts);
    result.heartRefillAt = result.hearts === HEART_MAX ? null : result.heartRefillAt + elapsedHearts * HEART_INTERVAL;
  }
  const today = localDate(new Date(currentTime));
  if (result.lastCompletedDate) {
    const gap = dayNumber(today) - dayNumber(result.lastCompletedDate);
    if (gap >= 2 && result.streak > 0) {
      const coveredThroughYesterday = result.freezeThroughDate && dayNumber(today) - dayNumber(result.freezeThroughDate) === 1;
      if (gap === 2 && !coveredThroughYesterday && result.freezes > 0) {
        result.freezes -= 1;
        result.freezeThroughDate = nextDay(result.lastCompletedDate);
      } else if (!coveredThroughYesterday) {
        result.streak = 0;
        result.freezeThroughDate = null;
      }
    } else if (gap < 0) {
      result.streak = 0;
      result.freezeThroughDate = null;
    }
  }
  result.streakCheckedDate = today;
  return result;
}

export function loseHeart(state, now = Date.now()) {
  const currentTime = clock(now);
  const result = refreshProgress(state, currentTime);
  if (result.hearts > 0) {
    const wasFull = result.hearts === HEART_MAX;
    result.hearts -= 1;
    if (wasFull || result.heartRefillAt === null) result.heartRefillAt = currentTime + HEART_INTERVAL;
  }
  return result;
}

export function getLevel(totalXP) {
  const xp = bound(totalXP, 0, 1000000000);
  const level = Math.floor(xp / 50) + 1;
  const progressXP = xp % 50;
  return { level, progressXP, nextLevelXP: level * 50, percent: progressXP * 2 };
}

/** Every completed run earns supplied XP plus +5 for zero wrong answers.
 * Replays and completed practice follow the same reward rule. Practice never
 * unlocks the normal path or changes lesson completion/accuracy. Call only on
 * a fully completed run; a run with no hearts remaining receives no reward.
 */
export function completeLesson(state, details, now = Date.now()) {
  const currentTime = clock(now);
  const progress = refreshProgress(state, currentTime);
  const levelBefore = getLevel(progress.totalXP).level;
  const emptyResult = () => ({ progress, xpEarned: 0, perfect: false, levelBefore, levelAfter: levelBefore, leveledUp: false });
  if (!isRecord(details) || !validID(details.lessonId) || progress.hearts === 0) return emptyResult();
  const practice = details.practice === true;
  const wrongAnswers = bound(details.wrongAnswers ?? 0, 0, 10000);
  const perfect = wrongAnswers === 0;
  const previous = progress.completed[details.lessonId];
  const baseXP = bound(details.xp, 0, 10000, 20);
  const xpEarned = baseXP + (perfect ? 5 : 0);
  const totalQuestions = bound(details.totalQuestions ?? 5, 1, 10000, 5);
  const accuracy = Math.round(Math.max(0, totalQuestions - wrongAnswers) / totalQuestions * 100);
  const today = localDate(new Date(currentTime));
  const gap = progress.lastCompletedDate ? dayNumber(today) - dayNumber(progress.lastCompletedDate) : null;
  const frozenGap = gap === 2 && progress.freezeThroughDate && dayNumber(today) - dayNumber(progress.freezeThroughDate) === 1;
  progress.streak = gap === 0 ? Math.max(1, progress.streak) : gap === 1 || frozenGap ? Math.max(1, progress.streak + 1) : 1;
  progress.lastCompletedDate = today;
  progress.streakCheckedDate = today;
  progress.freezeThroughDate = null;
  progress.totalXP = Math.min(1000000000, progress.totalXP + xpEarned);
  progress.dailyXP[today] = Math.min(1000000, (progress.dailyXP[today] || 0) + xpEarned);
  if (!practice) {
    progress.completed[details.lessonId] = {
      completedAt: previous ? previous.completedAt : currentTime,
      bestAccuracy: Math.max(previous?.bestAccuracy || 0, accuracy),
      attempts: Math.min(1000000, (previous?.attempts || 0) + 1),
      xpAwarded: Math.min(1000000, (previous?.xpAwarded || 0) + xpEarned),
    };
  }
  const levelAfter = getLevel(progress.totalXP).level;
  return { progress, xpEarned, perfect, levelBefore, levelAfter, leveledUp: levelAfter > levelBefore };
}

function lessonsOf(course) {
  return Array.isArray(course?.units) ? course.units.flatMap((unit) => Array.isArray(unit.lessons) ? unit.lessons : []) : [];
}

export function getLessonStatus(state, course, lessonId) {
  const lessons = lessonsOf(course);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return 'locked';
  const completed = isRecord(state?.completed) ? state.completed : {};
  const done = (id) => validID(id) && Object.hasOwn(completed, id);
  if (done(lessonId)) return 'done';
  return lessons.slice(0, index).every((lesson) => done(lesson.id)) ? 'current' : 'locked';
}

export function recordMistake(state, qId) {
  const progress = normalizeProgress(state);
  if (validID(qId)) progress.mistakes[qId] = { correctCount: 0 };
  return progress;
}

export function markMistakeCorrect(state, qId) {
  const progress = normalizeProgress(state);
  if (!validID(qId) || !Object.hasOwn(progress.mistakes, qId)) return progress;
  const correctCount = progress.mistakes[qId].correctCount + 1;
  if (correctCount >= 2) delete progress.mistakes[qId];
  else progress.mistakes[qId] = { correctCount };
  return progress;
}

export function getDailyXP(state, now = Date.now()) {
  const today = localDate(new Date(clock(now)));
  return bound(state?.dailyXP?.[today], 0, 1000000);
}

export function buyFreeze(state) {
  const progress = normalizeProgress(state);
  if (progress.freezes >= 1 || progress.totalXP < 50) return progress;
  progress.totalXP -= 50;
  progress.freezes = 1;
  return progress;
}

function latestDate(first, second) {
  if (!first) return second;
  if (!second) return first;
  return first > second ? first : second;
}

/** Merge overlapping device snapshots without duplicating earned XP or healing. */
export function mergeProgress(local, remote, now = Date.now()) {
  const currentTime = clock(now);
  const left = refreshProgress(local, currentTime);
  const right = refreshProgress(remote, currentTime);
  const progress = normalizeProgress(left, currentTime);
  progress.totalXP = Math.max(left.totalXP, right.totalXP);
  progress.streak = Math.max(left.streak, right.streak);
  progress.lastCompletedDate = latestDate(left.lastCompletedDate, right.lastCompletedDate);
  progress.freezeThroughDate = latestDate(left.freezeThroughDate, right.freezeThroughDate);
  progress.streakCheckedDate = localDate(new Date(currentTime));
  progress.freezes = Math.min(left.freezes, right.freezes);
  progress.onboarded = left.onboarded || right.onboarded;
  progress.hearts = Math.min(left.hearts, right.hearts);
  progress.heartRefillAt = progress.hearts === HEART_MAX ? null : Math.max(left.heartRefillAt || 0, right.heartRefillAt || 0, currentTime + 1);
  for (const [lessonId, record] of Object.entries(right.completed)) {
    const own = progress.completed[lessonId];
    progress.completed[lessonId] = own ? {
      completedAt: Math.min(own.completedAt, record.completedAt),
      bestAccuracy: Math.max(own.bestAccuracy, record.bestAccuracy),
      attempts: Math.max(own.attempts, record.attempts),
      xpAwarded: Math.max(own.xpAwarded, record.xpAwarded),
    } : { ...record };
  }
  for (const [date, xp] of Object.entries(right.dailyXP)) progress.dailyXP[date] = Math.max(progress.dailyXP[date] || 0, xp);
  for (const [qId, record] of Object.entries(right.mistakes)) {
    progress.mistakes[qId] = { correctCount: Object.hasOwn(progress.mistakes, qId) ? Math.min(progress.mistakes[qId].correctCount, record.correctCount) : record.correctCount };
  }
  return progress;
}
