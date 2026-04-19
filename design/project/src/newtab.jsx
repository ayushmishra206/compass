// New Tab — morning brief + widgets
const { useState: useS_nt } = React;

function NewTabView({ setRoute, openBlock }){
  const [rating, setRating] = useS_nt(null);
  const [collapsed, setCollapsed] = useS_nt(false);
  const b = MOCK.brief;

  return (
    <div className="surface">
      {/* Greeting line */}
      <div style={{display:"flex", alignItems:"baseline", gap:16, marginBottom:10}}>
        <div className="mono">Sunday · 07:42 am · 14°C · light drizzle</div>
        <div style={{marginLeft:"auto", display:"flex", gap:8}}>
          <button className="btn btn-sm btn-ghost">{I.cal({size:14})} Calendar</button>
          <button className="btn btn-sm btn-ghost" onClick={()=>setRoute("focus")}>{I.focus({size:14})} Start focus</button>
        </div>
      </div>

      <h1 className="serif" style={{fontSize:44, fontWeight:400, lineHeight:1.1, letterSpacing:"-0.02em", margin:"0 0 4px"}}>
        Good morning, {MOCK.user.name.split(" ")[0]}.
      </h1>
      <p className="serif" style={{fontSize:22, fontWeight:300, color:"var(--ink-3)", fontStyle:"italic", marginTop:0, marginBottom:28}}>
        {b.oneLineMood}
      </p>

      {/* Morning brief card */}
      <section className="card" style={{overflow:"hidden", marginBottom:28}}>
        <div style={{display:"flex", alignItems:"center", gap:10, padding:"14px 22px", borderBottom:"1px solid var(--hair)"}}>
          <span className="mono" style={{color:"var(--accent-ink)"}}>Morning brief</span>
          <span className="mono" style={{color:"var(--ink-4)"}}>· generated 7:10 am · 4.2s · claude-haiku-4-5</span>
          <div style={{marginLeft:"auto", display:"flex", gap:4}}>
            <button className={`icon-btn ${rating==="up"?"active":""}`} style={rating==="up"?{color:"var(--accent-ink)"}:{}} onClick={()=>setRating("up")} title="Useful">{I.thumbup({size:14})}</button>
            <button className={`icon-btn ${rating==="down"?"active":""}`} style={rating==="down"?{color:"var(--accent-ink)"}:{}} onClick={()=>setRating("down")} title="Not useful">{I.thumbdn({size:14})}</button>
            <button className="icon-btn" onClick={()=>setCollapsed(c=>!c)} title={collapsed?"Expand":"Collapse"}>
              {collapsed ? I.down({size:14}) : I.up({size:14})}
            </button>
          </div>
        </div>

        {!collapsed && <div style={{padding:"22px 22px 18px"}}>
          <p className="serif prose" style={{fontSize:18, lineHeight:1.55, color:"var(--ink-2)", margin:"0 0 22px", maxWidth:720}}>
            {b.tldr}
          </p>

          {/* Top priority */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:22, marginBottom:20}}>
            <div style={{padding:"18px 20px", background:"var(--accent-wash)", borderRadius:"var(--radius)"}}>
              <div className="mono" style={{color:"var(--accent-ink)", marginBottom:8}}>Top priority · 90 min</div>
              <div className="serif" style={{fontSize:22, lineHeight:1.2, letterSpacing:"-0.01em", marginBottom:6}}>{b.topPriority.title}</div>
              <div style={{fontSize:13, color:"var(--ink-2)", marginBottom:14}}>{b.topPriority.why}</div>
              <div style={{display:"flex", gap:8}}>
                <button className="btn btn-sm btn-accent" onClick={()=>setRoute("focus")}>{I.play({size:12})} Start 90 min</button>
                <button className="btn btn-sm">Adjust</button>
              </div>
            </div>

            <div style={{padding:"18px 20px", border:"1px solid var(--hair)", borderRadius:"var(--radius)"}}>
              <div className="mono" style={{marginBottom:8}}>Today's shape · 3 pomodoros</div>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                {b.pomodoros.map((p,i) => (
                  <div key={i} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: i<b.pomodoros.length-1?"1px solid var(--hair)":"none"}}>
                    <div className="mono" style={{width:80, color:"var(--ink-3)"}}>{p.startLocal}–{p.endLocal}</div>
                    <div style={{flex:1, fontSize:13.5}}>{p.theme}</div>
                    <button className="btn btn-xs btn-ghost">{I.play({size:10})}</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Watchouts + recovery row */}
          <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:22}}>
            <div>
              <div className="mono" style={{marginBottom:10}}>Watchouts</div>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                {b.watchouts.map((w,i) => (
                  <div key={i} style={{display:"flex", gap:10, fontSize:13.5, color:"var(--ink-2)", lineHeight:1.5}}>
                    <span style={{color:"var(--ink-4)", fontFamily:"var(--mono)", fontSize:10, marginTop:4}}>0{i+1}</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mono" style={{marginBottom:10}}>Recovery</div>
              <div style={{display:"flex", gap:16, marginBottom:10}}>
                <Vital ico="sleep"  label="Sleep" value="82" sub="good"/>
                <Vital ico="heart"  label="Recovery" value="71" sub="mid"/>
                <Vital ico="drop"   label="RHR" value="58"/>
              </div>
              <div style={{fontSize:13, color:"var(--ink-2)", lineHeight:1.5}}>{b.recovery.note}</div>
            </div>
          </div>

          {b.quotedGoal && <div style={{marginTop:24, paddingTop:18, borderTop:"1px solid var(--hair)", display:"flex", gap:12, alignItems:"flex-start"}}>
            <div className="mono" style={{flex:"0 0 80px", marginTop:2}}>From goal</div>
            <div className="serif" style={{fontSize:16, fontStyle:"italic", color:"var(--ink-2)", flex:1}}>“{b.quotedGoal}”</div>
            <button className="btn btn-xs btn-ghost" onClick={()=>setRoute("goals")}>Open {I.chev({size:12})}</button>
          </div>}
        </div>}
      </section>

      {/* Widget grid */}
      <div className="grid-12">
        <section className="col-7">
          <Widget title="Today" subtitle="5 events · 2 need prep" action={{label:"Open calendar", onClick:()=>{}}}>
            <Timeline/>
          </Widget>
        </section>

        <section className="col-5" style={{display:"flex", flexDirection:"column", gap:22}}>
          <Widget title="Inbox actions" subtitle="3 P1/P2 · scanned 6 min ago" action={{label:"Open", onClick:()=>setRoute("inbox")}}>
            <InboxMini setRoute={setRoute}/>
          </Widget>

          <Widget title="From Compass" subtitle="Patterns it noticed this week">
            <Suggestions/>
          </Widget>
        </section>

        <section className="col-7">
          <Widget title="Active goals" subtitle="2 in flight · 1 ambient" action={{label:"Open", onClick:()=>setRoute("goals")}}>
            <GoalsMini setRoute={setRoute}/>
          </Widget>
        </section>

        <section className="col-5">
          <Widget title="Notes" subtitle="Semantic autolinks on" action={{label:"Open", onClick:()=>setRoute("notes")}}>
            <NotesMini setRoute={setRoute}/>
          </Widget>
        </section>

        <section className="col-12">
          <Widget title="Focus blocker" subtitle={`${MOCK.blockRules.length} rules · 2 adaptive · next window 2:00 pm`} action={{label:"Manage", onClick:()=>setRoute("blocker")}}>
            <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
              {MOCK.blockRules.map(r => (
                <button key={r.id} onClick={()=>openBlock(r)} className="card" style={{padding:"10px 14px", textAlign:"left", display:"flex", gap:10, alignItems:"center", flex:"1 1 220px"}}>
                  <div className="dot" style={{color: r.mode==="hard"?"var(--accent-ink)":"var(--ink-4)"}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13, fontWeight:500}}>{r.pattern}</div>
                    <div style={{fontSize:11, color:"var(--ink-4)"}}>{r.mode} · {r.source} · {r.note}</div>
                  </div>
                  <div className="mono" style={{color:"var(--ink-4)"}}>preview {I.chev({size:11})}</div>
                </button>
              ))}
            </div>
          </Widget>
        </section>
      </div>

      <div style={{textAlign:"center", marginTop:40, color:"var(--ink-4)", fontFamily:"var(--mono)", fontSize:10, letterSpacing:"0.1em"}}>
        local-first · your keys · no content telemetry
      </div>
    </div>
  );
}

