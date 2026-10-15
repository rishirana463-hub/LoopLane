import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
import LearningCompanion from './LearningCompanion.jsx';
import './result.css';
export default function Result({result,onHome,onNext}) {
  const {xpEarned,perfect,leveledUp,levelAfter,lesson,wrong}=result;
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <main className="result-screen lesson-result">
    <motion.div className="result-character" initial={{scale:.8,rotate:-8}} animate={{scale:1,rotate:0}} transition={{type:'spring',bounce:.3}}>
      <LearningCompanion character={perfect ? 'leo' : 'dr-maya'} variant="result"/>
    </motion.div>
    <h1 ref={heading} tabIndex={-1}>{perfect?'Perfect!':'Lesson complete!'}</h1>
    <p>{perfect?'Every answer correct. Nicely done.':`${lesson.title} complete. Keep building.`}</p>
    <div className="result-stats">
      <div className="result-stat result-xp">
        <span className="result-stat-label">XP earned</span>
        <div className="result-stat-value"><Icon name="bolt" size={30}/><strong>+{xpEarned}</strong></div>
        {perfect&&<span className="result-stat-detail">Includes +5 perfect bonus</span>}
      </div>
      <div className="result-stat result-accuracy">
        <span className="result-stat-label">Accuracy</span>
        <div className="result-stat-value"><Icon name="target" size={30}/><strong>{Math.round((lesson.questions.length-wrong)/lesson.questions.length*100)}%</strong></div>
      </div>
    </div>
    {leveledUp&&<motion.div className="level-celebration" role="status" initial={{scale:.8,opacity:0}} animate={{scale:[.8,1.06,1],opacity:1}}><Icon name="star"/>Level {levelAfter} unlocked<Icon name="star" size={18}/></motion.div>}
    <div className="result-actions">
      <button className="button" onClick={onNext}>Continue<Icon name="arrow"/></button>
      <button className="text-button" onClick={onHome}>Back to learning path</button>
    </div>
  </main>;
}
