import { useState,useEffect,useCallback } from 'react';
import { AnimatePresence,motion } from 'framer-motion';
import { loseHeart,recordMistake,markMistakeCorrect } from '../lib/progress.js';
import { playFeedback } from '../lib/feedback.js';
import QuestionBody from './QuestionBody.jsx';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
export default function LessonScreen({lesson,progress,updateProgress,onComplete,onExit,onOut}) {
  const [index,setIndex]=useState(0),[answer,setAnswer]=useState(null),[feedback,setFeedback]=useState(null),[wrong,setWrong]=useState(0),[exit,setExit]=useState(false);
  const question=lesson.questions[index];
  const closeExit=useCallback(()=>setExit(false),[]);
  useEffect(()=>{document.getElementById('question-heading')?.focus();},[index]);
  const isReady=question.type==='code'?answer===true:question.type==='reorder'?Array.isArray(answer)&&answer.length===question.blocks.length:answer!==null;
  function check() {
    if(!isReady||feedback) return;
    const correct=question.type==='code'?answer===true:question.type==='reorder'?JSON.stringify(answer)===JSON.stringify(question.answer):answer===question.answer;
    playFeedback(correct,progress.muted);
    if(correct) updateProgress(p=>markMistakeCorrect(p,question.id));
    else {
      setWrong(w=>w+1);
      const afterLoss=recordMistake(loseHeart(progress),question.id);
      updateProgress(afterLoss);
      if(afterLoss.hearts===0){onOut(lesson);return;}
    }
    setFeedback({correct,explanation:question.explanation});
  }
  function next() {
    if(index===lesson.questions.length-1){onComplete(lesson,wrong);return;}
    setIndex(i=>i+1);setAnswer(null);setFeedback(null);
  }
  return <div className="lesson-screen"><div className="lesson-top"><button className="icon-button" aria-label="Exit lesson" onClick={()=>setExit(true)}><Icon name="close"/></button><progress max={lesson.questions.length} value={index+(feedback?1:0)} aria-label={`Question ${index+1} of ${lesson.questions.length}`}/><span className="lesson-hearts"><Icon name="heart"/>{progress.hearts}</span></div><div className="lesson-content"><div className="question-meta"><span className="eyebrow">{lesson.title}</span><span>{index+1} / {lesson.questions.length}</span></div><div className="question-type" id="question-heading" tabIndex={-1}>{question.type==='predict'?'READ THE CODE':question.type==='fill'?'FILL THE GAP':question.type==='reorder'?'PUT IT TOGETHER':question.type==='code'?'YOUR TURN TO CODE':'QUICK QUESTION'}</div><AnimatePresence mode="wait"><motion.div key={`${question.id}:${index}`} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-15}} transition={{duration:.18}}><QuestionBody question={question} answer={answer} onAnswer={setAnswer} disabled={!!feedback}/></motion.div></AnimatePresence></div><div className={`lesson-footer ${feedback?(feedback.correct?'correct':'wrong'):''}`}><div className="lesson-footer-inner">{feedback?<motion.div className="feedback" role="status" initial={{y:10,opacity:0}} animate={{y:0,opacity:1}}><span className="feedback-icon"><Icon name={feedback.correct?'check':'close'}/></span><div><strong>{feedback.correct?'That’s it!':'A useful little mistake.'}</strong><p>{feedback.explanation}</p></div></motion.div>:<p className="check-hint">{question.type==='code'?'Run your code and pass every test.':'Take your time. You’re here to learn.'}</p>}<button className="button check-button" disabled={!feedback&&!isReady} onClick={feedback?next:check}>{feedback?(index===lesson.questions.length-1?'See results':'Continue'):'Check'}<Icon name="arrow" size={19}/></button></div></div>{exit&&<Modal title="Leave this lesson?" onClose={closeExit}><h2>Take a breather?</h2><p>Leaving this lesson won’t earn XP. Your completed lessons are saved.</p><button className="button" onClick={closeExit}>Keep learning</button><button className="button secondary" onClick={onExit}>Leave lesson</button></Modal>}</div>;
}
