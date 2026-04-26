// Icons — feather-style 1.5px line icons
const Icon = ({ d, s=1.6, size=16, fill, ...p }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={fill||"none"} stroke="currentColor" strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
);

const I = {
  compass: (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.3 6.2-6.2 2.3 2.3-6.2z"/></>} />,
  home:   (p)=> <Icon {...p} d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  note:   (p)=> <Icon {...p} d={<><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4"/><path d="M8 12h8M8 16h5"/></>} />,
  focus:  (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>} />,
  goal:   (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 3v9l5 3"/></>} />,
  inbox:  (p)=> <Icon {...p} d={<><path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 13V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7"/><path d="M4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></>} />,
  block:  (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/></>} />,
  gear:   (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/></>} />,
  search: (p)=> <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />,
  plus:   (p)=> <Icon {...p} d="M12 5v14M5 12h14" />,
  chev:   (p)=> <Icon {...p} d="m9 6 6 6-6 6" />,
  up:     (p)=> <Icon {...p} d="m6 15 6-6 6 6" />,
  down:   (p)=> <Icon {...p} d="m6 9 6 6 6-6" />,
  check:  (p)=> <Icon {...p} d="M5 12l4 4 10-10" />,
  x:      (p)=> <Icon {...p} d="M6 6l12 12M18 6 6 18" />,
  play:   (p)=> <Icon {...p} d="M7 5v14l12-7z" fill="currentColor" s={0}/>,
  pause:  (p)=> <Icon {...p} d={<><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/></>} />,
  sun:    (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></>} />,
  moon:   (p)=> <Icon {...p} d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />,
  spark:  (p)=> <Icon {...p} d={<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5 8 8M16 16l2.5 2.5M18.5 5.5 16 8M8 16l-2.5 2.5"/></>} s={1.4}/>,
  mic:    (p)=> <Icon {...p} d={<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>} />,
  link:   (p)=> <Icon {...p} d={<><path d="M9.2 14.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14.8 9.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></>} />,
  star:   (p)=> <Icon {...p} d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  drop:   (p)=> <Icon {...p} d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z"/>,
  sleep:  (p)=> <Icon {...p} d={<><path d="M3 18h18"/><path d="M5 18v-4a5 5 0 0 1 5-5h9v9"/></>} />,
  heart:  (p)=> <Icon {...p} d="M12 20S3 14 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12-9 12z" />,
  cloud:  (p)=> <Icon {...p} d="M6 19a4 4 0 0 1-.7-7.9 6 6 0 0 1 11.6-1A4.5 4.5 0 0 1 18 19z" />,
  cal:    (p)=> <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>} />,
  clock:  (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  people: (p)=> <Icon {...p} d={<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="3"/><path d="M15 15.5a5 5 0 0 1 7.5 4.5"/></>} />,
  key:    (p)=> <Icon {...p} d={<><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2 2 2-2 2-2-2"/><path d="m17 6 2 2"/></>} />,
  thumbup:(p)=> <Icon {...p} d={<><path d="M7 11v9H4v-9zM7 11l4-8c2 0 3 1.5 3 3.5V10h5a2 2 0 0 1 2 2.3l-1 6a3 3 0 0 1-3 2.7H7"/></>} />,
  thumbdn:(p)=> <Icon {...p} d={<><path d="M7 13V4H4v9zM7 13l4 8c2 0 3-1.5 3-3.5V14h5a2 2 0 0 0 2-2.3l-1-6A3 3 0 0 0 17 3H7"/></>} />,
  send:   (p)=> <Icon {...p} d="m22 2-10 20-2-8-8-2z" />,
  wand:   (p)=> <Icon {...p} d={<><path d="m4 20 12-12"/><path d="M14 4v2M20 10h2M18 2l1 1M15 13l3 3M10 6l2 2"/></>} />,
  sound:  (p)=> <Icon {...p} d={<><path d="M4 9h3l5-4v14l-5-4H4z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></>} />,
  eye:    (p)=> <Icon {...p} d={<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>} />,
  eyeoff: (p)=> <Icon {...p} d={<><path d="m4 4 16 16M6.5 6.5C4 8 2 12 2 12s3.5 7 10 7c2 0 3.7-.6 5.1-1.4M10 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4.3"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/></>} />,
  sliders:(p)=> <Icon {...p} d={<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h14M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2" fill="currentColor"/></>} />,
  more:   (p)=> <Icon {...p} d={<><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/></>} />,
  arrow:  (p)=> <Icon {...p} d="M5 12h14M13 6l6 6-6 6" />,
};

Object.assign(window, { I, Icon });
