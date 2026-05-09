// Momentum — image-led hero with drawer-based detail
const { useState, useEffect, useMemo, useRef } = React;

const ACCENTS = {
  amber: { h: 28, c: 0.14, l: 0.65 },
  rose: { h: 18, c: 0.13, l: 0.66 },
  mint: { h: 160, c: 0.1, l: 0.7 },
  violet: { h: 285, c: 0.12, l: 0.68 },
  sky: { h: 230, c: 0.1, l: 0.7 },
};

// Curated Unsplash backdrops (direct CDN URLs, no API key needed for source)
const SCENES = {
  dawn: {
    label: 'Dawn ridge',
    img: window.__resources.sceneDawn,
    credit: 'Photo · Lukasz Szmigiel',
    mood: 'Clear ridge, slow climb, low cloud.',
  },
  fog: {
    label: 'Fog forest',
    img: window.__resources.sceneFog,
    credit: 'Photo · Sebastian Unrau',
    mood: 'Quiet morning, soft edges, deep work weather.',
  },
  ocean: {
    label: 'Open ocean',
    img: window.__resources.sceneOcean,
    credit: 'Photo · Jeremy Bishop',
    mood: 'Distance to cover, steady horizon, no obstacles.',
  },
  desert: {
    label: 'Desert dune',
    img: window.__resources.sceneDesert,
    credit: 'Photo · NEOM',
    mood: 'Long arc, warm light, single direction.',
  },
  alpine: {
    label: 'Alpine pass',
    img: window.__resources.sceneAlpine,
    credit: 'Photo · Cristina Gottardi',
    mood: 'High altitude, cold air, pace yourself.',
  },
};
const SCENE_KEYS = Object.keys(SCENES);

function pickScene() {
  const h = new Date().getHours();
  if (h < 8) return 'dawn';
  if (h < 12) return 'fog';
  if (h < 16) return 'ocean';
  if (h < 20) return 'alpine';
  return 'desert';
}

