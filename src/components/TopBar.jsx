import { getLevel } from '../lib/progress.js';
import Icon from './Icon.jsx';
export default function TopBar({progress,onAccount,syncStatus}) {
  const level=getLevel(progress.totalXP);
  return <header className="topbar"><a className="mobile-brand brand" href="/" aria-label="Looplane home"><img src="/logo.svg" alt=""/>looplane</a><div className="course-label"><span className="js-badge">JS</span><span>JavaScript Basics <small>Your coding journey</small></span></div><div className="top-stats"><div className="stat xp" title="Total XP"><Icon name="bolt"/><span>{progress.totalXP}<small>XP</small></span></div><div className="stat streak" title="Current day streak"><Icon name="flame"/><span>{progress.streak}<small>day streak</small></span></div><div className="stat hearts" title="Hearts regenerate every 30 minutes"><Icon name="heart"/><span>{progress.hearts}<small>hearts</small></span></div></div><button className="avatar" onClick={onAccount} aria-label={`Account and cloud sync: ${syncStatus}`}><Icon name="user"/></button><div className="mobile-level"><span>Level {level.level}</span><progress max="50" value={level.progressXP} aria-label="Progress to next level"/></div></header>;
}

