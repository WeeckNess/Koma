import type {Book} from './books';
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function editionInfo(book:Book){
 const title=book.title.replace(/&amp;/g,'&').trim();
 const explicit=title.match(/\b(?:tome|volume|vol\.?|T\.?)\s*(\d+(?:[.,]\d+)?)/i);
 const trailing=title.match(/(?:^|\s|[·—-])0*(\d+(?:[.,]\d+)?)\s*$/);
 const number=book.volume??(explicit||trailing?Number((explicit||trailing)![1].replace(',','.')):null);
 const raw=book.seriesTitle||(explicit?title.slice(0,explicit.index):title.replace(/\s+[0-9]+(?:[.,][0-9]+)?\s*$/,'')).replace(/\s*[·—:\-]\s*$/,'').trim();
 const special=(word:string)=>new RegExp('(?:[ée]dition\\s+'+word+'\\b|\\b'+word+'\\s*(?:[·—-]\\s*)?(?:(?:tome|vol\\.?)\\s*)?\\d+\\s*$)','i').test(title);
 const edition=book.edition||(special('deluxe')?'Deluxe':special('perfect')?'Perfect':special('collector')?'Collector':/coffret/i.test(title)?'Coffret':special('int[ée]grale')?'Intégrale':special('grand format')?'Grand format':special('double|omnibus')?'Double':'Standard');
 const editionSuffix=edition==='Standard'?'originale|standard|simple':normalize(edition)==='integrale'?'int[ée]grale':edition==='Double'?'double|omnibus':edition.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const series=raw.replace(new RegExp('(?:[·—:\\-]\\s*)?(?:[ée]dition\\s+)?(?:'+editionSuffix+')\\s*$','i'),'').replace(/\s+/g,' ').replace(/\s*[·—:\-]\s*$/,'').trim()||raw;
 return {title:series,volume:number,edition,key:[normalize(series),normalize(book.publisher||''),normalize(edition),normalize(book.language||'fr')].join('|')};
}
export function groupSeries<T extends Book>(books:T[]){
 const groups=new Map<string,{key:string;title:string;edition:string;publisher:string;books:T[]}>();
 for(const book of books){const info=editionInfo(book);const group=groups.get(info.key)||{key:info.key,title:info.title,edition:info.edition,publisher:book.publisher,books:[]};group.books.push(book);groups.set(info.key,group)}
 for(const g of groups.values())g.books.sort((a,b)=>(editionInfo(a).volume??Infinity)-(editionInfo(b).volume??Infinity)||a.title.localeCompare(b.title,'fr',{numeric:true}));
 return [...groups.values()];
}
