import {env} from 'cloudflare:workers';
import {calendarICS,matchesFollow} from '../../../lib/reader';
import {publicReleaseFeed} from '../../../lib/reader-server';
import {rate} from '../../../lib/access';
export const dynamic='force-dynamic';
export async function GET(req:Request){const token=new URL(req.url).searchParams.get('token');if(!token||!/^[a-f0-9-]{36}$/.test(token))return new Response('Calendrier introuvable',{status:404});if(!await rate(req,'calendar',60))return new Response('Réessayez plus tard',{status:429});const row:any=await env.DB!.prepare('SELECT owner FROM reader_settings WHERE calendar_token=?').bind(token).first();if(!row)return new Response('Abonnement révoqué',{status:404});const follows=await env.DB!.prepare('SELECT data FROM series_follows WHERE owner=?').bind(row.owner).all<any>();const fs=follows.results.map(r=>JSON.parse(r.data));const feed=await publicReleaseFeed();return new Response(calendarICS(feed.books.filter(b=>fs.some(f=>matchesFollow(b,f)))),{headers:{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Disposition':'inline; filename="koma-sorties.ics"'}})}
