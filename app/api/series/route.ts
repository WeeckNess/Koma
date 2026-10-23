import {env} from 'cloudflare:workers';
import {searchBooks} from '../../../lib/catalog';
import {parsePublisherBook} from '../../../lib/publisher-catalog';
import glenat from '../../../lib/data/glenat-index.json';
import extra from '../../../lib/data/extra-publisher-index.json';
import {editionInfo,normalize} from '../../../lib/series';
import {rate} from '../../../lib/access';
import type {Book} from '../../../lib/books';
export const dynamic='force-dynamic';
const indexes=[{data:glenat,origin:'https://www.glenat.com',name:'Glénat'},{data:extra.sources.pika,origin:'https://www.pika.fr',name:'Pika'},{data:extra.sources.nobi,origin:'https://www.nobi-nobi.fr',name:'nobi nobi !'},{data:extra.sources.hachette,origin:'https://www.hachette.fr',name:'Hachette'}];
export async function GET(req:Request){
 if(!await rate(req,'series',40))return Response.json({error:'Réessayez dans une minute.'},{status:429});
 const params=new URL(req.url).searchParams,q=(params.get('q')||'').trim().slice(0,150),offset=Math.max(0,Math.min(1000,Math.floor(Number(params.get('offset'))||0)));
 if(q.length<2)return Response.json({error:'Précisez le titre de la série.'},{status:400});
 const words=normalize(q).split(' ').filter(w=>!['l','le','la','les','d','du','des','de','et','a'].includes(w));if(!words.length)return Response.json({error:'Précisez le nom de la série.'},{status:400});
 const unique=new Map<string,{isbn:string;path:string;origin:string;name:string}>();for(const source of indexes)for(const [isbn,path] of Object.entries(source.data)){const title=normalize(path.replace(/97[89]\d{10}/g,''));if(!unique.has(isbn)&&words.every(w=>title.includes(w)))unique.set(isbn,{isbn,path,origin:source.origin,name:source.name})}
 const entries=[...unique.values()].sort((a,b)=>{const number=(s:string)=>Number(s.match(/(?:tome-|vol-|[/-]t)(\d+)/i)?.[1]||99999);return number(a.path)-number(b.path)||a.path.localeCompare(b.path,'fr',{numeric:true})});
 const page=entries.slice(offset,offset+12),books:Book[]=[],failed:string[]=[];let cursor=0;
 await Promise.all([0,1,2].map(async()=>{while(cursor<page.length){const entry=page[cursor++];try{const key='series-edition:v1:'+entry.isbn;const cached:any=await env.DB!.prepare('SELECT data,expires FROM catalog_cache WHERE key=?').bind(key).first();if(cached?.expires>Date.now()){books.push(JSON.parse(cached.data));continue}const response=await fetch(entry.origin+entry.path,{signal:AbortSignal.timeout(5500)});if(!response.ok)throw Error();const book=parsePublisherBook(await response.text(),entry.isbn,entry.origin+entry.path,entry.name,entry.name);if(!book)throw Error();books.push(book);await env.DB!.prepare('INSERT INTO catalog_cache (key,data,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind(key,JSON.stringify(book),Date.now()+86400000).run()}catch{failed.push(entry.isbn)}}}));
 if(!entries.length){try{books.push(...await searchBooks(q))}catch{}}
 books.sort((a,b)=>(editionInfo(a).volume??1e9)-(editionInfo(b).volume??1e9)||a.title.localeCompare(b.title,'fr',{numeric:true}));
 return Response.json({books,next:offset+12<entries.length?offset+12:null,indexed:entries.length,failed,notice:'Seules les éditions dont la fiche a été retrouvée sont proposées. Le catalogue peut être incomplet.'},{headers:{'Cache-Control':'public, max-age=300'}});
}
