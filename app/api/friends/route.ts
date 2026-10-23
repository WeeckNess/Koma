import {friendBook} from '../../../lib/reader';
import {env} from 'cloudflare:workers';
import {actor,ensureProfile,privateJSON,sameOrigin,rate} from '../../../lib/access';
export const dynamic='force-dynamic';
export async function GET(req:Request){const u=await actor(req);if(!u)return privateJSON({error:'Connexion nécessaire.'},401);await ensureProfile(u);const code=new URL(req.url).searchParams.get('code');
 if(code){const p:any=await env.DB!.prepare('SELECT p.id,p.name FROM profiles p JOIN friends f ON f.target=p.id AND f.owner=? WHERE p.code=? AND p.shared=1').bind(u.id,code).first();if(!p)return privateJSON({error:'Cette collection est privée ou votre invitation n’a pas encore été acceptée.'},404);const {results}=await env.DB!.prepare("SELECT data,read,created FROM items WHERE owner=? AND status='owned' ORDER BY created DESC").bind(p.id).all();const style:any=await env.DB!.prepare('SELECT customization FROM library_styles WHERE owner=?').bind(p.id).first();return privateJSON({name:p.name,customization:{theme:'classic',decoration:'none',...(style?JSON.parse(style.customization):{})},items:results.map((r:any)=>friendBook({...JSON.parse(r.data),read:!!r.read,created:r.created,status:'owned'}))})}
 const [friends,incoming,outgoing]=await Promise.all([
  env.DB!.prepare('SELECT p.name,p.code,p.shared FROM friends f JOIN profiles p ON p.id=f.target WHERE f.owner=?').bind(u.id).all(),
  env.DB!.prepare('SELECT p.name,p.code FROM friend_requests r JOIN profiles p ON p.id=r.sender WHERE r.target=?').bind(u.id).all(),
  env.DB!.prepare('SELECT p.name,p.code FROM friend_requests r JOIN profiles p ON p.id=r.target WHERE r.sender=?').bind(u.id).all()]);
 return privateJSON({friends:friends.results,incoming:incoming.results,outgoing:outgoing.results});}
export async function POST(req:Request){
 if(!sameOrigin(req))return privateJSON({error:'Origine refusée.'},403);const u=await actor(req);if(!u)return privateJSON({error:'Connexion nécessaire.'},401);if(!await rate(req,'friends',30))return privateJSON({error:'Réessayez dans une minute.'},429);
 let b:any;try{b=await req.json()}catch{return privateJSON({error:'Requête invalide.'},400)}await ensureProfile(u);
 const p:any=await env.DB!.prepare('SELECT id,shared FROM profiles WHERE code=?').bind(String(b.code||'').slice(0,80)).first();if(!p||(!p.shared&&!['accept','decline','remove','cancel'].includes(b.action)))return privateJSON({error:'Code inconnu ou invitations désactivées.'},404);if(p.id===u.id)return privateJSON({error:'Il s’agit de votre propre code.'},400);
 if(b.action==='remove'){await env.DB!.batch([env.DB!.prepare('DELETE FROM friends WHERE (owner=? AND target=?) OR (owner=? AND target=?)').bind(u.id,p.id,p.id,u.id),env.DB!.prepare('DELETE FROM friend_requests WHERE (sender=? AND target=?) OR (sender=? AND target=?)').bind(u.id,p.id,p.id,u.id),env.DB!.prepare('DELETE FROM loan_requests WHERE (sender=? AND target=?) OR (sender=? AND target=?)').bind(u.id,p.id,p.id,u.id)]);}
 else if(b.action==='decline')await env.DB!.prepare('DELETE FROM friend_requests WHERE sender=? AND target=?').bind(p.id,u.id).run();
 else if(b.action==='cancel')await env.DB!.prepare('DELETE FROM friend_requests WHERE sender=? AND target=?').bind(u.id,p.id).run();
 else if(b.action==='accept'){
  const request=await env.DB!.prepare('SELECT 1 FROM friend_requests WHERE sender=? AND target=?').bind(p.id,u.id).first();if(!request)return privateJSON({error:'Invitation introuvable.'},404);
  await env.DB!.batch([env.DB!.prepare('INSERT OR IGNORE INTO friends (owner,target) VALUES (?,?),(?,?)').bind(u.id,p.id,p.id,u.id),env.DB!.prepare('DELETE FROM friend_requests WHERE (sender=? AND target=?) OR (sender=? AND target=?)').bind(u.id,p.id,p.id,u.id),env.DB!.prepare('DELETE FROM loan_requests WHERE (sender=? AND target=?) OR (sender=? AND target=?)').bind(u.id,p.id,p.id,u.id)]);
 }else {
  const existing=await env.DB!.prepare('SELECT 1 FROM friends WHERE owner=? AND target=?').bind(u.id,p.id).first();if(!existing)await env.DB!.prepare('INSERT OR IGNORE INTO friend_requests (sender,target,created) VALUES (?,?,?)').bind(u.id,p.id,Date.now()).run();
 }
 return privateJSON({ok:true});}
