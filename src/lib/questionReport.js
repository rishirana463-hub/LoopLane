const SUPPORT_EMAIL = 'rishirana463@gmail.com';
const text = value => typeof value === 'string' ? value : '';

export function buildQuestionReportUrl({ lessonTitle, lessonId, questionId, questionType, prompt, appVersion } = {}) {
  const title = text(lessonTitle).replace(/[\r\n]+/g, ' ');
  const subject = `Looplane question report: ${title || 'Lesson'}`;
  const body = [
    'What went wrong?',
    '[Describe the problem here.]',
    '',
    `Lesson: ${text(lessonTitle)}`,
    `Lesson ID: ${text(lessonId)}`,
    `Question ID: ${text(questionId)}`,
    `Question type: ${text(questionType)}`,
    ...(text(appVersion) ? [`App version: ${text(appVersion)}`] : []),
    '',
    'Question prompt:',
    text(prompt),
  ].join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