function useTweaks() {
  const [tw, setTw] = useState(() => ({ ...window.TWEAKS }));
  useEffect(() => {
    const a = ACCENTS[tw.accent] || ACCENTS.amber;
    document.documentElement.style.setProperty('--accent-h', a.h);
    document.documentElement.style.setProperty('--accent-c', a.c);
    document.documentElement.style.setProperty('--accent-l', a.l);
  }, [tw]);
  const set = (patch) => {
    const next = { ...tw, ...patch };
    setTw(next);
    window.parent?.postMessage?.({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };
  return [tw, set];
}

// ============ STAGE BACKDROP ============
function Stage({ sceneKey }) {
  const scene = SCENES[sceneKey] || SCENES.dawn;
  return (
    <div className="stage">
      <div className="img" key={sceneKey} style={{ backgroundImage: `url(${scene.img})` }} />
      <div className="veil" />
      <div className="grain" />
    </div>
  );
}

// ============ TOPBAR ============
function Topbar({ openDrawer, openCmd, sceneKey, cycleScene }) {
  const tabs = [
    { id: 'brief', label: 'Brief' },
    { id: 'day', label: 'Today' },
    { id: 'goals', label: 'Goals' },
    { id: 'notes', label: 'Notes' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'focus', label: 'Focus' },
  ];
  return (
    <header className="topbar">
      <div className="brand">
        <div className="mark" />
        <div className="name">Compass</div>
        <div className="mono" style={{ marginLeft: 14 }}>
          {SCENES[sceneKey].label}
        </div>
      </div>
      <nav className="nav">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => openDrawer(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="right-tools">
        <button className="cmdk-trigger" onClick={openCmd}>
          {I.search({ size: 13 })}
          <span style={{ flex: 1, textAlign: 'left' }}>Ask Compass…</span>
          <span className="kbd">⌘K</span>
        </button>
        <button className="icon-btn" onClick={cycleScene} title="Change scene">
          {I.spark({ size: 14 })}
        </button>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-soft), oklch(0.5 0.13 25))',
            display: 'grid',
            placeItems: 'center',
            color: '#1a0e02',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          AY
        </div>
      </div>
    </header>
  );
}

// ============ HERO ============
function Hero({ sceneKey, openDrawer }) {
  const b = MOCK.brief;
  const scene = SCENES[sceneKey];
  return (
    <section className="hero">
      <div className="hero-meta">
        <div className="mono">Sun · May 3 · 7:42 am · Brooklyn</div>
        <h1 className="greeting">
          Move with <em>momentum</em>.
        </h1>
        <p className="where">
          {scene.mood} {b.tldr}
        </p>
      </div>
      <div className="hero-card">
        <div className="lbl">Top of mind · 90 minutes</div>
        <div className="top">
          <h2 className="serif">{b.topPriority.title}</h2>
        </div>
        <p className="why">{b.topPriority.why}</p>
        <div className="actions">
          <button className="btn btn-accent" onClick={() => openDrawer('focus')}>
            {I.play({ size: 11 })} Begin 90 min
          </button>
          <button className="btn btn-ghost" onClick={() => openDrawer('brief')}>
            Read full brief
          </button>
          <span className="mono" style={{ marginLeft: 'auto' }}>
            claude · 4.2s
          </span>
        </div>
      </div>
    </section>
  );
}

// ============ TICKER ============
function Ticker({ openDrawer }) {
  return (
    <div className="ticker">
      <div className="vitals">
        <div className="vital">
          <span className="lbl">Sleep</span>
          <span className="val">82</span>
          <span className="sub">good</span>
        </div>
        <div className="vital">
          <span className="lbl">Recovery</span>
          <span className="val">71</span>
          <span className="sub">mid</span>
        </div>
        <div className="vital">
          <span className="lbl">RHR</span>
          <span className="val">58</span>
          <span className="sub">bpm</span>
        </div>
        <div className="vital">
          <span className="lbl">Streak</span>
          <span className="val">14</span>
          <span className="sub">days</span>
        </div>
      </div>
      <div className="center">"{MOCK.brief.quotedGoal}"</div>
      <div className="right">
        <button className="pill" onClick={() => openDrawer('inbox')}>
          <span className="dot" />2 inbox actions
        </button>
        <button className="pill warn" onClick={() => openDrawer('day')}>
          <span className="dot" />3 back-to-backs after 1pm
        </button>
      </div>
    </div>
  );
}

// ============ DRAWER CONTENT ============
function BriefDrawer() {
  const b = MOCK.brief;
  return (
    <>
      <p
        className="serif"
        style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--ink-2)', margin: '0 0 22px' }}
      >
        {b.tldr}
      </p>

      <div className="mono" style={{ marginBottom: 10 }}>
        Pomodoros
      </div>
      <div style={{ marginBottom: 24 }}>
        {b.pomodoros.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              padding: '10px 0',
              gap: 14,
              fontSize: 13,
              alignItems: 'center',
              borderBottom: i < b.pomodoros.length - 1 ? '1px solid var(--hair)' : 'none',
            }}
          >
            <span className="mono" style={{ width: 90, color: 'var(--ink-2)' }}>
              {p.startLocal}–{p.endLocal}
            </span>
            <span style={{ flex: 1 }}>{p.theme}</span>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 10 }}>
              {I.play({ size: 10 })} Start
            </button>
          </div>
        ))}
      </div>

      <div className="mono" style={{ marginBottom: 10 }}>
        Watchouts
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {b.watchouts.map((w, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              color: 'var(--ink-2)',
              display: 'flex',
              gap: 12,
              lineHeight: 1.55,
              fontFamily: 'var(--serif)',
            }}
          >
            <span
              className="mono"
              style={{
                flex: '0 0 18px',
                color: 'var(--ink-4)',
                paddingTop: 3,
                fontFamily: 'var(--mono)',
              }}
            >
              0{i + 1}
            </span>
            <span>{w}</span>
          </li>
        ))}
      </ul>

      <div className="mono" style={{ marginTop: 30, marginBottom: 10 }}>
        Recovery note
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--ink-2)',
          margin: 0,
          fontFamily: 'var(--serif)',
        }}
      >
        {b.recovery.note}
      </p>
    </>
  );
}