function Widget({ title, subtitle, action, children }){
  return (
    <div className="card card-pad" style={{height:"100%"}}>
      <div style={{display:"flex", alignItems:"baseline", marginBottom:14, gap:10}}>
        <div className="serif" style={{fontSize:18, fontWeight:500, letterSpacing:"-0.01em"}}>{title}</div>
        {subtitle && <div className="mono" style={{color:"var(--ink-4)"}}>{subtitle}</div>}
        {action && <button className="btn btn-xs btn-ghost" style={{marginLeft:"auto"}} onClick={action.onClick}>{action.label} {I.chev({size:11})}</button>}
      </div>
      {children}
    </div>
  );
}

function Vital({ ico, label, value, sub }){
  return (
    <div style={{display:"flex", alignItems:"center", gap:8}}>
      <div style={{color:"var(--ink-3)"}}>{I[ico]({size:14})}</div>
      <div>
        <div style={{display:"flex", alignItems:"baseline", gap:4}}>
          <span className="serif" style={{fontSize:22, lineHeight:1}}>{value}</span>
          {sub && <span className="mono" style={{color:"var(--ink-4)"}}>{sub}</span>}
        </div>
        <div className="mono" style={{color:"var(--ink-4)"}}>{label}</div>
      </div>
    </div>
  );
}

