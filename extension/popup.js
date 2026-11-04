const el=id=>document.getElementById(id);
const status=message=>el('status').textContent=message;
chrome.storage.local.get(['aegisURL','aegisToken']).then(s=>{el('url').value=s.aegisURL||'http://localhost:5173';el('token').value=s.aegisToken||'';});
el('connect').addEventListener('click',async()=>{
 try{
  const url=new URL(el('url').value);if(!['https:','http:'].includes(url.protocol))throw new Error('Use an HTTP(S) workspace URL');
  if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Remote workspaces must use HTTPS');
  const allowed=await chrome.permissions.request({origins:[url.origin+'/*']});if(!allowed)throw new Error('Workspace permission denied');
  await chrome.storage.local.set({aegisURL:url.origin,aegisToken:el('token').value.trim()});
  const result=await chrome.runtime.sendMessage({action:'cases'});if(result.error)throw new Error(result.error);
  el('case').replaceChildren();for(const c of result){const option=document.createElement('option');option.value=c.id;option.textContent=c.title;el('case').append(option);}
  el('capture').disabled=!result.length;el('links').disabled=!result.length;status('Connected. Select an investigation before capturing.');
 }catch(e){status(e.message);}
});
for(const action of ['capture','links'])el(action).addEventListener('click',async()=>{
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.url)throw new Error('Open a source tab');
  const source=new URL(tab.url);if(!['https:','http:'].includes(source.protocol))throw new Error('Only HTTP(S) pages are supported');
  const allowed=await chrome.permissions.request({origins:[source.origin+'/*']});if(!allowed)throw new Error('Source permission denied');
  el('capture').disabled=true;el('links').disabled=true;status('Working. Keep the source tab active…');
  const result=await chrome.runtime.sendMessage({action,tabId:tab.id,caseId:el('case').value,expand:el('comments').checked});if(result.error)throw new Error(result.error);status(result.message);
 }catch(e){status(e.message);}finally{el('capture').disabled=false;el('links').disabled=false;}
});
