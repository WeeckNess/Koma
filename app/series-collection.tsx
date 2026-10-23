 'use client';
import {useState} from 'react';
import {ChevronDown,BookCheck,Bookmark,BookOpen} from 'lucide-react';
import type {Book,Item} from '../lib/books';
import {groupSeries,editionInfo} from '../lib/series';
import Cover from './cover';
export default function SeriesCollection({books,allBooks=books,onSelect,onRead,compact=false,saving=false}:{books:Book[];allBooks?:Book[];onSelect:(b:Book)=>void;onRead?:(b:Item)=>void;compact?:boolean;saving?:boolean}){
 const [open,setOpen]=useState<Record<string,boolean>>({});
 const groups=groupSeries(books),totals=new Map(groupSeries(allBooks).map(group=>[group.key,group.books]));
 return <div className={'series-collection'+(compact?' compact-series':'')}>{groups.map(group=>{const total=totals.get(group.key)||group.books,expanded=!!open[group.key],read=total.filter(b=>(b as Item).read).length,wish=group.books.every(b=>(b as Item).status==='wish');return <article className={'series-card'+(expanded?' expanded':'')} key={group.key}>
 <button className="series-summary" aria-expanded={expanded} onClick={()=>setOpen({...open,[group.key]:!expanded})}>
 <div className="series-cover"><Cover book={group.books[0]}/></div><div className="series-summary-info"><small>{group.publisher||'Ma collection'} · {group.edition}</small><h3>{group.title}</h3><strong>{total.length} tome{total.length>1?'s':''} {wish?'souhaité':'possédé'}{total.length>1?'s':''}</strong>{!wish&&<p>{read} lu{read>1?'s':''} · {total.length-read} à lire</p>}<div className="owned-volumes" aria-label="Tomes de ma collection">{group.books.slice(0,12).map(b=><span key={b.isbn}>{editionInfo(b).volume==null?'Édition':'T'+editionInfo(b).volume}</span>)}{group.books.length>12&&<span>+{group.books.length-12}</span>}</div></div><ChevronDown className="series-chevron" size={20}/></button>
 {expanded&&<div className="series-volumes"><div className="series-volume-heading"><BookOpen size={16}/><span>{wish?'Vos envies':'Vos tomes'}, dans l’ordre · {group.edition}</span></div><div className="volume-grid">{group.books.map(book=>{const item=book as Item;return <div className="volume-card" key={book.isbn}><button className="volume-open" onClick={()=>onSelect(book)}><Cover book={book}/><strong>{editionInfo(book).volume!==null?'Tome '+editionInfo(book).volume:book.title}</strong></button>{onRead?<button className="volume-read" disabled={saving} aria-pressed={!!item.read} onClick={()=>onRead(item)}>{item.read?<BookCheck size={15}/>:<Bookmark size={15}/>} {item.read?'Lu':'À lire'}</button>:<small>{item.read?'Lu':'À lire'}</small>}</div>})}</div></div>}
 </article>})}</div>
}
