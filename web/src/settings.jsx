// Settings + AI budget
function SettingsView(){
  return (
    <div className="surface" style={{maxWidth:880}}>
      <div className="mono" style={{color:"var(--ink-4)", marginBottom:8}}>Settings</div>
      <h1 className="serif" style={{fontSize:34, fontWeight:500, letterSpacing:"-0.02em", margin:"0 0 28px"}}>AI providers & budget</h1>

      <Section title="Connected providers" sub="Keys stay on this device. Compass never proxies LLM calls.">
        <Provider name="OpenAI Platform" sub="sk-proj-…••••4kWa · validated 2 days ago" status="active" budget="$0.68 this month" primary/>
        <Provider name="Anthropic Console" sub="Not connected" status="off"/>
        <Provider name="OpenRouter (OAuth)" sub="Recommended for one-click sign-in" status="off"/>
      </Section>

      <Section title="Monthly AI budget" sub="Soft cap; Compass downgrades models when you hit it.">
        <div className="card card-pad">
          <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:8}}>
            <span className="serif" style={{fontSize:28, fontWeight:500}}>$0.84</span>
            <span className="mono" style={{color:"var(--ink-4)"}}>of $2.00 · 42% · 11 days left</span>
          </div>
          <div style={{height:6, background:"var(--hair)", borderRadius:3, overflow:"hidden"}}>
            <div style={{width:"42%", height:"100%", background:"var(--accent)"}}/>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginTop:18}}>
            <Stat2 lbl="Briefs" n="18" s="$0.07"/>
            <Stat2 lbl="Gmail extracts" n="142" s="$0.31"/>
            <Stat2 lbl="Meeting prep" n="9" s="$0.22"/>
            <Stat2 lbl="Goal decompose" n="2" s="$0.16"/>
          </div>
          <div style={{display:"flex", gap:8, marginTop:14}}>
            <button className="btn btn-sm">Adjust cap</button>
            <button className="btn btn-sm btn-ghost">Download ledger (CSV)</button>
          </div>
        </div>
      </Section>

      <Section title="Privacy" sub="Provable in a signed transparency report.">
        <div className="card card-pad prose" style={{fontSize:14}}>
          <p>• Note text, email bodies, and calendar descriptions <b>never leave your device</b> except to the LLM you chose.</p>
          <p>• Gmail bodies are <b>not stored</b> beyond a 500-char snippet.</p>
          <p>• Block-rule URLs send <b>hostname only</b> to the model — never paths or queries.</p>
          <p>• Telemetry is <b>counters only</b> — no free-form text ever leaves.</p>
        </div>
      </Section>

      <Section title="Feature flags" sub="Everything is opt-in. Turn it off and the classic Compass is untouched.">
        <div className="card">
          {[
            ["Daily Agent", true], ["EOD reflection", true], ["Adaptive personalization", true],
            ["Semantic Notes", true], ["Smarter blocker", true], ["Gmail AI", true],
            ["Meeting prep", true], ["Goal decomposition", true], ["Voice input", false],
            ["Vision board image gen", false], ["Image-to-tasks OCR", false],
          ].map(([k,on],i) => (
            <div key={i} style={{display:"flex", alignItems:"center", padding:"12px 18px", borderTop: i===0?"none":"1px solid var(--hair)"}}>
              <div style={{flex:1, fontSize:13.5}}>{k}</div>
              <Toggle on={on}/>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, sub, children }){
  return (
    <section style={{marginBottom:36}}>
      <div style={{marginBottom:14}}>
        <div className="serif" style={{fontSize:20, fontWeight:500}}>{title}</div>
        <div className="mono" style={{color:"var(--ink-4)", marginTop:4}}>{sub}</div>
      </div>
      {children}
    </section>
  );
}

function Provider({ name, sub, status, budget, primary }){
  const color = status==="active" ? "var(--accent-ink)" : "var(--ink-4)";
  return (
    <div className="card card-pad" style={{marginBottom:10, display:"flex", alignItems:"center", gap:14}}>
      <div style={{width:36, height:36, borderRadius:8, background:"var(--panel-2)", display:"grid", placeItems:"center", color}}>
        {I.key({size:16})}
      </div>
      <div style={{flex:1}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:14, fontWeight:500}}>{name}</span>
          {primary && <span className="badge badge-accent">default</span>}
          <span className="badge" style={{color}}><span className="dot"/> {status==="active"?"active":"not connected"}</span>
        </div>
        <div style={{fontSize:12, color:"var(--ink-4)", marginTop:3}}>{sub}{budget && <> · <span style={{color:"var(--ink-3)"}}>{budget}</span></>}</div>
      </div>
      <button className="btn btn-sm">{status==="active"?"Manage":"Connect"}</button>
    </div>
  );
}

function Stat2({ lbl, n, s }){
  return (
    <div>
      <div className="mono" style={{color:"var(--ink-4)"}}>{lbl}</div>
      <div className="serif" style={{fontSize:20, fontWeight:500}}>{n}</div>
      <div className="mono" style={{color:"var(--ink-3)"}}>{s}</div>
    </div>
  );
}

function Toggle({ on: initial }){
  const [on, setOn] = React.useState(initial);
  return (
    <button onClick={()=>setOn(!on)} style={{
      width:36, height:20, borderRadius:10, position:"relative",
      background: on?"var(--accent)":"var(--hair-2)",
      transition:"background 150ms",
    }}>
      <span style={{
        position:"absolute", top:2, left: on?18:2,
        width:16, height:16, borderRadius:"50%", background:"#fff",
        transition:"left 150ms", boxShadow:"0 1px 3px oklch(0 0 0 / 0.2)",
      }}/>
    </button>
  );
}

Object.assign(window, { SettingsView });
