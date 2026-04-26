// Shell: sidebar, topbar, tweaks panel
const { useState, useEffect, useRef, useMemo } = React;

const ACCENTS = {
  terracotta: { h:48,  c:0.13, l:0.56 },
  ink:        { h:260, c:0.04, l:0.40 },
  sage:       { h:150, c:0.06, l:0.52 },
  ocean:      { h:230, c:0.10, l:0.52 },
  plum:       { h:340, c:0.10, l:0.52 },
};

function useTweaks(){
  const [tw, setTw] = useState(() => ({ ...window.TWEAKS }));
  useEffect(() => {
    document.documentElement.dataset.theme = tw.theme;
    const a = ACCENTS[tw.accent] || ACCENTS.terracotta;
    document.documentElement.style.setProperty("--accent-h", a.h);
    document.documentElement.style.setProperty("--accent-c", a.c);
    document.documentElement.style.setProperty("--accent-l", a.l);
  }, [tw]);
  const set = (patch) => {
    const next = { ...tw, ...patch };
    setTw(next);
    window.parent?.postMessage?.({ type:"__edit_mode_set_keys", edits: patch }, "*");
  };
  return [tw, set];
}

function Sidebar({ route, setRoute, tweaks }){
  const items = [
    { id:"newtab",  label:"New Tab",       icon:"home" },
    { id:"notes",   label:"Notes",         icon:"note",  count: MOCK.notes.length },
    { id:"focus",   label:"Focus",         icon:"focus" },
    { id:"goals",   label:"Goals",         icon:"goal",  count: MOCK.goals.filter(g=>g.status!=="achieved").length },
    { id:"inbox",   label:"Inbox Actions", icon:"inbox", count: MOCK.inboxActions.filter(a=>a.actions.length).length },
    { id:"blocker", label:"Site Blocker",  icon:"block", count: MOCK.blockRules.length },
  ];
  const Ico = (name) => I[name]?.({ size:16, className:"nav-ico" });
  const compact = tweaks.density === "compact";
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        {!compact && <>
          <div className="brand-name">Compass</div>
          <div className="brand-sub">plus</div>
        </>}
      </div>

      <div className="nav">
        {items.map(it => (
          <button key={it.id} className={`nav-btn ${route===it.id?"active":""}`} onClick={()=>setRoute(it.id)}>
            {Ico(it.icon)}
            <span className="nav-label">{it.label}</span>
            {it.count ? <span className="count">{it.count}</span> : null}
          </button>
        ))}
      </div>

      {!compact && <div className="nav-section mono">Agent</div>}
      <div className="nav">
        <button className={`nav-btn ${route==="settings"?"active":""}`} onClick={()=>setRoute("settings")}>
          {Ico("gear")}<span className="nav-label">Settings & AI budget</span>
        </button>
      </div>

      <div className="sidebar-foot">
        <div className="budget">
          <div className="row"><span>April AI budget</span><span>$0.84 / $2.00</span></div>
          <div className="bar"><span style={{width:"42%"}}/></div>
          <div className="row" style={{marginTop:6}}><span className="mono">BYOK · openai</span><span className="mono">42%</span></div>
        </div>
        <div className="user-line">
          <div className="avatar">AM</div>
          <div style={{fontSize:12.5, lineHeight:1.2}}>
            <div>{MOCK.user.name}</div>
            <div style={{color:"var(--ink-4)", fontSize:11}}>Compass Plus</div>
          </div>
          <button className="icon-btn" style={{marginLeft:"auto"}} title="More">{I.more({size:14})}</button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ route, setRoute, onCmdK }){
  const titles = {
    newtab: ["Morning"], notes:["Notes"], focus:["Focus"], goals:["Goals"],
    inbox:["Inbox","Actions"], blocker:["Site Blocker"], settings:["Settings"]
  };
  const crumbs = titles[route] || ["Compass"];
  const todayStr = new Date("2026-04-20T07:42").toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" });
  return (
    <header className="topbar">
      <div className="breadcrumb">
        {crumbs.map((c,i) => <React.Fragment key={i}>{i>0 && <span className="sep">/</span>}<span>{c}</span></React.Fragment>)}
      </div>
      {route==="newtab" && <div className="mono" style={{color:"var(--ink-4)"}}>{todayStr} · 7:42 am</div>}
      <button className="search" onClick={onCmdK} title="Semantic search">
        {I.search({size:14})}
        <input placeholder="Search notes, emails, goals…" readOnly />
        <span className="kbd">⌘</span><span className="kbd">K</span>
      </button>
      <button className="icon-btn" title="New note">{I.plus({size:16})}</button>
    </header>
  );
}

function Tweaks({ open, close, tw, set }){
  return (<>
    {!open && <button className="toolbar-tweaks-btn" onClick={()=>document.dispatchEvent(new CustomEvent("open-tweaks"))}>Tweaks</button>}
    <div className={`tweaks ${open?"open":""}`}>
      <div className="hd">
        <span>Tweaks</span>
        <button className="icon-btn" onClick={close}>{I.x({size:14})}</button>
      </div>
      <div className="body">
        <div className="row">
          <label>Theme</label>
          <div className="seg">
            <button className={tw.theme==="light"?"on":""} onClick={()=>set({theme:"light"})}>Light</button>
            <button className={tw.theme==="dark"?"on":""}  onClick={()=>set({theme:"dark"})}>Dark</button>
          </div>
        </div>
        <div className="row">
          <label>Accent</label>
          <div className="swatch-row">
            {Object.keys(ACCENTS).map(k => (
              <button key={k} className={`swatch ${tw.accent===k?"active":""}`} style={{ background:`oklch(${ACCENTS[k].l} ${ACCENTS[k].c} ${ACCENTS[k].h})` }} onClick={()=>set({accent:k})} title={k}/>
            ))}
          </div>
        </div>
        <div className="row">
          <label>Density</label>
          <div className="seg">
            <button className={tw.density==="spacious"?"on":""} onClick={()=>set({density:"spacious"})}>Spacious</button>
            <button className={tw.density==="compact"?"on":""}  onClick={()=>set({density:"compact"})}>Compact</button>
          </div>
        </div>
        <div className="row">
          <label style={{fontSize:11, color:"var(--ink-4)", lineHeight:1.4}}>
            Changes persist to the file so you can refresh and keep your setup.
          </label>
        </div>
      </div>
    </div>
  </>);
}

Object.assign(window, { Sidebar, Topbar, Tweaks, useTweaks, ACCENTS });
