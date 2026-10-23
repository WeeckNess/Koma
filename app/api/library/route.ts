import {privateItemPatch} from '../../../lib/reader';
import {parisDay} from '../../../lib/release-feed';
import {env} from 'cloudflare:workers';
import {progress} from '../../../lib/progress';
import {themes,decorations,unlocked} from '../../../lib/rewards';
import {dailyBackup} from '../../../lib/backups';
import {canonicalISBN} from '../../../lib/books';
import {actor,ensureProfile,privateJSON,sameOrigin,rate} from '../../../lib/access';
import {cleanBook} from '../../../lib/validation';
export const dynamic='force-dynamic';
export async function GET(req:Request){const u=await actor(req);if(!u)return privateJSON({error:'Connectez-vous pour retrouver votre collection.'},401);
 await ensureProfile(u);
 const profile=await env.DB!.prepare('SELECT id,name,code,shared FROM profiles WHERE id=?').bind(u.id).first();
 const {results}=await env.DB!.prepare('SELECT * FROM items WHERE owner=? ORDER BY created DESC').bind(u.id).all();
 const earned=await progress(u.id);
 return privateJSON({profile:{...profile,progress:earned,customization:earned.customization},items:results.map((r:any)=>({...JSON.parse(r.data),status:r.status,read:!!r.read,created:r.created})),syncedAt:new Date().toISOString()});}
export async function POST(req:Request){
 if(!sameOrigin(req))return privateJSON({error:'Origine refusée.'},403);
 const u=await actor(req);if(!u)return privateJSON({error:'Connexion nécessaire.'},401);
 if(!await rate(req,'write',120))return privateJSON({error:'Trop de modifications. Réessayez dans une minute.'},429);
 if(Number(req.headers.get('content-length')||0)>30000)return privateJSON({error:'Fiche trop volumineuse.'},413);
 let b:any;try{b=await req.json()}catch{return privateJSON({error:'Requête invalide.'},400)}
 if(JSON.stringify(b).length>30000)return privateJSON({error:'Fiche trop volumineuse.'},413);
 await ensureProfile(u);
 if(b.action==='nickname'){const name=typeof b.name==='string'?b.name.trim():'';if(name.length<2||name.length>60||/[\u0000-\u001f\u007f]/.test(name))return privateJSON({error:'Choisissez un surnom de 2 à 60 caractères.'},400);await env.DB!.prepare('UPDATE profiles SET name=? WHERE id=?').bind(name,u.id).run();return privateJSON({ok:true})}
 if(b.action==='profile'){const name=String(b.name||'Lecteur Koma').trim().slice(0,60)||'Lecteur Koma';await env.DB!.prepare('UPDATE profiles SET name=?,shared=? WHERE id=?').bind(name,b.shared===true?1:0,u.id).run();return privateJSON({ok:true})}
 if(b.action==='customize'){
  const state=await progress(u.id);const patch:any={};
  for(const [field,options] of [['theme',themes],['decoration',decorations]] as const){if(b[field]===undefined)continue;const choice=options.find(o=>o.id===b[field]);if(!choice||!unlocked(choice.goal,state.earned))return privateJSON({error:'Terminez le succès associé pour débloquer cette personnalisation.'},403);patch[field]=choice.id}
  await env.DB!.prepare('UPDATE library_styles SET customization=json_patch(customization,?) WHERE owner=?').bind(JSON.stringify(patch),u.id).run();return privateJSON({ok:true});
 }
 let extra:any;try{extra=privateItemPatch(b)}catch(e:any){return privateJSON({error:e.message},400)}
 const book=b.book?cleanBook(b.book):null;
 const isbn=book?.isbn||(typeof b.isbn==='string'?canonicalISBN(b.isbn):null);if(!isbn)return privateJSON({error:'ISBN invalide.'},400);
 const operation=typeof b.operationId==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(b.operationId)?b.operationId:crypto.randomUUID();
 const guard='NOT EXISTS (SELECT 1 FROM mutations WHERE owner=? AND id=?)';
 let statement;const eventStatements:any[]=[];
 if(b.action==='delete')statement=env.DB!.prepare(`DELETE FROM items WHERE owner=? AND isbn=? AND ${guard}`).bind(u.id,isbn,u.id,operation);
 else if(b.action==='update'){
  const placement:any={...extra};
  if(extra.readingState!==undefined)b.read=extra.readingState==='finished';
  if(typeof b.read==='boolean'){placement.readingState=b.read?'finished':(extra.readingState||'to-read');placement.readAt=b.read?new Date().toISOString():'';if(b.read)eventStatements.push(env.DB!.prepare(`INSERT OR IGNORE INTO reader_events (owner,isbn,kind,day) SELECT ?,?,'read',? WHERE EXISTS (SELECT 1 FROM items WHERE owner=? AND isbn=? AND read=0) AND ${guard}`).bind(u.id,isbn,parisDay(),u.id,isbn,u.id,operation));}
  if(b.customCover!==undefined){if(b.customCover==='')placement.customCover='';else{try{const url=new URL(b.customCover);if(url.protocol!=='https:'||url.href.length>2000)throw Error();placement.customCover=url.href}catch{return privateJSON({error:'Utilisez un lien d’image HTTPS valide.'},400)}}}
  if(typeof b.shelf==='string')placement.shelf=b.shelf.trim().slice(0,60)||'Étagère 1';
  if(typeof b.position==='number'&&Number.isFinite(b.position)&&Math.abs(b.position)<=1e9)placement.position=b.position;
  if(typeof b.spineColor==='string'&&/^#[0-9a-f]{6}$/i.test(b.spineColor))placement.spineColor=b.spineColor;
  statement=env.DB!.prepare(`UPDATE items SET status=COALESCE(?,status),read=COALESCE(?,read),data=json_patch(data,?) WHERE owner=? AND isbn=? AND ${guard}`).bind(['wish','owned'].includes(b.status)?b.status:null,typeof b.read==='boolean'?(b.read?1:0):null,JSON.stringify(placement),u.id,isbn,u.id,operation);
 }
 else if(!b.action||b.action==='add'){
  if(!book)return privateJSON({error:'Fiche invalide.'},400);
  if(b.read===true){book.readingState='finished';book.readAt=new Date().toISOString();eventStatements.push(env.DB!.prepare(`INSERT OR IGNORE INTO reader_events (owner,isbn,kind,day) SELECT ?,?,'read',? WHERE NOT EXISTS (SELECT 1 FROM items WHERE owner=? AND isbn=?) AND ${guard}`).bind(u.id,isbn,parisDay(),u.id,isbn,u.id,operation));}
  statement=env.DB!.prepare(`INSERT OR IGNORE INTO items (owner,isbn,data,status,read,created) SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(u.id,isbn,JSON.stringify(book),b.status==='wish'?'wish':'owned',b.read===true?1:0,new Date().toISOString(),u.id,operation);
 }else return privateJSON({error:'Action inconnue.'},400);
 await dailyBackup(u.id);
 await env.DB!.batch([...eventStatements,statement,env.DB!.prepare('INSERT OR IGNORE INTO mutations (owner,id,created) VALUES (?,?,?)').bind(u.id,operation,Date.now())]);
 await progress(u.id);
 return privateJSON({ok:true});
}
