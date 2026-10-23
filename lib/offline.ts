import {privateItemPatch} from './reader';
import {Item,Book} from './books';
export type Change={operationId:string;action:'add'|'update'|'delete';isbn?:string;book?:Book;status?:'owned'|'wish';read?:boolean;shelf?:string;position?:number;spineColor?:string;customCover?:string;readingState?:Item['readingState'];queueOrder?:number;pricePaidCents?:number;plannedPriceCents?:number;purchasedAt?:string;room?:string;cabinet?:string;location?:string;notes?:string;rating?:number;reviewShared?:boolean;coverageSeries?:string;coverageStart?:number;coverageEnd?:number;spinePhoto?:string};
export type Snapshot={profile:{id:string;name:string;code:string;shared:number};items:Item[];pending:Change[];syncedAt?:string};
export function applyChange(items:Item[],change:Change):Item[]{
 const isbn=change.book?.isbn||change.isbn;
 if(change.action==='delete')return items.filter(book=>book.isbn!==isbn);
 if(change.action==='update')return items.map(book=>book.isbn===isbn?{...book,status:change.status||book.status,read:change.read??(change.readingState?change.readingState==='finished':book.read),shelf:change.shelf??book.shelf,position:change.position??book.position,spineColor:change.spineColor??book.spineColor,customCover:change.customCover??book.customCover,...privateItemPatch(change)}:book);
 if(!change.book||items.some(book=>book.isbn===isbn))return items;
 return [{...change.book,status:change.status||'owned',read:change.read||false,created:new Date().toISOString()},...items];
}
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('koma-offline-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
export async function readLocal():Promise<Snapshot|null>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('state');const r=tx.objectStore('state').get('active');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close()})}
export async function writeLocal(value:Snapshot|null){const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('state','readwrite');if(value)tx.objectStore('state').put(value,'active');else tx.objectStore('state').delete('active');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
