import {env} from 'cloudflare:workers';
import {canonicalISBN,featured} from '../../../lib/books';
import verified from '../../../lib/data/verified-editions.json';
import {publisherBook} from '../../../lib/publisher-catalog';
import {supplementalBooks} from '../../../lib/supplemental-catalog';
import {prhCover} from '../../../lib/prh-covers';
import {CATALOG_SOURCES} from '../../../lib/catalog-sources';
import {rate} from '../../../lib/access';
import {usableCover,coverScore} from '../../../lib/cover-policy';
import {bnfCover,CoverCandidate} from '../../../lib/cover-sources';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const isbn=canonicalISBN(new URL(req.url).searchParams.get('isbn')||'');
 if(!isbn)return Response.json({error:'ISBN invalide.'},{status:400});
 const key='covers:v5:'+isbn;
 const cache:any=await env.DB!.prepare('SELECT data,expires FROM catalog_cache WHERE key=?').bind(key).first();
 if(cache&&cache.expires>Date.now())return Response.json(JSON.parse(cache.data),{headers:{'Cache-Control':'public, max-age=3600'}});
 if(!await rate(req,'covers',60))return Response.json({error:'Réessayez dans un instant.'},{status:429});
 const candidates:CoverCandidate[]=[];
 const add=(url:string|null|undefined,source:string)=>{if(url&&usableCover(url)&&(/^(https:\/\/|\/[a-z0-9-]+\.jpg$)/i.test(url))&&!candidates.some(c=>c.url===url))candidates.push({url,source})};
 const known=[...featured,...verified].find(b=>b.isbn===isbn);add(known?.cover,'Catalogue Koma');
 candidates.push(bnfCover(isbn));
 const results=await Promise.allSettled([
  supplementalBooks(isbn),
  publisherBook(isbn),
  (async()=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);try{const r=await fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:'+isbn+'&maxResults=5',{signal:controller.signal});if(!r.ok)return [];const d:any=await r.json();return (d.items||[]).filter((x:any)=>x.volumeInfo?.industryIdentifiers?.some((id:any)=>canonicalISBN(id.identifier||'')===isbn)).flatMap((x:any)=>['extraLarge','large','medium','thumbnail','smallThumbnail'].map(size=>x.volumeInfo?.imageLinks?.[size])).filter((url:any)=>typeof url==='string').map((url:any)=>url.replace(/^http:/,'https:')) as string[]}finally{clearTimeout(timer)}})(),
  (async()=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);try{const key='ISBN:'+isbn;const r=await fetch('https://openlibrary.org/api/books?bibkeys='+key+'&format=json&jscmd=data',{signal:controller.signal});if(!r.ok)return null;const d:any=await r.json();return d[key]?.cover?.large||d[key]?.cover?.medium||null}finally{clearTimeout(timer)}})(),
  prhCover(isbn)
 ]);
 if(results[0].status==='fulfilled')for(const book of results[0].value)add(book.cover,book.source);
 if(results[1].status==='fulfilled')add(results[1].value?.cover,'Glénat');
 if(results[2].status==='fulfilled')for(const url of results[2].value||[])add(url,'Google Books');
 if(results[3].status==='fulfilled')add(results[3].value,'Open Library · édition');
 if(results[4].status==='fulfilled'&&results[4].value)add(results[4].value.url,results[4].value.source);
 add('https://covers.openlibrary.org/b/isbn/'+isbn+'-L.jpg?default=false','Open Library');
 candidates.sort((a,b)=>coverScore(a.url)-coverScore(b.url));
 const value={isbn,candidates,sources:CATALOG_SOURCES};
 await env.DB!.prepare('INSERT INTO catalog_cache (key,data,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind(key,JSON.stringify(value),Date.now()+3600000).run();
 return Response.json(value,{headers:{'Cache-Control':'public, max-age=3600'}});
}
