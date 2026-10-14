import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
export default function Modal({title, children, onClose}) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () => [...panel.current.querySelectorAll('button, input, a[href], select, textarea')].filter(el => !el.disabled);
    focusable()[0]?.focus();
    const key = event => {
      if(event.key === 'Escape') onClose();
      if(event.key === 'Tab') {
        const elements = focusable(); const first=elements[0], last=elements.at(-1);
        if(event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();}
        if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key);
    const overflow = document.body.style.overflow; document.body.style.overflow='hidden';
    return () => {document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus();};
  },[onClose]);
  return <div className="modal-backdrop" onClick={e => {if(e.target===e.currentTarget) onClose();}}><motion.section ref={panel} className="modal" role="dialog" aria-modal="true" aria-label={title} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}><button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button>{children}</motion.section></div>;
}
