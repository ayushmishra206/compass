// Focus — planner + running overlay
const { useState: useS_f, useEffect: useE_f, useRef: useR_f } = React;

function FocusView({ setRoute }){
  const [running, setRunning] = useS_f(false);
  const [task, setTask] = useS_f("PRD final pass");
  const [mins, setMins] = useS_f(90);
  return (
    <div className="surface" style={{maxWidth:880}}>
      <div className="mono" style={{color:"var(--ink-4)", marginBottom:10}}>Focus</div>
      <h1 className="serif" style={{fontSize:38, fontWeight:400, letterSpacing:"-0.02em", margin:"0 0 4px"}}>What are you moving today?</h1>
      <p className="serif" style={{fontSize:18, color:"var(--ink-3)", margin:"0 0 28px", fontStyle:"italic"}}>One thing, 90 minutes, no tabs.</p>

      <div className="card card-pad" style={{padding:28}}>
        <div className="mono" style={{color:"var(--ink-4)", marginBottom:10}}>Daily focus</div>
        <input value={task} onChange={e=>setTask(e.target.value)} style={{
          width:"100%", border:0, outline:0, background:"transparent",
          fontFamily:"var(--serif)", fontSize:28, letterSpacing:"-0.01em",
          color:"var(--ink)", paddingBottom:14, borderBottom:"1px solid var(--hair)",
        }}/>
        <div style={{display:"flex", gap:8, marginTop:14, flexWrap:"wrap"}}>
          <span className="mono" style={{color:"var(--ink-4)", alignSelf:"center", marginRight:6}}>linked to</span>
          <span className="badge badge-accent">Compass AI upgrade</span>
          <span className="mono" style={{color:"var(--ink-4)", alignSelf:"center", margin:"0 6px 0 12px"}}>soundscape</span>
          {MOCK.soundscapes.map((s,i) => <button key={s.id} className={`badge ${i===0?"badge-accent":""}`}>{I.sound({size:10})} {s.name}</button>)}
        </div>

        <div style={{display:"flex", alignItems:"center", gap:22, marginTop:28}}>
          <div style={{display:"flex", flexDirection:"column", gap:6}}>
            <span className="mono" style={{color:"var(--ink-4)"}}>Duration</span>
            <div style={{display:"flex", gap:6}}>
              {[25,45,60,90,120].map(m => (
                <button key={m} className={`btn btn-sm ${mins===m?"btn-primary":""}`} onClick={()=>setMins(m)}>{m}m</button>
              ))}
            </div>
          </div>
          <div style={{flex:1}}/>
          <button className="btn btn-accent" style={{padding:"12px 22px", fontSize:14}} onClick={()=>setRunning(true)}>
            {I.play({size:14})} Start focus · {mins} min
          </button>
        </div>
      </div>

      {/* History */}
      <div style={{marginTop:32}}>
        <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:14}}>
          <div className="serif" style={{fontSize:20, fontWeight:500}}>This week</div>
          <div className="mono" style={{color:"var(--ink-4)"}}>6h 40m · 9 pomodoros · peak 10 am</div>
        </div>
        <div className="card card-pad">
          <div style={{display:"flex", alignItems:"flex-end", gap:10, height:160}}>
            {[
              {d:"Mon", completed:90, abandoned:0},
              {d:"Tue", completed:75, abandoned:25},
              {d:"Wed", completed:120, abandoned:0},
              {d:"Thu", completed:45, abandoned:30},
              {d:"Fri", completed:105, abandoned:15},
              {d:"Sat", completed:0, abandoned:0},
              {d:"Sun", completed:0, abandoned:0},
            ].map((day,i) => {
              const max = 150;
              return (
                <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8}}>
                  <div style={{width:"100%", height:120, display:"flex", flexDirection:"column-reverse", gap:2}}>
                    <div style={{height:`${day.completed/max*100}%`, background:"var(--accent)", borderRadius:4}}/>
                    {day.abandoned>0 && <div style={{height:`${day.abandoned/max*100}%`, background:"var(--hair-2)", borderRadius:4}}/>}
                  </div>
                  <div className="mono" style={{color:"var(--ink-4)"}}>{day.d}</div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:18, padding:"12px 14px", background:"var(--panel-2)", borderRadius:10, fontSize:13, color:"var(--ink-2)", display:"flex", gap:10}}>
            {I.spark({size:14})}
            <span><b>Compass noticed:</b> Thursday afternoon Pomodoros finish 42% of the time when a calendar meeting sits within 30 minutes. Consider blocking 1–3 pm on Thursdays.</span>
          </div>
        </div>
      </div>

      {running && <FocusRunning task={task} mins={mins} onExit={()=>setRunning(false)}/>}
    </div>
  );
}

function FocusRunning({ task, mins, onExit }){
  const [elapsed, setElapsed] = useS_f(0); // seconds
  useE_f(() => {
    const t = setInterval(()=>setElapsed(e=>e+1), 1000);
    return () => clearInterval(t);
  }, []);
  const total = mins*60;
  const remaining = Math.max(0, total - elapsed);
  const mm = Math.floor(remaining/60).toString().padStart(2,"0");
  const ss = (remaining%60).toString().padStart(2,"0");
  const pct = elapsed/total;
  return (
    <div className="focus-overlay on">
      <div style={{padding:"18px 32px", display:"flex", alignItems:"center", borderBottom:"1px solid var(--hair)"}}>
        <div className="mono" style={{color:"var(--ink-4)"}}>focus · round 1 of 1</div>
        <div style={{flex:1}}/>
        <button className="btn btn-sm btn-ghost" onClick={onExit}>End early</button>
      </div>
      <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:22, padding:"0 40px"}}>
        <div className="serif" style={{fontSize:18, fontStyle:"italic", color:"var(--ink-3)"}}>You're moving</div>
        <div className="serif" style={{fontSize:52, fontWeight:400, letterSpacing:"-0.02em", maxWidth:760, textAlign:"center", lineHeight:1.15}}>{task}</div>

        {/* ring */}
        <div style={{position:"relative", width:280, height:280, margin:"18px 0"}}>
          <svg width="280" height="280" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r="128" fill="none" stroke="var(--hair)" strokeWidth="2"/>
            <circle cx="140" cy="140" r="128" fill="none" stroke="var(--accent)" strokeWidth="3"
              strokeDasharray={`${2*Math.PI*128}`} strokeDashoffset={`${2*Math.PI*128*(1-pct)}`}
              strokeLinecap="round" transform="rotate(-90 140 140)"/>
          </svg>
          <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
            <div style={{fontFamily:"var(--serif)", fontSize:72, fontWeight:300, letterSpacing:"-0.03em"}}>{mm}:{ss}</div>
            <div className="mono" style={{color:"var(--ink-4)"}}>remaining</div>
          </div>
        </div>

        <div style={{display:"flex", gap:8}}>
          <button className="btn btn-sm">{I.pause({size:12})} Pause</button>
          <button className="btn btn-sm">{I.sound({size:12})} Rain on leaves</button>
          <button className="btn btn-sm">{I.block({size:12})} Blocking 6 sites</button>
        </div>

        <div className="mono" style={{color:"var(--ink-4)", marginTop:20, textAlign:"center", maxWidth:520, lineHeight:1.5}}>
          The brief suggested two more Pomodoros after this. <br/>
          Inbox, notifications, and social sites are muted until {fmtTime(new Date(Date.now()+remaining*1000))}.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FocusView });