function Timeline(){
  // 8am to 6pm (10 hours)
  const startH = 8, endH = 18, H = (endH-startH);
  const toTop = (hhmm) => { const [h,m] = hhmm.split(":").map(Number); return ((h-startH) + m/60) / H * 100; };
  const nowTop = toTop("07:42") < 0 ? 0 : toTop("07:42");
  const hours = Array.from({length:H+1}, (_,i)=> startH+i);
  return (
    <div style={{position:"relative", height:360, paddingLeft:56}}>
      {hours.map((h,i) => (
        <div key={i} style={{position:"absolute", left:0, right:0, top: `${i/H*100}%`, borderTop: i===0?"none":"1px dashed var(--hair)"}}>
          <span className="mono" style={{position:"absolute", left:0, top:-7, color:"var(--ink-4)"}}>
            {((h+11)%12)+1}{h<12?"am":"pm"}
          </span>
        </div>
      ))}
      {/* now line */}
      <div style={{position:"absolute", left:50, right:0, top:`${nowTop}%`, borderTop:"1.5px solid var(--accent)"}}>
        <div style={{position:"absolute", left:-6, top:-5, width:10, height:10, borderRadius:"50%", background:"var(--accent)"}}/>
      </div>
      {MOCK.events.map(ev => {
        const top = toTop(ev.start); const height = toTop(ev.end) - top;
        return (
          <div key={ev.id} style={{
            position:"absolute", left:0, right:10,
            top:`${top}%`, height:`${height}%`,
            padding:"8px 12px", borderRadius:10,
            background: ev.focus ? "var(--accent-wash)" : "var(--panel-2)",
            border:"1px solid var(--hair)",
            display:"flex", alignItems:"flex-start", gap:8,
          }}>
            <div className="mono" style={{color:"var(--ink-4)", width:80, flex:"0 0 80px"}}>{ev.start}–{ev.end}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:500}}>{ev.summary}</div>
              <div style={{fontSize:11, color:"var(--ink-4)"}}>
                {ev.attendees} {ev.attendees===1?"person":"attendees"}
                {ev.prep && <> · <span style={{color:"var(--accent-ink)"}}>prep ready</span></>}
              </div>
            </div>
            {ev.prep && <button className="btn btn-xs">{I.spark({size:10})} Brief</button>}
          </div>
        );
      })}
    </div>
  );
}

