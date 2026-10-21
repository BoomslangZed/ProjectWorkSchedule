import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { useRef } from 'react';

const STORAGE_KEY = 'cajun-projects-personal-v1';
const CLIENTS_KEY = 'cajun-projects-client-directory-v1';
const METRICS_KEY = 'cajun-projects-dashboard-metrics-v1';
const METRIC_OPTIONS = [['active','Active projects'],['outstanding','Outstanding invoices'],['hold','On hold'],['completed','Completed'],['paidYear','Paid this year'],['invoicedYear','Project value added this year'],['unpaidCount','Unpaid projects'],['waiting','Waiting on items'],['avgAge','Average active age'],['totalInvoiced','Total invoiced']];
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
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
const age = date => { if(!date)return 0; const start=new Date(`${date}T00:00:00`); if(Number.isNaN(start.getTime()))return 0; const now=new Date(); const dayNumber=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000; return Math.max(0,dayNumber(now)-dayNumber(start)); };
const color = (days, completed, hold) => {
 if(!completed && hold) return '#fed7aa';
 if(completed) return '#dcefe4';
 // A gentler 60-day progression, with several warm pink and red stages.
 const stops = [
  [0,[236,238,241]], [7,[245,236,238]], [14,[251,223,226]],
  [21,[253,207,212]], [28,[253,187,194]], [35,[251,165,174]],
  [42,[249,143,153]], [49,[245,120,131]], [56,[238,95,107]],
  [60,[226,78,91]]
 ];
 const d = Math.max(0,Math.min(Number(days)||0,60));
 let i=1; while(i<stops.length-1 && d>stops[i][0]) i++;
 const [from, a] = stops[i-1], [to,b] = stops[i];
 const t=(d-from)/(to-from);
 return `rgb(${a.map((v,j)=>Math.round(v+(b[j]-v)*t)).join(',')})`;
};
const shortDate = value => { if(!value) return '—'; const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/); return match ? `${match[2]}/${match[3]}/${match[1].slice(-2)}` : String(value); };
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

