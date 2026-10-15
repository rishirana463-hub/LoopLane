import { useState,useEffect,useCallback } from 'react';
import { AnimatePresence,motion } from 'framer-motion';
import { useProgress } from './lib/useProgress.js';
import { useInstall } from './lib/useInstall.js';
import { refreshProgress } from './lib/progress.js';
import { assembleCourses,getCourse,getCourseMistakes,getNextLesson } from './lib/curriculum.js';
import Home from './components/Home.jsx';
import TopBar from './components/TopBar.jsx';
import LessonScreen from './components/LessonScreen.jsx';
import Result from './components/Result.jsx';
import Onboarding from './components/Onboarding.jsx';
import AccountDialog from './components/AccountDialog.jsx';
import Icon from './components/Icon.jsx';

export default function App() {
  const store=useProgress(), install=useInstall();
  const {progress,updateProgress}=store;
  const [courses,setCourses]=useState([]),[dataError,setDataError]=useState(false),[screen,setScreen]=useState('home'),[lesson,setLesson]=useState(null),[result,setResult]=useState(null),[account,setAccount]=useState(false),[message,setMessage]=useState('');
  const course=getCourse(courses,progress.activeCourseId);
  const closeAccount=useCallback(()=>setAccount(false),[]);
  useEffect(()=>{
    let live=true;
    const modules=import.meta.glob('./data/*.json', {import:'default'});
    Promise.all(Object.values(modules).map(load=>load())).then(assembleCourses).then(data=>{if(live)setCourses(data);}).catch(()=>{if(live)setDataError(true);});
    return()=>{live=false;};
  },[]);
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[screen,course?.id]);
  function start(item) {
    const current=updateProgress(p=>refreshProgress(p));
    setLesson(item);setScreen(current.hearts?'lesson':'out');setMessage('');
  }
  function practice() {
    const questions=getCourseMistakes(progress,course);
    if(!questions.length){setMessage('No mistakes to review.');return;}
    const batch=Array.from({length:5},(_,i)=>questions[i%questions.length]);
    start({id:course.practice.id,title:'Mistakes practice',xp:course.practice.xp,questions:batch,practice:true});
  }
  function complete(item,wrong) {
    const earned=store.complete({lessonId:item.id,xp:item.xp,wrongAnswers:wrong,totalQuestions:item.questions.length,practice:!!item.practice});
    setResult({...earned,lesson:item,wrong});setScreen('result');
  }
  function nextLesson() {const next=getNextLesson(progress,course);if(next)start(next);else setScreen('home');}
  function changeCourse(activeCourseId) {
    if(!courses.some(item=>item.id===activeCourseId)) return;
    updateProgress(p=>({...p,activeCourseId}));setMessage('');
  }
  if(location.pathname==='/privacy') return <main className="privacy-page"><a className="brand" href="/"><img src="/logo.svg" alt=""/>looplane</a><h1>Your learning. Your choice.</h1><p>Guest progress, daily goals, sound preferences, and missed-question IDs stay in your browser’s local storage. Clearing site data removes them.</p><p>If you choose an account, Supabase processes your email, authentication details, and learning progress so you can sign in and sync across devices. Google sign-in shares your Google identity with Supabase. Your password is handled by Supabase Auth.</p><p>Your coding exercise text runs only in an isolated browser worker. Looplane does not send that text to Supabase or another server. Cloud progress contains lesson IDs, scores, settings, and dates, never your code.</p><p>Vercel hosts the app and may process connection information in its hosting logs. Vercel Web Analytics collects aggregated page-view, device, browser, and referrer statistics without analytics cookies. Our integration removes URL query strings and fragments and sends no exercise code, answers, email addresses, account IDs, or learning progress. Analytics stays off when your browser signals Do Not Track or Global Privacy Control. Looplane uses no advertising trackers. Offline app files are cached on your device.</p><p>“Report a problem” opens your email app with the lesson and question identifiers. You can review and edit the draft before sending it; Looplane does not send it automatically.</p><p>You can sign out through Account. For support or to request account deletion, email <a className="privacy-contact" href="mailto:rishirana463@gmail.com">rishirana463@gmail.com</a>. Cloud progress is retained until account deletion. The project operator can delete your user in Supabase Auth; its linked progress row is deleted automatically.</p><a className="button" href="/">Back to learning</a></main>;
  if(dataError) return <main className="error-page"><h1>Couldn’t load the lessons.</h1><p>Please reconnect and try again. Your progress is saved locally.</p><button className="button" onClick={()=>location.reload()}>Try again</button></main>;
  if(!course) return <main className="loading-page" role="status"><img src="/logo.svg" alt=""/><p>Getting your next aha ready…</p></main>;
  return <><a className="skip-link" href="#main">Skip to content</a><AnimatePresence mode="wait">{screen==='lesson'?<motion.main id="main" key="lesson" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><LessonScreen key={lesson.id} lesson={lesson} progress={progress} updateProgress={updateProgress} onComplete={complete} onExit={()=>setScreen('home')} onOut={()=>setScreen('out')}/></motion.main>:screen==='result'?<motion.div id="main" key="result" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><Result result={result} onHome={()=>setScreen('home')} onNext={nextLesson}/></motion.div>:screen==='out'?<main id="main" className="result-screen"><div className="out-art"><Icon name="heart" size={62}/></div><span className="eyebrow">A LITTLE PAUSE</span><h1>Out of hearts</h1><p>One heart returns every 30 minutes. A fresh start will be waiting.</p><span className="refill-note">{progress.hearts?`${progress.hearts} heart${progress.hearts>1?'s':''} ready`:`Next heart in ${Math.max(1,Math.ceil(((progress.heartRefillAt||Date.now())-Date.now())/60000))} min`}</span><button className="button" onClick={()=>start(lesson)}>Retry<Icon name="refresh"/></button><button className="text-button" onClick={()=>setScreen('home')}>Back to your path</button></main>:<motion.div className="app-shell" key="home" initial={{opacity:0}} animate={{opacity:1}}><aside className="left-rail"><a className="brand" href="/"><img src="/logo.svg" alt=""/>looplane</a><nav aria-label="Main navigation"><button className="nav-item active" aria-current="page" onClick={()=>setScreen('home')}><Icon name="book"/>Learn<span className="nav-dot"/></button><button className="nav-item" onClick={practice}><Icon name="refresh"/>Practice</button><button className="nav-item" onClick={()=>setAccount(true)}><Icon name="user"/>Account</button></nav><div className="sidebar-course"><span className="js-badge">{course.badge}</span><div><strong>{course.language}</strong><span>{course.units.length} units · {course.units.flatMap(u=>u.lessons).length} lessons</span></div></div><a className="sidebar-bottom" href="/privacy">Privacy &amp; support<Icon name="arrow" size={16}/></a></aside><div className="main-shell"><TopBar courses={courses} course={course} onCourseChange={changeCourse} progress={progress} onAccount={()=>setAccount(true)} syncStatus={store.syncStatus}/><main id="main"><div className="status-messages" role="status">{store.storageError&&<p className="notice">{store.storageError}</p>}{store.authError&&<p className="notice">{store.authError}</p>}{store.syncStatus==='pending'&&<p className="notice">Saved on this device. Cloud sync will retry when you’re online.</p>}{message&&<p className="notice">{message}</p>}{install.error&&<p className="notice">{install.error}</p>}{install.needRefresh&&<p className="notice">A fresh version is ready. <button className="text-button" onClick={install.updateApp}>Update app</button></p>}</div><Home course={course} progress={progress} onStart={start} onPractice={practice} onAccount={()=>setAccount(true)} updateProgress={updateProgress} install={install}/></main><nav className="bottom-nav" aria-label="Mobile navigation"><button aria-current="page" onClick={()=>setScreen('home')}><Icon name="book"/>Learn</button><button onClick={practice}><Icon name="refresh"/>Practice</button><button onClick={()=>setAccount(true)}><Icon name="user"/>Account</button><button aria-label={progress.muted?'Turn sound on':'Mute sound'} onClick={()=>updateProgress(p=>({...p,muted:!p.muted}))}><Icon name={progress.muted?'mute':'sound'}/>{progress.muted?'Muted':'Sound'}</button>{install.canInstall&&<button onClick={install.install}><Icon name="download"/>Install</button>}</nav></div></motion.div>}</AnimatePresence>{!progress.onboarded&&!account&&<Onboarding courses={courses} course={course} onCourseChange={changeCourse} onSignIn={()=>setAccount(true)} goal={progress.dailyGoal} onGoal={dailyGoal=>updateProgress(p=>({...p,dailyGoal}))} onDone={()=>{updateProgress(p=>({...p,onboarded:true}));start(course.units[0].lessons[0]);}}/>}{account&&<AccountDialog initialMode={progress.onboarded?'signup':'signin'} onClose={closeAccount} session={store.session} syncStatus={store.syncStatus} signOut={store.signOut} offlineReady={install.offlineReady}/>}</>;
}
