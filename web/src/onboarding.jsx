// Onboarding — BYOK / OpenRouter
const { useState: useS_o } = React;

function Onboarding({ close }){
  const [step, setStep] = useS_o(0);
  const [picked, setPicked] = useS_o(null);
  const [key, setKey] = useS_o("");
  const [show, setShow] = useS_o(false);
  const [validating, setValidating] = useS_o(false);
  const [valid, setValid] = useS_o(false);

  const go = (s) => setStep(s);

  return (
    <div className="onb on">
      <aside style={{width:360, padding:"48px 40px", background:"var(--panel-2)", borderRight:"1px solid var(--hair)", display:"flex", flexDirection:"column"}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:40}}>
          <div className="brand-mark"/>
          <div className="brand-name">Compass</div>
        </div>
        <ol style={{listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:18}}>
          {["Welcome", "Connect a model", "You're set"].map((t,i) => (
            <li key={i} style={{display:"flex", gap:12, color: i===step?"var(--ink)":"var(--ink-4)"}}>
              <div style={{width:22, height:22, borderRadius:"50%", border:"1px solid currentColor", display:"grid", placeItems:"center", fontSize:11, fontFamily:"var(--mono)", background: i<step?"var(--accent)":"transparent", color: i<step?"#fff":"inherit", borderColor: i<step?"var(--accent)":"currentColor"}}>
                {i<step? "✓" : i+1}
              </div>
              <span className="serif" style={{fontSize:16}}>{t}</span>
            </li>
          ))}
        </ol>
        <div style={{marginTop:"auto"}}>
          <div className="mono" style={{color:"var(--ink-4)", lineHeight:1.6}}>
            your keys stay on this device · no content telemetry · local-first by default
          </div>
        </div>
      </aside>

      <main style={{flex:1, padding:"64px 80px", overflow:"auto"}}>
        {step===0 && (
          <div style={{maxWidth:620}}>
            <div className="mono" style={{color:"var(--ink-4)", marginBottom:8}}>Welcome to Compass AI</div>
            <h1 className="serif" style={{fontSize:48, fontWeight:400, letterSpacing:"-0.02em", lineHeight:1.05, margin:"0 0 20px"}}>
              A calm new tab<br/>that quietly learns your day.
            </h1>
            <p className="serif" style={{fontSize:19, fontStyle:"italic", color:"var(--ink-3)", maxWidth:560, margin:"0 0 32px", lineHeight:1.5}}>
              Morning brief. Semantic notes. Goal decomposition. Nothing auto-sends, auto-shares, or auto-anything.
              You bring the model, Compass brings the restraint.
            </p>
            <div className="card card-pad" style={{marginBottom:18}}>
              <div style={{display:"flex", gap:22}}>
                <Check label="Local-first SQLite with vector search"/>
                <Check label="Offscreen LLM calls, your key"/>
              </div>
              <div style={{display:"flex", gap:22, marginTop:10}}>
                <Check label="Content never touches our server"/>
                <Check label="Budget cap default $2/mo"/>
              </div>
            </div>
            <div style={{display:"flex", gap:10}}>
              <button className="btn btn-accent" onClick={()=>go(1)} style={{padding:"10px 20px"}}>Connect a model {I.arrow({size:13})}</button>
              <button className="btn btn-ghost" onClick={close}>Skip — use Compass without AI</button>
            </div>
          </div>
        )}

        {step===1 && (
          <div style={{maxWidth:700}}>
            <div className="mono" style={{color:"var(--ink-4)", marginBottom:8}}>Step 2 of 3</div>
            <h1 className="serif" style={{fontSize:36, fontWeight:500, letterSpacing:"-0.02em", margin:"0 0 10px"}}>Bring your own model.</h1>
            <p className="serif" style={{fontSize:16, color:"var(--ink-3)", margin:"0 0 28px", fontStyle:"italic", maxWidth:520}}>
              Pick one. You can add the others later. Any of them keeps your data off our servers.
            </p>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24}}>
              {[
                { id:"openai", name:"OpenAI", sub:"Platform key (sk-proj-…)", tag:"recommended", bill:"Your OpenAI org" },
                { id:"anthropic", name:"Anthropic", sub:"Console key (sk-ant-…)", tag:null, bill:"Your Anthropic org" },
                { id:"openrouter", name:"OpenRouter", sub:"One-click OAuth sign-in", tag:"easiest", bill:"Your OpenRouter balance" },
              ].map(p => (
                <button key={p.id} onClick={()=>setPicked(p.id)} style={{
                  textAlign:"left", padding:"18px 18px 16px", borderRadius:14,
                  border:"1px solid",
                  borderColor: picked===p.id?"var(--accent)":"var(--hair)",
                  background: picked===p.id?"var(--accent-wash)":"var(--panel)",
                  boxShadow: picked===p.id?"var(--shadow-2)":"var(--shadow-1)",
                }}>
                  <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                    <span className="serif" style={{fontSize:17, fontWeight:500}}>{p.name}</span>
                    {p.tag && <span className="badge badge-accent">{p.tag}</span>}
                  </div>
                  <div style={{fontSize:12.5, color:"var(--ink-3)", marginBottom:12}}>{p.sub}</div>
                  <div className="mono" style={{color:"var(--ink-4)"}}>billed to · {p.bill}</div>
                </button>
              ))}
            </div>

            {picked==="openai" && (
              <div className="card card-pad">
                <div className="mono" style={{color:"var(--ink-4)", marginBottom:8}}>Paste your OpenAI key</div>
                <div style={{display:"flex", gap:8, alignItems:"center"}}>
                  <input value={key} onChange={e=>{setKey(e.target.value); setValid(false);}} type={show?"text":"password"} placeholder="sk-proj-…"
                    style={{flex:1, padding:"10px 12px", border:"1px solid var(--hair)", borderRadius:10, background:"var(--panel-2)", fontSize:14, fontFamily:"var(--mono)"}}/>
                  <button className="icon-btn" onClick={()=>setShow(s=>!s)}>{show?I.eyeoff({size:14}):I.eye({size:14})}</button>
                  <button className="btn btn-sm btn-primary" disabled={!key.length} onClick={async ()=>{
                    setValidating(true); setTimeout(()=>{ setValidating(false); setValid(true); setTimeout(()=>go(2), 500);}, 900);
                  }}>{validating? <span className="spinner"/> : valid? "Valid ✓" : "Validate"}</button>
                </div>
                <div className="mono" style={{color:"var(--ink-4)", marginTop:12, lineHeight:1.6}}>
                  validation calls GET /v1/models once · stored in chrome.storage.local · passphrase encryption available (advanced)
                </div>
              </div>
            )}
            {picked==="openrouter" && (
              <div className="card card-pad">
                <div className="mono" style={{color:"var(--ink-4)", marginBottom:12}}>You'll be redirected to openrouter.ai to authorize Compass.</div>
                <button className="btn btn-accent" onClick={()=>{ setTimeout(()=>go(2), 1200); }}>{I.link({size:13})} Continue to OpenRouter</button>
              </div>
            )}
            {picked==="anthropic" && (
              <div className="card card-pad">
                <div className="mono" style={{color:"var(--ink-4)", marginBottom:8}}>Paste your Anthropic key</div>
                <input placeholder="sk-ant-…" style={{width:"100%", padding:"10px 12px", border:"1px solid var(--hair)", borderRadius:10, background:"var(--panel-2)", fontSize:14, fontFamily:"var(--mono)"}}/>
                <button className="btn btn-sm btn-primary" style={{marginTop:10}} onClick={()=>go(2)}>Validate</button>
              </div>
            )}
          </div>
        )}

        {step===2 && (
          <div style={{maxWidth:620, paddingTop:40}}>
            <div className="mono" style={{color:"var(--accent-ink)", marginBottom:8}}>You're set.</div>
            <h1 className="serif" style={{fontSize:44, fontWeight:400, letterSpacing:"-0.02em", lineHeight:1.1, margin:"0 0 22px"}}>
              Compass will draft your first brief tomorrow at 7:30 am.
            </h1>
            <p className="serif" style={{fontSize:17, color:"var(--ink-3)", fontStyle:"italic", margin:"0 0 28px", maxWidth:540}}>
              You can generate one now, or let it arrive in the morning. Everything else — Notes, Focus, Blocker — already works.
            </p>
            <div style={{display:"flex", gap:10}}>
              <button className="btn btn-accent" onClick={close}>{I.spark({size:13})} Generate my first brief</button>
              <button className="btn" onClick={close}>Open Compass</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Check({ label }){
  return <div style={{display:"flex", gap:8, fontSize:13.5, color:"var(--ink-2)", alignItems:"center"}}>
    <span style={{color:"var(--accent-ink)"}}>{I.check({size:14})}</span>{label}
  </div>;
}

Object.assign(window, { Onboarding });
