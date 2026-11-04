import test from 'node:test';
import assert from 'node:assert/strict';
import {publicURL,isPublicIP,csvCell} from '../server/security.js';
test('private, mapped and reserved addresses are rejected',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.1','169.254.169.254','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fe80::1','224.0.0.1'])assert.equal(isPublicIP(ip),false,ip);
 assert.equal(isPublicIP('8.8.8.8'),true);assert.equal(isPublicIP('2606:4700:4700::1111'),true);
});
test('unsafe URL syntax, credentials and obfuscated loopback are rejected',()=>{
 for(const url of ['file:///etc/passwd','ftp://example.com','http://localhost','http://foo.local','http://2130706433','http://0x7f000001','http://[::1]','http://user:pass@example.com','https://example.com:8080'])assert.throws(()=>publicURL(url),undefined,url);
 assert.equal(publicURL('https://example.com/#fragment').href,'https://example.com/');
});
test('CSV protects spreadsheet cells and escapes quotes',()=>{
 assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('a"b'),'"a""b"');assert.equal(csvCell('@SUM(A1)'),'"\'@SUM(A1)"');
});
