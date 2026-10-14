import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
export default function Result({result,onHome,onNext}) {
  const {xpEarned,perfect,leveledUp,levelAfter,lesson,wrong}=result;
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <main className="result-screen"><motion.div className="result-art" aria-hidden="true" initial={{scale:.5,rotate:-15}} animate={{scale:1,rotate:0}} transition={{type:'spring',bounce:.4}}><Icon name="trophy" size={68}/><span className="result-star one">✦</span><span className="result-star two">✦</span></motion.div><span className="eyebrow">{perfect?'PERFECT RUN':'ONE STEP FORWARD'}</span><h1 ref={heading} tabIndex={-1}>{perfect?'Look at you go.':'Lesson complete!'}</h1><p>You just learned a little more about {lesson.title.toLowerCase()}.</p><div className="result-stats"><div><Icon name="bolt"/><strong>+{xpEarned}</strong><span>XP EARNED{perfect?' · +5 BONUS':''}</span></div><div><Icon name="target"/><strong>{Math.round((lesson.questions.length-wrong)/lesson.questions.length*100)}%</strong><span>ACCURACY</span></div></div>{leveledUp&&<motion.div className="level-celebration" role="status" initial={{scale:.8,opacity:0}} animate={{scale:[.8,1.06,1],opacity:1}}><Icon name="star"/>Hello, level {levelAfter}!<span aria-hidden="true">✦</span></motion.div>}<button className="button" onClick={onNext}>Keep the momentum<Icon name="arrow"/></button><button className="text-button" onClick={onHome}>Back to your path</button></main>;
}