function DayDrawer() {
  const startH = 8,
    endH = 19,
    H = endH - startH;
  const HOUR_PX = 38;
  const toY = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h - startH + m / 60) * HOUR_PX;
  };
  return (
    <div className="timeline" style={{ height: H * HOUR_PX + 16 }}>
      {Array.from({ length: H + 1 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 60,
            right: 0,
            top: i * HOUR_PX,
            borderTop: i === 0 ? 'none' : '1px dashed var(--hair)',
            height: 1,
          }}
        >
          <span
            className="mono"
            style={{ position: 'absolute', left: -50, top: -7, fontSize: 9, color: 'var(--ink-4)' }}
          >
            {((startH + i + 11) % 12) + 1} {startH + i < 12 ? 'am' : 'pm'}
          </span>
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 0,
          top: toY('07:42'),
          borderTop: '1.5px solid var(--accent-soft)',
          zIndex: 2,
        }}
      >
        <span
          className="mono"
          style={{
            position: 'absolute',
            right: 8,
            top: -14,
            fontSize: 9,
            color: 'var(--accent-soft)',
          }}
        >
          now
        </span>
      </div>
      {MOCK.events.map((ev) => {
        const top = toY(ev.start),
          height = toY(ev.end) - top;
        return (
          <div key={ev.id} className={`ev ${ev.focus ? 'accent' : ''}`} style={{ top, height }}>
            <span className="mono" style={{ flex: '0 0 auto', fontSize: 9 }}>
              {ev.start}
            </span>
            <span
              style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ev.summary}
            </span>
            {ev.prep && <span className="badge badge-accent">prep</span>}
          </div>
        );
      })}
    </div>
  );
}

