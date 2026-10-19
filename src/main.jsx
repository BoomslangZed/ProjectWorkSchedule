import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const STORAGE_KEY = 'cajun-projects-personal-v1';
const CLIENTS_KEY = 'cajun-projects-client-directory-v1';
const METRICS_KEY = 'cajun-projects-dashboard-metrics-v1';
const METRIC_OPTIONS = [['active','Active projects'],['outstanding','Outstanding invoices'],['hold','On hold'],['completed','Completed'],['paidYear','Paid this year'],['invoicedYear','Invoiced this year'],['unpaidCount','Unpaid projects'],['waiting','Waiting on items'],['avgAge','Average active age'],['totalInvoiced','Total invoiced']];
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); };
const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
const seed = [
  {id:'1',name:'Johnson Residence',client:'Johnson Family',received:daysAgo(1),invoice:1200,invoiceNumber:'CE-1001',paid:false,hold:false,completed:false,markups:[],dropbox:'',items:[{id:'a',name:'Trusses',done:true},{id:'b',name:'Arch Files',done:true}]},
  {id:'2',name:'Smith Residence',client:'Smith Family',received:daysAgo(7),invoice:1750,invoiceNumber:'CE-1002',paid:false,hold:false,completed:false,markups:[{id:'m1',sent:daysAgo(3),response:'Waiting',notes:'Foundation markup sent'}],dropbox:'',items:[{id:'c',name:'Trusses',done:true},{id:'d',name:'Arch Files',done:false}]},
  {id:'3',name:'Boudreaux Barn',client:'Boudreaux',received:daysAgo(13),invoice:2500,invoiceNumber:'CE-1003',paid:true,hold:true,completed:false,markups:[],dropbox:'',items:[{id:'e',name:'Trusses',done:false},{id:'f',name:'Arch Files',done:true}]},
  {id:'4',name:'LeBlanc Addition',client:'LeBlanc',received:daysAgo(20),invoice:950,invoiceNumber:'CE-1004',paid:false,hold:false,completed:false,markups:[{id:'m2',sent:daysAgo(8),response:'Revisions requested',notes:'Updated opening sizes'}],dropbox:'',items:[{id:'g',name:'Trusses',done:false},{id:'h',name:'Arch Files',done:false}]},
  {id:'5',name:'Landry Residence',client:'Landry',received:daysAgo(32),invoice:3200,invoiceNumber:'CE-1005',paid:true,hold:false,completed:true,markups:[],dropbox:'',items:[{id:'i',name:'Trusses',done:true},{id:'j',name:'Arch Files',done:true}]}
];
// Use the highest existing CE invoice number, so deleted projects do not cause duplicates.
const INVOICE_COUNTER_KEY = 'cajun-projects-invoice-counter-v1';
const invoiceNumeric = value => { const m = /^CE-(\d+)$/i.exec(String(value||'').trim()); return m ? Number(m[1]) : 0; };
const initialCounter = projects => Math.max(1000, ...projects.flatMap(p => [invoiceNumeric(p.invoiceNumber),...(p.extraInvoices||[]).map(i=>invoiceNumeric(i.number))]));
const normalizeProjects = projects => projects.map(p => ({...p,items:p.items||[],markups:p.markups||[],revisions:p.revisions||[],extraInvoices:p.extraInvoices||[]}));
const age = date => Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - new Date(`${date}T00:00:00`).getTime()) / 86400000)) || 0;
const color = (days, completed, hold) => {
 if(!completed && hold) return '#fed7aa';
 if(completed) return '#dcefe4';
 const t = Math.min(days/30,1), start=[236,238,241],end=[238,95,95];
 return `rgb(${start.map((v,i)=>Math.round(v+(end[i]-v)*t)).join(',')})`;
};
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
const css = `
.topsearch{margin:-6px 0 20px}.topsearch .search{max-width:580px;width:100%}.newcard{border:2px dashed #94a3b8;border-radius:14px;min-height:230px;background:#ffffffb0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#475569;cursor:pointer}.newcard:hover{background:#eaf2ff;border-color:#2563eb}.newcard .plus{font-size:42px;line-height:1;color:#2563eb}.newcard span:last-child{font-size:12px}.cardcontrols{display:flex;align-items:center;gap:5px}.mini{border:1px solid #94a3b8;background:#ffffffb9;border-radius:6px;padding:3px 7px}.itemname{border:1px solid #cbd5e1;border-radius:7px;padding:8px;min-width:0;max-width:290px;width:100%}.checkrow label.inline{flex:1;min-width:0}

*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#1e293b;font:15px system-ui,-apple-system,Segoe UI,sans-serif}button,input,textarea,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed} .shell{max-width:1320px;margin:auto;padding:28px 22px 60px}.header{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:24px}.eyebrow{color:#64748b;text-transform:uppercase;letter-spacing:.13em;font-size:11px;font-weight:800}.header h1{margin:4px 0;font-size:31px}.sub{color:#64748b;font-size:13px}.btn{border:1px solid #cbd5e1;background:white;color:#1e293b;padding:9px 13px;border-radius:9px;font-weight:650}.btn.primary{background:#1d4ed8;color:white;border-color:#1d4ed8}.btn.danger{color:#b91c1c}.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 22px}.search{padding:10px 12px;border:1px solid #cbd5e1;border-radius:9px;min-width:250px;flex:1;max-width:360px;background:white}.tabs{display:flex;gap:7px;flex-wrap:wrap}.tab{background:white;border:1px solid #d5dce5;padding:9px 13px;border-radius:9px}.tab.active{background:#1e293b;color:white}.summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px}.metric{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px 18px;min-width:155px}.metric strong{display:block;font-size:22px;margin-top:3px}.board{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:16px}.project{border-radius:14px;padding:16px;border:1px solid rgba(40,50,70,.15);box-shadow:0 3px 9px #0000000a;min-height:230px;display:flex;flex-direction:column;gap:10px;transition:transform .12s,box-shadow .12s}.project:hover{transform:translateY(-2px);box-shadow:0 7px 20px #00000016}.project.dragging{opacity:1}.cardhead{display:flex;justify-content:space-between;gap:8px}.cardhead h3{font-size:18px;margin:0 0 4px}.age{font-weight:800;white-space:nowrap;font-size:13px}.tiny{font-size:12px;color:#475569}.tags{display:flex;gap:6px;flex-wrap:wrap}.tag{font-size:11px;padding:4px 7px;border-radius:6px;background:#ffffffb8;font-weight:750}.cardfoot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:10px;border-top:1px solid #00000019}.sectionhead{display:flex;align-items:center;justify-content:space-between;margin:28px 0 14px}.sectionhead h2{margin:0}.empty{padding:35px;border:2px dashed #cbd5e1;border-radius:14px;text-align:center;color:#64748b}.overlay{position:fixed;inset:0;background:#0f172a88;display:flex;justify-content:flex-end;z-index:10}.panel{background:white;height:100%;width:min(600px,100%);overflow:auto;padding:24px;box-shadow:-8px 0 35px #0002}.paneltop{display:flex;justify-content:space-between;align-items:start;gap:10px}.panel h2{margin:5px 0 3px}.field{display:flex;flex-direction:column;gap:5px;margin:12px 0}.field label{font-size:12px;color:#475569;font-weight:750}.field input,.field textarea,.field select{border:1px solid #cbd5e1;border-radius:8px;padding:10px;width:100%;background:white}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:12px}.line{border-top:1px solid #e2e8f0;margin:22px 0}.checkrow,.markup{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #edf2f7}.checkrow input{width:18px;height:18px}.inline{display:flex;gap:8px;align-items:center}.inline input{min-width:0;flex:1}.muted{color:#64748b;font-size:12px}.markup{align-items:flex-start;flex-direction:column}.markup select{padding:6px;border:1px solid #cbd5e1;border-radius:7px}.panelactions{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}.hint{color:#64748b;font-size:12px;margin:8px 0 16px}@media(max-width:650px){.shell{padding:18px 12px}.header{align-items:flex-start}.header h1{font-size:25px}.twocol{grid-template-columns:1fr}.panel{padding:18px}.metric{min-width:135px}}
.app-theme{min-height:100vh;background:linear-gradient(135deg,#edf6fc 0%,#e5f0f8 52%,#f2f6fa 100%);color:#203047;transition:background .2s,color .2s}
.header-actions{display:flex;gap:9px;flex-wrap:wrap}
.dropghost{border:2px dashed #2d7db8;border-radius:14px;min-height:230px;background:repeating-linear-gradient(135deg,rgba(59,130,246,.13),rgba(59,130,246,.13) 12px,rgba(59,130,246,.05) 12px,rgba(59,130,246,.05) 24px);display:flex;align-items:center;justify-content:center;color:#1d5e93;font-weight:800;box-shadow:inset 0 0 0 2px rgba(255,255,255,.4)}
.project.dragging{opacity:1;transform:none;box-shadow:0 10px 28px rgba(15,23,42,.24);outline:2px solid rgba(45,125,184,.6)}
.project.shuffle-target{outline:2px solid rgba(45,125,184,.42);outline-offset:2px}
.metricbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 12px;flex-wrap:wrap}.metricbar h2{font-size:17px;margin:0}.metricpicker{display:flex;flex-wrap:wrap;gap:10px;padding:14px;margin-bottom:17px;border-radius:12px;background:#ffffffb8;border:1px solid #d7e2ef}.metricpicker label{display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer}.metricpicker input{accent-color:#2563eb}.statusrow{display:flex;align-items:center;justify-content:space-between;padding:12px 13px;border:1px solid #dbe3ed;border-radius:9px;margin:9px 0;gap:12px}.statusrow input{width:20px;height:20px;accent-color:#2563eb}.dark .metricpicker{background:#1d3047;border-color:#40536c}.dark .statusrow{border-color:#40536c}
.app-theme.dark{background:linear-gradient(135deg,#0c1829 0%,#14243a 100%);color:#e6eef9}
.dark .eyebrow,.dark .sub,.dark .hint,.dark .muted{color:#a7b8ce}
.dark .metric,.dark .panel,.dark .btn,.dark .tab,.dark .search,.dark .field input,.dark .field textarea,.dark .field select,.dark .itemname,.dark .mini{background:#1d3047;color:#eef5ff;border-color:#40536c}
.dark .tab.active,.dark .btn.primary{background:#3569d2;color:white}
.dark .newcard{background:#1d3047;color:#d5e7fa;border-color:#54718f}
.dark .newcard:hover{background:#28415d}
.dark .project{color:#172b40}
.dark .project .tiny{color:#31465b}
.dark .project .age,.dark .project h3,.dark .project strong{color:#172b40}
.dark .project .tag{color:#172b40;background:rgba(255,255,255,.75)}
.dark .project .mini{background:rgba(255,255,255,.88);color:#172b40;border-color:#9aacc0}
.dark .tiny{color:#b7cbe2}
.dark .panel .tiny,.dark .panel .field label{color:#b7cbe2}
.dark .checkrow,.dark .markup,.dark .line{border-color:#40536c}
.dark .dropghost{background:repeating-linear-gradient(135deg,#203e5b,#203e5b 12px,#193149 12px,#193149 24px);color:#a5d8ff;border-color:#6daee6}
@media(max-width:650px){.header-actions{justify-content:flex-end}.dropghost{min-height:180px}}

.record{border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin:12px 0;background:#f8fafc}.recordtitle{display:flex;justify-content:space-between;align-items:center;gap:12px}.dark .record{background:#17283c;border-color:#40536c}
`;
function App(){
 const [clients,setClients]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(CLIENTS_KEY));return Array.isArray(saved)?saved:[]}catch{return []}});
 const [clientView,setClientView]=useState(false);
 const [selectedClient,setSelectedClient]=useState(null);
 const [clientDraft,setClientDraft]=useState('');
 const [clientNotes,setClientNotes]=useState('');
 const [projects,setProjects]=useState(()=>{try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));return normalizeProjects(Array.isArray(x)?x:seed)}catch{return normalizeProjects(seed)}});
 const [invoiceCounter,setInvoiceCounter]=useState(()=>{const saved=Number(localStorage.getItem(INVOICE_COUNTER_KEY))||1000;let stored;try{stored=JSON.parse(localStorage.getItem(STORAGE_KEY))}catch{}return Math.max(saved,initialCounter(Array.isArray(stored)?stored:seed))});
 const [selected,setSelected]=useState(null); const [tab,setTab]=useState('active'); const [query,setQuery]=useState(''); const [newItem,setNewItem]=useState(''); const [markupNote,setMarkupNote]=useState(''); const [drag,setDrag]=useState(null); const [hoverCard,setHoverCard]=useState(null); const [showMetrics,setShowMetrics]=useState(false); const [metrics,setMetrics]=useState(()=>{try{const v=JSON.parse(localStorage.getItem(METRICS_KEY));return Array.isArray(v)?v:['active','outstanding','hold','completed']}catch{return ['active','outstanding','hold','completed']}}); const [theme,setTheme]=useState(()=>localStorage.getItem('cajun-theme')||'light');
 useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(projects))},[projects]);
 useEffect(()=>{localStorage.setItem(INVOICE_COUNTER_KEY,String(invoiceCounter))},[invoiceCounter]);
 useEffect(()=>{localStorage.setItem(CLIENTS_KEY,JSON.stringify(clients))},[clients]);
 useEffect(()=>{localStorage.setItem('cajun-theme',theme)},[theme]);
 useEffect(()=>{localStorage.setItem(METRICS_KEY,JSON.stringify(metrics))},[metrics]);
 const update=(id,patch)=>setProjects(p=>p.map(x=>x.id===id?{...x,...patch}:x));
 const clientNameKey=name=>(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
 // Legacy projects used client names without IDs. Match those names to the directory.
 const allClients=useMemo(()=>{const list=[...clients];for(const p of projects){const name=(p.client||'').trim();if(name&&!list.some(c=>c.id===p.clientId||clientNameKey(c.name)===clientNameKey(name)))list.push({id:`legacy-${clientNameKey(name)}`,name,notes:''});}return list.sort((a,b)=>a.name.localeCompare(b.name));},[clients,projects]);
 const linkedProjects=client=>projects.filter(p=>p.clientId===client.id||(!p.clientId&&clientNameKey(p.client)===clientNameKey(client.name)));
 const setProjectClient=(projectId,raw)=>{const name=raw.trim().replace(/\s+/g,' ');if(!name){update(projectId,{client:'',clientId:null});return;}let match=allClients.find(c=>clientNameKey(c.name)===clientNameKey(name));if(!match){match={id:uid(),name,notes:''};setClients(prev=>[...prev,match]);}else if(!clients.some(c=>c.id===match.id)){setClients(prev=>[...prev,match]);}update(projectId,{client:match.name,clientId:match.id});};
 const addClient=()=>{const name=clientDraft.trim().replace(/\s+/g,' ');if(!name)return;const found=allClients.find(c=>clientNameKey(c.name)===clientNameKey(name));if(found){setSelectedClient(found.id);}else{const c={id:uid(),name,notes:''};setClients(prev=>[...prev,c]);setSelectedClient(c.id);}setClientDraft('');};
 const saveClientName=(c,name)=>{const clean=name.trim();if(!clean)return;const clash=allClients.some(x=>x.id!==c.id&&clientNameKey(x.name)===clientNameKey(clean));if(clash){window.alert('A client with that name already exists.');return;}setClients(prev=>prev.map(x=>x.id===c.id?{...x,name:clean}:x));setProjects(prev=>prev.map(p=>(p.clientId===c.id||(!p.clientId&&clientNameKey(p.client)===clientNameKey(c.name)))?{...p,client:clean,clientId:c.id}:p));};
 const currentClient=allClients.find(c=>c.id===selectedClient);
 const current=projects.find(x=>x.id===selected);
 const allocateInvoiceNumber=()=>{const highest=Math.max(invoiceCounter,initialCounter(projects));const next=highest+1;setInvoiceCounter(next);return `CE-${next}`};
 const add=()=>{const number=allocateInvoiceNumber();const p={id:uid(),name:'New Project',client:'',received:today(),invoice:0,invoiceNumber:number,proposal:false,paid:false,paidDate:'',hold:false,completed:false,markups:[],dropbox:'',items:[{id:uid(),name:'Trusses',done:false},{id:uid(),name:'Arch Files',done:false}],revisions:[],extraInvoices:[]};setProjects(s=>[p,...s]);setSelected(p.id);setClientView(false);setTab('active')};
 const move=(id,delta)=>setProjects(p=>{const a=[...p],i=a.findIndex(x=>x.id===id);if(i<0)return p;let j=i+delta;while(j>=0&&j<a.length&&a[j].completed!==a[i].completed)j+=delta;if(j<0||j>=a.length)return p;[a[i],a[j]]=[a[j],a[i]];return a});
 const reorder=(from,to)=>{if(!from||from===to)return;setProjects(p=>{const a=[...p],i=a.findIndex(x=>x.id===from),j=a.findIndex(x=>x.id===to);if(i<0||j<0||a[i].completed!==a[j].completed)return p;const [m]=a.splice(i,1);a.splice(j,0,m);return a})};
 const endDrag=()=>{setDrag(null);setHoverCard(null)};
 const visible=useMemo(()=>projects.filter(p=>{if(tab==='completed'?!p.completed:p.completed)return false;if(tab==='unpaid'&&!projectInvoices(p).some(i=>!i.paid))return false;if(tab==='hold'&&!p.hold)return false;if(tab==='waiting'&&!p.items.some(i=>!i.done)&&!p.markups.some(m=>m.response==='Waiting'))return false;return `${p.name} ${p.client} ${p.invoiceNumber||''}`.toLowerCase().includes(query.toLowerCase())}),[projects,tab,query]);
 const projectInvoices=p=>[{number:p.invoiceNumber,amount:p.invoice,paid:p.paid,paidDate:p.paidDate,date:p.invoiceDate||p.received},...(p.extraInvoices||[])];
 const active=projects.filter(p=>!p.completed);
 const currentYear=String(new Date().getFullYear());
 const values={
  active:active.length,
  outstanding:money(projects.flatMap(projectInvoices).filter(i=>!i.paid).reduce((s,i)=>s+(Number(i.amount)||0),0)),
  hold:active.filter(p=>p.hold).length,
