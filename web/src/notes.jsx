// Notes — list, detail, semantic search
const { useState: useS_n, useMemo: useM_n } = React;

function NotesView({ cmdKOpen, setCmdKOpen }){
  const [selId, setSelId] = useS_n("n1");
  const [q, setQ] = useS_n("");
  const sel = MOCK.notes.find(n => n.id === selId);
  const filtered = q
    ? MOCK.notes.filter(n => (n.title+" "+n.excerpt+" "+n.tags.join(" ")).toLowerCase().includes(q.toLowerCase()))
    : MOCK.notes;

  return (
    <>
      <div className="surface" style={{display:"grid", gridTemplateColumns:"320px 1fr", gap:0, padding:0, maxWidth:"none"}}>
        {/* List */}
        <div style={{borderRight:"1px solid var(--hair)", minHeight:"calc(100vh - 58px)"}}>
          <div style={{padding:"16px 18px", borderBottom:"1px solid var(--hair)"}}>
            <div style={{display:"flex", alignItems:"center", gap:8, padding:"6px 10px", border:"1px solid var(--hair)", borderRadius:8, background:"var(--panel)"}}>
              {I.search({size:14})}
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="/search semantic…" style={{border:0, outline:0, flex:1, background:"transparent", fontSize:13}}/>
              {q ? <button onClick={()=>setQ("")}>{I.x({size:12})}</button> : <span className="kbd">⌘K</span>}
            </div>
            <div className="mono" style={{marginTop:10, color:"var(--ink-4)"}}>
              {filtered.length} notes · 384-dim local embedding
            </div>
          </div>
          <div>
            {filtered.map(n => (
              <button key={n.id} onClick={()=>setSelId(n.id)} style={{
                width:"100%", textAlign:"left", padding:"12px 18px",
                borderBottom:"1px solid var(--hair)",
                background: selId===n.id?"var(--accent-wash)":"transparent"
              }}>
                <div style={{display:"flex", alignItems:"baseline", gap:8}}>
                  <div style={{fontSize:13.5, fontWeight:500, flex:1}}>{n.title}</div>
                  <span className="mono" style={{color:"var(--ink-4)"}}>{n.updated}</span>
                </div>
                <div style={{fontSize:12, color:"var(--ink-3)", marginTop:4, lineHeight:1.45, maxHeight:"2.8em", overflow:"hidden"}}>{n.excerpt}</div>
                <div style={{display:"flex", gap:4, marginTop:6}}>
                  {n.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div style={{padding:"28px 40px 80px", maxWidth:760}}>
          {sel && <>
            <div className="mono" style={{color:"var(--ink-4)", marginBottom:8}}>
              Note · updated {sel.updated} · MiniLM-L6-v2
            </div>
            <h1 className="serif" style={{fontSize:34, fontWeight:500, letterSpacing:"-0.02em", lineHeight:1.15, margin:"0 0 18px"}}>{sel.title}</h1>

            {/* Forgotten context callout */}
            {sel.related.some(r=>r.stale) && (
              <div style={{padding:"10px 14px", background:"var(--accent-wash)", borderRadius:10, marginBottom:22, display:"flex", alignItems:"center", gap:10, fontSize:13}}>
                {I.clock({size:14})}
                <span>You wrote about this <b>5 months ago</b> — <span className="link">revisit PRD outline</span>.</span>
                <button className="icon-btn" style={{marginLeft:"auto"}}>{I.x({size:12})}</button>
              </div>
            )}

            <div className="prose serif" style={{fontSize:17, lineHeight:1.65, color:"var(--ink-2)"}}>
              <p>Our decision rule is simple: <strong>anything needing DOM, WebGPU, OPFS sync handles, or more than ~25 seconds of work goes in the offscreen document.</strong> The service worker stays a thin event router. Anything that violates this we treat as a bug.</p>
              <p>On the data side, a single <strong>SQLite-WASM + sqlite-vec</strong> database lives in OPFS. Notes get a <code>notes_fts</code> FTS5 table and a <code>notes_vec</code> virtual table with 384-dim float embeddings from MiniLM-L6-v2 (quantized int8, bundled locally). Hybrid retrieval is reciprocal-rank fusion over both, K=20.</p>
              <p>The point of this architecture is not performance, it's that <strong>the user's content never leaves their machine unless they invoke a model themselves with their own key</strong>. Everything else is ceremony around that commitment.</p>
            </div>

            {/* Auto-links */}
            <div style={{marginTop:32}}>
              <div className="mono" style={{color:"var(--ink-4)", marginBottom:10}}>Related — auto-detected</div>
              <div style={{display:"flex", flexDirection:"column", gap:10}}>
                {sel.related.filter(r=>!r.stale).map(r => {
                  const target = MOCK.notes.find(n=>n.id===r.id);
                  return (
                    <div key={r.id} style={{display:"flex", gap:12, alignItems:"flex-start", padding:"12px 14px", border:"1px solid var(--hair)", borderRadius:12, background:"var(--panel)"}}>
                      {I.link({size:14, className:"", })}
                      <div style={{flex:1}}>
                        <button onClick={()=>setSelId(r.id)} style={{textAlign:"left"}}>
                          <div style={{fontSize:14, fontWeight:500}}>{target?.title}</div>
                        </button>
                        <div style={{fontSize:12.5, color:"var(--ink-3)", marginTop:3}}>
                          <span className="mono" style={{color:"var(--ink-4)"}}>{(r.sim*100).toFixed(0)}% · </span>
                          {r.reason}
                        </div>
                      </div>
                      <div style={{display:"flex", gap:4}}>
                        <button className="icon-btn" title="Accept">{I.check({size:13})}</button>
                        <button className="icon-btn" title="Reject">{I.x({size:13})}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>}
        </div>
      </div>

      {cmdKOpen && <CmdK onClose={()=>setCmdKOpen(false)} onPick={(id)=>{ setSelId(id); setCmdKOpen(false); }}/>}
    </>
  );
}

function CmdK({ onClose, onPick }){
  const [q, setQ] = useS_n("when did we discuss pricing with Mira");
  const [thinking, setThinking] = useS_n(false);
  // simulate rewrite
  const rewrites = q.length>5 ? [
    "pricing conversation with Mira",
    "Plus subscription price discussion",
    "pricing memo board review",
  ] : [];
  const results = MOCK.notes.filter(n =>
    (n.title+" "+n.excerpt+" "+n.tags.join(" ")).toLowerCase().split(" ").some(w =>
      q.toLowerCase().split(" ").some(qw => qw.length>3 && w.includes(qw))
    )
  );
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e=>e.stopPropagation()} style={{alignSelf:"flex-start", marginTop:"10vh"}}>
        <div style={{padding:"14px 18px", borderBottom:"1px solid var(--hair)", display:"flex", alignItems:"center", gap:10}}>
          {I.search({size:16})}
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask a question or search…" style={{flex:1, border:0, outline:0, background:"transparent", fontSize:16, color:"var(--ink)"}}/>
          <span className="mono" style={{color:"var(--ink-4)"}}>hybrid · FTS + vec</span>
          <button className="icon-btn" onClick={onClose}>{I.x({size:14})}</button>
        </div>
        {rewrites.length>0 && (
          <div style={{padding:"10px 18px", borderBottom:"1px solid var(--hair)", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
            <span className="mono" style={{color:"var(--ink-4)"}}>also searched</span>
            {rewrites.map((r,i) => <span key={i} className="badge">{r}</span>)}
          </div>
        )}
        <div style={{maxHeight:"60vh", overflowY:"auto"}}>
          {results.map(n => (
            <button key={n.id} onClick={()=>onPick(n.id)} style={{width:"100%", textAlign:"left", padding:"14px 18px", borderBottom:"1px solid var(--hair)", display:"flex", gap:14}}>
              <div style={{flex:1}}>
                <div style={{display:"flex", alignItems:"baseline", gap:10}}>
                  <span style={{fontSize:14, fontWeight:500}}>{n.title}</span>
                  <span className="mono" style={{color:"var(--ink-4)"}}>{n.updated}</span>
                </div>
                <div style={{fontSize:12.5, color:"var(--ink-3)", marginTop:4}}>{n.excerpt}</div>
              </div>
              <div className="mono" style={{color:"var(--accent-ink)", alignSelf:"flex-start"}}>0.{82-results.indexOf(n)*3}</div>
            </button>
          ))}
        </div>
        <div style={{padding:"10px 18px", borderTop:"1px solid var(--hair)", display:"flex", gap:16, color:"var(--ink-4)"}} className="mono">
          <span>↵ open</span><span>↑↓ move</span><span>⌘↵ ask AI across all notes</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NotesView });
