import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import {HttpsProxyAgent} from 'https-proxy-agent';
export function isPublicIP(value){
 try{let address=ipaddr.parse(value);if(address.kind()==='ipv6'&&address.isIPv4MappedAddress())address=address.toIPv4Address();return address.range()==='unicast';}catch{return false;}
}
export function publicURL(value){
 const url=new URL(value);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port))throw new Error('Use a public HTTP(S) URL without credentials or custom ports');
 const hostname=url.hostname.replace(/^\[|\]$/g,'');
 if(hostname==='localhost'||hostname.endsWith('.localhost')||hostname.endsWith('.local')||(ipaddr.isValid(hostname)&&!isPublicIP(hostname)))throw new Error('Private and reserved destinations are blocked');
 url.hash='';return url;
}
export async function safeFetch(value,{maxBytes=8*1024*1024,redirects=5,headers={}}={}){
 const url=publicURL(value),host=url.hostname.replace(/^\[|\]$/g,'');
 const addresses=await dns.lookup(host,{all:true});
 if(!addresses.length||addresses.some(a=>!isPublicIP(a.address)))throw new Error('Destination resolves to a private or reserved address');
 const address=addresses[0],proxy=process.env.AEGIS_HTTPS_PROXY||process.env.HTTPS_PROXY;
 const target=new URL(url.href);
 if(proxy)target.hostname=address.family===6?'['+address.address+']':address.address;
 const result=await new Promise((resolve,reject)=>{
  const transport=url.protocol==='https:'?https:http;
  const req=transport.request(target,{
   method:'GET',servername:host,
   agent:proxy?new HttpsProxyAgent(proxy):undefined,
   lookup:(_hostname,_options,cb)=>cb(null,address.address,address.family),
   headers:{'user-agent':'AegisIntel/0.2 (investigator collection)','accept-encoding':'identity',...headers,host:url.host}
  },res=>{
   let size=0;const chunks=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){res.destroy();reject(new Error('Response exceeds byte limit'));}else chunks.push(chunk);});
   res.on('end',()=>resolve({url:url.href,status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
   res.on('error',reject);
  });
  req.setTimeout(15000,()=>req.destroy(new Error('Source request timed out')));
  req.on('error',reject);req.end();
 });
 if([301,302,303,307,308].includes(result.status)&&result.headers.location){
  if(redirects<=0)throw new Error('Redirect limit reached');
  return safeFetch(new URL(result.headers.location,url).href,{maxBytes,redirects:redirects-1,headers});
 }
 return result;
}
export const csvCell=value=>'"'+String(value??'').replace(/^[=+\-@\t\r]/,"'$&").replaceAll('"','""')+'"';
