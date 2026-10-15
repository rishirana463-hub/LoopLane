import { getLevel } from '../lib/progress.js';
import Icon from './Icon.jsx';
import CoursePicker from './CoursePicker.jsx';

export default function TopBar({ progress, onAccount, syncStatus, courses, course, onCourseChange }) {
  const level = getLevel(progress.totalXP);
  return <header className="topbar">
    <CoursePicker courses={courses} course={course} onChange={onCourseChange}/>
    <div className="top-stats">
      <div className="stat streak" role="img" aria-label={`${progress.streak} day streak`} title="Current day streak"><Icon name="flame"/><span>{progress.streak}<small>day streak</small></span></div>
      <div className="stat xp" role="img" aria-label={`${progress.totalXP} total XP`} title="Total XP"><Icon name="bolt"/><span>{progress.totalXP}<small>XP</small></span></div>
      <div className="stat hearts" role="img" aria-label={`${progress.hearts} hearts remaining`} title="Hearts regenerate every 30 minutes"><Icon name="heart"/><span>{progress.hearts}<small>hearts</small></span></div>
    </div>
    <button className="avatar" onClick={onAccount} aria-label={`Account and cloud sync: ${syncStatus}`}><Icon name="user"/></button>
    <div className="mobile-level"><span>Level {level.level}</span><progress max="50" value={level.progressXP} aria-label="Progress to next level"/></div>
  </header>;
}
