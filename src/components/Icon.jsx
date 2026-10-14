const paths = {
  arrow: 'M5 12h14m-5-5 5 5-5 5', check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M6 18 18 6',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  flame: 'M13 3s1 5-3 7c0-3-2-4-2-4s-6 7-3 12a8 8 0 0 0 14-1c2-6-6-14-6-14Z',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-8l1-7Z', lock: 'M6 10h12v11H6ZM8 10V7a4 4 0 0 1 8 0v3',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16', book: 'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16',
  target: 'M21 12a9 9 0 1 1-9-9m8 1-8 8m1-8h7v7M16 12a4 4 0 1 1-4-4',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  sound: 'M11 4 6 8H2v8h4l5 4ZM15 8a6 6 0 0 1 0 8m3-12a11 11 0 0 1 0 16',
  mute: 'M11 4 6 8H2v8h4l5 4Zm5 5 6 6m0-6-6 6', snow: 'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3',
  star: 'm12 2 3.1 6.3L22 9.4l-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.3l-5-4.9 6.9-1.1Z',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', refresh: 'M20 7V3l-4 4a8 8 0 1 0 4 8M20 3h-5',
  cloud: 'M6 18a5 5 0 1 1 1-10 6 6 0 0 1 11 2 4 4 0 0 1 0 8Z', trophy: 'M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v6m-4 0h8',
};
export default function Icon({name, size=22, ...props}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.code}/></svg>;
}
