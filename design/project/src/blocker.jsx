// Site Blocker — negotiation overlay
const { useState: useS_b, useEffect: useE_b } = React;

function BlockerView({ openPreview }){
  return (
    <div className="surface" style={{maxWidth:980}}>
      <div className="mono" style={{color:"var(--ink-4)", marginBottom:8}}>Site blocker</div>
      <h1 className="serif" style={{fontSize:34, fontWeight:500, letterSpacing:"-0.02em", margin:"0 0 6px"}}>Soft blocks, honest conversations.</h1>
      <p className="serif" style={{fontSize:17, color:"var(--ink-3)", fontStyle:"italic", margin:"0 0 28px", maxWidth:620}}>When you reach for a blocked site, Compass asks once, gently. You can always proceed.</p>

      <div className="card card-pad" style={{marginBottom:22}}>
        <div style={{display:"flex", alignItems:"baseline", marginBottom:14}}>
          <div className="serif" style={{fontSize:20, fontWeight:500}}>Rules</div>
          <div className="mono" style={{color:"var(--ink-4)", marginLeft:10}}>4 active · 2 adaptive · paths never sent to the model</div>
          <button className="btn btn-sm btn-ghost" style={{marginLeft:"auto"}}>{I.plus({size:12})} Add rule</button>
        </div>
        <div style={{display:"flex", flexDirection:"column"}}>
          {MOCK.blockRules.map((r,i) => (
            <div key={r.id} style={{display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderTop: i===0?"none":"1px solid var(--hair)"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14, fontWeight:500, fontFamily:"var(--mono)", fontSize:13}}>{r.pattern}</div>
                <div style={{fontSize:12, color:"var(--ink-4)", marginTop:3}}>{r.note}</div>
              </div>
              <span className={`badge ${r.mode==="soft"?"badge-sage":"badge-accent"}`}>{r.mode}</span>
              <span className="badge">{r.source}</span>
              <span className="mono" style={{color:"var(--ink-4)"}}>{r.strikes} bypass{r.strikes!==1?"es":""}</span>
              <button className="btn btn-sm" onClick={()=>openPreview(r)}>{I.eye({size:12})} Preview</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:22}}>
        <div className="card card-pad">
          <div className="serif" style={{fontSize:18, fontWeight:500, marginBottom:6}}>Rationalization patterns</div>
          <div className="mono" style={{color:"var(--ink-4)", marginBottom:14}}>14 days</div>
          {[
            ["just_one_minute", 7],["work_related_cover", 3],["boredom_switch", 2],["emotional_avoidance", 1],
          ].map(([k,n]) => (
            <div key={k} style={{display:"flex", gap:10, padding:"8px 0", borderTop:"1px solid var(--hair)"}}>
              <span className="mono" style={{color:"var(--ink-3)", flex:1}}>{k.replace(/_/g," ")}</span>
              <span className="serif" style={{fontSize:18}}>{n}</span>
            </div>
          ))}
        </div>
        <div className="card card-pad">
          <div className="serif" style={{fontSize:18, fontWeight:500, marginBottom:6}}>Adaptive suggestions</div>
          <div className="mono" style={{color:"var(--ink-4)", marginBottom:14}}>one per week, opt-in</div>
          <div style={{padding:"12px 14px", background:"var(--panel-2)", borderRadius:10, fontSize:13, color:"var(--ink-2)", lineHeight:1.5}}>
            <b>linkedin.com</b> preceded 3 abandoned Pomodoros this week. Add as a soft rule during focus hours?
            <div style={{display:"flex", gap:6, marginTop:10}}>
              <button className="btn btn-xs btn-accent">Add as soft</button>
              <button className="btn btn-xs btn-ghost">Not now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockOverlay({ rule, onClose }){
  const [turns, setTurns] = useS_b([
    { role:"assistant", text:`You blocked ${rule.pattern} during deep-work hours. What's pulling you here right now?` }
  ]);
  const [input, setInput] = useS_b("");
  const [pattern, setPattern] = useS_b(null);
  const [seconds, setSeconds] = useS_b(0);
  useE_b(()=>{ const t = setInterval(()=>setSeconds(s=>s+1), 1000); return ()=>clearInterval(t); },[]);

  const send = () => {
    if (!input.trim()) return;
    const userText = input;
    setTurns(t => [...t, { role:"user", text: userText }]);
    setInput("");
    setTimeout(()=>{
      setPattern("just_one_minute");
      setTurns(t => [...t, { role:"assistant", text: "Five minutes is usually closer to twenty-five for me too. Would a 5-minute window now — or a real break between Pomodoros — serve you better?", offer:"grant_5min" }]);
    }, 700);
  };

  return (
    <div className="block-overlay on" style={{flexDirection:"column"}}>
      <div style={{padding:"18px 32px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid oklch(0.94 0.01 75 / 0.1)"}}>
        <div className="brand-mark" style={{width:22, height:22}}/>
        <div style={{fontFamily:"var(--serif)", fontSize:15}}>Compass</div>
        <div className="mono" style={{color:"oklch(0.8 0.02 75 / 0.6)", marginLeft:8}}>soft block · {rule.pattern}</div>
        <div style={{flex:1}}/>
        <div className="mono" style={{color:"oklch(0.8 0.02 75 / 0.55)"}}>focus ends in 0:47 · {seconds}s here</div>
        <button className="icon-btn" style={{color:"inherit"}} onClick={onClose}>{I.x({size:16})}</button>
      </div>

      <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 40px"}}>
        <div style={{maxWidth:640, width:"100%"}}>
          <div style={{display:"flex", flexDirection:"column", gap:14, marginBottom:24}}>
            {turns.map((t,i) => (
              <div key={i} style={{display:"flex", justifyContent: t.role==="user"?"flex-end":"flex-start"}}>
                <div style={{
                  maxWidth:"80%", padding:"14px 18px", borderRadius:14,
                  background: t.role==="user" ? "oklch(0.98 0.02 75 / 0.14)" : "oklch(0.98 0.02 75 / 0.04)",
                  border:"1px solid oklch(0.98 0.02 75 / 0.12)",
                  fontFamily: t.role==="user" ? "var(--sans)" : "var(--serif)",
                  fontSize: t.role==="user" ? 14 : 18,
                  lineHeight:1.5,
                }}>
                  {t.text}
                  {t.offer && (
                    <div style={{marginTop:10, display:"flex", gap:6, flexWrap:"wrap"}}>
                      <button className="btn btn-sm" style={{background:"oklch(0.98 0.02 75 / 0.1)", borderColor:"oklch(0.98 0.02 75 / 0.2)", color:"#f5ede0"}}>Grant 5 min</button>
                      <button className="btn btn-sm" style={{background:"transparent", borderColor:"oklch(0.98 0.02 75 / 0.2)", color:"#f5ede0"}}>Take a 2-min break</button>
                      <button className="btn btn-sm" style={{background:"transparent", borderColor:"oklch(0.98 0.02 75 / 0.2)", color:"#f5ede0"}}>Back to focus</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{display:"flex", gap:8, padding:"10px 12px", borderRadius:12, background:"oklch(0.98 0.02 75 / 0.08)", border:"1px solid oklch(0.98 0.02 75 / 0.14)"}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder="One sentence. What's pulling you here?"
              style={{flex:1, border:0, outline:0, background:"transparent", color:"#f5ede0", fontSize:14}}/>
            <button className="btn btn-sm" style={{background:"#f5ede0", color:"#2b1f12", border:0}} onClick={send}>Send {I.send({size:11})}</button>
          </div>

          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20, color:"oklch(0.8 0.02 75 / 0.55)"}} className="mono">
            <span>{pattern ? `pattern: ${pattern.replace(/_/g," ")}` : "listening…"} · host only, never path</span>
            <div style={{display:"flex", gap:10}}>
              <button style={{color:"inherit"}}>Close tab</button>
              <button style={{color:"#f5ede0", borderBottom:"1px solid #f5ede0", paddingBottom:1}} onClick={onClose}>Proceed anyway</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BlockerView, BlockOverlay });
