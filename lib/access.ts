import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
export async function digest(value:string) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function actor(req:Request):Promise<{id:string;name:string}|null>{
 const authorization=req.headers.get('authorization');
 if(authorization){
  const match=authorization.match(/^Bearer ([a-f0-9]{64})$/);if(!match)return null;
  const device:any=await env.DB!.prepare('SELECT owner FROM devices WHERE hash=? AND owner IS NOT NULL AND expires>?').bind(await digest(match[1]),Date.now()).first();
  return device?{id:device.owner,name:'Lecteur Koma'}:null;
 }
 const user=await getChatGPTUser();return user?{id:user.userId,name:user.fullName||'Lecteur Koma'}:null;
}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin}
export function privateJSON(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff'}})}
export async function rate(req:Request,scope:string,max:number){
 const bucket=Math.floor(Date.now()/60000);const key=scope+':'+await digest((req.headers.get('cf-connecting-ip')||'local')+':'+bucket);
 const row:any=await env.DB!.prepare('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,Date.now()+120000).first();
 if(Math.random()<0.02)await env.DB!.prepare('DELETE FROM rate_limits WHERE expires<?').bind(Date.now()).run();
 return row.count<=max;
}
export async function ensureProfile(user:{id:string;name:string}){await env.DB!.prepare('INSERT OR IGNORE INTO profiles (id,name,code,shared) VALUES (?,?,?,0)').bind(user.id,user.name,crypto.randomUUID()).run()}
