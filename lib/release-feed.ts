import {canonicalISBN,Book} from './books';
import {usableCover} from './cover-policy';
export type Release=Book&{calendarUrl:string;calendarPage:number;announcementSource:string;dateStatus:'announced'};
export const RELEASE_PUBLISHERS=[{id:'glenat',name:'Glénat',origin:'https://www.glenat.com',path:'/manga/planning-des-sorties/'},{id:'pika',name:'Pika',origin:'https://www.pika.fr',path:'/planning-sorties/'},{id:'nobi',name:'nobi nobi !',origin:'https://www.nobi-nobi.fr',path:'/planning-sorties/'}] as const;
export type ReleasePublisher=typeof RELEASE_PUBLISHERS[number];
export function parisDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function validDay(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value}
export function releaseMonths(today=parisDay()){const [year,month]=today.split('-').map(Number);return [0,1,2].map(offset=>new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,7))}
export function calendarURL(p:ReleasePublisher,month:string,page=1,today=parisDay()){return p.origin+p.path+(month===today.slice(0,7)?'':month+'/')+(page>1?page+'/':'')}
const first=(v:any)=>Array.isArray(v)?v[0]:v;
const text=(v:any)=>typeof first(v)==='string'?first(v):'';
const clean=(v:string)=>v.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,num)=>{const n=parseInt(hex||num,hex?16:10);return n<=0x10ffff?String.fromCodePoint(n):''}).replace(/&quot;/g,'"').replace(/&apos;/g,"'").trim();
export function parseReleasePage(html:string,p:ReleasePublisher,month:string,page=1,checkedAt=parisDay()):{books:Release[];pages:number}{
 const match=html.match(/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i);
 if(!match)throw Error('Le format du planning '+p.name+' a changé.');
 const data=JSON.parse(match[1]);const sections=data.props?.pageProps?.sections;
 if(!Array.isArray(sections))throw Error('Planning non reconnu.');
 const calendars=sections.filter((s:any)=>Array.isArray(s.data?.prefilter_results)&&s.data?.schedule);
 if(!calendars.length)throw Error('Liste de parutions absente.');
 const books:Release[]=[];let pages=1;
 for(const section of calendars){pages=Math.max(pages,Math.min(3,Number(section.data.pageMax)||1));for(const row of section.data.prefilter_results){try{
  const b=JSON.parse(text(row.decoupled_render));const isbn=canonicalISBN(String(b.ean||text(row.product__ean)));
  const path=text(row.path),id=path.match(/(97[89]\d{10})\/?$/)?.[1];
  const date=text(row.product__date_parution__date)||String(b.date_parution||'').replace(/^(\d{2})-(\d{2})-(\d{4})$/,'$3-$2-$1');
  if(!isbn||canonicalISBN(id||'')!==isbn||!validDay(date)||date.slice(0,7)!==month)continue;
  if(b.type_de_faconnage!=='Papier'&&(!Array.isArray(b.format)||!b.format.includes('Papier')))continue;
  const sourceUrl=new URL(path,p.origin);if(sourceUrl.origin!==p.origin)continue;
  const title=clean(b.titre_de_couverture||text(row.product__titre_de_couverture));if(!title||title.includes('??'))continue;
  const image=b.image_de_couverture?.uri;let candidate='';if(typeof image==='string'&&image.startsWith('imgArticle/')){const coverUrl=new URL('https://media.hachette.fr/fit-in/360x540/'+clean(image));coverUrl.searchParams.set('source','web');candidate=coverUrl.href}
  books.push({isbn,title,seriesTitle:b.serie_label||undefined,volume:typeof b.numero_de_tome==='number'?b.numero_de_tome:undefined,author:(row.product__intervenant__principal_full_name||[]).map(clean).join(', '),publisher:b.publisher?.label||p.name,date,cover:usableCover(candidate)?candidate:'',description:'',language:'fr',source:p.name+' · planning éditeur',sourceUrl:sourceUrl.href,checkedAt,calendarUrl:calendarURL(p,month,page,checkedAt),calendarPage:page,announcementSource:p.id,dateStatus:'announced'});
 }catch{/* Ignore malformed individual editions, never invent a date or ISBN. */}}}
 return {books,pages};
}
export function upcomingOnly(books:Release[],today=parisDay()){
 const unique=new Map<string,Release>();for(const book of books)if(canonicalISBN(book.isbn)&&validDay(book.date)&&book.date>=today&&book.sourceUrl){const old=unique.get(book.isbn);if(!old||(book.checkedAt||'')>(old.checkedAt||''))unique.set(book.isbn,book)}
 return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'fr',{numeric:true})||a.isbn.localeCompare(b.isbn));
}