function GoalsDrawer() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {MOCK.goals.map((g) => (
        <div key={g.id}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span className="mono" style={{ color: 'var(--accent-soft)' }}>
              {g.horizon} · {g.weeksRemaining}w
            </span>
            <span className="mono dim2" style={{ marginLeft: 'auto' }}>
              {Math.round(g.progress * 100)}%
            </span>
          </div>
          <h3
            className="serif"
            style={{ fontSize: 22, lineHeight: 1.2, margin: '0 0 10px', letterSpacing: '-0.02em' }}
          >
            {g.title}
          </h3>
          {g.why && (
            <p
              className="serif"
              style={{
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--ink-2)',
                fontStyle: 'italic',
                margin: '0 0 12px',
              }}
            >
              "{g.why}"
            </p>
          )}
          <div className="bar" style={{ marginBottom: 14 }}>
            <span style={{ width: `${g.progress * 100}%` }} />
          </div>
          {g.milestones.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                border: '1px solid var(--hair)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {g.milestones.slice(0, 5).map((m) => (
                <div
                  key={m.week}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 12px',
                    background: m.current ? 'var(--accent-wash)' : 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid var(--hair)',
                  }}
                >
                  <span className="mono dim2" style={{ flex: '0 0 50px' }}>
                    WK {m.week}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: m.done && !m.current ? 'var(--ink-4)' : 'var(--ink-2)',
                      textDecoration: m.done && !m.current ? 'line-through' : 'none',
                    }}
                  >
                    {m.title}
                  </span>
                  {m.done && !m.current && (
                    <span style={{ color: 'var(--accent-soft)' }}>{I.check({ size: 12 })}</span>
                  )}
                  {m.current && <span className="badge badge-accent">now</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NotesDrawer() {
  const [sel, setSel] = useState(null);
  if (sel) {
    const n = MOCK.notes.find((x) => x.id === sel);
    return (
      <>
        <button
          className="btn btn-ghost"
          style={{ marginBottom: 16, fontSize: 11 }}
          onClick={() => setSel(null)}
        >
          ← All notes
        </button>
        <h2
          className="serif"
          style={{ fontSize: 28, margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.15 }}
        >
          {n.title}
        </h2>
        <div className="mono" style={{ marginBottom: 18 }}>
          {n.tags.join(' · ')} · {n.updated}
        </div>
        <p className="serif" style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          {n.excerpt}
        </p>
        {n.related && n.related.length > 0 && (
          <>
            <div className="mono" style={{ marginTop: 24, marginBottom: 10 }}>
              Related · cosine sim
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {n.related.map((r) => {
                const target = MOCK.notes.find((x) => x.id === r.id);
                if (!target) return null;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSel(r.id)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      border: '1px solid var(--hair)',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{target.title}</span>
                      <span className="mono">{r.sim.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                      "{r.reason}"
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  }
  return (
    <div>
      {MOCK.notes.map((n) => (
        <div key={n.id} className="list-row" onClick={() => setSel(n.id)}>
          <div className="row1">
            <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{n.title}</span>
            <span className="mono dim2">{n.updated}</span>
          </div>
          <div
            className="dim"
            style={{ fontSize: 12, lineHeight: 1.5, maxHeight: '3em', overflow: 'hidden' }}
          >
            {n.excerpt}
          </div>
          {n.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
              {n.tags.map((t) => (
                <span key={t} className="badge">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function InboxDrawer() {
  const [sel, setSel] = useState(MOCK.inboxActions.find((a) => a.actions.length).id);
  const it = MOCK.inboxActions.find((a) => a.id === sel);
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
        {MOCK.inboxActions.map((a) => {
          const tone = { p1: 'red', p2: 'red', p3: 'blue', p4: '' }[a.priority];
          return (
            <button
              key={a.id}
              onClick={() => setSel(a.id)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 8,
                background: sel === a.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                marginBottom: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge badge-${tone}`}>{a.priority.toUpperCase()}</span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.from}
                </span>
                <span className="mono dim2">{a.received}</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  paddingLeft: 30,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {a.subject}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 18 }}>
        <h2
          className="serif"
          style={{ fontSize: 22, margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1.2 }}
        >
          {it.subject}
        </h2>
        <div className="dim" style={{ marginBottom: 14, fontSize: 12 }}>
          {it.from} · {it.email}
        </div>
        <p
          className="serif"
          style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)', margin: '0 0 18px' }}
        >
          {it.snippet}
        </p>
        {it.actions.length > 0 && (
          <div
            style={{
              padding: '14px 16px',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              background: 'var(--accent-wash)',
            }}
          >
            <div className="mono" style={{ color: 'var(--accent-soft)', marginBottom: 8 }}>
              Suggested · {Math.round(it.actions[0].confidence * 100)}% confident
            </div>
            <div className="serif" style={{ fontSize: 16, lineHeight: 1.3, marginBottom: 12 }}>
              {it.actions[0].title}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-accent" style={{ padding: '6px 12px', fontSize: 11 }}>
                {I.check({ size: 11 })} Accept
              </button>
              {it.hasDraft && (
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }}>
                  Open draft
                </button>
              )}
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }}>
                Snooze
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FocusDrawer() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(90 * 60);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  const mm = Math.floor(seconds / 60),
    ss = seconds % 60;
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}
    >
      <div className="mono" style={{ color: 'var(--accent-soft)', marginBottom: 14 }}>
        ● 90-min Pomodoro · PRD final pass
      </div>
      <div
        className="serif"
        style={{
          fontSize: 120,
          lineHeight: 1,
          fontWeight: 300,
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          margin: '4px 0 24px',
        }}
      >
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <button className="btn btn-accent" onClick={() => setRunning((r) => !r)}>
          {running ? <>{I.pause({ size: 11 })} Pause</> : <>{I.play({ size: 11 })} Begin</>}
        </button>
        <button className="btn btn-ghost" onClick={() => setSeconds(90 * 60)}>
          Reset
        </button>
      </div>
      <p
        className="serif"
        style={{
          fontSize: 14,
          fontStyle: 'italic',
          color: 'var(--ink-3)',
          textAlign: 'center',
          maxWidth: 380,
          margin: '0 0 28px',
          lineHeight: 1.6,
        }}
      >
        "{MOCK.brief.quotedGoal}"
      </p>
      <div style={{ width: '100%' }}>
        <div className="mono" style={{ marginBottom: 10 }}>
          Soundscape
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {MOCK.soundscapes.map((s) => (
            <button
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--hair)',
                textAlign: 'left',
                background: s.loved ? 'rgba(255,255,255,0.04)' : 'transparent',
              }}
            >
              {I.sound({ size: 12 })}
              <span style={{ flex: 1, fontSize: 12 }}>{s.name}</span>
              {s.loved && (
                <span style={{ color: 'var(--accent-soft)' }}>
                  {I.heart({ size: 10, fill: 'currentColor' })}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', marginTop: 24 }}>
        <div className="mono" style={{ marginBottom: 10 }}>
          Active blocks
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MOCK.blockRules.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                padding: '7px 10px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6,
              }}
            >
              <span className={`badge ${r.mode === 'hard' ? 'badge-red' : 'badge-accent'}`}>
                {r.mode}
              </span>
              <span
                style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)' }}
              >
                {r.pattern}
              </span>
              {r.source === 'adaptive' && <span className="mono dim2">adaptive</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ DRAWER ============
function Drawer({ open, kind, close }) {
  const titles = {
    brief: 'Morning brief',
    day: 'Today',
    goals: 'Goals',
    notes: 'Notes',
    inbox: 'Inbox',
    focus: 'Focus',
  };
  return (
    <>
      <div className={`drawer-overlay ${open ? 'on' : ''}`} onClick={close} />
      <aside className={`drawer ${open ? 'on' : ''}`}>
        <div className="hd">
          <h2>{titles[kind] || ''}</h2>
          <span className="meta mono">
            {kind === 'brief' && 'claude-haiku · 4.2s'}
            {kind === 'day' && '5 events'}
            {kind === 'notes' && `${MOCK.notes.length} notes`}
          </span>
          <button className="icon-btn" onClick={close}>
            {I.x({ size: 13 })}
          </button>
        </div>
        <div className="body">
          {open && kind === 'brief' && <BriefDrawer />}
          {open && kind === 'day' && <DayDrawer />}
          {open && kind === 'goals' && <GoalsDrawer />}
          {open && kind === 'notes' && <NotesDrawer />}
          {open && kind === 'inbox' && <InboxDrawer />}
          {open && kind === 'focus' && <FocusDrawer />}
        </div>
      </aside>
    </>
  );
}

// ============ COMMAND PALETTE ============
function CmdK({ on, close, openDrawer }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(null);
  const ref = useRef();
  useEffect(() => {
    if (on) setTimeout(() => ref.current?.focus(), 50);
    else {
      setQ('');
      setAnswer(null);
    }
  }, [on]);
  if (!on) return null;
  const navItems = [
    { label: 'Open brief', id: 'brief' },
    { label: "Open today's plan", id: 'day' },
    { label: 'Open goals', id: 'goals' },
    { label: 'Open notes', id: 'notes' },
    { label: 'Open inbox', id: 'inbox' },
    { label: 'Begin 90-min focus', id: 'focus' },
  ].filter((x) => !q || x.label.toLowerCase().includes(q.toLowerCase()));
  const isAsk = q.length > 5 && /[?]|^(what|why|how|when|did|should|is|are)\b/i.test(q);
  const onAsk = async () => {
    setBusy(true);
    setAnswer(null);
    await new Promise((r) => setTimeout(r, 1200));
    setAnswer(
      'From your notes: yes — keep the offscreen runtime. Cross-origin isolation only enables WebGPU and SharedArrayBuffer; the OPFS sync handles that gate the SQLite-vec write path are unaffected. Notes n1, n2, n8 all converge on this.',
    );
    setBusy(false);
  };
  return (
    <div className="scrim" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 18px',
            borderBottom: '1px solid var(--hair)',
          }}
        >
          {I.search({ size: 15 })}
          <input
            ref={ref}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search, navigate, or ask…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
            }}
          />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight: 380, overflow: 'auto', padding: '6px 0' }}>
          {!isAsk &&
            navItems.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  openDrawer(it.id);
                  close();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 18px',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {I.arrow({ size: 12 })}
                <span style={{ flex: 1, fontSize: 13 }}>{it.label}</span>
              </button>
            ))}
          {isAsk && !answer && !busy && (
            <button
              onClick={onAsk}
              style={{
                width: '100%',
                padding: '16px 18px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {I.spark({ size: 14 })}
              <span style={{ flex: 1, fontSize: 13 }}>
                Ask Compass: <em>"{q}"</em>
              </span>
              <span className="kbd">⏎</span>
            </button>
          )}
          {busy && (
            <div style={{ padding: '24px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="spinner" />
              <span className="dim" style={{ fontSize: 12 }}>
                Searching your notes & emails…
              </span>
            </div>
          )}
          {answer && (
            <div style={{ padding: '18px' }}>
              <div className="mono" style={{ color: 'var(--accent-soft)', marginBottom: 10 }}>
                Answer · grounded in 3 notes
              </div>
              <p className="serif" style={{ fontSize: 14.5, lineHeight: 1.6, margin: '0 0 12px' }}>
                {answer}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge">n1 architecture</span>
                <span className="badge">n2 offscreen runtime</span>
                <span className="badge">n8 auth reality</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ TWEAKS ============
function Tweaks({ open, close, tw, set, sceneKey, setSceneKey }) {
  return (
    <>
      {!open && (
        <button
          className="tweak-pill"
          onClick={() => document.dispatchEvent(new CustomEvent('open-tweaks'))}
        >
          Tweaks
        </button>
      )}
      <div className={`tweaks ${open ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span className="mono">Tweaks</span>
          <button
            className="icon-btn"
            style={{ marginLeft: 'auto', width: 24, height: 24 }}
            onClick={close}
          >
            {I.x({ size: 11 })}
          </button>
        </div>
        <div className="row">
          <span>Accent</span>
          <div className="swatch-row">
            {Object.keys(ACCENTS).map((k) => (
              <button
                key={k}
                className={`swatch ${tw.accent === k ? 'active' : ''}`}
                style={{ background: `oklch(${ACCENTS[k].l} ${ACCENTS[k].c} ${ACCENTS[k].h})` }}
                onClick={() => set({ accent: k })}
              />
            ))}
          </div>
        </div>
        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <span style={{ fontSize: 11 }}>Scene</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {SCENE_KEYS.map((k) => (
              <button
                key={k}
                title={SCENES[k].label}
                onClick={() => setSceneKey(k)}
                style={{
                  height: 34,
                  borderRadius: 6,
                  backgroundImage: `url(${SCENES[k].img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border:
                    sceneKey === k
                      ? '2px solid var(--accent-soft)'
                      : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ============ APP ============
function App() {
  const [tw, setTw] = useTweaks();
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, kind: 'brief' });
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [sceneKey, setSceneKey] = useState(() => pickScene());

  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    document.addEventListener('open-tweaks', () => setTweaksOpen(true));
    window.parent?.postMessage?.({ type: '__edit_mode_available' }, '*');
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setCmdkOpen(false);
        setDrawer((d) => ({ ...d, open: false }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('message', onMsg);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const closeTweaks = () => {
    setTweaksOpen(false);
    window.parent?.postMessage?.({ type: '__edit_mode_dismissed' }, '*');
  };
  const openDrawer = (kind) => setDrawer({ open: true, kind });
  const cycleScene = () => {
    const i = SCENE_KEYS.indexOf(sceneKey);
    setSceneKey(SCENE_KEYS[(i + 1) % SCENE_KEYS.length]);
  };

  return (
    <>
      <Stage sceneKey={sceneKey} />
      <div className="shell">
        <Topbar
          openDrawer={openDrawer}
          openCmd={() => setCmdkOpen(true)}
          sceneKey={sceneKey}
          cycleScene={cycleScene}
        />
        <Hero sceneKey={sceneKey} openDrawer={openDrawer} />
        <Ticker openDrawer={openDrawer} />
      </div>
      <Drawer
        open={drawer.open}
        kind={drawer.kind}
        close={() => setDrawer((d) => ({ ...d, open: false }))}
      />
      <CmdK on={cmdkOpen} close={() => setCmdkOpen(false)} openDrawer={openDrawer} />
      <Tweaks
        open={tweaksOpen}
        close={closeTweaks}
        tw={tw}
        set={setTw}
        sceneKey={sceneKey}
        setSceneKey={setSceneKey}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
