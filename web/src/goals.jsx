// Goals — decomposition view
const { useState: useS_g } = React;

function GoalsView(){
  const [selId, setSelId] = useS_g("g1");
  const [showDecompose, setShowDecompose] = useS_g(false);
  const sel = MOCK.goals.find(g=>g.id===selId);

  return (
    <div className="surface" style={{display:"grid", gridTemplateColumns:"280px 1fr", gap:32, padding:"28px 32px 64px", maxWidth:1200}}>
      <aside>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
          <div className="mono">Active goals</div>
          <button className="btn btn-xs btn-ghost">{I.plus({size:12})} New</button>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {MOCK.goals.map(g => (
            <button key={g.id} onClick={()=>setSelId(g.id)} style={{
              textAlign:"left", padding:"12px 14px", borderRadius:12,
              border:"1px solid var(--hair)",
              background: selId===g.id?"var(--accent-wash)":"var(--panel)"
            }}>
              <div className="mono" style={{color:"var(--ink-4)", marginBottom:4}}>{g.horizon} · {g.weeksRemaining}w left</div>
              <div style={{fontSize:13.5, fontWeight:500, lineHeight:1.3, marginBottom:8}}>{g.title}</div>
              <div style={{height:3, background:"var(--hair)", borderRadius:2}}>
                <div style={{width:`${g.progress*100}%`, height:"100%", background:"var(--accent)", borderRadius:2}}/>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main>
        <div className="mono" style={{color:"var(--ink-4)", marginBottom:8}}>{sel.horizon} goal · {sel.weeksRemaining} weeks remaining</div>
        <h1 className="serif" style={{fontSize:36, fontWeight:500, letterSpacing:"-0.02em", margin:"0 0 10px", lineHeight:1.15}}>{sel.title}</h1>
        {sel.why && <p className="serif" style={{fontSize:17, fontStyle:"italic", color:"var(--ink-3)", maxWidth:680, margin:"0 0 28px"}}>“{sel.why}”</p>}

        {/* Progress summary */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28}}>
          <Stat label="Progress" value={`${Math.round(sel.progress*100)}%`}/>
          <Stat label="Milestones done" value={`${sel.milestones.filter(m=>m.done).length}/${sel.milestones.length||"—"}`}/>
          <Stat label="Focus time · 14d" value="14h 20m"/>
          <Stat label="Drift" value="on track" accent/>
        </div>

        {/* Decomposition */}
        <div className="card card-pad" style={{marginBottom:24}}>
          <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:16}}>
            <div className="serif" style={{fontSize:20, fontWeight:500}}>Decomposition</div>
            <div className="mono" style={{color:"var(--ink-4)"}}>generated Apr 2 · claude-opus-4-7</div>
            <button className="btn btn-xs btn-ghost" style={{marginLeft:"auto"}} onClick={()=>setShowDecompose(true)}>{I.spark({size:12})} Re-decompose</button>
          </div>

          {sel.milestones.length ? (
            <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10}}>
              {sel.milestones.map((m,i) => (
                <div key={i} style={{
                  padding:"12px 14px", borderRadius:10,
                  border:"1px solid var(--hair)",
                  background: m.current ? "var(--accent-wash)" : (m.done ? "var(--panel-2)" : "var(--panel)"),
                  opacity: m.done && !m.current ? 0.75 : 1,
                }}>
                  <div className="mono" style={{color:"var(--ink-4)", marginBottom:4}}>
                    Week {m.week} {m.current && "· now"} {m.done && "· done"}
                  </div>
                  <div style={{fontSize:13, lineHeight:1.4}}>{m.title}</div>
                  {m.done && <div style={{marginTop:8, color:"var(--accent-ink)"}}>{I.check({size:12})}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{padding:"20px 0", color:"var(--ink-4)", fontStyle:"italic"}}>
              No decomposition yet. Let Compass draft weekly milestones from your why-it-matters note.
            </div>
          )}
        </div>

        {/* Daily templates */}
        {sel.dailyTemplates.length > 0 && (
          <div className="card card-pad">
            <div className="serif" style={{fontSize:18, fontWeight:500, marginBottom:6}}>Daily shape it suggests</div>
            <div className="mono" style={{color:"var(--ink-4)", marginBottom:14}}>Woven into your Daily Focus and Pomodoro suggestions</div>
            <ol style={{paddingLeft:18, margin:0, display:"flex", flexDirection:"column", gap:6, fontSize:14, color:"var(--ink-2)"}}>
              {sel.dailyTemplates.map((t,i) => <li key={i}>{t}</li>)}
            </ol>
          </div>
        )}
      </main>

      {showDecompose && <DecomposeModal close={()=>setShowDecompose(false)} goal={sel}/>}
    </div>
  );
}

function Stat({ label, value, accent }){
  return (
    <div style={{padding:"14px 16px", border:"1px solid var(--hair)", borderRadius:12, background:"var(--panel)"}}>
      <div className="mono" style={{color:"var(--ink-4)", marginBottom:6}}>{label}</div>
      <div className="serif" style={{fontSize:24, fontWeight:500, letterSpacing:"-0.01em", color: accent?"var(--accent-ink)":"var(--ink)"}}>{value}</div>
    </div>
  );
}

function DecomposeModal({ close, goal }){
  const [phase, setPhase] = useS_g("thinking");
  React.useEffect(() => { const t = setTimeout(()=>setPhase("result"), 1800); return ()=>clearTimeout(t); }, []);
  return (
    <div className="modal-scrim" onClick={close}>
      <div className="modal wide" onClick={e=>e.stopPropagation()}>
        <div style={{padding:"18px 22px", borderBottom:"1px solid var(--hair)", display:"flex", alignItems:"center", gap:10}}>
          {I.spark({size:16})}
          <div className="serif" style={{fontSize:18, fontWeight:500}}>Re-decompose goal</div>
          <div className="mono" style={{color:"var(--ink-4)", marginLeft:8}}>goal.decompose · claude-opus-4-7 · est ~$0.08</div>
          <button className="icon-btn" style={{marginLeft:"auto"}} onClick={close}>{I.x({size:14})}</button>
        </div>
        <div style={{padding:"22px"}}>
          {phase==="thinking" ? (
            <div style={{display:"flex", flexDirection:"column", gap:10, padding:"30px 10px"}}>
              <div style={{display:"flex", gap:10, alignItems:"center"}}><span className="spinner"/> <span className="mono">reading goal + why + 14d focus history</span></div>
              <div style={{display:"flex", gap:10, alignItems:"center", opacity:0.5}}><span className="spinner"/> <span className="mono">drafting weekly milestones</span></div>
              <div style={{display:"flex", gap:10, alignItems:"center", opacity:0.3}}><span className="spinner"/> <span className="mono">shaping daily templates</span></div>
            </div>
          ) : (
            <div>
              <p style={{fontSize:14, color:"var(--ink-2)", margin:"0 0 16px"}}>
                Keeping your week 4 milestone (done). Tightening weeks 5–8; the adaptive blocker can run alongside the Gmail beta without a hard dependency.
              </p>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                {["Week 5 · Adaptive personalization signals live behind flag",
                  "Week 6 · Smarter blocker negotiation GA for Plus",
                  "Week 7 · Gmail + Meeting AI in staging with 20 internal testers",
                  "Week 8 · Closed beta invite — 200 users, 14-day window"
                ].map((t,i) => (
                  <div key={i} style={{padding:"10px 12px", border:"1px solid var(--hair)", borderRadius:8, display:"flex", gap:10, alignItems:"center"}}>
                    <span className="mono" style={{color:"var(--ink-4)"}}>wk {5+i}</span>
                    <span style={{fontSize:13}}>{t.split("·")[1]}</span>
                  </div>
                ))}
              </div>
              <div style={{display:"flex", gap:8, marginTop:18, justifyContent:"flex-end"}}>
                <button className="btn btn-sm" onClick={close}>Keep existing</button>
                <button className="btn btn-sm btn-accent" onClick={close}>Replace decomposition</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GoalsView });
