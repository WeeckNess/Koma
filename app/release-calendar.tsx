'use client';
import {useEffect,useState} from 'react';
import {CalendarDays,RefreshCw,Search,Heart,Check,ArrowUpRight} from 'lucide-react';
import type {Book,Item} from '../lib/books';
import {Release,parisDay,upcomingOnly} from '../lib/release-feed';
import snapshot from '../lib/data/upcoming-releases.json';
import type {ReleaseFeed} from '../lib/releases-service';
import {matchesFollow,Follow} from '../lib/reader';
import {normalize,editionInfo} from '../lib/series';
import Cover from './cover';
const dayLabel=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString('fr-FR',{timeZone:'Europe/Paris',weekday:'long',day:'numeric',month:'long',year:'numeric'});
export default function ReleaseCalendar({items,onSelect,onWish,saving,follows=[],onFollow}:{follows?:Follow[];onFollow?:(book:Book)=>void;items:Item[];onSelect:(book:Book)=>void;onWish:(book:Book)=>void;saving:boolean}){
 const [feed,setFeed]=useState<ReleaseFeed>({books:snapshot.books as Release[],checkedAt:snapshot.checkedAt,stale:false,notice:'Dates annoncées par les éditeurs, susceptibles de changer. Calendrier partiel.',publishers:[]}),[query,setQuery]=useState(''),[month,setMonth]=useState('all'),[publisher,setPublisher]=useState('all'),[mine,setMine]=useState(false),[limit,setLimit]=useState(24),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function update(signal?:AbortSignal){setLoading(true);setError('');try{const r=await fetch('/api/releases',{signal,cache:'no-cache'});const data:any=await r.json();if(!r.ok||!Array.isArray(data.books))throw Error(data.error||'Actualisation indisponible.');setFeed(data)}catch(e){if(!signal?.aborted)setError('Actualisation indisponible. Les annonces déjà chargées restent visibles.')}finally{if(!signal?.aborted)setLoading(false)}}
 useEffect(()=>{const controller=new AbortController();void update(controller.signal);return()=>controller.abort()},[]);
 useEffect(()=>setLimit(24),[query,month,publisher,mine]);
 const books=upcomingOnly(feed.books,parisDay()),months=[...new Set(books.map(b=>b.date.slice(0,7)))],publishers=[...new Set(books.map(b=>b.publisher))].sort((a,b)=>a.localeCompare(b,'fr'));
 const ownedSeries=new Set(items.filter(b=>b.status==='owned').map(b=>normalize(editionInfo(b).title)));
 const selected=books.filter(b=>(month==='all'||b.date.startsWith(month))&&(publisher==='all'||b.publisher===publisher)&&(!mine||ownedSeries.has(normalize(editionInfo(b).title))||follows.some(f=>matchesFollow(b,f)))&&normalize(b.title+' '+b.author+' '+b.publisher+' '+b.isbn).includes(normalize(query)));
 const days=[...new Set(selected.slice(0,limit).map(b=>b.date))];
 return <section className="release-calendar"><div className="release-intro"><div><CalendarDays size={22}/><span><strong>{books.length} parutions annoncées</strong><small>Plannings éditeurs · Glénat, Pika et nobi nobi !</small></span></div><button className="secondary" disabled={loading} onClick={()=>void update()}><RefreshCw size={16} className={loading?'spin':''}/>{loading?'Actualisation…':'Actualiser'}</button></div>
 <div className="release-filters"><label className="release-search"><Search size={18}/><input aria-label="Chercher dans les prochaines sorties" placeholder="Une série, un auteur, un ISBN…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Éditeur<select value={publisher} onChange={e=>setPublisher(e.target.value)}><option value="all">Tous les éditeurs</option>{publishers.map(p=><option key={p}>{p}</option>)}</select></label>{(items.some(b=>b.status==='owned')||follows.length>0)&&<button className={mine?'release-mine selected':'release-mine'} aria-pressed={mine} onClick={()=>setMine(!mine)}>Mes séries</button>}</div>
 <nav className="release-months" aria-label="Mois de parution"><button aria-pressed={month==='all'} onClick={()=>setMonth('all')}>Toutes les dates</button>{months.map(m=><button key={m} aria-pressed={month===m} onClick={()=>setMonth(m)}>{new Date(m+'-15T12:00:00Z').toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</button>)}</nav>
 {(error||feed.stale)&&<p className="release-warning" role="status">{error||feed.notice}</p>}
 <div className="release-results-meta"><span>{selected.length} résultat{selected.length>1?'s':''}</span><span>Informations consultées le {dayLabel(feed.checkedAt)}</span></div>
 {days.map(day=><section className="release-day" key={day}><h2><CalendarDays size={17}/>{day===parisDay()?"Aujourd’hui":dayLabel(day)}</h2><div className="release-cards">{selected.filter(b=>b.date===day).slice(0,Math.max(0,limit-selected.filter(b=>b.date<day).length)).map(book=>{const item=items.find(b=>b.isbn===book.isbn);return <article className="release-card" key={book.isbn}><button className="release-book" onClick={()=>onSelect(book)}><div className="release-cover"><Cover book={book} announcement/></div><div><small>{book.publisher}</small><h3>{book.title}</h3><p>{book.author||'Auteur à préciser'}</p><span className="release-date-pill">Date annoncée</span></div></button><div className="release-card-actions"><a href={book.sourceUrl} target="_blank" rel="noreferrer">Annonce éditeur<ArrowUpRight size={13}/></a><button disabled={saving||!!item} onClick={()=>onWish(book)}>{item?<Check size={16}/>:<Heart size={16}/>} {item?.status==='owned'?'Possédé':item?'Dans mes envies':'Envie'}</button></div></article>})}</div></section>)}
 {!selected.length&&<div className="release-empty"><CalendarDays size={34}/><h3>Aucune annonce pour ces critères</h3><p>Essayez un autre mois ou retirez un filtre. Une date absente n’est jamais inventée.</p><button className="secondary" onClick={()=>{setQuery('');setMonth('all');setPublisher('all');setMine(false)}}>Réinitialiser les filtres</button></div>}
 {selected.length>limit&&<button className="secondary release-more" onClick={()=>setLimit(limit+24)}>Afficher les prochaines annonces ({selected.length-limit})</button>}
 <p className="release-disclaimer">Les dates peuvent être décalées par les éditeurs. Une couverture non dévoilée reste signalée « Couverture à venir ».</p>
 </section>
}
