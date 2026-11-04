import * as cheerio from 'cheerio';
import {chromium} from 'playwright';
import {safeFetch,publicURL} from './security.js';
import {id,now,sha,all,one,run,audit,requireCase} from './db.js';
import {preserve} from './evidence.js';
const active=new Set();
export function intelligence(html,url){
 const $=cheerio.load(html),text=$.text();
 return {source:url,emails:[...new Set(text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)||[])].slice(0,100),phones:[...new Set(text.match(/\+?\d[\d\s().-]{8,}\d/g)||[])].slice(0,60),
 documents:$('a[href]').map((_i,e)=>$(e).attr('href')).get().filter(x=>/\.(pdf|docx?|xlsx?|csv)(?:$|\?)/i.test(x)).slice(0,100),
 social:$('a[href]').map((_i,e)=>$(e).attr('href')).get().filter(x=>/https?:\/\/(?:www\.)?(facebook|instagram|linkedin|x|twitter|youtube|tiktok)\.com/i.test(x)).slice(0,100),
 tracking:[...new Set(html.match(/\b(?:G-[A-Z0-9]{6,}|GTM-[A-Z0-9]+|UA-\d+-\d+)\b/g)||[])],
 title:$('title').text().trim(),generator:$('meta[name=generator]').attr('content')||null};
}
export async function discover(owner,caseId,url,limit=100){
 requireCase(owner,caseId);const root=publicURL(url);limit=Math.min(20000,Math.max(1,Number(limit)||100));
 const job={id:id(),case_id:caseId,url:root.href,state:'discovering',sources:'[]',approval:null,results:'[]',errors:'[]',created:now()};
 run('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?)',...Object.values(job));
 audit(owner,'discovery.started',{caseId,jobId:job.id,url:root.href,limit});
 void crawl(owner,job,root,limit);return job;
}
async function crawl(owner,job,root,limit){
 const pending=[{url:root.href,via:'seed'}],seen=new Set(),sources=[],errors=[];
 const enqueue=(value,via)=>{try{const url=publicURL(new URL(value,root).href);if(url.origin===root.origin&&!seen.has(url.href)&&pending.length+seen.size<limit*4)pending.push({url:url.href,via});}catch{}};
 try{
  for(const pathname of ['/sitemap.xml','/robots.txt']){
   try{const r=await safeFetch(new URL(pathname,root).href,{maxBytes:2*1024*1024});if(r.status!==200)continue;
    const body=r.body.toString();
    if(pathname.endsWith('.xml')){const $=cheerio.load(body,{xmlMode:true});$('loc').each((_i,e)=>enqueue($(e).text(),'sitemap'));}
    else for(const match of body.matchAll(/^(?:Allow|Disallow):\s*(\/[^\s*]*)/gmi)){const u=new URL(match[1],root).href;sources.push({id:id(),url:u,via:'robots lead',status:'unvisited',selected:false});}
   }catch(e){errors.push({url:pathname,error:e.message});}
  }
  while(pending.length&&seen.size<limit){
   const state=one('SELECT state FROM jobs WHERE id=?',job.id)?.state;if(state!=='discovering')break;
   const batch=[];
   while(pending.length&&batch.length<8&&seen.size<limit){const item=pending.shift();if(seen.has(item.url))continue;seen.add(item.url);batch.push(item);}
   await Promise.all(batch.map(async item=>{
    try{const r=await safeFetch(item.url);if(new URL(r.url).origin!==root.origin)throw new Error('Redirect left approved origin');
     const source={id:id(),url:r.url,via:item.via,status:r.status,selected:r.status>=200&&r.status<300};
     if(String(r.headers['content-type']).includes('html')){
      const html=r.body.toString(),$=cheerio.load(html);source.intelligence=intelligence(html,r.url);source.title=source.intelligence.title;
      $('a[href]').each((_i,e)=>{try{enqueue(new URL($(e).attr('href'),r.url).href,'link from '+r.url);}catch{}});
     }else if(String(r.headers['content-type']).includes('xml')){const $=cheerio.load(r.body.toString(),{xmlMode:true});$('loc').each((_i,e)=>enqueue($(e).text(),'sitemap index'));}
     sources.push(source);
    }catch(e){sources.push({id:id(),url:item.url,via:item.via,status:'error',error:e.message,selected:false});errors.push({url:item.url,error:e.message});}
   }));
   run('UPDATE jobs SET sources=?,errors=? WHERE id=?',JSON.stringify(sources),JSON.stringify(errors),job.id);
  }
 }catch(e){errors.push({error:e.message});}
 run("UPDATE jobs SET state='review',sources=?,errors=? WHERE id=?",JSON.stringify(sources),JSON.stringify(errors),job.id);
 audit(owner,'discovery.completed',{caseId:job.case_id,jobId:job.id,sources:sources.length,errors:errors.length,limitReached:seen.size>=limit});
}
export function approve(owner,jobId,selectedIds){
 const job=one('SELECT * FROM jobs WHERE id=?',jobId);if(!job)throw new Error('Job not found');requireCase(owner,job.case_id);
 if(job.state!=='review'||job.approval)throw new Error('Job is not awaiting approval');
 const sources=JSON.parse(job.sources),selected=sources.filter(s=>selectedIds.includes(s.id)&&s.status!=='error');
 if(!selected.length||selected.length!==new Set(selectedIds).size)throw new Error('Select available sources from this discovery');
 const record={jobId,caseId:job.case_id,owner,at:now(),sources:selected.map(s=>({id:s.id,url:s.url,via:s.via}))};
 const approval={...record,hash:sha(JSON.stringify(record))};run("UPDATE jobs SET state='approved',approval=? WHERE id=?",JSON.stringify(approval),jobId);
 audit(owner,'collection.approved',{caseId:job.case_id,jobId,hash:approval.hash,count:selected.length});return approval;
}
export async function capture(owner,caseId,url){
 const normalized=publicURL(url).href;
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:false});
  await context.routeWebSocket('**/*',socket=>socket.close());
  await context.route('**/*',async route=>{
   const req=route.request();if(!['GET','HEAD'].includes(req.method()))return route.abort();
   try{const r=await safeFetch(req.url(),{maxBytes:15*1024*1024});const headers={};for(const k of ['content-type','content-encoding'])if(r.headers[k])headers[k]=String(r.headers[k]);await route.fulfill({status:r.status,headers,body:r.body});}
   catch{await route.abort();}
  });
  const page=await context.newPage();await page.goto(normalized,{waitUntil:'domcontentloaded',timeout:45000});
  const before=publicURL(page.url()).href;if(before!==normalized)throw new Error('Source changed URL during capture; discover the final URL first');
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);if(height>50000)throw new Error('Page exceeds the 50,000-pixel capture limit');
  const png=await page.screenshot({fullPage:true,timeout:30000});
  const html=await page.content(),cdp=await context.newCDPSession(page),mhtml=await cdp.send('Page.captureSnapshot',{format:'mhtml'});
  if(publicURL(page.url()).href!==before)throw new Error('URL changed during collection');
  const metadata={url:before,title:await page.title(),capturedAt:now(),viewport:{width:1440,height:1000},height,warnings:['System clock only','Lazy-loaded, dynamic, blocked or offscreen content may be incomplete','No authenticated investigator session used']};
  return [
   preserve(owner,caseId,'screenshot.png','image/png',png,before),
   preserve(owner,caseId,'page.mhtml','multipart/related',Buffer.from(mhtml.data),before),
   preserve(owner,caseId,'rendered.html','text/html',Buffer.from(html),before),
   preserve(owner,caseId,'capture.json','application/json',Buffer.from(JSON.stringify(metadata,null,2)),before)
  ];
 }finally{await browser.close();}
}
export function startCapture(owner,jobId){
 const job=one('SELECT * FROM jobs WHERE id=?',jobId);if(!job)throw new Error('Job not found');requireCase(owner,job.case_id);
 if(!job.approval||!['approved','paused','stopped'].includes(job.state)||active.has(jobId))throw new Error('Job is not ready to start');
 const approval=JSON.parse(job.approval),{hash,...record}=approval;
 if(sha(JSON.stringify(record))!==hash)throw new Error('Approval manifest integrity failed');
 run("UPDATE jobs SET state='capturing' WHERE id=?",jobId);active.add(jobId);
 audit(owner,'capture.started',{caseId:job.case_id,jobId});
 void (async()=>{
  const results=JSON.parse(job.results);
  try{
   for(const source of approval.sources){
    if(results.some(r=>r.sourceId===source.id))continue;
    if(one('SELECT state FROM jobs WHERE id=?',jobId).state!=='capturing')break;
    try{const artifacts=await capture(owner,job.case_id,source.url);results.push({sourceId:source.id,url:source.url,status:'captured',artifacts:artifacts.map(a=>a.id)});}
    catch(e){results.push({sourceId:source.id,url:source.url,status:'failed',error:e.message});}
    run('UPDATE jobs SET results=? WHERE id=?',JSON.stringify(results),jobId);
   }
   if(one('SELECT state FROM jobs WHERE id=?',jobId).state==='capturing')run("UPDATE jobs SET state='complete' WHERE id=?",jobId);
   audit(owner,'capture.reconciled',{caseId:job.case_id,jobId,approved:approval.sources.length,captured:results.filter(r=>r.status==='captured').length,failed:results.filter(r=>r.status==='failed').length});
  }finally{active.delete(jobId);}
 })();
}
