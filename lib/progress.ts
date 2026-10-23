import {env} from 'cloudflare:workers';
import {countBooks,earnedNow,Customization} from './rewards';
export async function progress(owner:string){
 const [{results},friends]=await Promise.all([env.DB!.prepare('SELECT data,status,read FROM items WHERE owner=?').bind(owner).all(),env.DB!.prepare('SELECT COUNT(*) AS n FROM friends WHERE owner=?').bind(owner).first<{n:number}>()]);
 const counts=countBooks(results.map((r:any)=>({...JSON.parse(r.data),status:r.status,read:!!r.read})),friends?.n||0);
 await env.DB!.prepare("INSERT OR IGNORE INTO library_styles (owner,earned,customization) VALUES (?,'{}','{}')").bind(owner).run();
 const row:any=await env.DB!.prepare('UPDATE library_styles SET earned=json_patch(earned,?) WHERE owner=? RETURNING earned,customization').bind(JSON.stringify(earnedNow(counts)),owner).first();
 return {counts,earned:JSON.parse(row.earned) as Record<string,boolean>,customization:{theme:'classic',decoration:'none',...JSON.parse(row.customization)} as Customization};
}
