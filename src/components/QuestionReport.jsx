import packageInfo from '../../package.json';
import { buildQuestionReportUrl } from '../lib/questionReport.js';

export default function QuestionReport({ lesson, question, questionNumber }) {
  const href = buildQuestionReportUrl({
    lessonTitle: lesson.title,
    lessonId: lesson.id,
    questionId: question.id,
    questionType: question.type,
    prompt: question.prompt,
    appVersion: packageInfo.version,
  });
  return <a
    className="question-report"
    href={href}
    aria-label={`Report a problem with question ${questionNumber} of ${lesson.questions.length} in ${lesson.title} (opens your email app)`}
  >Report a problem</a>;
}
