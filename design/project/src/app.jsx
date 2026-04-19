// App — router
const { useState: useS_a, useEffect: useE_a } = React;

function App(){
  const [tw, setTw] = useTweaks();
  const [route, _setRoute] = useS_a(() => localStorage.getItem("compass-route") || "newtab");
  const setRoute = (r) => { _setRoute(r); localStorage.setItem("compass-route", r); };
  const [tweaksOpen, setTweaksOpen] = useS_a(false);
  const [cmdK, setCmdK] = useS_a(false);
  const [blockRule, setBlockRule] = useS_a(null);
  const [onbOpen, setOnbOpen] = useS_a(false);

  useE_a(() => {
    // Toolbar tweaks integration
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === "__activate_edit_mode") setTweaksOpen(true);
      else if (t === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage?.({ type: "__edit_mode_available" }, "*");

    const onOpen = () => setTweaksOpen(true);
    document.addEventListener("open-tweaks", onOpen);

    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdK(true); }
      if (e.key === "Escape") { setCmdK(false); setBlockRule(null); }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("open-tweaks", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <div className={`shell ${tw.density==="compact"?"compact":""}`}
        data-screen-label={route}>
        <Sidebar route={route} setRoute={setRoute} tweaks={tw}/>
        <div className="main">
          <Topbar route={route} setRoute={setRoute} onCmdK={()=>setCmdK(true)}/>

          {route==="newtab"   && <NewTabView setRoute={setRoute} openBlock={r=>setBlockRule(r)}/>}
          {route==="notes"    && <NotesView cmdKOpen={cmdK} setCmdKOpen={setCmdK}/>}
          {route==="focus"    && <FocusView setRoute={setRoute}/>}
          {route==="goals"    && <GoalsView/>}
          {route==="inbox"    && <InboxView/>}
          {route==="blocker"  && <BlockerView openPreview={r=>setBlockRule(r)}/>}
          {route==="settings" && <SettingsView/>}
        </div>
      </div>

      <Tweaks open={tweaksOpen} close={()=>setTweaksOpen(false)} tw={tw} set={setTw}/>

      {blockRule && <BlockOverlay rule={blockRule} onClose={()=>setBlockRule(null)}/>}
      {onbOpen   && <Onboarding close={()=>setOnbOpen(false)}/>}

      {/* Floating tiny nav to reach onboarding */}
      <button onClick={()=>setOnbOpen(true)} style={{
        position:"fixed", left:22, bottom:22, zIndex:49,
        padding:"8px 12px", borderRadius:999, background:"var(--panel)", border:"1px solid var(--hair)",
        fontFamily:"var(--mono)", fontSize:10, color:"var(--ink-3)", boxShadow:"var(--shadow-1)"
      }}>
        {I.spark({size:11})} View onboarding
      </button>

      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
