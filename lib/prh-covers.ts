import {canonicalISBN} from './books';
import {CoverCandidate} from './cover-sources';
// The documented find endpoint lists actual PRH files. The cover endpoint alone
// may return a placeholder or an internally licensed non-PRH image instead.
export function parsePRHCovers(data:any,isbn:string):CoverCandidate|null{
 const formats=(data?.isbns||[]).find((entry:any)=>entry?.[isbn])?.[isbn];
 if(!Array.isArray(formats))return null;
 for(const size of ['700jpg','450jpg']){
  const raw=formats.find((entry:any)=>entry?.[size])?.[size];
  if(typeof raw!=='string')continue;
  try{const url=new URL(raw.replace(/\\/g,''));if(url.hostname!=='images.penguinrandomhouse.com'||!url.pathname.startsWith('/cover/')||!url.pathname.endsWith('/'+isbn))continue;
   return {url:`https://images.penguinrandomhouse.com/cover/${size==='700jpg'?'700jpg/':''}${isbn}`,source:'Penguin Random House'};
  }catch{ /* Ignore malformed URLs; never request an arbitrary host. */ }
 }
 return null;
}
export async function prhCover(isbn:string):Promise<CoverCandidate|null>{
 if(canonicalISBN(isbn)!==isbn||!/^(978[01]|9798)/.test(isbn))return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
 try{const r=await fetch('https://images.penguinrandomhouse.com/find/?isbn='+isbn,{signal:controller.signal});if(!r.ok)return null;return parsePRHCovers(await r.json(),isbn)}catch{return null}finally{clearTimeout(timer)}
}
