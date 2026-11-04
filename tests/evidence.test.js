import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'aegis-evidence-'));
process.env.AEGIS_DEMO='true';
const {db,id,now,run,all,sha,audit,auditCheck}=await import('../server/db.js');
const {preserve,verify,originalPath,report}=await import('../server/evidence.js');
const {approve}=await import('../server/collection.js');
const cid=id();run('INSERT INTO cases VALUES(?,?,?,?,?,?,?)',cid,'training','Integrity test','','active','normal',now());
test('original-byte preservation detects modification and missing original',()=>{
 const a=preserve('training',cid,'test.txt','text/plain',Buffer.from('exact original bytes'),'https://example.com/');
 assert.equal(verify(a).valid,true);fs.chmodSync(originalPath(a.id),0o600);fs.appendFileSync(originalPath(a.id),'tamper');assert.equal(verify(a).valid,false);
 fs.unlinkSync(originalPath(a.id));assert.equal(verify(a).valid,false);
});
test('custody chains are append-only and scoped to a case',()=>{
 const other=id();run('INSERT INTO cases VALUES(?,?,?,?,?,?,?)',other,'training','Other','','active','normal',now());
 audit('training','note.added',{caseId:other,body:'private to other case'});audit('training','test.recorded',{caseId:cid});
 assert.equal(auditCheck('training',cid).valid,true);assert.equal(all('SELECT * FROM audit WHERE scope=?',cid).some(e=>e.json.includes('private to other case')),false);
 assert.throws(()=>run('UPDATE audit SET hash=? WHERE scope=?','tamper',cid),/append-only/);
 assert.throws(()=>run('DELETE FROM audit WHERE scope=?',cid),/append-only/);
});
test('approval is explicit, scoped, immutable and excludes failed sources',()=>{
 const jid=id(),sources=[{id:'a',url:'https://example.com/',via:'seed',status:200},{id:'b',url:'https://example.com/fail',via:'link',status:'error'}];
 run('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?)',jid,cid,'https://example.com/','review',JSON.stringify(sources),null,'[]','[]',now());
 assert.throws(()=>approve('training',jid,['b']));assert.throws(()=>approve('training',jid,['unknown']));
 const approval=approve('training',jid,['a']),{hash,...record}=approval;
 assert.equal(hash,sha(JSON.stringify(record)));assert.equal(approval.sources.length,1);assert.throws(()=>approve('training',jid,['a']));
});
test('PDF record is generated from the case',async()=>{const bytes=await report('training',cid);assert.equal(bytes.subarray(0,4).toString(),'%PDF');});
test.after(()=>{db.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});});
