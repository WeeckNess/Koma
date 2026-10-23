import snapshot from './data/upcoming-releases.json';
import {RELEASE_PUBLISHERS,Release,ReleasePublisher,releaseMonths,calendarURL,parseReleasePage,parisDay,upcomingOnly} from './release-feed';
export type ReleaseFeed={books:Release[];checkedAt:string;stale:boolean;notice:string;publishers:string[]};
type Cached={data:any;expires:number};
export type ReleaseStore={get:(key:string)=>Promise<Cached|null>;set:(key:string,data:unknown,expires:number)=>Promise<void>};
const pending=new Map<string,Promise<ReleaseFeed>>();
export const releaseSnapshot=(today=parisDay()):ReleaseFeed=>({books:upcomingOnly(snapshot.books as Release[],today),checkedAt:snapshot.checkedAt,stale:false,notice:'Dates annoncées par les éditeurs, susceptibles de changer. Calendrier partiel.',publishers:RELEASE_PUBLISHERS.map(p=>p.name)});
async function cached(store:ReleaseStore,key:string){try{return await store.get(key)}catch{return null}}
async function save(store:ReleaseStore,key:string,data:unknown,expires:number){try{await store.set(key,data,expires)}catch{/* The bundled publisher selection remains available. */}}
export async function loadReleaseFeed(store:ReleaseStore,fetcher:typeof fetch=fetch,today=parisDay()):Promise<ReleaseFeed>{
 const feedKey='release-feed:v3:'+releaseMonths(today).join(',');const old=await cached(store,feedKey);
 if(old&&old.expires>Date.now())return {...old.data,books:upcomingOnly(old.data.books,today)};
 const inFlight=pending.get(feedKey);if(inFlight)return inFlight;
 const request=(async()=>{
  let stale=false;const all:Release[]=[];
  async function page(p:ReleasePublisher,month:string,index:number){
   const key='release-page:v3:'+p.id+':'+month+':'+index;
   const existing=await cached(store,key);
   if(existing&&existing.expires>Date.now())return existing.data as {books:Release[];pages:number};
   try{
    const response=await fetcher(calendarURL(p,month,index,today),{signal:AbortSignal.timeout(4500)});
    if(!response.ok)throw Error('HTTP '+response.status);
    const parsed=parseReleasePage(await response.text(),p,month,index,today);
    await save(store,key,parsed,Date.now()+2*3600000);return parsed;
   }catch{
    stale=true;
    if(existing?.data?.books)return existing.data as {books:Release[];pages:number};
    const previous=snapshot.books.filter(b=>b.announcementSource===p.id&&b.date.startsWith(month));
    return {books:previous.filter(b=>b.calendarPage===index) as Release[],pages:Math.max(1,...previous.map(b=>b.calendarPage))};
   }
  }
  const jobs=RELEASE_PUBLISHERS.flatMap(p=>releaseMonths(today).map(month=>async()=>{const first=await page(p,month,1);all.push(...first.books);for(let index=2;index<=Math.min(3,first.pages);index++)all.push(...(await page(p,month,index)).books)}));
  // Bound parallel publisher page fetches and Worker memory use.
  let cursor=0;await Promise.all([0,1,2].map(async()=>{while(cursor<jobs.length){const job=jobs[cursor++];await job()}}));
  const books=upcomingOnly(all,today);
  const dates=books.map(b=>b.checkedAt||snapshot.checkedAt).sort();
  const value:ReleaseFeed={books,checkedAt:dates[0]||snapshot.checkedAt,stale,notice:stale?'Certains plannings ne répondent pas : les dernières annonces disponibles sont conservées.':'Dates annoncées par les éditeurs, susceptibles de changer. Calendrier partiel.',publishers:RELEASE_PUBLISHERS.map(p=>p.name)};
  await save(store,feedKey,value,Date.now()+(stale?10*60000:30*60000));return value;
 })();pending.set(feedKey,request);try{return await request}finally{pending.delete(feedKey)}
}