function InboxMini({ setRoute }){
  const items = MOCK.inboxActions.filter(a=>a.actions.length).slice(0,3);
  const priColor = { p1:"var(--accent-ink)", p2:"var(--accent-ink)", p3:"var(--ink-3)", p4:"var(--ink-4)"};
  return (
    <div style={{display:"flex", flexDirection:"column"}}>
      {items.map((it,i)=> (
        <button key={it.id} onClick={()=>setRoute("inbox")} style={{textAlign:"left", padding:"10px 0", borderTop: i===0?"none":"1px solid var(--hair)", display:"flex", gap:10, alignItems:"flex-start"}}>
          <div style={{flex:"0 0 28px", paddingTop:4}}>
            <span className="mono" style={{color: priColor[it.priority], fontWeight:500}}>{it.priority.toUpperCase()}</span>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{it.subject}</div>
            <div style={{fontSize:12, color:"var(--ink-3)", marginTop:2}}>{it.actions[0].title}</div>
            <div style={{fontSize:11, color:"var(--ink-4)", marginTop:3}}>{it.from} · due {it.actions[0].due}</div>
          </div>
          {it.hasDraft && <span className="badge badge-accent">draft ready</span>}
        </button>
      ))}
    </div>
  );
}

function Suggestions(){
  return (
    <div style={{display:"flex", flexDirection:"column", gap:10}}>
      {MOCK.suggestions.map(s => (
        <div key={s.id} style={{padding:"12px 14px", border:"1px solid var(--hair)", borderRadius:12, background:"var(--panel-2)"}}>
          <div className="mono" style={{color:"var(--accent-ink)", marginBottom:6}}>
            {s.kind.replace("_"," ")}
          </div>
          <div style={{fontSize:13.5, color:"var(--ink-2)", lineHeight:1.5, marginBottom:10}}>{s.body}</div>
          <div style={{display:"flex", gap:6}}>
            <button className="btn btn-xs btn-accent">Apply</button>
            <button className="btn btn-xs btn-ghost">Not now</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalsMini({ setRoute }){
  return (
    <div style={{display:"flex", flexDirection:"column", gap:14}}>
      {MOCK.goals.slice(0,2).map(g => (
        <button key={g.id} onClick={()=>setRoute("goals")} style={{textAlign:"left"}}>
          <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:6}}>
            <div className="serif" style={{fontSize:16, fontWeight:500, flex:1}}>{g.title}</div>
            <div className="mono" style={{color:"var(--ink-4)"}}>{Math.round(g.progress*100)}% · {g.weeksRemaining}w left</div>
          </div>
          <div style={{height:4, background:"var(--hair)", borderRadius:2, overflow:"hidden"}}>
            <div style={{width:`${g.progress*100}%`, height:"100%", background:"var(--accent)"}}/>
          </div>
          {g.milestones.find(m=>m.current) && (
            <div style={{fontSize:12, color:"var(--ink-3)", marginTop:8}}>
              <span className="mono" style={{color:"var(--ink-4)"}}>this week · </span>
              {g.milestones.find(m=>m.current).title}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function NotesMini({ setRoute }){
  return (
    <div style={{display:"flex", flexDirection:"column", gap:10}}>
      {MOCK.notes.slice(0,3).map(n => (
        <button key={n.id} onClick={()=>setRoute("notes")} style={{textAlign:"left", padding:"10px 0", borderBottom:"1px solid var(--hair)"}}>
          <div style={{display:"flex", alignItems:"baseline", gap:10}}>
            <div style={{fontSize:13.5, fontWeight:500, flex:1}}>{n.title}</div>
            <span className="mono" style={{color:"var(--ink-4)"}}>{n.updated}</span>
          </div>
          <div style={{fontSize:12, color:"var(--ink-3)", marginTop:3, lineHeight:1.5, maxHeight:"2.8em", overflow:"hidden"}}>{n.excerpt}</div>
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { NewTabView });
