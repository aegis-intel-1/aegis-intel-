import React,{createContext,useContext,useState} from 'react';
import {X,ArrowUpRight,LoaderCircle} from 'lucide-react';
export const Workspace=createContext(null);
export const useWorkspace=()=>useContext(Workspace);
export async function api(path,options={}){
 const res=await fetch('/api'+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},body:options.body?JSON.stringify(options.body):undefined});
 const data=await res.json();if(!res.ok)throw Object.assign(new Error(data.error||'Request failed'),{status:res.status});return data;
}
export const parse=value=>{try{return JSON.parse(value||'[]');}catch{return [];}};
export const date=value=>value?new Date(value).toLocaleString(): '—';
export const bytes=n=>n>1048576?(n/1048576).toFixed(1)+' MB':n>1024?(n/1024).toFixed(1)+' KB':n+' B';
export const go=value=>{window.location.hash=value;};
export function Button({children,busy,kind='',...props}){return <button className={'button '+kind} disabled={busy||props.disabled} {...props}>{busy?<LoaderCircle size={16} className="spin"/>:null}{children}</button>;}
export function Badge({children,kind=''}){return <span className={'badge '+kind}>{children}</span>;}
export function Heading({title,description,children}){return <div className="heading"><div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{children}</div></div>;}
export function Empty({title,children}){return <div className="empty"><div className="empty-mark">◇</div><h3>{title}</h3><p>{children}</p></div>;}
export function Modal({title,onClose,children}){
 return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section role="dialog" aria-modal="true" aria-label={title} className="modal"><div className="section-head"><h2>{title}</h2><button aria-label="Close dialog" className="icon-button" onClick={onClose}><X size={20}/></button></div>{children}</section></div>;
}
export function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>;}
export function CaseSelect({value,onChange,required=true}){const {cases}=useWorkspace();return <select aria-label="Investigation" value={value} onChange={e=>onChange(e.target.value)} required={required}><option value="">{required?'Choose investigation':'Do not preserve to case'}</option>{cases.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>;}
export function CaseForm({onClose}){
 const {act}=useWorkspace();return <Modal title="New investigation" onClose={onClose}><form onSubmit={e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));act(async()=>{const c=await api('/cases',{method:'POST',body:data});onClose();go('case/'+c.id);},'Investigation created');}}>
 <Field label="Case title"><input autoFocus name="title" required maxLength={160} placeholder="Give this investigation a clear name"/></Field>
 <Field label="Scope and objective"><textarea name="description" rows={4} placeholder="Describe the question, sources, and boundaries."/></Field>
 <Field label="Priority"><select name="priority" defaultValue="normal"><option>normal</option><option>high</option><option>low</option></select></Field>
 <div className="form-footer"><Button kind="secondary" type="button" onClick={onClose}>Cancel</Button><Button>Create investigation</Button></div></form></Modal>;
}
export function LinkOut({href,children}){return <a href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={13}/></a>;}
