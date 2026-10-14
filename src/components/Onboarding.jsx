import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence,motion } from 'framer-motion';
import Icon from './Icon.jsx';
export default function Onboarding({goal,onGoal,onDone,onSignIn}) {
  const [step,setStep]=useState(0);
  const backdrop = useRef(null);
  const panel = useRef(null);
  const primary = useRef(null);
  const headingId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const background = [...backdrop.current.parentElement.children]
      .filter(element => element !== backdrop.current)
      .map(element => ({ element, inert: element.inert }));
    for (const item of background) item.element.inert = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primary.current?.focus();
    const trapFocus = event => {
      if (event.key !== 'Tab') return;
      const elements = [...panel.current.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
        .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); panel.current.focus(); return; }
      if (!panel.current.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = previousOverflow;
      for (const item of background) item.element.inert = item.inert;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <div ref={backdrop} className="onboarding-backdrop"><section ref={panel} className="onboarding" role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1}><a className="brand" href="/" aria-label="Looplane"><img src="/logo.svg" alt=""/>looplane</a><AnimatePresence mode="wait"><motion.div key={step} aria-live="polite" aria-atomic="true" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}><div className={`onboarding-icon step-${step}`}><Icon name={['code','target','bolt'][step]} size={54}/></div><span className="eyebrow">{['SMALL STEPS. REAL CODE.','A HABIT THAT FITS YOU.','YOUR FIRST LINE STARTS HERE.'][step]}</span><h1 id={headingId}>{['Meet your coding side.','Make a little time.','Ready for your first leap?'][step]}</h1><p>{['Learn JavaScript in bite-sized lessons. Try, make mistakes, and find your next aha.','Pick your daily XP goal. You can change it anytime.','Start with variables. Five questions, a few minutes, and one step closer to building things.'][step]}</p>{step===1&&<div className="onboarding-goals">{[10,20,30].map((value,i)=><button key={value} aria-pressed={value===goal} onClick={()=>onGoal(value)}><span>{['Easy does it','A steady rhythm','Let’s go further'][i]}</span><strong>{value} XP</strong><small>{['About 2 minutes','About 4 minutes','About 6 minutes'][i]}</small></button>)}</div>}</motion.div></AnimatePresence><div className="onboarding-dots" aria-label={`Step ${step+1} of 3`}>{[0,1,2].map(s=><i key={s} className={s===step?'active':''}/>)}</div><button ref={primary} className="button" onClick={()=>step<2?setStep(step+1):onDone()}>{['Let’s get started','That’s my goal','Start my first lesson'][step]}<Icon name="arrow" size={19}/></button><button type="button" className="text-button" onClick={onSignIn}>Already learning? Sign in</button></section></div>;
}

