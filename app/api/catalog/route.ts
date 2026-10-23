import {env} from 'cloudflare:workers';
import {GET as releaseFeed} from '../releases/route';
import {searchBooks} from '../../../lib/catalog';
import {rate} from '../../../lib/access';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const url=new URL(req.url);const q=(url.searchParams.get('q')||'manga').trim().slice(0,140);const upcoming=url.searchParams.get('upcoming')==='1';if(upcoming){const response=await releaseFeed(req);const data:any=await response.json();if(response.ok&&q!=='manga')data.books=data.books.filter((b:any)=>(b.title+' '+b.author+' '+b.isbn).toLowerCase().includes(q.toLowerCase()));return Response.json(data,{status:response.status,headers:response.headers})}const key='search:v2:'+q.toLowerCase();
 const cached:any=await env.DB!.prepare('SELECT data,expires FROM catalog_cache WHERE key=?').bind(key).first();
 if(cached&&cached.expires>Date.now())return Response.json(JSON.parse(cached.data),{headers:{'Cache-Control':'public, max-age=300'}});
 if(!await rate(req,'catalog',30))return Response.json({error:'Trop de recherches. Réessayez dans une minute.'},{status:429});
 try{
  const books=await searchBooks(q);
  const value={books,notice:'10 sources complémentaires, consultées selon l’ISBN. Catalogue partiel ; vérifiez votre édition.'};
  if(books.length)await env.DB!.prepare('INSERT INTO catalog_cache (key,data,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind(key,JSON.stringify(value),Date.now()+86400000).run();
  return Response.json(value,{headers:{'Cache-Control':'public, max-age=300'}});
 }catch(e){if(cached)return Response.json({...JSON.parse(cached.data),notice:'Source temporairement indisponible : dernière fiche enregistrée.'});const message=(e as Error).message;return Response.json({error:message},{status:message.includes('invalide')?400:502})}
}
