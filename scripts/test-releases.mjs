import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
// Load the small pure provider modules without a browser or an external test runtime.
const cache=new Map();
function load(path){path=resolve(path);if(cache.has(path))return cache.get(path);if(path.endsWith('.json'))return JSON.parse(readFileSync(path,'utf8'));const module={exports:{}};cache.set(path,module.exports);const js=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',js)(p=>load(resolve(dirname(path),p.endsWith('.json')?p:p+'.ts')),module,module.exports);cache.set(path,module.exports);return module.exports;}
const {RELEASE_PUBLISHERS,parseReleasePage,upcomingOnly,validDay,releaseMonths,calendarURL,parisDay}=load('lib/release-feed.ts');
const {loadReleaseFeed}=load('lib/releases-service.ts');
const p=RELEASE_PUBLISHERS[1],today='2026-10-20',isbn='9782344071137';
const row=(date='2026-11-04',path='/livre/one-piece-9782344071137',cover='imgArticle/PIKA/2026/9782344071137-001-X.jpeg')=>({path:[path],product__date_parution__date:[date],decoupled_render:[JSON.stringify({ean:isbn,titre_de_couverture:'One Piece T114',format:['Papier'],image_de_couverture:{uri:cover},publisher:{label:'Pika'}})]});
const html=(rows=[],pages=1)=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{sections:[{data:{schedule:true,prefilter_results:rows,pageMax:pages}}]}}})+'</script>';
const parsed=parseReleasePage(html([row()]),p,'2026-11',1,today);assert.equal(parsed.books.length,1);assert.equal(parsed.books[0].isbn,isbn);assert.match(parsed.books[0].cover,/media.hachette.fr/);assert.equal(new URL(parsed.books[0].cover).searchParams.get('source'),'web');
for(const bad of [row('2026-11-31'),row('2026-10-04'),row('2026-11-04','/livre/incorrect-9782344058831'),row('2026-11-04','https://evil.example/livre/one-piece-'+isbn)])assert.equal(parseReleasePage(html([bad]),p,'2026-11').books.length,0);
assert.equal(parseReleasePage(html([row(undefined,undefined,'/images/placeholders/pika/cover.png')]),p,'2026-11').books[0].cover,'');
assert.throws(()=>parseReleasePage('<h1>Unavailable</h1>',p,'2026-11'));
assert.equal(validDay('2026-02-29'),false);assert.equal(validDay('2028-02-29'),true);assert.equal(validDay('2026'),false);
assert.equal(parisDay(new Date('2026-10-20T22:30:00Z')),'2026-10-21');assert.deepEqual(releaseMonths('2026-12-31'),['2026-12','2027-01','2027-02']);assert.equal(calendarURL(p,'2026-10',1,today),'https://www.pika.fr/planning-sorties/');
const book=parsed.books[0];assert.equal(upcomingOnly([book,{...book,date:'2026-10-01',isbn:'9782344058831'}],today).length,1);assert.equal(upcomingOnly([book,{...book,date:'2026-12-02',checkedAt:'2026-10-21'}],today)[0].date,'2026-12-02');
const memory=()=>{const data=new Map();return {data,get:async key=>data.get(key)||null,set:async(key,value,expires)=>{data.set(key,{data:value,expires})}}};
const store=memory();let calls=0;const good=async url=>{calls++;return new Response(html(String(url).includes('pika.fr')&&String(url).includes('2026-11')?[row()]:[]))};
const feed=await loadReleaseFeed(store,good,today);assert.equal(feed.books.length,1);assert.equal(feed.stale,false);assert.equal(calls,9);await loadReleaseFeed(store,good,today);assert.equal(calls,9,'combined cache prevents repeated requests');
for(const value of store.data.values())value.expires=0;
const failed=await loadReleaseFeed(store,async()=>{throw Error('Publisher outage')},today);assert.equal(failed.stale,true);assert.equal(failed.books[0].isbn,isbn,'outage preserves last verified edition');
for(const value of store.data.values())value.expires=0;
const cancelled=await loadReleaseFeed(store,async()=>new Response(html()),today);assert.equal(cancelled.books.length,0,'successful empty planning removes withdrawn announcements');
const fallback=await loadReleaseFeed(memory(),async()=>{throw Error('Offline')},today);assert.ok(fallback.books.length>50);assert.ok(fallback.books.every(b=>validDay(b.date)&&b.date>=today&&b.sourceUrl.startsWith('https://www.')));
console.log('OK: exact ISBN/date validation, official front covers, Paris timezone, month rollover, publisher outages, cache, cancellations and bundled fallback.');