.client-chooser{position:relative}.client-suggestions{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:30;background:#fff;color:#1e293b;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 28px #0f172a25;overflow:hidden;max-height:250px;overflow-y:auto}.client-suggestions button{display:block;width:100%;text-align:left;padding:11px 13px;background:transparent;color:inherit;border:0;border-bottom:1px solid #e2e8f0}.client-suggestions button:hover,.client-suggestions button:focus{background:#eaf2ff}.dark .client-suggestions{background:#243a52;color:#f0f6ff;border-color:#52647b}.dark .client-suggestions button{border-color:#40536c}.dark .client-suggestions button:hover,.dark .client-suggestions button:focus{background:#36516e}
.record{border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin:12px 0;background:#f8fafc}.recordtitle{display:flex;justify-content:space-between;align-items:center;gap:12px}.dark .record{background:#17283c;border-color:#40536c}
.clientdirectory-groups{display:grid;gap:22px;margin-top:20px}.clientgroup{border:1px solid #d7e2ef;border-radius:14px;background:rgba(255,255,255,.6);overflow:hidden}.clientgroup-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;gap:12px}.clientgroup-head h3{margin:0 0 3px;font-size:17px}.clientgroup-head .muted{font-size:12px}.clientgroup-count{font-size:12px;font-weight:700;border-radius:99px;background:#e4edf8;color:#355a7b;padding:6px 10px;white-space:nowrap}.clientrows{display:grid}.clientrow{display:grid;grid-template-columns:minmax(160px,2fr) 90px minmax(145px,1fr) 18px;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 18px;background:transparent;color:inherit;border:0;border-top:1px solid #e2eaf2;cursor:pointer}.clientrow:hover{background:#eaf3fb}.clientrow-name,.clientrow-count,.clientrow-money{display:flex;flex-direction:column;gap:4px;min-width:0}.clientrow-name strong{overflow-wrap:anywhere}.clientrow small{font-size:11px;color:#60758b}.clientrow-count{text-align:center}.clientrow-count strong{font-size:21px}.clientrow-money{text-align:right}.clientrow-arrow{font-size:25px;color:#7b91a5}.clientgroup-empty{padding:0 18px 15px}.dark .clientgroup{background:#1a2d43;border-color:#40536c}.dark .clientrow{border-color:#40536c}.dark .clientrow:hover{background:#29425d}.dark .clientrow small{color:#a7b8ce}.dark .clientgroup-count{background:#304b69;color:#d3e7fa}@media(max-width:650px){.clientrow{grid-template-columns:minmax(100px,1fr) 56px minmax(95px,1fr) 12px;gap:7px;padding:12px}.clientrow-money strong{font-size:12px}.clientrow small{font-size:10px}.clientgroup-head{padding:13px}}

/* Card readability and checklist-first layout */
.project .cardhead h3{font-size:23px;line-height:1.16;letter-spacing:-.025em;margin:0 0 7px;font-weight:800;overflow-wrap:anywhere}
.project .cardclient{font-size:16px;font-weight:650;line-height:1.25;color:#30465c;overflow-wrap:anywhere}
.project .cardreceived{font-size:12px;color:#40566c}
.project .cardchecklist{display:flex;flex-direction:column;gap:5px;margin:4px 0 8px;flex:1}
.project .cardcheckitem{font-size:14px;font-weight:650;line-height:1.35;color:#233b50;overflow-wrap:anywhere}
.project .checksymbol{font-size:16px;display:inline-block;width:20px}
.project .cardmeta{display:flex;flex-direction:column;align-items:flex-start;gap:7px;margin-top:auto}
.project .cardinvoice{font-size:11px;color:#475569}
.project .cardpayment{font-size:12px;font-weight:750;background:rgba(255,255,255,.72);padding:5px 8px;border-radius:6px;color:#233b50}
.project .cardfoot{margin-top:6px}
.project .cardcontrols .mini{min-width:30px;font-size:17px;font-weight:750}
.dark .project .cardclient,.dark .project .cardreceived,.dark .project .cardcheckitem,.dark .project .cardinvoice,.dark .project .cardpayment{color:#20364a}

.analytics-totals{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.analytics-year{display:flex;align-items:center;gap:8px}.analytics-year select{border:1px solid #cbd5e1;border-radius:8px;padding:8px;background:white;color:#1e293b}.analytics-chart,.analytics-table{background:var(--analytics-bg,#ffffff);border:1px solid #d5dce5;border-radius:14px;padding:20px;margin:18px 0}.analytics-chart h3,.analytics-table h3{margin:0 0 20px}.analytics-bars{height:280px;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:7px;align-items:end}.analytics-column{min-width:0;height:100%;display:flex;flex-direction:column;align-items:center;gap:6px}.analytics-amount{font-size:10px;white-space:nowrap}.analytics-bartrack{width:100%;flex:1;display:flex;align-items:flex-end;background:#eaf0f7;border-radius:5px;overflow:hidden}.analytics-barfill{width:100%;background:#4d8fc8;border-radius:5px 5px 0 0}.analytics-month{font-size:11px}.analytics-table-row{display:flex;justify-content:space-between;padding:11px 0;border-top:1px solid #d5dce5}.dark .analytics-chart,.dark .analytics-table{--analytics-bg:#1d3047;border-color:#40536c}.dark .analytics-year select{background:#1d3047;color:#eef5ff;border-color:#40536c}.dark .analytics-bartrack{background:#34465d}@media(max-width:650px){.analytics-chart{overflow-x:auto}.analytics-bars{min-width:580px}}
.project{position:relative;overflow:visible}
.card-burst{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:visible}
.burst-label{position:absolute;top:37%;left:50%;transform:translate(-50%,-50%);white-space:nowrap;background:#ffffffed;border:1px solid #e6d9a3;border-radius:999px;padding:9px 17px;font-size:17px;font-weight:900;box-shadow:0 8px 22px #20304735;animation:burstLabel 1.5s ease-out both}
.burst-emoji{position:absolute;left:50%;top:45%;font-size:29px;animation:burstOut 1.55s ease-out both;animation-delay:calc(var(--i) * 50ms)}
@keyframes burstOut{0%{opacity:0;transform:translate(-50%,-50%) scale(.35)}16%{opacity:1}65%{opacity:1;transform:translate(calc(-50% + (var(--i) - 2.5) * 34px),calc(-90px - (var(--i) % 2) * 22px)) rotate(calc((var(--i) - 3) * 20deg)) scale(1.3)}100%{opacity:0;transform:translate(calc(-50% + (var(--i) - 2.5) * 48px),-125px) rotate(45deg) scale(.7)}}
@keyframes burstLabel{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.07)}65%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%)}}
@media(prefers-reduced-motion:reduce){.burst-emoji,.burst-label{animation:none}}
.business-settings{background:var(--panel,#fff);border:1px solid #cad9e9;border-radius:15px;padding:20px;margin:12px 0 20px}.business-settings .field input{width:100%;max-width:520px}.business-settings .inline{display:flex;gap:8px;align-items:center}.business-settings .inline .search{flex:1;min-width:100px}
.hold-reason-card{display:flex;flex-direction:column;gap:4px;background:#fff4d5;color:#5e410b;border:1px solid #e9c66a;border-radius:9px;padding:9px 11px;margin:8px 0;font-size:12px;line-height:1.45;overflow-wrap:anywhere}.hold-reason-card strong{font-size:12px}.waiting-banner{background:#fff3c4;border:1px solid #e6a537;border-radius:9px;padding:9px 10px;font-size:11px;font-weight:850;color:#744408;letter-spacing:.02em;line-height:1.3}
.celebration-overlay{pointer-events:none;position:fixed;left:50%;top:26%;transform:translateX(-50%);z-index:1000;background:rgba(255,255,255,.96);border:1px solid #d9e6f6;border-radius:22px;padding:26px 44px;box-shadow:0 22px 70px #132d5050;text-align:center;animation:celebrateIn .35s ease-out both;min-width:245px;color:#203047}
.celebration-icon{font-size:65px;animation:celebratePop .7s ease-out both}.celebration-overlay strong{font-size:20px;display:block;margin-top:6px}.celebration-sparkles{position:absolute;inset:0;pointer-events:none}.celebration-sparkles span{position:absolute;top:45%;left:50%;font-size:26px;animation:sparkleFly 1.65s ease-out both;animation-delay:calc(var(--i) * 85ms)}@keyframes celebrateIn{from{opacity:0;transform:translate(-50%,-20px) scale(.8)}to{opacity:1;transform:translate(-50%,0) scale(1)}}@keyframes celebratePop{0%{transform:scale(.25) rotate(-18deg)}65%{transform:scale(1.2) rotate(8deg)}100%{transform:scale(1)}}@keyframes sparkleFly{0%{opacity:0;transform:translate(0,0) scale(.4)}20%{opacity:1}100%{opacity:0;transform:translate(calc((var(--i) - 2) * 58px),calc(-90px + (var(--i) % 2) * 150px)) rotate(35deg) scale(1.3)}}@media(prefers-reduced-motion:reduce){.celebration-overlay,.celebration-icon,.celebration-sparkles span{animation:none}}

/* Business settings uses the same high-contrast palette as the rest of dark mode. */
.dark .business-settings{--panel:#1d3047;background:#1d3047;color:#eef5ff;border-color:#40536c}
.dark .business-settings h2,.dark .business-settings h3,.dark .business-settings label{color:#eef5ff}
.dark .business-settings .muted{color:#c1d0e2}
.dark .business-settings input,.dark .business-settings .search{background:#14243a;color:#eef5ff;border:1px solid #6a829e}
.dark .business-settings input::placeholder{color:#b5c5d8}
.dark .business-settings .btn:not(.primary){background:#29435f;color:#f0f6ff;border-color:#6a829e}
.dark .business-settings .btn.danger{color:#ffd2d2}
.business-settings input:focus-visible,.help-dialog button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
.help-overlay{position:fixed;inset:0;background:rgba(9,22,40,.7);display:flex;align-items:center;justify-content:center;padding:20px;z-index:100;overflow:auto}
.help-dialog{background:#fff;color:#203047;border-radius:20px;border:1px solid #cbd5e1;width:min(720px,100%);max-height:min(90vh,850px);overflow:auto;padding:24px;box-shadow:0 25px 75px #0005}
.help-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.help-heading h2{margin:0 0 5px}.help-heading p{margin:0;color:#61748a;font-size:13px}
.help-section{border-top:1px solid #dbe4ee;margin-top:18px;padding-top:15px}.help-section h3{margin:0 0 10px;font-size:16px}.help-section p{line-height:1.55;margin:8px 0;font-size:14px}.help-steps{padding-left:23px;line-height:1.65;font-size:14px}.help-steps li{margin:7px 0}.help-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.help-tip{padding:12px;border:1px solid #dbe4ee;background:#f5f9fd;border-radius:10px;font-size:13px;line-height:1.5}.help-tip strong{display:block;margin-bottom:3px}.help-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px}.dark .help-dialog{background:#1d3047;color:#eef5ff;border-color:#536985}.dark .help-heading p{color:#c1d0e2}.dark .help-section{border-color:#40536c}.dark .help-tip{background:#14243a;border-color:#40536c}.dark .help-dialog .btn{background:#29435f;color:#eef5ff;border-color:#6a829e}.dark .help-dialog .btn.primary{background:#3569d2;color:#fff}
@media(max-width:650px){.help-grid{grid-template-columns:1fr}.help-dialog{padding:18px}}

`;
function Dashboard({ initialData, onDataChange, saveStatus, onRetrySave, onSignOut }){
 const [clients,setClients]=useState(initialData.clients);
 const [businessName,setBusinessName]=useState(initialData.settings.businessName||'Cajun Engineering');
 const [defaultChecklist,setDefaultChecklist]=useState(Array.isArray(initialData.settings.defaultChecklist)?initialData.settings.defaultChecklist:['Trusses','Arch Files']);
 const [businessSettingsOpen,setBusinessSettingsOpen]=useState(false);
 const [helpOpen,setHelpOpen]=useState(false);
 const [templateDraft,setTemplateDraft]=useState('');
 const [celebration,setCelebration]=useState(null);
 const celebrationTimer=useRef(null);
 const [,setCalendarDay]=useState(today());
 useEffect(()=>{
   // Wake up at the next local midnight, then schedule the next one.
   let midnightTimer;
   const refreshDay=()=>{
     setCalendarDay(today());
     const now=new Date();
     const next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,0,50);
     midnightTimer=setTimeout(refreshDay,Math.max(100,next.getTime()-now.getTime()));
   };
   refreshDay();
   const onVisible=()=>{if(document.visibilityState==='visible'){clearTimeout(midnightTimer);refreshDay()}};
   document.addEventListener('visibilitychange',onVisible);
   window.addEventListener('focus',onVisible);
   return ()=>{clearTimeout(midnightTimer);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('focus',onVisible)};
 },[]);
 useEffect(()=>()=>{clearTimeout(celebrationTimer.current)},[]);
 const celebrate=(kind,projectId)=>{
   clearTimeout(celebrationTimer.current);
   setCelebration({kind,projectId,id:Date.now()});
   celebrationTimer.current=setTimeout(()=>setCelebration(null),1900);
 };
 const pendingCelebration=useRef(null);
 const closeProject=()=>{
   const pending=pendingCelebration.current;
   pendingCelebration.current=null;
   setSelected(null);
   if(pending){
     if(pending.kind==='complete')setTab('completed');
     celebrate(pending.kind,pending.projectId);
   }
 };
 const markProjectComplete=()=>{
   if(!current)return;
   const id=current.id;
   const finishing=!current.completed;
   update(id,{completed:finishing,completedDate:finishing?today():''});
   if(finishing)pendingCelebration.current={kind:'complete',projectId:id};
   else pendingCelebration.current=null;
   // Keep details open; celebrate immediately when the user closes them.
 };
 const markInvoicePaid=(checked)=>{
   if(!current)return;
   update(current.id,{paid:checked,paidDate:checked?(current.paidDate||today()):''});
   if(checked && pendingCelebration.current?.kind!=='complete')pendingCelebration.current={kind:'paid',projectId:current.id};if(!checked&&pendingCelebration.current?.kind==='paid'&&pendingCelebration.current.projectId===current.id)pendingCelebration.current=null;
 };
 const [clientView,setClientView]=useState(false);
 const [selectedClient,setSelectedClient]=useState(null);
 const [clientDraft,setClientDraft]=useState('');
 const [clientSuggestionsOpen,setClientSuggestionsOpen]=useState(false);
 const [clientNotes,setClientNotes]=useState('');
 const [projects,setProjects]=useState(()=>normalizeProjects(initialData.projects));
 const [invoiceCounter,setInvoiceCounter]=useState(()=>Math.max(Number(initialData.settings.invoiceCounter)||1000,initialCounter(initialData.projects)));
 const [analyticsView,setAnalyticsView]=useState(false); const [analyticsYear,setAnalyticsYear]=useState(new Date().getFullYear()); const [selected,setSelected]=useState(null); const [tab,setTab]=useState('active'); const [query,setQuery]=useState(''); const [newItem,setNewItem]=useState(''); const [markupNote,setMarkupNote]=useState(''); const [drag,setDrag]=useState(null); const [hoverCard,setHoverCard]=useState(null); const [showMetrics,setShowMetrics]=useState(false); const [metrics,setMetrics]=useState(initialData.settings.metrics); const [theme,setTheme]=useState(initialData.settings.theme);
  const firstRender = useRef(true);
  useEffect(()=>{
    // Keep a local backup, including the invoice counter, after the user has selected their data.
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));
      localStorage.setItem(INVOICE_COUNTER_KEY,String(invoiceCounter));
      localStorage.setItem(CLIENTS_KEY,JSON.stringify(clients));
      localStorage.setItem('cajun-theme',theme);
      localStorage.setItem(METRICS_KEY,JSON.stringify(metrics));
    } catch(e) { console.warn('Local backup could not be written',e); }
    if(firstRender.current){firstRender.current=false;return;}
    onDataChange({projects,clients,settings:{invoiceCounter,metrics,theme,businessName,defaultChecklist}});
  },[projects,clients,invoiceCounter,metrics,theme,businessName,defaultChecklist,onDataChange]);
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
 const add=()=>{const number=allocateInvoiceNumber();const p={id:uid(),name:'New Project',client:'',received:today(),invoice:0,invoiceNumber:number,proposal:false,paid:false,paidDate:'',hold:false,holdReason:'',completed:false,markups:[],dropbox:'',items:defaultChecklist.filter(Boolean).map(name=>({id:uid(),name,done:false})),revisions:[],extraInvoices:[]};setProjects(s=>[...s,p]);setSelected(p.id);setClientView(false);setTab('active')};
 const move=(id,delta)=>setProjects(p=>{const a=[...p],i=a.findIndex(x=>x.id===id);if(i<0)return p;let j=i+delta;while(j>=0&&j<a.length&&a[j].completed!==a[i].completed)j+=delta;if(j<0||j>=a.length)return p;[a[i],a[j]]=[a[j],a[i]];return a});
 const reorder=(from,to)=>{if(!from||from===to)return;setProjects(p=>{const a=[...p],i=a.findIndex(x=>x.id===from),j=a.findIndex(x=>x.id===to);if(i<0||j<0||a[i].completed!==a[j].completed)return p;const [m]=a.splice(i,1);a.splice(j,0,m);return a})};
 const endDrag=()=>{setDrag(null);setHoverCard(null)};
 const projectInvoices=p=>[{number:p.invoiceNumber,amount:p.invoice,paid:!!p.paid,paidDate:p.paidDate,date:p.received},...(Array.isArray(p.extraInvoices)?p.extraInvoices:[]).filter(Boolean).map(i=>({...i,date:p.received}))];
 const visible=useMemo(()=>projects.filter(p=>{if(tab==='completed'&&!p.completed)return false;if(tab==='unpaid'&&(!p.completed||!projectInvoices(p).some(i=>!i.paid&&Number(i.amount)>0)))return false;if(tab!=='completed'&&tab!=='unpaid'&&p.completed)return false;if(tab==='hold'&&!p.hold)return false;if(tab==='waiting'&&!(p.items||[]).some(i=>!i.done)&&!(p.markups||[]).some(m=>m.response==='Waiting'))return false;return `${p.name||''} ${p.client||''} ${p.invoiceNumber||''}`.toLowerCase().includes(query.toLowerCase())}),[projects,tab,query]);
 const active=projects.filter(p=>!p.completed);
 const currentYear=String(new Date().getFullYear());
 const values={
  active:active.length,
  outstanding:money(projects.filter(p=>p.completed).flatMap(projectInvoices).filter(i=>!i.paid).reduce((s,i)=>s+(Number(i.amount)||0),0)),
  hold:active.filter(p=>p.hold).length,
  completed:projects.filter(p=>p.completed).length,
  paidYear:money(projects.flatMap(projectInvoices).filter(i=>i.paid && (i.paidDate||'').startsWith(currentYear)).reduce((s,i)=>s+(Number(i.amount)||0),0)),
  invoicedYear:money(projects.flatMap(projectInvoices).filter(i=>(i.date||'').startsWith(currentYear)).reduce((s,i)=>s+(Number(i.amount)||0),0)),
  unpaidCount:projects.filter(p=>p.completed&&projectInvoices(p).some(i=>!i.paid&&Number(i.amount)>0)).length,
  waiting:active.filter(p=>p.items?.some(i=>!i.done)||p.markups?.some(m=>m.response==='Waiting')).length,
  avgAge:active.length?`${Math.round(active.reduce((s,p)=>s+age(p.received),0)/active.length)} days`:'0 days',
  totalInvoiced:money(projects.flatMap(projectInvoices).reduce((s,i)=>s+(Number(i.amount)||0),0))
 };
 const monthlyPaid=Array.from({length:12},(_,month)=>({month:new Date(2000,month,1).toLocaleString('en-US',{month:'short'}),total:projects.flatMap(projectInvoices).filter(i=>i.paid&&i.paidDate&&Number(i.paidDate.slice(0,4))===analyticsYear&&Number(i.paidDate.slice(5,7))===month+1).reduce((sum,i)=>sum+(Number(i.amount)||0),0)}));
 const annualPaid=monthlyPaid.reduce((sum,m)=>sum+m.total,0);
 const maxMonthly=Math.max(1,...monthlyPaid.map(m=>m.total));
 const metricNames=Object.fromEntries(METRIC_OPTIONS);
 const toggleMetric=id=>setMetrics(prev=>prev.includes(id)?(prev.length>1?prev.filter(x=>x!==id):prev):[...prev,id]);
 const addItem=()=>{if(!newItem.trim()||!current)return;update(current.id,{items:[...current.items,{id:uid(),name:newItem.trim(),done:false}]});setNewItem('')};
 const addRevision=()=>{if(!current)return;update(current.id,{revisions:[...(current.revisions||[]),{id:uid(),date:today(),description:'',status:'Requested',notes:''}]})};
 const addExtraInvoice=()=>{if(!current)return;const number=allocateInvoiceNumber();update(current.id,{extraInvoices:[...(current.extraInvoices||[]),{id:uid(),number,description:'Additional work',amount:0,paid:false,paidDate:''}]})};
 const updateRevision=(id,patch)=>update(current.id,{revisions:(current.revisions||[]).map(r=>r.id===id?{...r,...patch}:r)});
 const updateExtraInvoice=(id,patch)=>update(current.id,{extraInvoices:(current.extraInvoices||[]).map(i=>i.id===id?{...i,...patch}:i)});
 const addMarkup=()=>{if(!current)return;update(current.id,{markups:[...current.markups,{id:uid(),sent:today(),response:'Waiting',notes:markupNote}]});setMarkupNote('')};
 return <div className={`app-theme ${theme}`}><style>{css}</style><main className="shell"><div className="header"><div><div className="eyebrow">Cajun Projects</div><h1>{businessName.trim()||'My Business'}</h1><div className="sub">Keep your work moving. Old projects turn red automatically.</div></div><div className="header-actions"><button className="btn" onClick={()=>setHelpOpen(true)}>❔ How to use</button><button className="btn" onClick={()=>setBusinessSettingsOpen(v=>!v)}>⚙ Business settings</button><button className="btn" onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?'☾ Dark mode':'☀ Light mode'}</button><button className="btn primary" onClick={add}>+ New Project</button><span role="status" aria-live="polite" style={{fontSize:12,fontWeight:700,alignSelf:'center',color:saveStatus.startsWith('Save failed')?'#b91c1c':'inherit'}}>{saveStatus==='Saved'?'☁ Cloud: Saved':saveStatus.startsWith('Save failed')?'⚠ '+saveStatus:'🧠 Cloud: '+saveStatus}</span>{saveStatus.startsWith('Save failed')&&<button className="btn" onClick={onRetrySave}>Retry save</button>}<button className="btn" onClick={onSignOut}>Sign out</button></div></div>

 {helpOpen&&<div className="help-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setHelpOpen(false)}}><section className="help-dialog" role="dialog" aria-modal="true" aria-label="How to use Cajun Projects"><div className="help-heading"><div><h2>👋 Welcome to Cajun Projects</h2><p>A quick guide to running your business board.</p></div><button className="btn" onClick={()=>setHelpOpen(false)} aria-label="Close tutorial">✕ Close</button></div>
 <div className="help-section"><h3>🚀 Create your first project</h3><ol className="help-steps"><li>Click <strong>+ New Project</strong> at the top (or the plus card on your board).</li><li>Enter the <strong>Project name</strong>, <strong>Client</strong>, and <strong>Date received</strong>.</li><li>Check off work items as you receive or finish them. Add or remove items for this project anytime.</li><li>Optionally enter an invoice amount, Dropbox folder link, and any markups or revisions.</li><li>Click <strong>Close ✕</strong> or outside the details panel. Your project saves automatically to your private cloud board; look for <strong>Cloud: Saved</strong>.</li></ol></div>
 <div className="help-section"><h3>🧭 What the main buttons do</h3><div className="help-grid"><div className="help-tip"><strong>▦ Project Board</strong>All your project cards and status filters.</div><div className="help-tip"><strong>♧ Clients</strong>Browse client history and add clients.</div><div className="help-tip"><strong>▥ Analytics</strong>See invoices and revenue trends.</div><div className="help-tip"><strong>⚙ Business settings</strong>Change your business name and the default checklist for new projects.</div><div className="help-tip"><strong>☾ Dark / ☀ Light mode</strong>Switch the appearance of your dashboard.</div><div className="help-tip"><strong>⚙ Customize overview</strong>Choose which summary numbers appear above your board.</div><div className="help-tip"><strong>Search</strong>Find projects, clients, or invoice numbers.</div><div className="help-tip"><strong>← / → on cards</strong>Move a card's position; you can also drag cards to rearrange them.</div></div></div>
 <div className="help-section"><h3>📌 Understanding the project tabs</h3><div className="help-grid"><div className="help-tip"><strong>Active</strong>Projects you're currently working on.</div><div className="help-tip"><strong>Waiting On</strong>Projects waiting for information or responses.</div><div className="help-tip"><strong>Unpaid</strong>Completed projects with an unpaid invoice balance.</div><div className="help-tip"><strong>On Hold</strong>Projects you've paused.</div><div className="help-tip"><strong>Completed</strong>Finished projects, kept for your records.</div></div></div>
 <div className="help-section"><h3>💡 Useful tips</h3><p><strong>Markups:</strong> In a project, enter a markup description and click <strong>+ Sent today</strong>. Leave its response as <strong>Waiting</strong> to show a yellow waiting-on-client notice on the card. Change the response when they reply.</p><p><strong>Invoices:</strong> Check <strong>Invoice paid</strong> only after payment arrives. Uncheck it to reverse the status and clear the payment date.</p><p><strong>Completion:</strong> Click <strong>✓ Mark Completed</strong> inside a project, then close the panel to see the celebration on its card.</p><p><strong>Checklist:</strong> The checklist under Business settings applies to <em>new</em> projects; changing it doesn't alter existing projects.</p></div>
 <div className="help-actions"><button className="btn primary" onClick={()=>{setHelpOpen(false);add()}}>+ Create a project now</button><button className="btn" onClick={()=>setHelpOpen(false)}>Back to my board</button></div></section></div>}
 {businessSettingsOpen&&<section className="business-settings"><h2>Business settings</h2><p className="muted">Set the name at the top of your dashboard and the checklist used for every new project. Existing project checklists stay unchanged.</p><div className="field"><label>Business name</label><input value={businessName} maxLength={80} onChange={e=>setBusinessName(e.target.value)}/></div><h3>Default project checklist</h3>{defaultChecklist.map((item,index)=><div className="inline" key={index} style={{marginBottom:8}}><input aria-label={`Checklist item ${index+1}`} className="search" value={item} onChange={e=>setDefaultChecklist(prev=>prev.map((x,i)=>i===index?e.target.value:x))}/><button className="btn" disabled={index===0} onClick={()=>setDefaultChecklist(prev=>{const a=[...prev];[a[index-1],a[index]]=[a[index],a[index-1]];return a})}>↑</button><button className="btn" disabled={index===defaultChecklist.length-1} onClick={()=>setDefaultChecklist(prev=>{const a=[...prev];[a[index+1],a[index]]=[a[index],a[index+1]];return a})}>↓</button><button className="btn danger" onClick={()=>setDefaultChecklist(prev=>prev.filter((_,i)=>i!==index))}>Remove</button></div>)}<div className="inline"><input className="search" placeholder="New checklist item" value={templateDraft} onChange={e=>setTemplateDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&templateDraft.trim()){setDefaultChecklist(prev=>[...prev,templateDraft.trim()]);setTemplateDraft('')}}}/><button className="btn" onClick={()=>{if(templateDraft.trim()){setDefaultChecklist(prev=>[...prev,templateDraft.trim()]);setTemplateDraft('')}}}>+ Add item</button></div><div style={{marginTop:16}}><button className="btn primary" onClick={()=>setBusinessSettingsOpen(false)}>Done</button></div></section>}
 <div className="topsearch"><input className="search" placeholder="Search projects, clients, or invoice numbers..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="toolbar"><div className="tabs"><button className={`tab ${!clientView&&!analyticsView?'active':''}`} onClick={()=>{setClientView(false);setAnalyticsView(false);setSelectedClient(null)}}>▦ Project Board</button><button className={`tab ${clientView?'active':''}`} onClick={()=>{setClientView(true);setAnalyticsView(false);setSelectedClient(null)}}>♧ Clients ({allClients.length})</button><button className={`tab ${analyticsView?'active':''}`} onClick={()=>{setAnalyticsView(true);setClientView(false);setSelectedClient(null)}}>▥ Analytics</button></div></div><div className="metricbar"><h2>Overview</h2><button className="btn" onClick={()=>setShowMetrics(v=>!v)}>{showMetrics?"Done customizing":"⚙ Customize overview"}</button></div>{showMetrics&&<div className="metricpicker">{METRIC_OPTIONS.map(([id,label])=><label key={id}><input type="checkbox" checked={metrics.includes(id)} onChange={()=>toggleMetric(id)}/>{label}</label>)}<div className="muted" style={{width:"100%"}}>Paid this year uses Date Paid. Invoiced this year uses Invoice Date, or Date Received for older records.</div></div>}<div className="summary">{metrics.map(id=><div className="metric" key={id}>{metricNames[id]}<strong>{values[id]}</strong></div>)}</div>
 {analyticsView ? <section className="analytics-page"><div className="sectionhead"><h2>Revenue Analytics</h2><label className="analytics-year">Year <select value={analyticsYear} onChange={e=>setAnalyticsYear(Number(e.target.value))}>{Array.from({length:7},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}</select></label></div><p className="hint">Monthly earnings count invoices marked paid with a Date Paid in the selected month. Original and additional-work invoices are included. Paid invoices missing a Date Paid cannot be placed on the chart.</p><div className="analytics-totals"><div className="metric">Collected in {analyticsYear}<strong>{money(annualPaid)}</strong></div><div className="metric">Monthly average<strong>{money(annualPaid/12)}</strong></div><div className="metric">Best month<strong>{money(Math.max(...monthlyPaid.map(m=>m.total)))}</strong></div></div><div className="analytics-chart" role="img" aria-label={`Monthly paid invoice revenue for ${analyticsYear}`}><h3>Monthly earnings</h3><div className="analytics-bars">{monthlyPaid.map(m=><div className="analytics-column" key={m.month}><span className="analytics-amount">{m.total?money(m.total):'—'}</span><div className="analytics-bartrack"><div className="analytics-barfill" style={{height:`${m.total?Math.max(3,m.total/maxMonthly*100):0}%`}}/></div><span className="analytics-month">{m.month}</span></div>)}</div></div><div className="analytics-table"><h3>Monthly breakdown</h3>{monthlyPaid.map(m=><div className="analytics-table-row" key={m.month}><span>{m.month} {analyticsYear}</span><strong>{money(m.total)}</strong></div>)}</div></section> : clientView ? <section className="client-directory"><div className="sectionhead"><h2>Client Directory</h2><span className="muted">{allClients.length} clients</span></div><p className="hint">Clients are remembered automatically when you enter them on a project. Select a client to see all their projects.</p><div className="inline clientadd"><input className="search" placeholder="New client name..." value={clientDraft} onChange={e=>setClientDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addClient()}/><button className="btn primary" onClick={addClient}>+ Add client</button></div><div className="clientdirectory-groups">{[{title:'Frequent Clients',subtitle:'5 or more projects',min:5,max:Infinity},{title:'Repeat Clients',subtitle:'2–4 projects',min:2,max:4},{title:'One-Time Clients',subtitle:'1 project',min:1,max:1},{title:'Other Clients',subtitle:'No projects yet',min:0,max:0}].map(group=>{const matching=allClients.filter(c=>{const ps=linkedProjects(c);return ps.length>=group.min&&ps.length<=group.max&&(c.name.toLowerCase().includes(query.toLowerCase())||ps.some(p=>p.name.toLowerCase().includes(query.toLowerCase())))}).sort((a,b)=>linkedProjects(b).length-linkedProjects(a).length||a.name.localeCompare(b.name));return <div className="clientgroup" key={group.title}><div className="clientgroup-head"><div><h3>{group.title}</h3><span className="muted">{group.subtitle}</span></div><span className="clientgroup-count">{matching.length} clients</span></div>{matching.length?<div className="clientrows">{matching.map(c=>{const ps=linkedProjects(c);const invoices=ps.flatMap(projectInvoices);return <button type="button" key={c.id} className="clientrow" onClick={()=>setSelectedClient(c.id)}><span className="clientrow-name"><strong>{c.name}</strong><small>{ps.filter(p=>!p.completed).length} active · {ps.filter(p=>p.completed).length} completed</small></span><span className="clientrow-count"><strong>{ps.length}</strong><small>projects</small></span><span className="clientrow-money"><strong>{money(invoices.reduce((sum,i)=>sum+(Number(i.amount)||0),0))}</strong><small>{money(invoices.filter(i=>!i.paid).reduce((sum,i)=>sum+(Number(i.amount)||0),0))} outstanding</small></span><span className="clientrow-arrow">›</span></button>})}</div>:<p className="muted clientgroup-empty">No clients in this group.</p>}</div>})}</div></section> : <>
 <div className="toolbar"><div className="tabs">{[['active','Active'],['waiting','Waiting On'],['unpaid','Unpaid'],['hold','On Hold'],['completed','Completed']].map(([id,label])=><button key={id} className={`tab ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>)}</div></div>
 <div className="sectionhead"><h2>{({active:'Priority Board',waiting:'Waiting On',unpaid:'Unpaid Projects',hold:'On Hold',completed:'Completed Projects'})[tab]}</h2><span className="muted">{visible.length} projects</span></div><p className="hint">Drag cards to shuffle them into your preferred order. Click a card to edit its details. Project age is measured in calendar days.</p>
 {visible.length?<div className="board">{visible.map(p=><article data-project-id={p.id} key={p.id} className={`project ${drag===p.id?'dragging':''} ${hoverCard===p.id?'shuffle-target':''}`} draggable onDragStart={e=>{setDrag(p.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',p.id)}} onDragOver={e=>{e.preventDefault();if(drag&&drag!==p.id){setHoverCard(p.id);reorder(drag,p.id)}}} onDrop={e=>{e.preventDefault();endDrag()}} onDragEnd={endDrag} onClick={()=>{if(!drag){pendingCelebration.current=null;setSelected(p.id)}}} style={{background:color(age(p.received),p.completed,p.hold),cursor:'grab'}}>{celebration?.projectId===p.id&&<div className="card-burst" key={celebration.id} aria-live="polite"><span className="burst-label">{celebration.kind==='complete'?'🎉 Nice work!':'💸 Paid!'}</span>{(celebration.kind==='complete'?['🎉','🎊','✨','🥳','⭐','🎉']:['💵','💸','💰','🤑','💵','✨']).map((emoji,i)=><span key={i} className="burst-emoji" style={{'--i':i}}>{emoji}</span>)}</div>}<div className="cardhead"><div><h3>{p.name}</h3><div className="cardclient">{p.client||'No client'}</div></div><div className="age">{p.completed?'✓ Done':`${age(p.received)}d`}</div></div><div className="cardreceived">Received {shortDate(p.received)}</div>{p.hold&&<div className="hold-reason-card"><strong>⏸ On hold</strong><span>{p.holdReason?.trim()||"No reason added yet"}</span></div>}{p.completed&&<div className="cardreceived" style={{fontWeight:750,color:"#166534"}}>✓ Completed {p.completedDate?shortDate(p.completedDate):"(date not recorded)"}</div>}<div className="cardchecklist">{(p.items||[]).map(i=><div key={i.id} className="cardcheckitem"><span className="checksymbol">{i.done?'✓':'○'}</span> {i.name}</div>)}{!p.completed&&(p.markups||[]).some(m=>m.response==='Waiting')&&<div className="waiting-banner">📨 WAITING ON CLIENT · MARKUPS SENT</div>}{(p.markups||[]).length>0&&<div className="cardcheckitem"><span className="checksymbol">↗</span> Markups: {p.markups.length} sent{p.markups.some(m=>m.response==='Waiting')?' · Awaiting response':''}</div>}{(p.revisions||[]).length>0&&<div className="cardcheckitem"><span className="checksymbol">↻</span> {p.revisions.length} revisions</div>}</div><div className="cardmeta">{p.proposal&&<span className="tag">✓ Proposal</span>}{p.hold&&<span className="tag">⏸ On Hold</span>}<div className="cardinvoice">Invoice #: {p.invoiceNumber||'Not assigned'}{projectInvoices(p).length>1?` · ${projectInvoices(p).length} invoices`:''}</div><div className="cardpayment">{projectInvoices(p).some(i=>!i.paid&&Number(i.amount)>0)?'Unpaid invoice':projectInvoices(p).some(i=>i.paid&&Number(i.amount)>0)?'✓ Paid':'No invoice balance'}</div></div><div className="cardfoot"><strong>{money(projectInvoices(p).reduce((sum,i)=>sum+(Number(i.amount)||0),0))}</strong><div className="cardcontrols"><button className="mini" title="Move left" aria-label="Move card left" onClick={e=>{e.stopPropagation();move(p.id,-1)}}>←</button><button className="mini" title="Move right" aria-label="Move card right" onClick={e=>{e.stopPropagation();move(p.id,1)}}>→</button><span className="tiny">Edit →</span></div></div></article>)}{tab==='active'&&!query&&<button className="newcard" onClick={add}><span className="plus">+</span><strong>New Project</strong><span>Click to add a project</span></button>}</div>:tab==='active'&&!query?<div className="board"><button className="newcard" onClick={add}><span className="plus">+</span><strong>New Project</strong><span>Click to add a project</span></button></div>:<div className="empty">No projects in this view.</div>}
 </>}
 <p className="hint" style={{marginTop:24}}>Your changes are saved to Supabase when Cloud shows “Saved”. A local backup is also kept in this browser. Avoid editing on two devices at the same time.</p></main>
 {currentClient&&clientView&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedClient(null)}}><aside className="panel"><div className="paneltop"><div><div className="eyebrow">Client directory</div><h2>{currentClient.name}</h2><div className="sub">{linkedProjects(currentClient).length} linked projects</div></div><button className="btn" onClick={()=>setSelectedClient(null)}>Close ✕</button></div><div className="field"><label>Client name</label><input key={currentClient.id} defaultValue={currentClient.name} onBlur={e=>saveClientName(currentClient,e.target.value)} /></div><div className="field"><label>Client notes</label><textarea rows="3" value={clients.find(c=>c.id===currentClient.id)?.notes||''} onChange={e=>{const v=e.target.value;setClients(prev=>prev.some(c=>c.id===currentClient.id)?prev.map(c=>c.id===currentClient.id?{...c,notes:v}:c):[...prev,{...currentClient,notes:v}])}} placeholder="Contact details, preferences, notes..." /></div><div className="line"/><h3>Projects for {currentClient.name}</h3>{linkedProjects(currentClient).map(p=><button key={p.id} className="clientproject" onClick={()=>{setSelectedClient(null);setSelected(p.id)}}><strong>{p.name}</strong><span>{p.completed?'Completed':p.hold?'On hold':'Active'} · {p.invoiceNumber||'No invoice #'} · {money(projectInvoices(p).reduce((sum,i)=>sum+(Number(i.amount)||0),0))}</span></button>)}{!linkedProjects(currentClient).length&&<p className="muted">No projects yet. Select this client when creating a project.</p>}</aside></div>}
 {current&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeProject()}}><aside className="panel"><div className="paneltop"><div><div className="eyebrow">Project details</div><h2>{current.name}</h2><div className="sub">{age(current.received)} calendar days since received</div>{current.completed&&<div className="sub" style={{marginTop:5}}>✓ Completed {current.completedDate?shortDate(current.completedDate):"(date not recorded)"}</div>}</div><button className="btn" onClick={closeProject}>Close ✕</button></div>
 <div className="field"><label>Project name</label><input value={current.name} onChange={e=>update(current.id,{name:e.target.value})}/></div><div className="field"><label>Client — choose existing or enter new</label><div className="client-chooser"><input autoComplete="off" value={current.client||''} onFocus={()=>setClientSuggestionsOpen(true)} onChange={e=>{update(current.id,{client:e.target.value,clientId:null});setClientSuggestionsOpen(true)}} onBlur={e=>{setProjectClient(current.id,e.target.value);setClientSuggestionsOpen(false)}} placeholder="Type or select a client..."/>{clientSuggestionsOpen&&allClients.filter(c=>(!current.client||c.name.toLowerCase().includes(current.client.toLowerCase()))&&c.name.toLowerCase()!==String(current.client||'').toLowerCase()).slice(0,7).length>0&&<div className="client-suggestions">{allClients.filter(c=>(!current.client||c.name.toLowerCase().includes(current.client.toLowerCase()))&&c.name.toLowerCase()!==String(current.client||'').toLowerCase()).slice(0,7).map(c=><button type="button" key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{setProjectClient(current.id,c.name);setClientSuggestionsOpen(false)}}>{c.name}</button>)}</div>}</div><span className="muted">Names are saved to your Client Directory when you leave this field.</span>{current.client&&<button className="btn" onClick={()=>{setProjectClient(current.id,current.client);setSelected(null);setClientView(true);const c=allClients.find(x=>clientNameKey(x.name)===clientNameKey(current.client));if(c)setSelectedClient(c.id)}}>View this client's projects →</button>}</div><div className="twocol"><div className="field"><label>Date received</label><input type="date" value={current.received} onChange={e=>update(current.id,{received:e.target.value})}/></div><div className="field"><label>Invoice amount ($)</label><input type="number" min="0" step="0.01" value={current.invoice} onChange={e=>update(current.id,{invoice:e.target.value})}/></div></div>
 <label className="statusrow"><span>Proposal sent</span><input type="checkbox" checked={!!current.proposal} onChange={e=>update(current.id,{proposal:e.target.checked})}/></label><label className="statusrow"><span>Invoice paid</span><input type="checkbox" checked={current.paid} onChange={e=>markInvoicePaid(e.target.checked)}/></label>{current.paid&&<div className="field"><label>Date paid (for yearly revenue)</label><input type="date" value={current.paidDate||''} onChange={e=>update(current.id,{paidDate:e.target.value})}/></div>}<label className="statusrow"><span>On hold</span><input type="checkbox" checked={current.hold} onChange={e=>update(current.id,{hold:e.target.checked})}/></label>{current.hold&&<div className="field"><label>Reason for putting this project on hold</label><textarea rows="3" value={current.holdReason||''} onChange={e=>update(current.id,{holdReason:e.target.value})} placeholder="e.g. Waiting for revised architectural plans, client approval, or permit"/><span className="muted">This reason will appear directly on the project card. It stays saved if you take the project off hold.</span></div>}
 <div className="line"/><h3>Required files checklist</h3>{current.items.map(item=><div className="checkrow" key={item.id}><label className="inline"><input type="checkbox" checked={item.done} onChange={e=>update(current.id,{items:current.items.map(i=>i.id===item.id?{...i,done:e.target.checked}:i)})}/><input aria-label="Checklist item name" className="itemname" value={item.name} onChange={e=>update(current.id,{items:current.items.map(i=>i.id===item.id?{...i,name:e.target.value}:i)})}/></label><button className="btn danger" onClick={()=>update(current.id,{items:current.items.filter(i=>i.id!==item.id)})}>Remove</button></div>)}<div className="inline" style={{marginTop:12}}><input className="search" style={{maxWidth:'none'}} placeholder="Add checklist item..." value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()}/><button className="btn" onClick={addItem}>Add</button></div>
 <div className="line"/><h3>Dropbox link</h3><div className="field"><label>Optional project folder URL</label><input type="url" placeholder="https://www.dropbox.com/..." value={current.dropbox} onChange={e=>update(current.id,{dropbox:e.target.value})}/></div>{/^https:\/\//i.test(current.dropbox)&&<a href={current.dropbox} target="_blank" rel="noopener noreferrer">Open Dropbox link ↗</a>}
 <div className="line"/><h3>Markups sent</h3><p className="muted">Record each markup submission and whether the client responded.</p>{current.markups.map(m=><div className="markup" key={m.id}><div className="inline" style={{width:'100%'}}><input type="date" value={m.sent} onChange={e=>update(current.id,{markups:current.markups.map(x=>x.id===m.id?{...x,sent:e.target.value}:x)})}/><select value={m.response} onChange={e=>update(current.id,{markups:current.markups.map(x=>x.id===m.id?{...x,response:e.target.value}:x)})}><option>Waiting</option><option>Received</option><option>Revisions requested</option><option>No response needed</option></select></div><div className="inline" style={{width:'100%'}}><input placeholder="What was sent?" value={m.notes} onChange={e=>update(current.id,{markups:current.markups.map(x=>x.id===m.id?{...x,notes:e.target.value}:x)})}/><button className="btn danger" onClick={()=>update(current.id,{markups:current.markups.filter(x=>x.id!==m.id)})}>Remove</button></div></div>)}<div className="inline" style={{marginTop:12}}><input className="search" style={{maxWidth:'none'}} placeholder="Markup description..." value={markupNote} onChange={e=>setMarkupNote(e.target.value)}/><button className="btn" onClick={addMarkup}>+ Sent today</button></div>
 <div className="line"/><h3>Project revisions</h3><p className="muted">Keep revisions attached to this project. A revision does not create another invoice unless you add one below.</p>
 {(current.revisions||[]).map((r,index)=><div className="record" key={r.id}><div className="recordtitle"><strong>Revision {index+1}</strong><button className="btn danger" onClick={()=>update(current.id,{revisions:current.revisions.filter(x=>x.id!==r.id)})}>Remove</button></div><div className="twocol"><div className="field"><label>Requested on</label><input type="date" value={r.date||''} onChange={e=>updateRevision(r.id,{date:e.target.value})}/></div><div className="field"><label>Status</label><select value={r.status||'Requested'} onChange={e=>updateRevision(r.id,{status:e.target.value})}><option>Requested</option><option>In progress</option><option>Sent to client</option><option>Waiting on client</option><option>Completed</option></select></div></div><div className="field"><label>What changed?</label><input value={r.description||''} placeholder="e.g. Revise foundation for new layout" onChange={e=>updateRevision(r.id,{description:e.target.value})}/></div><div className="field"><label>Notes</label><textarea rows="2" value={r.notes||''} onChange={e=>updateRevision(r.id,{notes:e.target.value})}/></div></div>)}<button className="btn" onClick={addRevision}>+ Add revision</button>
 <div className="line"/><h3>Additional work & invoices</h3><p className="muted">Each additional invoice receives its own permanent number and payment status, without creating another project card.</p>
 {(current.extraInvoices||[]).map(i=><div className="record" key={i.id}><div className="recordtitle"><strong>Invoice {i.number}</strong><span className="muted">{i.paid?'Paid':'Unpaid'}</span></div><div className="field"><label>Work description</label><input value={i.description||''} onChange={e=>updateExtraInvoice(i.id,{description:e.target.value})}/></div><div className="field"><label>Amount ($)</label><input type="number" min="0" step="0.01" value={i.amount} onChange={e=>updateExtraInvoice(i.id,{amount:e.target.value})}/></div><label className="statusrow"><span>Invoice paid</span><input type="checkbox" checked={!!i.paid} onChange={e=>{updateExtraInvoice(i.id,{paid:e.target.checked,paidDate:e.target.checked?(i.paidDate||today()):''});if(e.target.checked && pendingCelebration.current?.kind!=='complete')pendingCelebration.current={kind:'paid',projectId:current.id};if(!e.target.checked&&pendingCelebration.current?.kind==='paid'&&pendingCelebration.current.projectId===current.id)pendingCelebration.current=null}}/></label>{i.paid&&<div className="field"><label>Date paid</label><input type="date" value={i.paidDate||''} onChange={e=>updateExtraInvoice(i.id,{paidDate:e.target.value})}/></div>}<div className="field"><label>Invoice number (editable)</label><input value={i.number||''} onChange={e=>updateExtraInvoice(i.id,{number:e.target.value})}/></div><button className="btn danger" onClick={()=>{if(window.confirm('Remove this invoice record? Its number will not be reused.'))update(current.id,{extraInvoices:current.extraInvoices.filter(x=>x.id!==i.id)})}}>Remove invoice record</button></div>)}<button className="btn" onClick={addExtraInvoice}>+ Add additional invoice</button>
 {current.completed&&<div className="field"><label>Date completed (editable)</label><input type="date" value={current.completedDate||""} onChange={e=>update(current.id,{completedDate:e.target.value})}/></div>}<div className="line"/><h3>Invoice reference</h3><div className="field"><label>Invoice number (automatically assigned; editable)</label><input placeholder="e.g. CE-1025" value={current.invoiceNumber||''} onChange={e=>update(current.id,{invoiceNumber:e.target.value})}/></div><div className="line"/><div className="panelactions"><button className="btn primary" onClick={markProjectComplete}>{current.completed?'↩ Move to Active':'✓ Mark Completed'}</button><button className="btn danger" onClick={()=>{if(window.confirm(`Delete ${current.name}?`)){setProjects(p=>p.filter(x=>x.id!==current.id));setSelected(null)}}}>Delete Project</button></div></aside></div>}
 </div>;
}
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL,SUPABASE_KEY) : null;
const defaultSettings = {businessName:'Cajun Engineering',defaultChecklist:['Trusses','Arch Files'],invoiceCounter:1000,metrics:['active','outstanding','hold','completed'],theme:'light'};
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
function Thinking({message='Cajun Projects is thinking...',detail='Consulting the tiny engineer in the computer.'}){
  return <div role="status" aria-live="polite" style={{textAlign:'center',padding:'22px 8px'}}>
    <style>{`@keyframes cajunThink {0%,100%{transform:rotate(-9deg) scale(1)}50%{transform:rotate(9deg) scale(1.13)}} @keyframes cajunDots {0%,80%,100%{opacity:.25}40%{opacity:1}} .cajun-brain{display:inline-block;font-size:49px;animation:cajunThink 1.15s ease-in-out infinite;transform-origin:center}.cajun-dots span{animation:cajunDots 1.2s infinite;display:inline-block}.cajun-dots span:nth-child(2){animation-delay:.2s}.cajun-dots span:nth-child(3){animation-delay:.4s}@media(prefers-reduced-motion:reduce){.cajun-brain,.cajun-dots span{animation:none}}`}</style>
    <div className="cajun-brain" aria-hidden="true">🧠</div>
    <div style={{fontWeight:750,fontSize:17,marginTop:12}}>{message}<span className="cajun-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></div>
    <p style={{fontSize:13,color:'#64748b',marginBottom:0}}>{detail}</p>
  </div>;
}
const authBox={maxWidth:450,margin:'max(5vh,28px) auto',padding:'38px 36px',background:'rgba(255,255,255,.97)',borderRadius:24,boxShadow:'0 25px 80px rgba(22,55,95,.16)',border:'1px solid rgba(255,255,255,.9)'};
const loginField={display:'block',width:'100%',padding:'13px 14px',margin:'7px 0 19px',border:'1px solid #cbd9e8',borderRadius:11,background:'#f8fbff',color:'#203047',outlineColor:'#2563eb'};
const loginButton={padding:'14px 18px',width:'100%',border:0,borderRadius:12,background:'linear-gradient(120deg,#1556b5,#3282dc)',color:'white',fontWeight:750,fontSize:15,boxShadow:'0 7px 16px #1556b52a'};
function App(){
  const [session,setSession]=useState(undefined);
  const sessionRef=useRef(undefined);
  sessionRef.current=session;
  const [screen,setScreen]=useState('loading');
  const screenRef=useRef('loading');
  const [data,setData]=useState(null);
  const [dashboardVersion,setDashboardVersion]=useState(0);
  const [localCandidate,setLocalCandidate]=useState(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [businessSignupName,setBusinessSignupName]=useState('');
  const [authMode,setAuthMode]=useState('login');
  const [signupNotice,setSignupNotice]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [saveStatus,setSaveStatus]=useState('Saved');
  const latest=useRef(null);
  const pendingVersion=useRef(0);
  const savedVersion=useRef(0);
  const saving=useRef(false);
  const saveTimer=useRef(null);
  const userId=useRef(null);
  screenRef.current=screen;
  // A separate watchdog covers BOTH authentication and cloud data loading.
  // AbortController alone is not sufficient: some stalled requests never settle.
  useEffect(()=>{
    if(screen!=='loading')return;
    const timeout=setTimeout(()=>{
      if(sessionRef.current?.user?.id){
        setError('Cloud loading took too long. Check your Supabase settings and try again.');
        setScreen('loadError');
      }else{
        setError('Login check took too long. Please try signing in.');
        setScreen('authError');
      }
    },15000);
    return ()=>clearTimeout(timeout);
  },[screen]);
  useEffect(()=>{
    if(!supabase){setScreen('config');return;}
    let alive=true;
    // A broken auth request must never leave the brain spinning forever.
    const timer=setTimeout(()=>{
      if(alive && sessionRef.current===undefined){
        setError('Login check timed out. Check your Supabase URL and connection, then retry.');
        setScreen('authError');
      }
    },12000);
    supabase.auth.getSession().then(({data,error})=>{
      if(!alive)return;
      if(error){setError(error.message);setScreen('authError');return;}
      setSession(data?.session||null);
    }).catch(e=>{if(alive){setError(e.message||String(e));setScreen('authError')}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{
      if(alive)setSession(next||null);
    });
    return ()=>{alive=false;clearTimeout(timer);subscription.unsubscribe()};
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
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    (async()=>{
      const {data:row,error:loadError}=await supabase.from('user_data').select('projects,clients,settings').eq('user_id',id).maybeSingle().abortSignal(controller.signal);
      if(cancelled||userId.current!==id||screenRef.current==='loadError')return;
      if(loadError){setError('Could not load cloud data: '+loadError.message);setScreen('loadError');return;}
      // Never import old browser records automatically. New accounts start blank.
      const workspace=normalizeData(row);
      // Brand-new accounts start with their own business name and no Cajun-specific checklist.
      // Existing users retain every setting and project exactly as stored.
      if(!row){
        const name=String(session.user.user_metadata?.business_name||'').trim();
        workspace.settings.businessName=name||'My Business';
        workspace.settings.defaultChecklist=[];
        const {error:createError}=await supabase.from('user_data').insert({user_id:id,...workspace,updated_at:new Date().toISOString()});
        if(cancelled||userId.current!==id)return;
        if(createError){
          // A concurrent sign-in can create the row first; reload that row rather than overwrite it.
          if(createError.code==='23505'){
            const {data:existing,error:readError}=await supabase.from('user_data').select('projects,clients,settings').eq('user_id',id).single();
            if(readError){setError('Could not load your workspace: '+readError.message);setScreen('loadError');return;}
            setData(normalizeData(existing));setSaveStatus('Saved');setScreen('ready');return;
          }
          setError('Could not create your private workspace: '+createError.message);setScreen('loadError');return;
        }
      }
      setData(workspace);setSaveStatus('Saved');setScreen('ready');
    })().catch(e=>{if(!cancelled&&screenRef.current!=='loadError'){setError(e.name==='AbortError'?'Cloud request timed out. Check Supabase project status and URL.':(e.message||String(e)));setScreen('loadError')}}).finally(()=>clearTimeout(timer));
    return ()=>{cancelled=true;clearTimeout(timer);controller.abort()};
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
  const startFresh=async()=>{
    if(!session?.user?.id)return;
    if(!window.confirm('Permanently erase ALL cloud projects, clients, invoices, and settings for this account and start with a blank dashboard?'))return;
    setBusy(true);setError('');
    const snapshot=emptyData();
    snapshot.settings.businessName=data?.settings?.businessName||session.user.user_metadata?.business_name||'My Business';
    snapshot.settings.defaultChecklist=data?.settings?.defaultChecklist||[];
    try {
      const {error:resetError}=await supabase.from('user_data').upsert({user_id:session.user.id,...snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(resetError)throw resetError;
      // Clear the old local backup only after cloud reset succeeds.
      for(const key of [STORAGE_KEY,CLIENTS_KEY,METRICS_KEY,INVOICE_COUNTER_KEY,'cajun-theme'])localStorage.removeItem(key);
      latest.current=null;pendingVersion.current=0;savedVersion.current=0;
      setData(snapshot);setDashboardVersion(v=>v+1);setSaveStatus('Saved');setScreen('ready');
    }catch(e){setError('Could not start fresh: '+(e.message||String(e)))}
    finally{setBusy(false)}
  };
  const login=async e=>{
    e.preventDefault();setBusy(true);setError('');
    const {error:loginError}=await supabase.auth.signInWithPassword({email,password});
    setBusy(false);setPassword('');
    if(loginError)setError(loginError.message);
  };
  const signup=async e=>{
    e.preventDefault();
    const name=businessSignupName.trim();
    if(!name){setError('Enter your business name.');return;}
    if(password.length<6){setError('Use a password with at least 6 characters.');return;}
    setBusy(true);setError('');setSignupNotice('');
    try{
      const {data:result,error:signupError}=await supabase.auth.signUp({
        email:email.trim(),password,
        options:{data:{business_name:name},emailRedirectTo:window.location.origin}
      });
      if(signupError)throw signupError;
      setPassword('');
      if(result.session){
        setSignupNotice('Account created. Opening your private board…');
      }else{
        setSignupNotice('Check your email for the confirmation link, then return here and sign in. If an account already exists, use Sign in instead.');
        setAuthMode('login');
      }
    }catch(e){setError(e.message||'Could not create account. Please try again.');}
    finally{setBusy(false);}
  };
  if(screen==='ready'&&data&&session)return <><div style={{position:'fixed',bottom:12,right:12,zIndex:100}}><button onClick={()=>void startFresh()} disabled={busy} style={{background:'#fff',color:'#9f1239',border:'1px solid #fda4af',borderRadius:8,padding:'7px 10px',fontSize:12}}>Start fresh (erase cloud data)</button></div><Dashboard key={`${session.user.id}-${dashboardVersion}`} initialData={data} onDataChange={queueSave} saveStatus={saveStatus} onRetrySave={()=>void saveNow()} onSignOut={async()=>{if(pendingVersion.current>savedVersion.current){await saveNow();if(pendingVersion.current>savedVersion.current){window.alert('Cloud save failed. Please retry before signing out.');return;}}await supabase.auth.signOut()}}/></>;
  return <div style={{minHeight:'100vh',background:'radial-gradient(ellipse at 20% 10%,#c6e6ff 0%,transparent 44%),linear-gradient(145deg,#edf5fd,#dfeafa)',padding:'25px 18px',fontFamily:'system-ui',color:'#203047'}}><div style={authBox}><div style={{display:'flex',alignItems:'center',gap:13,marginBottom:12}}><div style={{fontSize:34,background:'#eaf3ff',padding:11,borderRadius:15}}>📐</div><div><div style={{fontSize:11,letterSpacing:2,fontWeight:800,color:'#48749c'}}>YOUR PRIVATE WORKSPACE</div><h1 style={{margin:'3px 0 0',fontSize:28,letterSpacing:'-.7px'}}>Cajun Projects</h1></div></div>
    {screen==='config'?<p>Supabase settings are missing. Check your Netlify environment variables and redeploy the site.</p>:
     screen==='loading'?<Thinking message="Loading your projects" detail="Checking the blueprints in the cloud."/>:
     screen==='login'?<>
       <div style={{display:'flex',gap:8,background:'#eef4fa',padding:5,borderRadius:13,margin:'20px 0 22px'}}>
         <button type="button" onClick={()=>{setAuthMode('login');setError('');setSignupNotice('')}} style={{...loginButton,flex:1,width:'auto',padding:11,boxShadow:'none',background:authMode==='login'?'#1556b5':'transparent',color:authMode==='login'?'white':'#526579'}}>Sign in</button>
         <button type="button" onClick={()=>{setAuthMode('signup');setError('');setSignupNotice('')}} style={{...loginButton,flex:1,width:'auto',padding:11,boxShadow:'none',background:authMode==='signup'?'#1556b5':'transparent',color:authMode==='signup'?'white':'#526579'}}>Create account</button>
       </div>
       {authMode==='signup'?<form onSubmit={signup}>
         <p style={{color:'#64748b',lineHeight:1.6}}>Start a private project board for your business. Your projects are separate from every other account.</p>
         <label>Business name<input required maxLength={80} autoComplete="organization" value={businessSignupName} onChange={e=>setBusinessSignupName(e.target.value)} placeholder="Your company name" style={loginField}/></label>
         <label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={loginField}/></label>
         <label>Password<input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} style={loginField}/></label>
         <button disabled={busy} type="submit" style={loginButton}>{busy?'Creating your account…':'Create my business board →'}</button>
       </form>:<form onSubmit={login}>
         <p style={{color:'#64748b',lineHeight:1.6}}>Welcome back! Your projects, clients, and invoices are ready when you are.</p>
         <label>Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={loginField}/></label>
         <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={loginField}/></label>
         <button disabled={busy} type="submit" style={loginButton}>{busy?'Checking your login…':'Sign in to my dashboard →'}</button>
       </form>}
       {signupNotice&&<p role="status" style={{background:'#eaf7ee',color:'#17613c',padding:13,borderRadius:10,lineHeight:1.5}}>{signupNotice}</p>}
       <p style={{textAlign:'center',fontSize:12,color:'#8495a9',margin:'20px 0 0'}}>🔒 Private workspace · Secure cloud storage</p>
     </>:
     screen==='choose'?<><h2>Import your existing projects?</h2><p>We found {localCandidate.projects.length} projects and {localCandidate.clients.length} saved clients in this browser. Your cloud database has no saved record yet.</p><p>Choose <strong>Import</strong> to copy your existing work to Supabase. This also preserves your invoice counter and dashboard preferences.</p><button disabled={busy} onClick={()=>void chooseData(localCandidate)} style={{padding:12,marginRight:8}}>Import my existing work</button><button disabled={busy} onClick={()=>void chooseData(emptyData())} style={{padding:12}}>Start with an empty dashboard</button><p style={{fontSize:12}}>Starting empty replaces the working view and local browser backup; export a copy first if you need your old data.</p></>:
     screen==='loadError'||screen==='authError'?<><p>Connection problem. No cloud data was changed.</p><button onClick={()=>window.location.reload()}>Try again</button>{<button style={{marginLeft:8}} onClick={()=>{setSession(null);setError('');setScreen('login')}}>Go to sign in</button>}</>:null}
    {busy&&screen==='login'&&<Thinking message="Checking your login" detail="Making sure you have the keys to the office."/>}
    {busy&&screen==='choose'&&<Thinking message="Setting up your dashboard" detail="Getting the filing cabinet ready."/>}
    {error&&<p role="alert" style={{color:'#b91c1c',marginTop:14}}>{error}</p>}
  </div></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
