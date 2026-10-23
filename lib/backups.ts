import {env} from 'cloudflare:workers';
export async function dailyBackup(owner:string){const day=new Date().toISOString().slice(0,10);const exists=await env.DB!.prepare('SELECT 1 FROM backups WHERE owner=? AND day=?').bind(owner,day).first();if(exists)return;
 const {results}=await env.DB!.prepare('SELECT data,status,read,created FROM items WHERE owner=?').bind(owner).all();
 await env.DB!.batch([env.DB!.prepare('INSERT OR IGNORE INTO backups (owner,day,data,created) VALUES (?,?,?,?)').bind(owner,day,JSON.stringify(results),Date.now()),env.DB!.prepare('DELETE FROM backups WHERE owner=? AND created<?').bind(owner,Date.now()-7*86400000)]);
}
