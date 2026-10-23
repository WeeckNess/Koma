'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,CalendarDays} from 'lucide-react';
import type {Book} from '../lib/books';
import {bnfCover,CoverCandidate} from '../lib/cover-sources';
import {usableCover,thumbnail,coverScore} from '../lib/cover-policy';
const resolutions=new Map<string,Promise<CoverCandidate|null>>();
const winners=new Map<string,CoverCandidate>();
const STORAGE='koma-front-covers-v3';
let hydrated=false,active=0;
const queue:(()=>void)[]=[];
function hydrate(){if(hydrated||typeof window==='undefined')return;hydrated=true;try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'[]');for(const [key,value,time] of saved)if(Date.now()-time<7*86400000&&usableCover(value?.url||''))winners.set(key,value)}catch{}}
function remember(key:string,c:CoverCandidate){winners.delete(key);winners.set(key,c);while(winners.size>250)winners.delete(winners.keys().next().value!);try{localStorage.setItem(STORAGE,JSON.stringify([...winners].map(([k,v])=>[k,v,Date.now()])))}catch{}}
function probe(c:CoverCandidate){return new Promise<CoverCandidate>((resolve,reject)=>{const start=()=>{active++;const image=new Image();let finished=false;const finish=(ok:boolean)=>{if(finished)return;finished=true;clearTimeout(timer);image.onload=null;image.onerror=null;active--;queue.shift()?.();ok?resolve({...c,url:image.src}):reject(Error('Couverture indisponible'))};const timer=setTimeout(()=>finish(false),4500);image.onload=()=>{const ratio=image.naturalWidth/image.naturalHeight;finish(image.naturalWidth>=60&&image.naturalHeight>=80&&ratio>=.48&&ratio<=.86)};image.onerror=()=>finish(false);image.src=thumbnail(c.url)};if(active<6)start();else queue.push(start)})}
function resolveCover(book:Book,key:string,announcement=false){
 let existing=resolutions.get(key);if(existing)return existing;
 const request=(async()=>{
  const cached=winners.get(key);if(cached)return cached;
  if(book.customCover){try{return await probe({url:book.customCover,source:'Visuel personnel'})}catch{return null}}
  if(announcement){if(!usableCover(book.cover))return null;try{const winner=await probe({url:book.cover,source:book.source||'Éditeur'});remember(key,winner);return winner}catch{return null}}
  const candidates=[bnfCover(book.isbn),...(usableCover(book.cover)?[{url:book.cover,source:book.source||'Éditeur'}]:[]),{url:'https://covers.openlibrary.org/b/isbn/'+book.isbn+'-M.jpg?default=false',source:'Open Library'}].sort((a,b)=>coverScore(a.url)-coverScore(b.url));
  // A slow provider must not block a fast one. First successful image wins and
  // remains stable for every occurrence of this edition and future visits.
  let settled=false;
  const immediate=candidates.map((c,i)=>new Promise<CoverCandidate>((resolve,reject)=>setTimeout(()=>{if(settled){reject(Error('Déjà chargée'));return}probe(c).then(resolve,reject)},i*250)));
  const more=new Promise<CoverCandidate>((resolve,reject)=>setTimeout(async()=>{if(settled){reject(Error('Déjà chargée'));return}try{const r=await fetch('/api/covers?isbn='+book.isbn,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const data:any=await r.json();const options:CoverCandidate[]=(data.candidates||[]).filter((c:CoverCandidate)=>usableCover(c.url)&&!candidates.some(x=>thumbnail(x.url)===thumbnail(c.url))).sort((a:CoverCandidate,b:CoverCandidate)=>coverScore(a.url)-coverScore(b.url));if(!options.length)throw Error();Promise.any(options.slice(0,5).map(probe)).then(resolve,reject)}catch{reject(Error('Sources indisponibles'))}},1000));
  try{const winner=await Promise.any([...immediate,more]);settled=true;remember(key,winner);return winner}catch{settled=true;return null}
 })();resolutions.set(key,request);return request;
}
export default function Cover({book,announcement=false}:{book:Book;announcement?:boolean}){const upcoming=announcement||book.date>new Date().toISOString().slice(0,10);return <CoverImage key={book.isbn+'|'+(book.customCover||book.cover)+'|'+upcoming} book={book} announcement={upcoming}/>}
function CoverImage({book,announcement}:{book:Book;announcement:boolean}){
 const key=book.isbn+'|'+(book.customCover||book.cover||'')+'|'+announcement;
 const [candidate,setCandidate]=useState<CoverCandidate|null>(null),[pending,setPending]=useState(true);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{hydrate();let disposed=false;const cached=winners.get(key);if(cached){setCandidate(cached);setPending(false)}const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();resolveCover(book,key,announcement).then(result=>{if(!disposed){setCandidate(result);setPending(false)}})},{rootMargin:'350px'});if(root.current)observer.observe(root.current);return()=>{disposed=true;observer.disconnect()}},[key]);
 const upcoming=book.date>new Date().toISOString().slice(0,10),number=book.title.match(/(?:tome|vol\.?)\s*0*(\d+)/i)?.[1];
 const bnf=candidate?.url.includes('openapi.bnf.fr/'),date=(candidate?.retrievedAt||new Date().toISOString().slice(0,10)).split('-').reverse().join('/');
 return <figure className="cover-figure"><div ref={root} className="cover" aria-busy={pending}>{candidate?<><img src={candidate.url} alt={'Couverture de '+book.title} decoding="async" onError={()=>{winners.delete(key);resolutions.delete(key);setCandidate(null);if(announcement||book.customCover){setPending(false);return}setPending(true);resolveCover({...book,cover:''},key).then(c=>{setCandidate(c);setPending(false)})}}/></>:pending?<div className="cover-loading" aria-label="Chargement de la couverture"><BookOpen size={28}/></div>:<div className="fallback generated-cover"><span className="generated-cover-mark">{upcoming?<CalendarDays size={25}/>:<BookOpen size={25}/>} KOMA</span><span className="generated-cover-title">{book.title}</span>{number&&<strong className="generated-cover-volume">{number}</strong>}<span className="generated-cover-author">{book.author}</span><span className="generated-cover-note">{upcoming?'Couverture à venir':'Visuel provisoire'}</span><span className="generated-cover-publisher">{book.publisher}</span></div>}</div>{bnf&&<figcaption className="cover-credit">Image BnF · récupérée le {date}</figcaption>}</figure>
}
