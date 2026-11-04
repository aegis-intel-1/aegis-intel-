import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {dataDir,id,now,sha,run,all,audit,requireCase} from './db.js';
export const originals=path.join(dataDir,'originals');
fs.mkdirSync(originals,{recursive:true,mode:0o700});
export const originalPath=id=>path.join(originals,id);
export function preserve(owner,caseId,name,mime,body,source=''){
 requireCase(owner,caseId);if(!Buffer.isBuffer(body)||!body.length||body.length>25*1024*1024)throw new Error('File must contain 1 byte to 25 MiB');
 const artifact={id:id(),case_id:caseId,name:String(name).slice(0,180),mime:String(mime).slice(0,120),sha256:sha(body),size:body.length,source:String(source).slice(0,3000),tags:'[]',created:now()};
 fs.writeFileSync(originalPath(artifact.id),body,{flag:'wx',mode:0o400});
 try{run('INSERT INTO artifacts VALUES(?,?,?,?,?,?,?,?,?)',...Object.values(artifact));}
 catch(e){fs.unlinkSync(originalPath(artifact.id));throw e;}
 audit(owner,'artifact.preserved',{caseId,artifactId:artifact.id,name:artifact.name,sha256:artifact.sha256,size:artifact.size,source:artifact.source});
 return artifact;
}
export function verify(artifact){
 try{const bytes=fs.readFileSync(originalPath(artifact.id));return {id:artifact.id,valid:sha(bytes)===artifact.sha256&&bytes.length===artifact.size,expected:artifact.sha256,actual:sha(bytes),size:bytes.length};}
 catch{return {id:artifact.id,valid:false,error:'Original missing or unreadable'};}
}
export async function report(owner,caseId){
 const c=requireCase(owner,caseId),pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page,y;
 const clean=s=>String(s??'').replace(/[^\x20-\x7e]/g,'?');
 function line(s,strong=false){const text=clean(s);for(let start=0;start<Math.max(1,text.length);start+=90){if(!page||y<50){page=pdf.addPage([595,842]);y=788;}page.drawText(text.slice(start,start+90),{x:42,y,size:10,font:strong?bold:font,color:rgb(.12,.17,.22)});y-=16;}}
 line('AEGIS INTEL / COLLECTION RECORD',true);line(c.title,true);line('Case: '+c.id);line('Generated: '+now());line(c.description);line('');
 line('This record describes preserved bytes. System time is not a trusted timestamp.');
 line('Hashes do not establish authenticity of source claims or legal admissibility.');line('');
 for(const a of all('SELECT * FROM artifacts WHERE case_id=? ORDER BY created',caseId)){line(a.name,true);line(a.source);line('SHA-256 '+a.sha256);line(a.size+' bytes | '+a.created);line('Original verification: '+(verify(a).valid?'PASS':'FAIL'));line('');}
 for(const n of all('SELECT * FROM notes WHERE case_id=? ORDER BY created',caseId)){line('Investigator note | '+n.created,true);line(n.body);line('');}
 return Buffer.from(await pdf.save());
}
export async function bundle(owner,caseId,res){
 const c=requireCase(owner,caseId),artifacts=all('SELECT * FROM artifacts WHERE case_id=? ORDER BY created',caseId);
 const checks=artifacts.map(verify);if(checks.some(x=>!x.valid))throw new Error('Bundle blocked: an original failed verification');
 audit(owner,'bundle.exported',{caseId,count:artifacts.length});
 const events=all('SELECT json,previous,hash FROM audit WHERE owner=? AND scope=? ORDER BY seq',owner,caseId);
 const approvals=all('SELECT id,approval FROM jobs WHERE case_id=? AND approval IS NOT NULL',caseId);
 const pdf=await report(owner,caseId);
 res.setHeader('Content-Type','application/zip');res.setHeader('Content-Disposition','attachment; filename="aegis-'+caseId+'.zip"');
 const zip=archiver('zip',{zlib:{level:6}});zip.on('error',()=>res.destroy());zip.pipe(res);
 for(const a of artifacts)zip.file(originalPath(a.id),{name:'originals/'+a.id});
 zip.append(JSON.stringify({version:1,case:c,artifacts,custody:events,approvals,limitations:['System timestamps only','Local case hash chain; no external anchoring','Rendered captures may omit lazy-loaded content']},null,2),{name:'manifest.json'});
 zip.append(pdf,{name:'report.pdf'});
 zip.file(path.resolve('scripts/verify-bundle.js'),{name:'verify-bundle.mjs'});
 await zip.finalize();
}
