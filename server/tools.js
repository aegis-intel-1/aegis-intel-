import dns from 'node:dns/promises';
import {createHash} from 'node:crypto';
import {safeFetch,publicURL} from './security.js';
export const catalog=[
 ['dns','DNS records','Infrastructure'],['rdap','Domain registration','Infrastructure'],['ct','Certificate transparency','Infrastructure'],['domain-workflow','DNS + RDAP + CT','Workflows'],
 ['ip','IP registration','Infrastructure'],['url','URL and response headers','Infrastructure'],['username','Username candidates','Identity'],
 ['headers','Email header parser','Utilities'],['timestamp','Timestamp and snowflake','Utilities'],['jwt','JWT claims (unverified)','Utilities'],['encoding','Base64 / URL decoding','Utilities'],['hash','SHA-256 text digest','Utilities'],['phone','Phone normalization','Identity'],
 ['github','GitHub public profile','Public sources'],['cve','CVE record','Public sources'],['bitcoin','Bitcoin address summary','Public sources'],
 ['hibp','Have I Been Pwned','Providers','HIBP_API_KEY'],['shodan','Shodan host','Providers','SHODAN_API_KEY'],
 ['pdl','People Data Labs','Providers','implementation required'],['records','Court / property / vehicle records','Providers','licensed jurisdiction adapters required'],
 ['reverse-image','Reverse image search','Providers','provider adapter required'],['geolocation','IP geolocation and reputation','Providers','provider adapter required']
].map(([id,name,category,requirement])=>({id,name,category,requirement:requirement||null,available:!requirement||(requirement.endsWith('_API_KEY')&&!!process.env[requirement])}));
const json=async url=>{const r=await safeFetch(url);if(r.status<200||r.status>=300)throw new Error('Source returned HTTP '+r.status);return JSON.parse(r.body.toString());};
const domain=value=>{const host=value.includes('://')?new URL(value).hostname:value.toLowerCase();if(!/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/i.test(host))throw new Error('Enter a domain name');return host;};
export async function execute(tool,input){
 const value=String(input||'').trim();if(!value||value.length>20000)throw new Error('Input must contain 1 to 20,000 characters');
 const item=catalog.find(t=>t.id===tool);if(!item?.available)throw new Error(item?.requirement||'Unknown tool');
 const started=new Date().toISOString();let data,source='Local analysis';
 switch(tool){
 case 'dns':{const host=domain(value);data={};for(const type of ['A','AAAA','MX','NS','TXT','CNAME']){try{data[type]=await dns.resolve(host,type);}catch(e){data[type]={error:e.code};}}source='DNS resolver';break;}
 case 'rdap':source='https://rdap.org/domain/'+encodeURIComponent(domain(value));data=await json(source);break;
 case 'ct':source='https://crt.sh/?q='+encodeURIComponent(domain(value))+'&output=json';data=(await json(source)).slice(0,500);break;
 case 'ip':source='https://rdap.org/ip/'+encodeURIComponent(value);data=await json(source);break;
 case 'domain-workflow':data=await Promise.all(['dns','rdap','ct'].map(async name=>{try{return await execute(name,value);}catch(e){return {tool:name,error:e.message};}}));break;
 case 'url':{const r=await safeFetch(publicURL(value).href);source=r.url;data={status:r.status,headers:r.headers,bytes:r.body.length};break;}
 case 'username':{
  if(!/^[a-zA-Z0-9._-]{1,60}$/.test(value))throw new Error('Enter a username without spaces');
  const providers=[['GitHub','https://github.com/'],['Reddit','https://www.reddit.com/user/'],['Instagram','https://www.instagram.com/'],['X','https://x.com/'],['TikTok','https://www.tiktok.com/@'],['YouTube','https://www.youtube.com/@'],['Pinterest','https://www.pinterest.com/'],['Medium','https://medium.com/@'],['Twitch','https://www.twitch.tv/'],['GitLab','https://gitlab.com/'],['Hacker News','https://news.ycombinator.com/user?id='],['Keybase','https://keybase.io/']];
  data=await Promise.all(providers.map(async([platform,base])=>{const url=base+encodeURIComponent(value);try{const r=await safeFetch(url,{maxBytes:2*1024*1024});return {platform,url,status:r.status,observation:r.status===200?'Candidate URL responds; identity and account existence unconfirmed':'Inconclusive HTTP response'};}catch(e){return {platform,url,observation:'Inconclusive',error:e.message};}}));break;
 }
 case 'headers':data={headers:value.replace(/\r?\n[ \t]+/g,' ').split(/\r?\n/).filter(line=>/^[\w-]+:/.test(line)),warning:'Header claims are untrusted; SPF/DKIM signatures have not been verified.'};break;
 case 'timestamp':{let n=Number(value);if(!Number.isFinite(n))throw new Error('Numeric timestamp required');data={seconds:new Date(n*1000).toString(),milliseconds:new Date(n).toString()};try{data.twitterSnowflake=new Date(Number((BigInt(value)>>22n)+1288834974657n)).toISOString();}catch{}break;}
 case 'jwt':{const parts=value.split('.');if(parts.length!==3)throw new Error('JWT must have three sections');data={header:JSON.parse(Buffer.from(parts[0],'base64url')),claims:JSON.parse(Buffer.from(parts[1],'base64url')),verified:false,warning:'No signature verification; do not trust these claims.'};break;}
 case 'encoding':{data={base64:Buffer.from(value).toString('base64'),base64Decoded:Buffer.from(value,'base64').toString('utf8')};try{data.urlDecoded=decodeURIComponent(value);}catch{data.urlDecoded='Invalid URL encoding';}break;}
 case 'hash':data={sha256:createHash('sha256').update(value).digest('hex'),bytes:Buffer.byteLength(value)};break;
 case 'phone':{const normalized=value.replace(/[^\d+]/g,'');data={normalized,validE164Shape:/^\+[1-9]\d{7,14}$/.test(normalized),warning:'Formatting only; no subscriber, carrier or ownership assertion.'};break;}
 case 'github':source='https://api.github.com/users/'+encodeURIComponent(value);data=await json(source);break;
 case 'cve':if(!/^CVE-\d{4}-\d{4,}$/i.test(value))throw new Error('Use a CVE identifier');source='https://cveawg.mitre.org/api/cve/'+value.toUpperCase();data=await json(source);break;
 case 'bitcoin':if(!/^(?:bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(value))throw new Error('Invalid Bitcoin address shape');source='https://blockstream.info/api/address/'+value;data=await json(source);break;
 case 'hibp':{source='https://haveibeenpwned.com/api/v3/breachedaccount/'+encodeURIComponent(value);const r=await safeFetch(source,{headers:{'hibp-api-key':process.env.HIBP_API_KEY}});if(r.status===404)data=[];else if(r.status===200)data=JSON.parse(r.body);else throw new Error('HIBP returned '+r.status);break;}
 case 'shodan':{source='https://api.shodan.io/shodan/host/'+encodeURIComponent(value);data=await json(source+'?key='+encodeURIComponent(process.env.SHODAN_API_KEY));break;}
 default:throw new Error('Adapter not implemented');
 }
 return {tool,input:value,source,started,completed:new Date().toISOString(),data};
}
