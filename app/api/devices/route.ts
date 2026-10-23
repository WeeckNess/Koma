import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {actor,digest,ensureProfile,privateJSON,rate,sameOrigin} from '../../../lib/access';
export const dynamic='force-dynamic';
export async function GET(req:Request){const user=await actor(req);if(!user)return privateJSON({error:'Connexion nécessaire.'},401);const {results}=await env.DB!.prepare('SELECT code,name,created,expires FROM devices WHERE owner=? AND expires>?').bind(user.id,Date.now()).all();return privateJSON({devices:results})}
export async function POST(req:Request){
 if(!sameOrigin(req))return privateJSON({error:'Origine refusée.'},403);
 let body:any;try{body=await req.json()}catch{return privateJSON({error:'Requête invalide.'},400)}
 if(body.action==='start'){
  if(!await rate(req,'device-start',8))return privateJSON({error:'Réessayez dans une minute.'},429);
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');const code=crypto.randomUUID();
  await env.DB!.prepare('DELETE FROM devices WHERE expires<?').bind(Date.now()).run();
  await env.DB!.prepare('INSERT INTO devices (hash,code,owner,name,expires,created) VALUES (?,?,NULL,?,?,?)').bind(await digest(token),code,String(body.name||'Téléphone Expo').slice(0,60),Date.now()+600000,Date.now()).run();
  return privateJSON({token,url:new URL('/connect?code='+code,req.url).href,expiresIn:600});
 }
 if(body.action==='poll'){
  if(!await rate(req,'device-poll',90))return privateJSON({error:'Réessayez dans une minute.'},429);
  if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return privateJSON({error:'Session invalide.'},400);
  const row:any=await env.DB!.prepare('SELECT owner,expires FROM devices WHERE hash=? AND expires>?').bind(await digest(body.token),Date.now()).first();
  if(!row)return privateJSON({error:'Association expirée. Recommencez.'},410);
  return privateJSON({ready:!!row.owner,expires:row.expires});
 }
 if(body.action==='approve'){
  const u=await getChatGPTUser();if(!u)return privateJSON({error:'Connectez-vous dans le navigateur.'},401);
  const user={id:u.userId,name:u.fullName||'Lecteur Koma'};await ensureProfile(user);
  const result=await env.DB!.prepare('UPDATE devices SET owner=?,expires=? WHERE code=? AND owner IS NULL AND expires>?').bind(u.userId,Date.now()+30*86400000,String(body.code||''),Date.now()).run();
  return result.meta.changes?privateJSON({ok:true}):privateJSON({error:'Association expirée ou déjà utilisée.'},410);
 }
 if(body.action==='revoke'){
  const u=await actor(req);if(!u)return privateJSON({error:'Connexion nécessaire.'},401);
  await env.DB!.prepare('DELETE FROM devices WHERE code=? AND owner=?').bind(String(body.code||''),u.id).run();return privateJSON({ok:true});
 }
 return privateJSON({error:'Action inconnue.'},400);
}
