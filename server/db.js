import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash,scryptSync,randomBytes,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
if(fs.existsSync('.env')) process.loadEnvFile('.env');
export const production=process.env.NODE_ENV==='production';
export const demo=process.env.AEGIS_DEMO==='true'||(!production&&process.env.AEGIS_DEMO!=='false');
export const origin=process.env.APP_URL||'http://localhost:5173';
if(production&&(demo||new URL(origin).protocol!=='https:')) throw new Error('Production requires AEGIS_DEMO=false and an HTTPS APP_URL');
export const dataDir=path.resolve(process.env.DATA_DIR||'./data');
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
export const db=new DatabaseSync(path.join(dataDir,demo?'demo.sqlite':'aegis.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
db.exec([
'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,plan TEXT NOT NULL DEFAULT "pilot")',
'CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),expires INTEGER,kind TEXT)',
'CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),title TEXT,description TEXT,status TEXT,priority TEXT,created TEXT)',
'CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY,case_id TEXT REFERENCES cases(id),type TEXT,value TEXT,notes TEXT)',
'CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY,case_id TEXT REFERENCES cases(id),body TEXT,created TEXT)',
'CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY,case_id TEXT REFERENCES cases(id),name TEXT,mime TEXT,sha256 TEXT,size INTEGER,source TEXT,tags TEXT,created TEXT)',
'CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,case_id TEXT REFERENCES cases(id),url TEXT,state TEXT,sources TEXT,approval TEXT,results TEXT,errors TEXT,created TEXT)',
'CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT REFERENCES users(id),scope TEXT NOT NULL,json TEXT NOT NULL,previous TEXT NOT NULL,hash TEXT NOT NULL)',
'CREATE TRIGGER IF NOT EXISTS immutable_audit_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,"Audit events are append-only"); END',
'CREATE TRIGGER IF NOT EXISTS immutable_audit_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,"Audit events are append-only"); END',
'CREATE TABLE IF NOT EXISTS monitors (id TEXT PRIMARY KEY,case_id TEXT REFERENCES cases(id),url TEXT,interval_minutes INTEGER,enabled INTEGER,last_checked TEXT,last_hash TEXT,error TEXT)',
'CREATE TABLE IF NOT EXISTS billing_events (id TEXT PRIMARY KEY,created TEXT)'
].join(';'));
export const id=()=>randomUUID();
export const now=()=>new Date().toISOString();
export const sha=value=>createHash('sha256').update(value).digest('hex');
export const all=(sql,...params)=>db.prepare(sql).all(...params);
export const one=(sql,...params)=>db.prepare(sql).get(...params);
export const run=(sql,...params)=>db.prepare(sql).run(...params);
export function passwordHash(value){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(value,salt,64).toString('hex');}
export function passwordMatches(value,encoded){try{const [salt,digest]=encoded.split(':');const a=scryptSync(value,salt,64),b=Buffer.from(digest,'hex');return a.length===b.length&&timingSafeEqual(a,b);}catch{return false;}}
export function audit(owner,action,detail={}){
 const scope=detail.caseId||'account';
 const previous=one('SELECT hash FROM audit WHERE owner=? AND scope=? ORDER BY seq DESC LIMIT 1',owner,scope)?.hash||'0'.repeat(64);
 const json=JSON.stringify({id:id(),at:now(),action,detail});
 run('INSERT INTO audit(owner,scope,json,previous,hash) VALUES(?,?,?,?,?)',owner,scope,json,previous,sha(previous+'\n'+json));
}
export function auditCheck(owner,scope='account'){
 let previous='0'.repeat(64),count=0;
 for(const event of all('SELECT * FROM audit WHERE owner=? AND scope=? ORDER BY seq',owner,scope)){
  if(event.previous!==previous||event.hash!==sha(previous+'\n'+event.json))return {valid:false,count};
  previous=event.hash;count++;
 }
 return {valid:true,count,head:previous};
}
export function requireCase(owner,caseId){const c=one('SELECT * FROM cases WHERE id=? AND owner=?',caseId,owner);if(!c)throw Object.assign(new Error('Case not found'),{status:404});return c;}
let ownerEmail=process.env.OWNER_EMAIL,ownerPassword=process.env.OWNER_PASSWORD;
if(demo){
 if(!one('SELECT id FROM users WHERE id=?','training'))run('INSERT INTO users(id,email,password) VALUES(?,?,?)','training','training@local.invalid',passwordHash(randomBytes(32).toString('hex')));
 if(!one('SELECT id FROM cases WHERE owner=?','training')){
  const cid=id();run('INSERT INTO cases VALUES(?,?,?,?,?,?,?)',cid,'training','Training • Brand impersonation','Fictional training case. Add a public source to test the collection workflow.','active','high',now());
  run('INSERT INTO subjects VALUES(?,?,?,?,?)',id(),cid,'domain','example.com','Reserved example domain for training.');
  audit('training','case.created',{caseId:cid,title:'Training • Brand impersonation'});
 }
}else if(!one('SELECT id FROM users LIMIT 1')){
 if(!ownerEmail||!ownerPassword||ownerPassword.length<14)throw new Error('Set OWNER_EMAIL and OWNER_PASSWORD (at least 14 characters) to bootstrap the first account');
 run('INSERT INTO users(id,email,password) VALUES(?,?,?)',id(),ownerEmail.toLowerCase(),passwordHash(ownerPassword));
}
run("UPDATE jobs SET state='paused' WHERE state IN ('capturing','discovering')");
