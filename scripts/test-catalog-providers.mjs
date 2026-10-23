import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
// Load the small pure provider modules without a browser or an external test runtime.
const cache=new Map();
function load(path){path=resolve(path);if(cache.has(path))return cache.get(path);if(path.endsWith('.json'))return JSON.parse(readFileSync(path,'utf8'));const module={exports:{}};cache.set(path,module.exports);const js=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',js)(p=>load(resolve(dirname(path),p.endsWith('.json')?p:p+'.ts')),module,module.exports);cache.set(path,module.exports);return module.exports;}
const {parsePublisherBook}=load('lib/publisher-catalog.ts');
const {parseInventaire,parseOpenBD,supplementalBooks,extraPublisherURLs,extraTitleISBNs}=load('lib/supplemental-catalog.ts');
const {prhCover,parsePRHCovers}=load('lib/prh-covers.ts');
assert.equal(await prhCover('9782380710243'),null);
assert.equal(parsePRHCovers({isbns:[{'9781612620244':[]}]},'9781612620244'),null);
assert.equal(parsePRHCovers({isbns:[{'9781612620244':[{'700jpg':'https://images.penguinrandomhouse.com/cover/700jpg/9781612620244'}]}]},'9781612620244').source,'Penguin Random House');
assert.equal(parsePRHCovers({isbns:[{'9781612620244':[{'700jpg':'https://images.penguinrandomhouse.com/cover/700jpg/9781612620244'}]}]},'9781646516544'),null);
const {CATALOG_SOURCES}=load('lib/catalog-sources.ts');
assert.equal(CATALOG_SOURCES.length,10);assert.equal(new Set(CATALOG_SOURCES.map(s=>s.id)).size,10);
const isbn='9782811611699';
const script=data=>'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
const book={ '@type':'Book',name:'Titans T01',author:[{name:'Hajime Isayama'},{name:'Hajime Isayama'}],image:'https://media.hachette.fr/imgArticle/PIKA/2013/'+isbn+'-X.jpg',offers:{url:'https://www.pika.fr/livre/titans-'+isbn+'/'}};
const parsed=parsePublisherBook(script(book),isbn,'https://www.pika.fr/livre/titans-'+isbn+'/','Pika');
assert.equal(parsed.publisher,'Pika');assert.equal(parsed.author,'Hajime Isayama');assert.equal(parsePublisherBook(script(book),'9782380710243','https://www.pika.fr'),null);
const product={'@type':'Product',name:'Spy x Family - tome 1',isbn:'9782380710243'};
const html=script({'@graph':[product]})+script({'@type':'BreadcrumbList',itemListElement:[{name:'Kurokawa',item:'https://www.lisez.com/editeurs/kurokawa'},{name:'Tatsuya Endo',item:'https://www.lisez.com/auteurs/tatsuya-endo'}]})+'<meta property="og:image" content="https://img.lisez.com/9782380710243.jpg?a=1&amp;b=2">';
const lisez=parsePublisherBook(html,'9782380710243','https://www.lisez.com/livres/spy/9782380710243','Lisez / Kurokawa');
assert.equal(lisez.author,'Tatsuya Endo');assert.equal(lisez.publisher,'Kurokawa');assert.ok(lisez.cover.endsWith('a=1&b=2'));
const inv={entities:{a:{type:'edition',claims:{'wdt:P212':['978-2-8116-1169-9'],'wdt:P1476':['Titans T01']},image:{url:'/img/entities/known'}}}};
assert.equal(parseInventaire(inv,isbn).cover,'https://inventaire.io/img/entities/known');assert.equal(parseInventaire(inv,'9782380710243'),null);
const japanese='9784088725093';
assert.equal(parseOpenBD([{summary:{isbn:japanese,title:'One piece 巻1',pubdate:'199712'}}],japanese).date,'1997-12');assert.equal(parseOpenBD([null],japanese),null);assert.equal(parseOpenBD([{summary:{isbn:japanese,title:'One Piece'}}],isbn),null);
assert.ok(extraTitleISBNs('tani suzuki 1').includes('9782384961221'));assert.ok(extraPublisherURLs(isbn).some(p=>p.id==='pika'));
const originalFetch=globalThis.fetch,requests=[];
try{
 globalThis.fetch=async url=>{requests.push(url);if(url.startsWith('https://www.pika.fr'))throw Error('publisher temporarily unavailable');if(url.startsWith('https://www.hachette.fr'))return new Response(script(book));if(url.includes('inventaire.io'))return Response.json(inv);if(url.includes('openbd.jp'))return Response.json([{summary:{isbn:japanese,title:'One Piece 巻1'}}]);throw Error('Unexpected provider');};
 const french=await supplementalBooks(isbn);assert.ok(french.some(b=>b.source.startsWith('Hachette')));assert.ok(french.some(b=>b.source==='Inventaire'));assert.ok(!requests.some(u=>u.includes('openbd.jp')));
 const ja=await supplementalBooks(japanese);assert.ok(ja.some(b=>b.source.startsWith('openBD')));assert.ok(ja.every(b=>b.isbn===japanese));
 const before=requests.length;assert.deepEqual(await supplementalBooks('bad ISBN'),[]);assert.equal(requests.length,before);
}finally{globalThis.fetch=originalFetch;}
console.log('OK: ten sources, exact editions, publisher HTML/JSON-LD, community ISBN validation, Japanese routing and isolated provider failures.');
