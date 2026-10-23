import {env} from 'cloudflare:workers';
import {dailyBackup} from '../../../lib/backups';
import {actor,ensureProfile,privateJSON,sameOrigin,rate} from '../../../lib/access';
import {cleanBook} from '../../../lib/validation';
export const dynamic='force-dynamic';
export async function GET(req:Request){const u=await actor(req);if(!u)return privateJSON({error:'Connexion nécessaire.'},401);if(new URL(req.url).searchParams.get('history')==='1'){const {results}=await env.DB!.prepare('SELECT day,created FROM backups WHERE owner=? ORDER BY created DESC').bind(u.id).all();return privateJSON({backups:results})}const {results}=await env.DB!.prepare('SELECT * FROM items WHERE owner=? ORDER BY created DESC').bind(u.id).all();return privateJSON({format:'koma-v1',exportedAt:new Date().toISOString(),items:results.map((r:any)=>({...JSON.parse(r.data),status:r.status,read:!!r.read,created:r.created}))})}
export async function POST(req:Request){if(!sameOrigin(req))return privateJSON({error:'Origine refusée.'},403);const u=await actor(req);if(!u)return privateJSON({error:'Connexion nécessaire.'},401);if(!await rate(req,'import',3))return privateJSON({error:'Réessayez dans une minute.'},429);if(Number(req.headers.get('content-length')||0)>2000000)return privateJSON({error:'Fichier trop volumineux.'},413);let body:any;try{body=await req.json()}catch{return privateJSON({error:'Fichier invalide.'},400)}
 if(body.action==='restore'){
 if(typeof body.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.day))return privateJSON({error:'Date invalide.'},400);
 const backup:any=await env.DB!.prepare('SELECT data FROM backups WHERE owner=? AND day=?').bind(u.id,body.day).first();if(!backup)return privateJSON({error:'Sauvegarde introuvable.'},404);
 const rows=JSON.parse(backup.data);await dailyBackup(u.id);await env.DB!.batch([env.DB!.prepare('DELETE FROM items WHERE owner=?').bind(u.id),...rows.map((r:any)=>env.DB!.prepare('INSERT INTO items (owner,isbn,data,status,read,created) VALUES (?,?,?,?,?,?)').bind(u.id,JSON.parse(r.data).isbn,r.data,r.status,r.read,r.created))]);return privateJSON({ok:true,restored:rows.length});
 }
 const entries=Array.isArray(body)?body:body.items;
 if(!Array.isArray(entries)||entries.length>500||JSON.stringify(body).length>2000000)return privateJSON({error:'Import limité à 500 mangas et 2 Mo.'},400);
 const books=entries.map(cleanBook);if(books.some(b=>!b))return privateJSON({error:'Une fiche est invalide. Aucun manga importé.'},400);await ensureProfile(u);
 if(!books.length)return privateJSON({ok:true,imported:0});
 const statements=books.map((book,i)=>env.DB!.prepare('INSERT OR IGNORE INTO items (owner,isbn,data,status,read,created) VALUES (?,?,?,?,?,?)').bind(u.id,book!.isbn,JSON.stringify(book),entries[i].status==='wish'?'wish':'owned',entries[i].read===true?1:0,new Date().toISOString()));
 await dailyBackup(u.id);
 const results=await env.DB!.batch(statements);return privateJSON({ok:true,imported:results.reduce((n,r)=>n+r.meta.changes,0)});
}
