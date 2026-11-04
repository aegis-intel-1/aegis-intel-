import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]||'.'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const sha=v=>createHash('sha256').update(v).digest('hex');
let failures=0;
for(const a of manifest.artifacts){
 try{if(!/^[a-f0-9-]{36}$/.test(a.id))throw new Error('Unsafe artifact ID');const body=fs.readFileSync(path.join(root,'originals',a.id));if(sha(body)!==a.sha256||body.length!==a.size)throw new Error('Hash or size mismatch');console.log('PASS',a.name);}
 catch(e){failures++;console.error('FAIL',a.name,e.message);}
}
let previous='0'.repeat(64);
for(const event of manifest.custody){
 if(event.previous!==previous||event.hash!==sha(previous+'\n'+event.json)){failures++;console.error('FAIL custody chain');break;}
 previous=event.hash;
}
for(const j of manifest.approvals){
 const a=JSON.parse(j.approval),{hash,...record}=a;
 if(sha(JSON.stringify(record))!==hash){failures++;console.error('FAIL approval manifest',j.id);}
}
console.log(manifest.artifacts.length+' originals, '+manifest.custody.length+' custody events; '+failures+' failures');
console.log('This checks internal consistency. It does not provide an independent timestamp or signature.');
process.exitCode=failures?1:0;
