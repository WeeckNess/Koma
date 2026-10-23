import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(){try{await env.DB!.prepare('SELECT 1 AS ok').first();return Response.json({ok:true,service:'Koma',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({ok:false},{status:503})}}
