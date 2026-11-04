import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aegis-auth-')),base='http://127.0.0.1:4324',origin='https://aegis.test';
const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATA_DIR:dir,AEGIS_DEMO:'false',NODE_ENV:'production',APP_URL:origin,PORT:'4324',HOST:'127.0.0.1',OWNER_EMAIL:'owner@example.test',OWNER_PASSWORD:'a-long-test-password-123',ALLOW_REGISTRATION:'true'},stdio:['ignore','pipe','pipe']});
let logs='';child.stderr.on('data',b=>logs+=b);child.stdout.on('data',b=>logs+=b);
async function request(url,method='GET',body,cookie,requestOrigin=origin){
 return fetch(base+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),Origin:requestOrigin},body:body?JSON.stringify(body):undefined});
}
test.before(async()=>{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}if(child.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,100));}
 throw new Error('Server startup timeout: '+logs);
});
test.after(async()=>{child.kill();await new Promise(r=>child.once('close',r));fs.rmSync(dir,{recursive:true,force:true});});
test('production auth rejects anonymous and cross-origin access; cookie flags are secure',async()=>{
 assert.equal((await request('/api/cases')).status,401);
 assert.equal((await request('/api/auth/login','POST',{email:'owner@example.test',password:'a-long-test-password-123'},null,'https://wrong.test')).status,403);
 const response=await request('/api/auth/login','POST',{email:'owner@example.test',password:'a-long-test-password-123'});
 assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
});
test('accounts are isolated and companion tokens revoke immediately',async()=>{
 const login=await request('/api/auth/login','POST',{email:'owner@example.test',password:'a-long-test-password-123'}),cookie=login.headers.get('set-cookie').split(';')[0];
 const c=await (await request('/api/cases','POST',{title:'Private owner case'},cookie)).json();
 assert.equal((await request('/api/auth/register','POST',{email:'other@example.test',password:'another-long-password-123'})).status,201);
 const otherLogin=await request('/api/auth/login','POST',{email:'other@example.test',password:'another-long-password-123'}),otherCookie=otherLogin.headers.get('set-cookie').split(';')[0];
 assert.equal((await request('/api/cases/'+c.id,'GET',null,otherCookie)).status,404);
 const token=await (await request('/api/pairing','POST',{},cookie)).json();
 assert.equal((await fetch(base+'/api/cases',{headers:{Authorization:'Bearer '+token.token}})).status,200);
 await request('/api/pairing','DELETE',{},cookie);
 assert.equal((await fetch(base+'/api/cases',{headers:{Authorization:'Bearer '+token.token}})).status,401);
});
