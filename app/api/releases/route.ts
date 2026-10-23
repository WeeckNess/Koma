import {env} from 'cloudflare:workers';
import {loadReleaseFeed,releaseSnapshot,ReleaseStore} from '../../../lib/releases-service';
import {rate} from '../../../lib/access';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 if(!await rate(req,'releases',30))return Response.json({error:'Réessayez dans une minute.'},{status:429});
 const store:ReleaseStore={async get(key){const row:any=await env.DB!.prepare('SELECT data,expires FROM catalog_cache WHERE key=?').bind(key).first();if(!row)return null;try{return {data:JSON.parse(row.data),expires:row.expires}}catch{return null}},async set(key,data,expires){await env.DB!.prepare('INSERT INTO catalog_cache (key,data,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind(key,JSON.stringify(data),expires).run()}};
 try{return Response.json(await loadReleaseFeed(store),{headers:{'Cache-Control':'public, max-age=300, stale-while-revalidate=3600'}})}catch{return Response.json({...releaseSnapshot(),stale:true,notice:'Dernière sélection disponible : actualisation temporairement impossible.'},{headers:{'Cache-Control':'public, max-age=60'}})}
}
