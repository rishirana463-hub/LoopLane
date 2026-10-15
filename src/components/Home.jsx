import { motion } from 'framer-motion';
import { getDailyXP, getLevel, getLessonStatus, buyFreeze } from '../lib/progress.js';
import { getCourseMistakes, getNextLesson } from '../lib/curriculum.js';
import Icon from './Icon.jsx';
import LearningCompanion from './LearningCompanion.jsx';

export default function Home({ course, progress, onStart, onPractice, onAccount, updateProgress, install }) {
  const lessons = course.units.flatMap(u => u.lessons), level = getLevel(progress.totalXP);
  const next = getNextLesson(progress, course);
  const count = lessons.filter(l => progress.completed[l.id]).length;
  const daily = getDailyXP(progress), mistakes = getCourseMistakes(progress, course).length;

  return <div className="dashboard">
    <div className="journey">
      <div className="path-heading">
        <div><h1>{course.language} path</h1><p>{count} of {lessons.length} lessons complete</p></div>
        <button className="continue-button" onClick={() => onStart(next || lessons[0])}>{next ? 'Continue' : 'Review'}<Icon name="arrow" size={18}/></button>
      </div>
      <div className="course-path">
        {course.units.map((unit, unitIndex) => {
          const unitDone = unit.lessons.filter(l => progress.completed[l.id]).length;
          const locked = getLessonStatus(progress, course, unit.lessons[0].id) === 'locked';
          return <section className={`unit unit-${unitIndex % 4 + 1}`} key={unit.id} aria-labelledby={`unit-title-${unit.id}`}>
            <div className={`unit-banner ${locked ? 'unit-locked' : ''}`}>
              <div className="unit-heading"><span className="unit-kicker">Unit {unitIndex + 1} · {unit.level} · {locked ? 'Locked' : `${unitDone}/${unit.lessons.length} complete`}</span><h2 id={`unit-title-${unit.id}`}>{unit.title}</h2><p>{unit.description}</p></div>
              <Icon name={locked ? 'lock' : 'book'} size={30}/>
            </div>
            <div className="lesson-path">
              {unit.lessons.map((lesson, index) => {
                const status = getLessonStatus(progress, course, lesson.id);
                return <div className={`path-row row-${index % 4} ${status}`} key={lesson.id}>
                  <div className="node-cluster">
                    {status === 'current' && <span className="start-label">Start here</span>}
                    <motion.button whileTap={status === 'locked' ? undefined : { scale: .94 }} className={`lesson-node ${status}`} disabled={status === 'locked'} aria-label={`${lesson.title}, ${status}, ${lesson.xp} XP`} onClick={() => onStart(lesson)}>
                      <Icon name={status === 'done' ? 'check' : status === 'locked' ? 'lock' : index === unit.lessons.length - 1 ? 'star' : 'code'} size={32}/>
                    </motion.button>
                    <div className="node-copy"><strong>{lesson.title}</strong><span>{lesson.questions.length} questions · {status === 'done' ? 'Completed' : status === 'locked' ? 'Locked' : 'Ready'}</span></div>
                  </div>
                </div>;
              })}
              <LearningCompanion character={['aria', 'leo', 'yuki', 'dr-maya'][unitIndex % 4]}/>
            </div>
          </section>;
        })}
      </div>
      <div className="path-end"><Icon name="code" size={32}/><strong>One lesson closer.</strong><p>Your next idea starts here.</p></div>
    </div>
    <aside className="right-rail" aria-label="Learning progress">
      <section className="card daily-card">
        <div className="card-heading"><h2>Daily goal</h2><Icon name="target"/></div>
        <div className="daily-total"><Icon name="bolt" size={30}/><strong>{daily}<span> / {progress.dailyGoal} XP</span></strong></div>
        <progress max={progress.dailyGoal} value={Math.min(daily, progress.dailyGoal)} aria-label={`${daily} of ${progress.dailyGoal} XP daily goal`}/>
        <p>{daily >= progress.dailyGoal ? 'Daily goal complete. Nice work!' : 'A little practice goes a long way.'}</p>
        <div className="goal-options" role="group" aria-label="Daily XP goal">{[10, 20, 30].map(goal => <button key={goal} aria-pressed={progress.dailyGoal === goal} onClick={() => updateProgress(p => ({ ...p, dailyGoal: goal }))}>{goal} XP</button>)}</div>
      </section>
      <section className="card level-card"><div className="card-heading"><h2>Level {level.level}</h2><Icon name="trophy"/></div><progress max="50" value={level.progressXP} aria-label="XP progress to next level"/><p>{50 - level.progressXP} XP to level {level.level + 1}</p></section>
      <section className="card practice-card"><div className="card-heading"><h2>Sharpen your skills</h2><Icon name="refresh"/></div><p>{mistakes ? `${mistakes} question${mistakes === 1 ? '' : 's'} ready to review.` : 'Missed questions land here. Get each right twice to clear it.'}</p><button className="button secondary" onClick={onPractice} disabled={!mistakes}>Review mistakes<Icon name="arrow" size={18}/></button></section>
      <section className="freeze-card"><Icon name="snow" size={28}/><div><strong>Streak freeze</strong><p>{progress.freezes ? '1 ready · a missed day is covered' : 'Protect one missed day for 50 XP.'}</p></div>{!progress.freezes && <button className="text-button" disabled={progress.totalXP < 50} onClick={() => updateProgress(buyFreeze)}>Buy · 50 XP</button>}</section>
      <div className="rail-settings"><button className="text-button" onClick={() => updateProgress(p => ({ ...p, muted: !p.muted }))}><Icon name={progress.muted ? 'mute' : 'sound'} size={18}/>{progress.muted ? 'Sound off' : 'Sound on'}</button>{install.canInstall && <button className="text-button" onClick={install.install}><Icon name="download" size={18}/>Install app</button>}<button className="text-button" onClick={onAccount}><Icon name="cloud" size={18}/>Save across devices</button></div>
      <p className="rail-footer"><a href="/privacy">Privacy</a><span>Looplane © {new Date().getFullYear()}</span></p>
    </aside>
  </div>;
}
