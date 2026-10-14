import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? <main className="error-page"><h1>Let’s try that again.</h1><p>The app could not open this screen. Your saved progress is still on this device.</p><button className="button" onClick={() => location.reload()}>Reload app</button></main> : this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><MotionConfig reducedMotion="user"><App/></MotionConfig></ErrorBoundary>);
