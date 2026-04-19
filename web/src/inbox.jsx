// Inbox Actions
const { useState: useS_i } = React;

function InboxView(){
  const [selId, setSelId] = useS_i("a1");
  const [draftOpen, setDraftOpen] = useS_i(false);
  const sel = MOCK.inboxActions.find(a=>a.id===selId);
  const priColor = { p1:"var(--accent-ink)", p2:"var(--accent-ink)", p3:"var(--ink-3)", p4:"var(--ink-4)" };
  return (
    <div className="surface" style={{display:"grid", gridTemplateColumns:"380px 1fr", gap:0, padding:0, maxWidth:"none"}}>
      <div style={{borderRight:"1px solid var(--hair)", minHeight:"calc(100vh - 58px)"}}>
        <div style={{padding:"16px 20px", borderBottom:"1px solid var(--hair)"}}>
          <div style={{display:"flex", alignItems:"baseline", gap:10}}>
            <div className="serif" style={{fontSize:20, fontWeight:500}}>Actions</div>
            <div className="mono" style={{color:"var(--ink-4)"}}>last scan 6 min · next 12:15 pm</div>
          </div>
          <div style={{display:"flex", gap:6, marginTop:10}}>
            <span className="badge badge-accent">3 need reply</span>
            <span className="badge">2 P1</span>
            <span className="badge">gmail.modify</span>
          </div>
        </div>
        {MOCK.inboxActions.map(it => (
          <button key={it.id} onClick={()=>setSelId(it.id)} style={{
            width:"100%", textAlign:"left", padding:"14px 20px",
            borderBottom:"1px solid var(--hair)",
            background: selId===it.id?"var(--accent-wash)":"transparent"
          }}>
            <div style={{display:"flex", alignItems:"baseline", gap:10}}>
              <span className="mono" style={{color: priColor[it.priority]}}>{it.priority.toUpperCase()}</span>
              <div style={{fontSize:13.5, fontWeight:500, flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{it.subject}</div>
              <span className="mono" style={{color:"var(--ink-4)"}}>{it.received}</span>
            </div>
            <div style={{fontSize:12, color:"var(--ink-3)", marginTop:4}}>{it.from}</div>
            {it.actions.length>0 && (
              <div style={{fontSize:12, color:"var(--ink-2)", marginTop:6, display:"flex", gap:6, alignItems:"flex-start"}}>
                <span style={{color:"var(--accent-ink)", marginTop:1}}>{I.arrow({size:11})}</span>
                <span>{it.actions[0].title}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div style={{padding:"28px 36px 80px", maxWidth:780}}>
        {sel && <>
          <div style={{display:"flex", gap:10, alignItems:"center", marginBottom:10}}>
            <span className="mono" style={{color: priColor[sel.priority], fontWeight:500}}>{sel.priority.toUpperCase()} priority</span>
            <span className="mono" style={{color:"var(--ink-4)"}}>· extracted gpt-5.4-mini · confidence 0.91</span>
          </div>
          <h1 className="serif" style={{fontSize:28, fontWeight:500, letterSpacing:"-0.01em", margin:"0 0 6px", lineHeight:1.2}}>{sel.subject}</h1>
          <div style={{fontSize:13, color:"var(--ink-3)", marginBottom:22}}>from <b>{sel.from}</b> · {sel.email} · {sel.received}</div>

          {sel.actions.length>0 && (
            <div className="card card-pad" style={{marginBottom:22}}>
              <div className="mono" style={{color:"var(--ink-4)", marginBottom:10}}>Extracted action</div>
              {sel.actions.map((a,i) => (
                <div key={i}>
                  <div className="serif" style={{fontSize:20, lineHeight:1.25, marginBottom:10}}>{a.title}</div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:8, marginBottom:14}}>
                    <span className="badge"><span className="dot" style={{color:"var(--accent)"}}/> Owner · you</span>
                    <span className="badge">{I.cal({size:10})} due {a.due}</span>
                    <span className="badge">{a.type}</span>
                    <span className="badge">confidence {Math.round(a.confidence*100)}%</span>
                  </div>
                  <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                    <button className="btn btn-sm btn-accent" onClick={()=>setDraftOpen(true)}>{I.wand({size:12})} Draft reply</button>
                    <button className="btn btn-sm">{I.check({size:12})} Send to Todoist</button>
                    <button className="btn btn-sm btn-ghost">{I.x({size:12})} Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card card-pad">
            <div className="mono" style={{color:"var(--ink-4)", marginBottom:10}}>Snippet · local only · body never stored</div>
            <div className="serif" style={{fontSize:16, color:"var(--ink-2)", fontStyle:"italic", lineHeight:1.6, maxWidth:680}}>
              "{sel.snippet}"
            </div>
          </div>

          {sel.hasDraft && <div style={{marginTop:18, padding:"14px 16px", background:"var(--accent-wash)", borderRadius:12, fontSize:13}}>
            <b>Draft is ready</b> in your Gmail Drafts folder. Compass never sends — you do.
          </div>}
        </>}

        {draftOpen && <DraftModal close={()=>setDraftOpen(false)}/>}
      </div>
    </div>
  );
}

function DraftModal({ close }){
  const [phase, setPhase] = useS_i("thinking");
  const [body, setBody] = useS_i("");
  const FINAL = `Hey Mira — here are the three scenarios for Thursday:

1. Hold at $39. Retention is our strongest lever; adding friction at the price point without feature lift is a wash.
2. Raise to $49 with the AI pillars gated. Cleanest story but likely a 6-month dip before AI cohort catches up.
3. $49 with a 30-day trial and AI-on-by-default. My preference — softens the price raise and lets the Daily Agent prove itself.

Happy to walk through at 9 am. I'll bring cohort math.

— Ayush`;
  React.useEffect(() => {
    setTimeout(()=>setPhase("streaming"), 800);
    let i = 0;
    const stream = setInterval(() => {
      i += 8;
      setBody(FINAL.slice(0, i));
      if (i >= FINAL.length) { clearInterval(stream); setPhase("done"); }
    }, 20);
    return () => clearInterval(stream);
  }, []);
  return (
    <div className="modal-scrim" onClick={close}>
      <div className="modal wide" onClick={e=>e.stopPropagation()}>
        <div style={{padding:"18px 22px", borderBottom:"1px solid var(--hair)", display:"flex", alignItems:"center", gap:10}}>
          {I.wand({size:16})}
          <div className="serif" style={{fontSize:18, fontWeight:500}}>Draft reply</div>
          <div className="mono" style={{color:"var(--ink-4)"}}>gmail.draft · claude-sonnet-4-6</div>
          <button className="icon-btn" style={{marginLeft:"auto"}} onClick={close}>{I.x({size:14})}</button>
        </div>
        <div style={{padding:"20px 22px"}}>
          <div style={{fontFamily:"var(--serif)", fontSize:15.5, color:"var(--ink-2)", lineHeight:1.65, whiteSpace:"pre-wrap", minHeight:220}}>
            {body}{phase==="streaming" && <span style={{display:"inline-block", width:7, height:15, background:"var(--accent)", verticalAlign:"middle", marginLeft:2, animation:"blink 1s steps(1) infinite"}}/>}
          </div>
          <div style={{display:"flex", gap:8, marginTop:18, justifyContent:"flex-end"}}>
            <button className="btn btn-sm btn-ghost">Regenerate shorter</button>
            <button className="btn btn-sm" onClick={close}>Discard</button>
            <button className="btn btn-sm btn-accent" onClick={close} disabled={phase!=="done"}>Save as Gmail draft</button>
          </div>
          <div className="mono" style={{color:"var(--ink-4)", textAlign:"center", marginTop:14}}>saved locally · never sent automatically</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { InboxView });
