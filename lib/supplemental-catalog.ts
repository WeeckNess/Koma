import {Book,canonicalISBN} from './books';
import {parsePublisherBook} from './publisher-catalog';
import index from './data/extra-publisher-index.json';

const publishers = [
 {id:'pika',origin:'https://www.pika.fr',name:'Pika',publisher:'Pika'},
 {id:'nobi',origin:'https://www.nobi-nobi.fr',name:'nobi nobi !',publisher:'nobi nobi !'},
 {id:'hachette',origin:'https://www.hachette.fr',name:'Hachette',publisher:''},
] as const;
const indexes:Record<string,Record<string,string>>=index.sources;
async function get(url:string,format:'json'|'text'='json'):Promise<any>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('Catalogue '+new URL(url).hostname+' : HTTP '+r.status);return format==='json'?await r.json():await r.text()}finally{clearTimeout(timer)}
}
export function extraPublisherURLs(isbn:string){
 return publishers.flatMap(p=>indexes[p.id][isbn]?[{...p,url:p.origin+indexes[p.id][isbn]}]:[]);
}
export function extraTitleISBNs(query:string){
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const words=normalize(query).split(' ').filter(Boolean);if(!words.length)return [];
 const unique=new Set<string>();
 // Avoid returning the same edition once per distributor.
 for(const p of publishers)for(const [isbn,path] of Object.entries(indexes[p.id])){
  const tokens=normalize(path.replace(/97[89]\d{10}/g,'')).split(' ');
  if(words.every(word=>tokens.some(token=>token===word||(/^\d+$/.test(word)&&Number(token.replace(/^t(?=\d)/,''))===Number(word)))))unique.add(isbn);
  if(unique.size>=6)return [...unique];
 }
 return [...unique];
}
export function parseInventaire(data:any,isbn:string):Book|null{
 const entities=Object.values(data?.entities||{}) as any[];
 const entity=entities.find(e=>e.type==='edition'&&[...(e.claims?.['wdt:P212']||[]),...(e.claims?.['wdt:P957']||[])].some(id=>canonicalISBN(id)===isbn));
 if(!entity)return null;
 const title=entity.claims?.['wdt:P1476']?.[0]||entity.labels?.fr||entity.labels?.fromclaims;
 if(typeof title!=='string'||!title)return null;
 const image=entity.image?.url||'';
 const cover=image.startsWith('/img/entities/')?'https://inventaire.io'+image:image.startsWith('https://inventaire.io/img/')?image:'';
 return {isbn,title,author:'',publisher:'',date:entity.claims?.['wdt:P577']?.[0]||'',description:'',cover,language:entity.originalLang||'',source:'Inventaire',sourceUrl:'https://inventaire.io/entity/isbn:'+isbn,checkedAt:new Date().toISOString().slice(0,10)};
}
export function parseOpenBD(data:any,isbn:string):Book|null{
 const s=Array.isArray(data)?data.find(x=>canonicalISBN(x?.summary?.isbn||'')===isbn)?.summary:null;
 if(!s?.title)return null;
 const rawDate=String(s.pubdate||'');const date=/^\d{8}$/.test(rawDate)?rawDate.slice(0,4)+'-'+rawDate.slice(4,6)+'-'+rawDate.slice(6):/^\d{6}$/.test(rawDate)?rawDate.slice(0,4)+'-'+rawDate.slice(4):'';
 return {isbn,title:s.title,author:s.author||'',publisher:s.publisher||'',date,cover:typeof s.cover==='string'&&s.cover.startsWith('https://')?s.cover:'',description:'',language:'ja',source:'openBD · édition japonaise',sourceUrl:'https://www.hanmoto.com/bd/isbn/'+isbn,checkedAt:new Date().toISOString().slice(0,10)};
}
export async function supplementalBooks(isbn:string):Promise<Book[]>{
 if(canonicalISBN(isbn)!==isbn)return [];
 const jobs:Promise<Book|null>[] = extraPublisherURLs(isbn).map(async p=>parsePublisherBook(await get(p.url,'text'),isbn,p.url,p.name,p.publisher));
 jobs.push(get('https://inventaire.io/api/entities/by-uris?uris=isbn:'+isbn+'&lang=fr').then(d=>parseInventaire(d,isbn)));
 // Japanese ISBN registration group only; never substitute a Japanese volume for a French ISBN.
 if(/^(9784|9794)/.test(isbn))jobs.push(get('https://api.openbd.jp/v1/get?isbn='+isbn).then(d=>parseOpenBD(d,isbn)));
 const results=await Promise.allSettled(jobs);
 for(const r of results)if(r.status==='rejected')console.warn('Catalogue complémentaire indisponible',r.reason instanceof Error?r.reason.message:'Erreur de réponse');
 return results.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]);
}
