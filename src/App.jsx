import React,{useEffect,useState,useCallback} from 'react';
import {Shield,LayoutDashboard,FolderOpen,ScanLine,Layers,Search,Network,Radio,FileText,History,Settings,BookOpen,ArrowUpRight,Plus,LogOut,Menu,X} from 'lucide-react';
import {api,Workspace,Button,Badge,CaseForm,Field} from './ui.jsx';
import {Overview,Cases,CaseDetail,Evidence,Reports,Activity} from './pages/Cases.jsx';
import {Collection} from './pages/Collection.jsx';
import {Tools,Analysis,Monitors,Preferences,Guide,Pricing} from './pages/Intelligence.jsx';
const navigation=[['overview','Overview',LayoutDashboard],['cases','Investigations',FolderOpen],['collection','Collection studio',ScanLine],['evidence','Evidence vault',Layers],['tools','Research tools',Search],['analysis','Link analysis',Network],['monitors','Monitors',Radio],['reports','Reports & exports',FileText],['activity','Activity log',History]];
export default function App(){
 const [route,setRoute]=useState(location.hash.slice(1)||'overview'),[me,setMe]=useState(undefined),[data,setData]=useState({cases:[],artifacts:[],jobs:[],activity:[],tools:[]}),[search,setSearch]=useState(''),[notice,setNotice]=useState(null),[newCase,setNewCase]=useState(false),[mobile,setMobile]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{const listener=()=>{setRoute(location.hash.slice(1)||'overview');setMobile(false);};window.addEventListener('hashchange',listener);return()=>window.removeEventListener('hashchange',listener);},[]);
 const refresh=useCallback(async()=>{
  try{const user=await api('/me');setMe(user);const [cases,artifacts,jobs,activity,tools]=await Promise.all(['/cases','/artifacts','/jobs','/activity','/tools'].map(p=>api(p)));setData({cases,artifacts,jobs,activity,tools});}
  catch(e){if(e.status===401)setMe(null);else setNotice({error:true,text:e.message});}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{if(!data.jobs.some(j=>['discovering','capturing'].includes(j.state)))return;const timer=setInterval(refresh,4000);return()=>clearInterval(timer);},[data.jobs,refresh]);
 async function act(fn,message='Saved'){setBusy(true);try{const result=await fn();await refresh();setNotice({text:message});return result;}catch(e){setNotice({error:true,text:e.message});}finally{setBusy(false);}}
 if(me===undefined)return <main className="login"><Shield size={36}/><h1>Aegis Intel</h1><p>Opening investigation workspace…</p>{notice&&<p role="alert">{notice.text}</p>}</main>;
 if(me===null)return <main className="login"><div className="login-panel"><Shield size={36}/><h1>Welcome to Aegis.</h1><p>Sign in to your investigation workspace.</p><form onSubmit={async e=>{e.preventDefault();await act(()=>api('/auth/login',{method:'POST',body:Object.fromEntries(new FormData(e.currentTarget))}),'Signed in');}}><Field label="Email"><input name="email" type="email" autoComplete="username" required/></Field><Field label="Password"><input name="password" type="password" autoComplete="current-password" required/></Field><Button busy={busy}>Sign in <ArrowUpRight size={16}/></Button></form>{notice&&<p role="alert" className="error-text">{notice.text}</p>}</div></main>;
 let page;
 const shared={...data,me,search,act,refresh,busy};
 const pages={overview:<Overview onCreate={()=>setNewCase(true)}/>,cases:<Cases onCreate={()=>setNewCase(true)}/>,collection:<Collection/>,evidence:<Evidence/>,tools:<Tools/>,analysis:<Analysis/>,monitors:<Monitors/>,reports:<Reports/>,activity:<Activity/>,settings:<Preferences/>,guide:<Guide/>,pricing:<Pricing/>};
 page=route.startsWith('case/')?<CaseDetail caseId={route.slice(5)}/>:pages[route]||pages.overview;
 return <Workspace.Provider value={shared}><div className="app">
 <aside className={mobile?'sidebar open':'sidebar'}><a href="#overview" className="brand"><span className="brand-mark"><Shield size={25}/></span><span>AEGIS<span className="brand-sub">INTELLIGENCE WORKSPACE</span></span></a>
 <div className="workspace-label"><span className="avatar">T</span><div>TJK Operations<small>Investigator workspace</small></div><Badge kind="mint">PILOT</Badge></div>
 <div className="nav-label">WORKSPACE</div><nav>{navigation.map(([key,label,Icon])=><a className={route===key||(key==='cases'&&route.startsWith('case/'))?'active':''} href={'#'+key} key={key}><Icon size={18}/><span>{label}</span>{key==='cases'&&<small>{data.cases.length}</small>}</a>)}</nav>
 <div className="sidebar-bottom"><a href="#guide"><BookOpen size={17}/>Field guide</a><a href="#settings"><Settings size={17}/>Workspace settings</a><div className="account"><span className="avatar small">AI</span><div>{me.demo?'Training workspace':'Signed in'}<small>{me.email}</small></div><button aria-label="Sign out" className="icon-button" onClick={()=>act(()=>api('/auth/logout',{method:'POST'}),'Signed out')}><LogOut size={16}/></button></div></div></aside>
 <div className="main"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Toggle navigation" onClick={()=>setMobile(!mobile)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> {route.startsWith('case/')?'Investigation':navigation.find(n=>n[0]===route)?.[1]||'Settings'}</div><div className="global-search"><Search size={16}/><input aria-label="Search workspace" placeholder="Search cases, evidence, tools…" value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="status-dot"/><span className="top-status">Private workspace</span></header>
 {me.demo&&<div className="training-banner">Training workspace · Seeded case is fictional. Queries, imports, and captures use your real inputs.</div>}
 <main className="content">{page}</main><footer className="footer"><span>Aegis Intel · v0.2 reconstruction</span><a href="#pricing">$149 monthly / $1,599 annually · proposed pricing</a></footer></div>
 {notice&&<div className={'toast '+(notice.error?'error':'')} role={notice.error?'alert':'status'}><span>{notice.text}</span><button aria-label="Dismiss notification" className="icon-button" onClick={()=>setNotice(null)}><X size={16}/></button></div>}
 {newCase&&<CaseForm onClose={()=>setNewCase(false)}/>}</div></Workspace.Provider>;
}
