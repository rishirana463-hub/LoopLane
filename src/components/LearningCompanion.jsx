import './learning-companion.css';

const companions = {
  aria: { name: 'Aria', caption: 'Ready to learn!' },
  leo: { name: 'Leo', caption: 'Let’s go!' },
  yuki: { name: 'Yuki', caption: 'You got this!' },
  'dr-maya': { name: 'Dr. Maya', caption: 'Amazing work!' },
};

export default function LearningCompanion({ character = 'aria', variant = 'path' }) {
  const { name, caption } = companions[character];
  return <figure className={`learning-companion learning-companion--${variant}`} data-character={character}>
    <img src={`/characters/${character}.png`} alt="" width="320" height="400" loading={variant === 'path' ? 'lazy' : 'eager'} decoding="async"/>
    <figcaption><strong>{name}</strong><span>{caption}</span></figcaption>
  </figure>;
}
