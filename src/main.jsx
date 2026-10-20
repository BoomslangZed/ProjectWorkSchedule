 {visible.length?<div className="board">{visible.map(p=><article key={p.id} className={`project ${drag===p.id?'dragging':''} ${hoverCard===p.id?'shuffle-target':''}`} draggable onDragStart={e=>{setDrag(p.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',p.id)}} onDragOver={e=>{e.preventDefault();if(drag&&drag!==p.id){setHoverCard(p.id);reorder(drag,p.id)}}} onDrop={e=>{e.preventDefault();endDrag()}} onDragEnd={endDrag} onClick={()=>{if(!drag)setSelected(p.id)}} style={{background:color(age(p.received),p.completed,p.hold),cursor:'grab'}}><div className="cardhead"><div><h3>{p.name}</h3><div className="cardclient">{p.client||'No client'}</div></div><div className="age">{p.completed?'✓ Done':`${age(p.received)}d`}</div></div><div className="cardreceived">Received {shortDate(p.received)}</div><div className="cardchecklist">{(p.items||[]).map(i=><div key={i.id} className="cardcheckitem"><span className="checksymbol">{i.done?'✓':'○'}</span> {i.name}</div>)}{(p.markups||[]).length>0&&<div className="cardcheckitem"><span className="checksymbol">↗</span> Markups: {p.markups.length} sent{p.markups.some(m=>m.response==='Waiting')?' · Awaiting response':''}</div>}{(p.revisions||[]).length>0&&<div className="cardcheckitem"><span className="checksymbol">↻</span> {p.revisions.length} revisions</div>}</div><div className="cardmeta">{p.proposal&&<span className="tag">✓ Proposal</span>}{p.hold&&<span className="tag">⏸ On Hold</span>}<div className="cardinvoice">Invoice #: {p.invoiceNumber||'Not assigned'}{projectInvoices(p).length>1?` · ${projectInvoices(p).length} invoices`:''}</div><div className="cardpayment">{projectInvoices(p).some(i=>!i.paid&&Number(i.amount)>0)?'Unpaid invoice':'✓ Paid / No balance'}</div></div><div className="cardfoot"><strong>{money(projectInvoices(p).reduce((sum,i)=>sum+(Number(i.amount)||0),0))}</strong><div className="cardcontrols"><button className="mini" title="Move left" aria-label="Move card left" onClick={e=>{e.stopPropagation();move(p.id,-1)}}>←</button><button className="mini" title="Move right" aria-label="Move card right" onClick={e=>{e.stopPropagation();move(p.id,1)}}>→</button><span className="tiny">Edit →</span></div></div></article>)}{tab==='active'&&!query&&<button className="newcard" onClick={add}><span className="plus">+</span><strong>New Project</strong><span>Click to add a project</span></button>}</div>:tab==='active'&&!query?<div className="board"><button className="newcard" onClick={add}><span className="plus">+</span><strong>New Project</strong><span>Click to add a project</span></button></div>:<div className="empty">No projects in this view.</div>}
 </>}
 <p className="hint" style={{marginTop:24}}>Your changes are saved to Supabase when Cloud shows “Saved”. A local backup is also kept in this browser. Avoid editing on two devices at the same time.</p></main>
 {currentClient&&clientView&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedClient(null)}}><aside className="panel"><div className="paneltop"><div><div className="eyebrow">Client directory</div><h2>{currentClient.name}</h2><div className="sub">{linkedProjects(currentClient).length} linked projects</div></div><button className="btn" onClick={()=>setSelectedClient(null)}>Close ✕</button></div><div className="field"><label>Client name</label><input key={currentClient.id} defaultValue={currentClient.name} onBlur={e=>saveClientName(currentClient,e.target.value)} /></div><div className="field"><label>Client notes</label><textarea rows="3" value={clients.find(c=>c.id===currentClient.id)?.notes||''} onChange={e=>{const v=e.target.value;setClients(prev=>prev.some(c=>c.id===currentClient.id)?prev.map(c=>c.id===currentClient.id?{...c,notes:v}:c):[...prev,{...currentClient,notes:v}])}} placeholder="Contact details, preferences, notes..." /></div><div className="line"/><h3>Projects for {currentClient.name}</h3>{linkedProjects(currentClient).map(p=><button key={p.id} className="clientproject" onClick={()=>{setSelectedClient(null);setSelected(p.id)}}><strong>{p.name}</strong><span>{p.completed?'Completed':p.hold?'On hold':'Active'} · {p.invoiceNumber||'No invoice #'} · {money(projectInvoices(p).reduce((sum,i)=>sum+(Number(i.amount)||0),0))}</span></button>)}{!linkedProjects(currentClient).length&&<p className="muted">No projects yet. Select this client when creating a project.</p>}</aside></div>}
 {current&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><aside className="panel"><div className="paneltop"><div><div className="eyebrow">Project details</div><h2>{current.name}</h2><div className="sub">{age(current.received)} calendar days since received</div></div><button className="btn" onClick={()=>setSelected(null)}>Close ✕</button></div>
 <div className="field"><label>Project name</label><input value={current.name} onChange={e=>update(current.id,{name:e.target.value})}/></div><div className="field"><label>Client — choose existing or enter new</label><div className="client-chooser"><input autoComplete="off" value={current.client||''} onFocus={()=>setClientSuggestionsOpen(true)} onChange={e=>{update(current.id,{client:e.target.value,clientId:null});setClientSuggestionsOpen(true)}} onBlur={e=>{setProjectClient(current.id,e.target.value);setClientSuggestionsOpen(false)}} placeholder="Type or select a client..."/>{clientSuggestionsOpen&&allClients.filter(c=>(!current.client||c.name.toLowerCase().includes(current.client.toLowerCase()))&&c.name.toLowerCase()!==String(current.client||'').toLowerCase()).slice(0,7).length>0&&<div className="client-suggestions">{allClients.filter(c=>(!current.client||c.name.toLowerCase().includes(current.client.toLowerCase()))&&c.name.toLowerCase()!==String(current.client||'').toLowerCase()).slice(0,7).map(c=><button type="button" key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{setProjectClient(current.id,c.name);setClientSuggestionsOpen(false)}}>{c.name}</button>)}</div>}</div><span className="muted">Names are saved to your Client Directory when you leave this field.</span>{current.client&&<button className="btn" onClick={()=>{setProjectClient(current.id,current.client);setSelected(null);setClientView(true);const c=allClients.find(x=>clientNameKey(x.name)===clientNameKey(current.client));if(c)setSelectedClient(c.id)}}>View this client's projects →</button>}</div><div className="twocol"><div className="field"><label>Date received</label><input type="date" value={current.received} onChange={e=>update(current.id,{received:e.target.value})}/></div><div className="field"><label>Invoice amount ($)</label><input type="number" min="0" step="0.01" value={current.invoice} onChange={e=>update(current.id,{invoice:e.target.value})}/></div></div>
 <label className="statusrow"><span>Proposal sent</span><input type="checkbox" checked={!!current.proposal} onChange={e=>update(current.id,{proposal:e.target.checked})}/></label><label className="statusrow"><span>Invoice paid</span><input type="checkbox" checked={current.paid} onChange={e=>update(current.id,{paid:e.target.checked,paidDate:e.target.checked?(current.paidDate||today()):''})}/></label>{current.paid&&<div className="field"><label>Date paid (for yearly revenue)</label><input type="date" value={current.paidDate||''} onChange={e=>update(current.id,{paidDate:e.target.value})}/></div>}<label className="statusrow"><span>On hold</span><input type="checkbox" checked={current.hold} onChange={e=>update(current.id,{hold:e.target.checked})}/></label>
 <div className="line"/><h3>Required files checklist</h3>{current.items.map(item=><div className="checkrow" key={item.id}><label className="inline"><input type="checkbox" checked={item.done} onChange={e=>update(current.id,{items:current.items.map(i=>i.id===item.id?{...i,done:e.target.checked}:i)})}/><input aria-label="Checklist item name" className="itemname" value={item.name} onChange={e=>update(current.id,{items:current.items.map(i=>i.id===item.id?{...i,name:e.target.value}:i)})}/></label><button className="btn danger" onClick={()=>update(current.id,{items:current.items.filter(i=>i.id!==item.id)})}>Remove</button></div>)}<div className="inline" style={{marginTop:12}}><input className="search" style={{maxWidth:'none'}} placeholder="Add checklist item..." value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()}/><button className="btn" onClick={addItem}>Add</button></div>
 <div className="line"/><h3>Dropbox link</h3><div className="field"><label>Optional project folder URL</label><input type="url" placeholder="https://www.dropbox.com/..." value={current.dropbox} onChange={e=>update(current.id,{dropbox:e.target.value})}/></div>{/^https:\/\//i.test(current.dropbox)&&<a href={current.dropbox} target="_blank" rel="noopener noreferrer">Open Dropbox link ↗</a>}
 <div className="line"/><h3>Markups sent</h3><p className="muted">Record each markup submission and whether the client responded.</p>{current.markups.map(m=><div className="markup" key={m.id}><div className="inline" style={{width:'100%'}}><input type="date" value={m.sent} onChange={e=>update(current.id,{markups:current.markups.map(x=>x.id===m.id?{...x,sent:e.target.value}:x)})}/><select value={m.response} onChange={e=>update(current.id,{markups:current.markups.map(x=>x.id===m.id?{...x,response:e.target.value}:x)})}><option>Waiting</option><option>Received</option><option>Revisions requested</option><option>No response needed</option></select></div><div className="inline" style={{width:'100%'}}><input placeholder="What was sent?" value={m.notes} onChange={e=>update(current.id,{markups:current.markups.map(x=>x.id===m.id?{...x,notes:e.target.value}:x)})}/><button className="btn danger" onClick={()=>update(current.id,{markups:current.markups.filter(x=>x.id!==m.id)})}>Remove</button></div></div>)}<div className="inline" style={{marginTop:12}}><input className="search" style={{maxWidth:'none'}} placeholder="Markup description..." value={markupNote} onChange={e=>setMarkupNote(e.target.value)}/><button className="btn" onClick={addMarkup}>+ Sent today</button></div>
 <div className="line"/><h3>Project revisions</h3><p className="muted">Keep revisions attached to this project. A revision does not create another invoice unless you add one below.</p>
 {(current.revisions||[]).map((r,index)=><div className="record" key={r.id}><div className="recordtitle"><strong>Revision {index+1}</strong><button className="btn danger" onClick={()=>update(current.id,{revisions:current.revisions.filter(x=>x.id!==r.id)})}>Remove</button></div><div className="twocol"><div className="field"><label>Requested on</label><input type="date" value={r.date||''} onChange={e=>updateRevision(r.id,{date:e.target.value})}/></div><div className="field"><label>Status</label><select value={r.status||'Requested'} onChange={e=>updateRevision(r.id,{status:e.target.value})}><option>Requested</option><option>In progress</option><option>Sent to client</option><option>Waiting on client</option><option>Completed</option></select></div></div><div className="field"><label>What changed?</label><input value={r.description||''} placeholder="e.g. Revise foundation for new layout" onChange={e=>updateRevision(r.id,{description:e.target.value})}/></div><div className="field"><label>Notes</label><textarea rows="2" value={r.notes||''} onChange={e=>updateRevision(r.id,{notes:e.target.value})}/></div></div>)}<button className="btn" onClick={addRevision}>+ Add revision</button>
 <div className="line"/><h3>Additional work & invoices</h3><p className="muted">Each additional invoice receives its own permanent number and payment status, without creating another project card.</p>
 {(current.extraInvoices||[]).map(i=><div className="record" key={i.id}><div className="recordtitle"><strong>Invoice {i.number}</strong><span className="muted">{i.paid?'Paid':'Unpaid'}</span></div><div className="field"><label>Work description</label><input value={i.description||''} onChange={e=>updateExtraInvoice(i.id,{description:e.target.value})}/></div><div className="field"><label>Amount ($)</label><input type="number" min="0" step="0.01" value={i.amount} onChange={e=>updateExtraInvoice(i.id,{amount:e.target.value})}/></div><label className="statusrow"><span>Invoice paid</span><input type="checkbox" checked={!!i.paid} onChange={e=>updateExtraInvoice(i.id,{paid:e.target.checked,paidDate:e.target.checked?(i.paidDate||today()):''})}/></label>{i.paid&&<div className="field"><label>Date paid</label><input type="date" value={i.paidDate||''} onChange={e=>updateExtraInvoice(i.id,{paidDate:e.target.value})}/></div>}<div className="field"><label>Invoice number (editable)</label><input value={i.number||''} onChange={e=>updateExtraInvoice(i.id,{number:e.target.value})}/></div><button className="btn danger" onClick={()=>{if(window.confirm('Remove this invoice record? Its number will not be reused.'))update(current.id,{extraInvoices:current.extraInvoices.filter(x=>x.id!==i.id)})}}>Remove invoice record</button></div>)}<button className="btn" onClick={addExtraInvoice}>+ Add additional invoice</button>
 <div className="line"/><h3>Invoice reference</h3><div className="field"><label>Invoice number (automatically assigned; editable)</label><input placeholder="e.g. CE-1025" value={current.invoiceNumber||''} onChange={e=>update(current.id,{invoiceNumber:e.target.value})}/></div><div className="line"/><div className="panelactions"><button className="btn primary" onClick={()=>{update(current.id,{completed:!current.completed});setSelected(null);setTab(current.completed?'active':'completed')}}>{current.completed?'↩ Move to Active':'✓ Mark Completed'}</button><button className="btn danger" onClick={()=>{if(window.confirm(`Delete ${current.name}?`)){setProjects(p=>p.filter(x=>x.id!==current.id));setSelected(null)}}}>Delete Project</button></div></aside></div>}
 </div>;
}
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL,SUPABASE_KEY) : null;
const defaultSettings = {invoiceCounter:1000,metrics:['active','outstanding','hold','completed'],theme:'light'};
const emptyData = () => ({projects:[],clients:[],settings:{...defaultSettings}});
const readLocalData = () => {
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw===null) return null;
    const projects=JSON.parse(raw);
    if(!Array.isArray(projects)) return null;
    const clients=JSON.parse(localStorage.getItem(CLIENTS_KEY)||'[]');
    const metrics=JSON.parse(localStorage.getItem(METRICS_KEY)||'null');
    return {projects,clients:Array.isArray(clients)?clients:[],settings:{
      invoiceCounter:Math.max(Number(localStorage.getItem(INVOICE_COUNTER_KEY))||1000,initialCounter(projects)),
      metrics:Array.isArray(metrics)&&metrics.length?metrics:defaultSettings.metrics,
      theme:localStorage.getItem('cajun-theme')||'light'
    }};
  } catch { return null; }
};
const normalizeData = row => ({
  projects:Array.isArray(row?.projects)?row.projects:[],
  clients:Array.isArray(row?.clients)?row.clients:[],
  settings:{...defaultSettings,...(row?.settings||{})}
});
const authBox={maxWidth:440,margin:'12vh auto',padding:28,background:'white',borderRadius:14,boxShadow:'0 5px 25px #0001'};
function App(){
  const [session,setSession]=useState(undefined);
  const [screen,setScreen]=useState('loading');
  const [data,setData]=useState(null);
  const [localCandidate,setLocalCandidate]=useState(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [saveStatus,setSaveStatus]=useState('Saved');
  const latest=useRef(null);
  const pendingVersion=useRef(0);
  const savedVersion=useRef(0);
  const saving=useRef(false);
  const saveTimer=useRef(null);
  const userId=useRef(null);
  useEffect(()=>{
    if(!supabase){setScreen('config');return;}
    supabase.auth.getSession().then(({data:{session},error})=>{
      if(error)setError(error.message);
      setSession(session||null);
    }).catch(e=>{setError(e.message);setSession(null)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if(session===undefined||!supabase)return;
    if(!session){
      clearTimeout(saveTimer.current);
      userId.current=null;latest.current=null;pendingVersion.current=0;savedVersion.current=0;
      setData(null);setScreen('login');return;
    }
    const id=session.user.id;
    if(userId.current===id)return;
    userId.current=id;
    let cancelled=false;
    setScreen('loading');setError('');
    (async()=>{
      const {data:row,error:loadError}=await supabase.from('user_data').select('projects,clients,settings').eq('user_id',id).maybeSingle();
      if(cancelled||userId.current!==id)return;
      if(loadError){setError('Could not load cloud data: '+loadError.message);setScreen('loadError');return;}
      const local=readLocalData();
      // Never overwrite cloud data automatically. Offer a deliberate import if the cloud is empty.
      if(!row && local && (local.projects.length || local.clients.length)){
        setLocalCandidate(local);setScreen('choose');return;
      }
      setData(normalizeData(row));setSaveStatus('Saved');setScreen('ready');
    })().catch(e=>{if(!cancelled){setError(e.message);setScreen('loadError')}});
    return ()=>{cancelled=true};
  },[session?.user?.id]);
  const saveNow=async()=>{
    if(!supabase||!userId.current||saving.current||!latest.current)return;
    saving.current=true;
    const id=userId.current;
    try {
      while(savedVersion.current<pendingVersion.current && userId.current===id){
        const version=pendingVersion.current;
        const snapshot=latest.current;
        setSaveStatus('Saving…');
        const {error:saveError}=await supabase.from('user_data').upsert({user_id:id,...snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'});
        if(saveError)throw saveError;
        savedVersion.current=version;
      }
      if(userId.current===id)setSaveStatus('Saved');
    }catch(e){if(userId.current===id)setSaveStatus('Save failed: '+e.message)}
    finally{saving.current=false}
  };
  const queueSave=React.useCallback(snapshot=>{
    latest.current=snapshot;
    pendingVersion.current+=1;
    setSaveStatus('Unsaved changes…');
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>{void saveNowRef.current()},700);
  },[]);
  const saveNowRef=useRef(null);
  saveNowRef.current=saveNow;
  const chooseData=async chosen=>{
    setBusy(true);setError('');
    const snapshot=normalizeData(chosen);
    const {error:saveError}=await supabase.from('user_data').upsert({user_id:session.user.id,...snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    setBusy(false);
    if(saveError){setError('Import failed: '+saveError.message);return;}
    setData(snapshot);setSaveStatus('Saved');setScreen('ready');
  };
  const login=async e=>{
    e.preventDefault();setBusy(true);setError('');
    const {error:loginError}=await supabase.auth.signInWithPassword({email,password});
    setBusy(false);setPassword('');
    if(loginError)setError(loginError.message);
  };
  if(screen==='ready'&&data&&session)return <Dashboard key={session.user.id} initialData={data} onDataChange={queueSave} saveStatus={saveStatus} onRetrySave={()=>void saveNow()} onSignOut={async()=>{if(pendingVersion.current>savedVersion.current){await saveNow();if(pendingVersion.current>savedVersion.current){window.alert('Cloud save failed. Please retry before signing out.');return;}}await supabase.auth.signOut()}}/>;
  return <div style={{minHeight:'100vh',background:'#eaf2fa',padding:'20px',fontFamily:'system-ui',color:'#203047'}}><div style={authBox}><h1 style={{marginTop:0}}>Cajun Projects</h1>
    {screen==='config'?<p>Supabase settings are missing. Check your Netlify environment variables and redeploy the site.</p>:
     screen==='loading'?<p>Loading your private projects…</p>:
     screen==='login'?<form onSubmit={login}><p>Sign in to your private dashboard.</p><label>Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:10,margin:'6px 0 15px'}}/></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:'block',width:'100%',padding:10,margin:'6px 0 15px'}}/></label><button disabled={busy} type="submit" style={{padding:12,width:'100%'}}>{busy?'Signing in…':'Sign in'}</button></form>:
     screen==='choose'?<><h2>Import your existing projects?</h2><p>We found {localCandidate.projects.length} projects and {localCandidate.clients.length} saved clients in this browser. Your cloud database has no saved record yet.</p><p>Choose <strong>Import</strong> to copy your existing work to Supabase. This also preserves your invoice counter and dashboard preferences.</p><button disabled={busy} onClick={()=>void chooseData(localCandidate)} style={{padding:12,marginRight:8}}>Import my existing work</button><button disabled={busy} onClick={()=>void chooseData(emptyData())} style={{padding:12}}>Start with an empty dashboard</button><p style={{fontSize:12}}>Starting empty replaces the working view and local browser backup; export a copy first if you need your old data.</p></>:
     screen==='loadError'?<><p>Cloud data could not be loaded. No data was changed.</p><button onClick={()=>window.location.reload()}>Try again</button></>:null}
    {error&&<p role="alert" style={{color:'#b91c1c',marginTop:14}}>{error}</p>}
  </div></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
