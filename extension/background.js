let collecting=false;
async function workspace(path,body){
 const s=await chrome.storage.local.get(['aegisURL','aegisToken']);if(!s.aegisURL||!s.aegisToken)throw new Error('Pair the companion first');
 const r=await fetch(s.aegisURL+'/api'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+s.aegisToken,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const data=await r.json();if(!r.ok)throw new Error(data.error||'Workspace request failed');return data;
}
const encode=bytes=>{let binary='';const data=new Uint8Array(bytes);for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(binary);};
async function assertTab(tabId,url){const tab=await chrome.tabs.get(tabId),[active]=await chrome.tabs.query({active:true,lastFocusedWindow:true});if(tab.url!==url||active?.id!==tabId)throw new Error('Tab or URL changed; capture stopped');}
async function collect(message){
 if(collecting)throw new Error('A capture is already running');collecting=true;const {tabId,caseId}=message;let attached=false;
 try{
  const tab=await chrome.tabs.get(tabId),url=tab.url;if(!/^https?:\/\//.test(url))throw new Error('Only HTTP(S) pages supported');if(!caseId)throw new Error('Choose an investigation');await assertTab(tabId,url);
  if(message.action==='links'){
   const [{result}]=await chrome.scripting.executeScript({target:{tabId},func:()=>({url:location.href,title:document.title,links:[...document.querySelectorAll('a[href]')].map(a=>({url:a.href,text:a.innerText.slice(0,180)})).filter(a=>/^https?:/.test(a.url)).slice(0,20000),dates:[...document.querySelectorAll('time')].map(t=>({datetime:t.dateTime,text:t.innerText})).slice(0,500),warning:'Visible DOM inventory only; not an exhaustive historical timeline.'})});
   await assertTab(tabId,url);await workspace('/cases/'+caseId+'/import',{name:'browser-link-inventory.json',mime:'application/json',source:url,base64:encode(new TextEncoder().encode(JSON.stringify(result,null,2)))});
   return {message:'Visible link inventory preserved in the evidence vault.'};
  }
  if(message.expand)await chrome.scripting.executeScript({target:{tabId},func:async()=>{
   const pattern=/^(?:view|see|load|show)\s+(?:more|previous|all|\d+)\s+(?:comments|replies)/i;
   for(let pass=0;pass<4;pass++){const buttons=[...document.querySelectorAll('button,[role=button]')].filter(b=>pattern.test((b.innerText||'').trim())&&b.getBoundingClientRect().height>0).slice(0,20);if(!buttons.length)break;for(const b of buttons)b.click();await new Promise(r=>setTimeout(r,800));}
  }});
  await assertTab(tabId,url);await chrome.debugger.attach({tabId},'1.3');attached=true;
  const metrics=await chrome.debugger.sendCommand({tabId},'Page.getLayoutMetrics');if(metrics.cssContentSize.height>50000)throw new Error('Page exceeds the 50,000-pixel limit');
  const screenshot=await chrome.debugger.sendCommand({tabId},'Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:metrics.cssContentSize.width,height:metrics.cssContentSize.height,scale:1}});
  const archive=await chrome.pageCapture.saveAsMHTML({tabId});if(!archive)throw new Error('Chrome returned no MHTML');const mhtml=encode(await archive.arrayBuffer());await assertTab(tabId,url);
  const metadata={url,title:tab.title,at:new Date().toISOString(),height:metrics.cssContentSize.height,commentExpansionRequested:!!message.expand,warnings:['System time only','Lazy-loaded content may be absent','Comment expansion is best effort','Capture uses the investigator browser session']};
  for(const file of [{name:'browser-screenshot.png',mime:'image/png',base64:screenshot.data},{name:'browser-page.mhtml',mime:'multipart/related',base64:mhtml},{name:'browser-capture.json',mime:'application/json',base64:encode(new TextEncoder().encode(JSON.stringify(metadata,null,2)))}]){await assertTab(tabId,url);await workspace('/cases/'+caseId+'/import',{...file,source:url});}
  return {message:'PNG, MHTML, and metadata preserved. Verify and inspect the originals in the evidence vault.'};
 }finally{if(attached)await chrome.debugger.detach({tabId}).catch(()=>{});collecting=false;}
}
chrome.runtime.onMessage.addListener((message,_sender,respond)=>{(message.action==='cases'?workspace('/cases'):collect(message)).then(respond).catch(e=>respond({error:e.message}));return true;});
