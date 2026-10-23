import {privateItemPatch} from './reader';
import {Book,canonicalISBN} from './books';
export function cleanBook(value:any):Book|null {
 if(!value||typeof value!=='object')return null;
 const isbn=typeof value.isbn==='string'?canonicalISBN(value.isbn):null;
 if(!isbn||typeof value.title!=='string'||!value.title.trim()||value.title.length>300)return null;
 const text=(key:string,max:number)=>typeof value[key]==='string'?value[key].slice(0,max):'';
 const url=(key:string)=>{try{const v=new URL(text(key,2000));return v.protocol==='https:'?v.href:''}catch{return ''}};
 let extra:any={};try{extra=privateItemPatch(value)}catch{return null}
 return {...extra,checkedAt:text('checkedAt',30)||undefined,isbn,title:value.title.trim(),seriesTitle:text('seriesTitle',300)||undefined,edition:text('edition',100)||undefined,volume:typeof value.volume==='number'&&Number.isFinite(value.volume)&&value.volume>=0&&value.volume<10000?value.volume:undefined,author:text('author',300),publisher:text('publisher',200),description:text('description',12000),cover:url('cover')||(typeof value.cover==='string'&&/^\/[a-z0-9-]+\.jpg$/.test(value.cover)?value.cover:''),date:text('date',30),source:text('source',100)||'Ajout personnel',language:text('language',10),sourceUrl:url('sourceUrl'),customCover:url('customCover')||undefined,shelf:text('shelf',60)||undefined,position:typeof value.position==='number'&&Number.isFinite(value.position)?Math.max(-1e9,Math.min(1e9,value.position)):undefined,spineColor:typeof value.spineColor==='string'&&/^#[0-9a-f]{6}$/i.test(value.spineColor)?value.spineColor:undefined};
}
